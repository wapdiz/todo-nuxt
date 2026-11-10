import { promises as fs } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { pictureOptimizerConfig } from './picture-optimizer.config';

const PUBLIC_DIR = pictureOptimizerConfig.publicDir;

type OriginalFormat = 'jpg' | 'jpeg' | 'png' | 'webp' | 'avif';

interface OptimizerOptions {
  avifQuality?: number;
  webpQuality?: number;
  originalJpegQuality?: number;
  originalPngQuality?: number;
  originalPngCompressionLevel?: number;
  originalWebpQuality?: number;
  originalAvifQuality?: number;
  generateOriginal?: boolean;
  generateAvif?: boolean;
  generateWebp?: boolean;
}

interface OptimizedVariant {
  original: string;
  avif?: string;
  webp?: string;
}

const defaultOptions: Required<OptimizerOptions> = {
  avifQuality: pictureOptimizerConfig.defaultAvifQuality,
  webpQuality: pictureOptimizerConfig.defaultWebpQuality,
  originalJpegQuality: pictureOptimizerConfig.defaultOriginalJpegQuality,
  originalPngQuality: pictureOptimizerConfig.defaultOriginalPngQuality,
  originalPngCompressionLevel: pictureOptimizerConfig.defaultOriginalPngCompressionLevel,
  originalWebpQuality: pictureOptimizerConfig.defaultOriginalWebpQuality,
  originalAvifQuality: pictureOptimizerConfig.defaultOriginalAvifQuality,
  generateOriginal: true,
  generateAvif: true,
  generateWebp: true,
};

const pendingJobs = new Map<string, Promise<OptimizedVariant>>();

function normalizePublicPath(inputPath: string): string {
  const unixPath = inputPath.replace(/\\/g, '/').trim();
  const prefixed = unixPath.startsWith('/') ? unixPath : `/${unixPath}`;
  return prefixed.replace(/\/{2,}/g, '/');
}

function toPublicFilePath(publicPath: string): string {
  const normalized = normalizePublicPath(publicPath);
  const fullPath = path.resolve(PUBLIC_DIR, `.${normalized}`);

  if (!fullPath.startsWith(PUBLIC_DIR)) {
    throw new Error(`Path is outside public directory: ${publicPath}`);
  }

  return fullPath;
}

function getSourceExtension(sourcePath: string): string {
  return path.extname(sourcePath).replace(/^\./, '').toLowerCase();
}

function toOriginalFormat(ext: string): OriginalFormat | undefined {
  if (ext === 'jpg' || ext === 'jpeg' || ext === 'png' || ext === 'webp' || ext === 'avif') return ext;
  return undefined;
}

