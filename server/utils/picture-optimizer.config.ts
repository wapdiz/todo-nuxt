import path from 'node:path';
import { PICTURE_PATHS } from '../../project-config/base';

function toRelativePublicPath(publicPath: string): string {
  return publicPath.replace(/^\//, '');
}

export interface pictureOptimizerConfig {
  publicDir: string;
  assetsPublicRoot: string;
  optimizedPublicRoot: string;
  prebuildScanPublicRoot: string;
  optimizedRelativeDir: string;
  defaultAvifQuality: number;
  defaultWebpQuality: number;
  defaultOriginalJpegQuality: number;
  defaultOriginalPngQuality: number;
  defaultOriginalPngCompressionLevel: number;
  defaultOriginalWebpQuality: number;
  defaultOriginalAvifQuality: number;
  keepOriginalIfOptimizedIsLarger: boolean;
}

export const pictureOptimizerConfig: pictureOptimizerConfig = {
  publicDir: path.resolve(process.cwd(), 'public'),
  assetsPublicRoot: PICTURE_PATHS.assetsPublicRoot,
  optimizedPublicRoot: PICTURE_PATHS.optimizedPublicRoot,
  prebuildScanPublicRoot: PICTURE_PATHS.prebuildScanPublicRoot,
  optimizedRelativeDir: toRelativePublicPath(PICTURE_PATHS.optimizedPublicRoot),
  defaultAvifQuality: 50,
  defaultWebpQuality: 75,
  defaultOriginalJpegQuality: 92,
  defaultOriginalPngQuality: 95,
  defaultOriginalPngCompressionLevel: 9,
  defaultOriginalWebpQuality: 75,
  defaultOriginalAvifQuality: 50,
  keepOriginalIfOptimizedIsLarger: true,
};
