import { promises as fs } from 'node:fs';
import path from 'node:path';
import { PICTURE_PATHS } from '../project-config/base';
import { pictureOptimizerConfig } from '../server/utils/picture-optimizer.config';
import { optimizePublicImage } from '../server/utils/picture-optimizer';

const ROOT_DIR = process.cwd();
const PUBLIC_DIR = pictureOptimizerConfig.publicDir;
const SUPPORTED_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'avif']);

async function listFilesRecursive(dirPath: string): Promise<string[]> {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(async (entry) => {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) return listFilesRecursive(fullPath);
      if (entry.isFile()) return [fullPath];
      return [];
    }),
  );

  return files.flat();
}

function normalizePath(inputPath: string): string {
  const unix = inputPath.replace(/\\/g, '/').trim();
  const withSlash = unix.startsWith('/') ? unix : `/${unix}`;
  return withSlash.replace(/\/{2,}/g, '/');
}

function toPublicAssetPath(absolutePath: string): string {
  const relative = path.relative(PUBLIC_DIR, absolutePath).replace(/\\/g, '/');
  return normalizePath(relative);
}

function isInsideOptimized(publicAssetPath: string): boolean {
  const optimizedRoot = normalizePath(PICTURE_PATHS.optimizedPublicRoot);
  return publicAssetPath.startsWith(`${optimizedRoot}/`) || publicAssetPath === optimizedRoot;
}

function resolveScanAbsoluteDir(): string {
  const dirArgIndex = process.argv.findIndex((arg) => arg === '--dir');

  if (dirArgIndex === -1) {
    return path.resolve(PUBLIC_DIR, `.${PICTURE_PATHS.prebuildScanPublicRoot}`);
  }

  const rawDir = process.argv[dirArgIndex + 1];
  if (!rawDir) {
    throw new Error('Missing value for --dir');
  }

  const normalizedPublicDir = normalizePath(rawDir);
  const absolute = path.resolve(PUBLIC_DIR, `.${normalizedPublicDir}`);

  if (!absolute.startsWith(PUBLIC_DIR)) {
    throw new Error(`Directory is outside public: ${rawDir}`);
  }

  return absolute;
}

async function main(): Promise<void> {
  const scanAbsoluteDir = resolveScanAbsoluteDir();

  const allFiles = await listFilesRecursive(scanAbsoluteDir);
  let processed = 0;

  for (const filePath of allFiles) {
    const ext = path.extname(filePath).replace(/^\./, '').toLowerCase();
    if (!SUPPORTED_EXTENSIONS.has(ext)) continue;

    const publicPath = toPublicAssetPath(filePath);
    if (isInsideOptimized(publicPath)) continue;

    await optimizePublicImage(publicPath, {
      generateOriginal: true,
      generateWebp: true,
      generateAvif: true,
    });

    processed += 1;
  }

  console.info(`[Picture] prebuild done. processed images: ${processed}`);
  console.info(`[Picture] scan root: ${path.relative(ROOT_DIR, scanAbsoluteDir)}`);
}

main().catch((error) => {
  console.error('[Picture] prebuild failed', error);
  process.exitCode = 1;
});