function buildOptimizedBasePath(sourcePath: string): string {
  const normalizedSource = normalizePublicPath(sourcePath);
  const sourceWithoutSlash = normalizedSource.replace(/^\//, '');
  const assetsWithoutSlash = pictureOptimizerConfig.assetsPublicRoot.replace(/^\//, '');
  const relativeFromAssets = sourceWithoutSlash.startsWith(`${assetsWithoutSlash}/`)
    ? sourceWithoutSlash.replace(new RegExp(`^${assetsWithoutSlash}/`), '')
    : sourceWithoutSlash;
  const relativeWithoutExt = relativeFromAssets.replace(/\.[^.]+$/, '');

  return normalizePublicPath(path.posix.join(pictureOptimizerConfig.optimizedPublicRoot, relativeWithoutExt));
}

function getOptimizedPaths(sourcePath: string, sourceExt: string): { original: string; avif: string; webp: string } {
  const base = buildOptimizedBasePath(sourcePath);

  return {
    original: `${base}.${sourceExt}`,
    avif: `${base}.avif`,
    webp: `${base}.webp`,
  };
}

async function ensureParentDir(filePath: string): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function getFileSize(filePath: string): Promise<number> {
  const stat = await fs.stat(filePath);
  return stat.size;
}

async function isOutputFresh(sourceFilePath: string, outputFilePath: string): Promise<boolean> {
  if (!(await fileExists(outputFilePath))) return false;

  const [sourceStat, outputStat] = await Promise.all([fs.stat(sourceFilePath), fs.stat(outputFilePath)]);
  return outputStat.mtimeMs >= sourceStat.mtimeMs;
}

async function generateOptimizedOriginal(
  sourceFilePath: string,
  targetFilePath: string,
  format: OriginalFormat,
  options: Required<OptimizerOptions>,
): Promise<boolean> {
  const image = sharp(sourceFilePath).rotate();
  const sourceSize = await getFileSize(sourceFilePath);

  await ensureParentDir(targetFilePath);

  if (format === 'jpg' || format === 'jpeg') {
    await image.jpeg({ quality: options.originalJpegQuality, progressive: true, mozjpeg: true }).toFile(targetFilePath);
    return true;
  }

  if (format === 'png') {
    await image
      .png({
        compressionLevel: options.originalPngCompressionLevel,
        adaptiveFiltering: true,
        progressive: false,
        quality: options.originalPngQuality,
      })
      .toFile(targetFilePath);

    if (pictureOptimizerConfig.keepOriginalIfOptimizedIsLarger) {
      const optimizedSize = await getFileSize(targetFilePath);
      if (optimizedSize >= sourceSize) {
        await fs.unlink(targetFilePath).catch(() => undefined);
        return false;
      }
    }

    return true;
  }

  if (format === 'webp') {
    await image.webp({ quality: options.originalWebpQuality }).toFile(targetFilePath);
    return true;
  }

  await image.avif({ quality: options.originalAvifQuality }).toFile(targetFilePath);
  return true;
}

export async function optimizePublicImage(
  sourcePath: string,
  options: OptimizerOptions = {},
): Promise<OptimizedVariant> {
  const normalizedSourcePath = normalizePublicPath(sourcePath);
  const sourceFilePath = toPublicFilePath(normalizedSourcePath);
  const sourceExt = getSourceExtension(normalizedSourcePath);
  const originalFormat = toOriginalFormat(sourceExt);
  const finalOptions = { ...defaultOptions, ...options };
  const pendingKey = `${normalizedSourcePath}:${JSON.stringify(finalOptions)}`;

  const existingJob = pendingJobs.get(pendingKey);
  if (existingJob) return existingJob;

  const job = (async () => {
    try {
      if (!(await fileExists(sourceFilePath))) {
        return { original: normalizedSourcePath };
      }

      const shouldGenerateOriginal = finalOptions.generateOriginal && Boolean(originalFormat);
      const optimizedPaths = getOptimizedPaths(normalizedSourcePath, sourceExt);
      const optimizedFsPaths = {
        original: toPublicFilePath(optimizedPaths.original),
        avif: toPublicFilePath(optimizedPaths.avif),
        webp: toPublicFilePath(optimizedPaths.webp),
      };

      const isCacheHit =
        (!shouldGenerateOriginal || (await isOutputFresh(sourceFilePath, optimizedFsPaths.original))) &&
        (!finalOptions.generateAvif || (await isOutputFresh(sourceFilePath, optimizedFsPaths.avif))) &&
        (!finalOptions.generateWebp || (await isOutputFresh(sourceFilePath, optimizedFsPaths.webp)));

      if (isCacheHit) {
        console.info(`[Picture] cache hit: ${normalizedSourcePath}`);

        return {
          original:
            shouldGenerateOriginal && (await fileExists(optimizedFsPaths.original))
              ? optimizedPaths.original
              : normalizedSourcePath,
          avif: finalOptions.generateAvif ? optimizedPaths.avif : undefined,
          webp: finalOptions.generateWebp ? optimizedPaths.webp : undefined,
        };
      }

      const outputs: { original?: string; avif?: string; webp?: string } = {};

      if (shouldGenerateOriginal && originalFormat) {
        const hasSmallerOrEqualResult = await generateOptimizedOriginal(
          sourceFilePath,
          optimizedFsPaths.original,
          originalFormat,
          finalOptions,
        );

        if (hasSmallerOrEqualResult) {
          outputs.original = optimizedPaths.original;
        }
      }

      if (finalOptions.generateAvif) {
        await ensureParentDir(optimizedFsPaths.avif);
        await sharp(sourceFilePath).rotate().avif({ quality: finalOptions.avifQuality }).toFile(optimizedFsPaths.avif);
        outputs.avif = optimizedPaths.avif;
      }

      if (finalOptions.generateWebp) {
        await ensureParentDir(optimizedFsPaths.webp);
        await sharp(sourceFilePath).rotate().webp({ quality: finalOptions.webpQuality }).toFile(optimizedFsPaths.webp);
        outputs.webp = optimizedPaths.webp;
      }

      console.info(`[Picture] generated: ${normalizedSourcePath}`);

      return {
        original: outputs.original ?? normalizedSourcePath,
        avif: outputs.avif,
        webp: outputs.webp,
      };
    } catch (error) {
      console.error(`[Picture] fallback for ${normalizedSourcePath}`, error);
      return { original: normalizedSourcePath };
    } finally {
      pendingJobs.delete(pendingKey);
    }
  })();

  pendingJobs.set(pendingKey, job);
  return job;
}
