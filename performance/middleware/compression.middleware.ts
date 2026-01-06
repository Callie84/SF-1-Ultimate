/**
 * Compression Middleware for Express
 *
 * Optimized response compression with Brotli and Gzip
 *
 * Installation:
 * npm install compression
 *
 * Usage:
 * import { setupCompression } from './middleware/compression.middleware';
 * setupCompression(app);
 */

import { Express, Request, Response } from 'express';
import compression from 'compression';

/**
 * Setup compression middleware with optimal settings
 *
 * @param app - Express app instance
 * @param options - Compression options
 */
export function setupCompression(
  app: Express,
  options: {
    /** Compression level (0-9, default: 6) */
    level?: number;
    /** Minimum response size to compress (default: 1024 bytes) */
    threshold?: number;
    /** Disable compression for specific routes */
    exclude?: string[];
  } = {}
): void {
  const {
    level = 6, // Balance between speed and compression ratio
    threshold = 1024, // 1KB minimum
    exclude = [],
  } = options;

  app.use(
    compression({
      // Compression level (0-9)
      // 0 = no compression
      // 1 = fastest, least compression
      // 6 = balanced (default)
      // 9 = slowest, best compression
      level,

      // Only compress responses larger than threshold
      threshold,

      // Filter which responses should be compressed
      filter: (req: Request, res: Response) => {
        // Skip if client doesn't support compression
        if (!req.headers['accept-encoding']) {
          return false;
        }

        // Skip excluded routes
        const path = req.path || req.url;
        if (exclude.some((pattern) => path.includes(pattern))) {
          return false;
        }

        // Skip if response has Cache-Control: no-transform
        if (res.getHeader('Cache-Control')?.toString().includes('no-transform')) {
          return false;
        }

        // Skip if already compressed (e.g., pre-compressed assets)
        const contentEncoding = res.getHeader('Content-Encoding');
        if (contentEncoding) {
          return false;
        }

        // Skip streaming responses
        if (req.headers['x-no-compression']) {
          return false;
        }

        // Use default compression filter
        return compression.filter(req, res);
      },

      // Brotli compression (better than gzip, but slower)
      // Only use for static assets or cached responses
      // @ts-ignore - brotli options
      brotliOptions: {
        params: {
          // Compression quality (0-11, default: 11)
          [require('zlib').constants.BROTLI_PARAM_QUALITY]: 4, // Fast compression
          [require('zlib').constants.BROTLI_PARAM_SIZE_HINT]: 0,
        },
      },
    })
  );

  console.log(`✅ Compression enabled (level: ${level}, threshold: ${threshold}b)`);
}

/**
 * Pre-compress static assets (run during build)
 *
 * Usage in build script:
 * import { precompressAssets } from './middleware/compression.middleware';
 * precompressAssets('./public');
 */
export async function precompressAssets(directory: string): Promise<void> {
  const fs = require('fs').promises;
  const path = require('path');
  const zlib = require('zlib');
  const { promisify } = require('util');

  const gzip = promisify(zlib.gzip);
  const brotliCompress = promisify(zlib.brotliCompress);

  async function compressFile(filePath: string): Promise<void> {
    const content = await fs.readFile(filePath);

    // Skip small files
    if (content.length < 1024) {
      return;
    }

    // Gzip compression
    const gzipped = await gzip(content, { level: 9 });
    await fs.writeFile(`${filePath}.gz`, gzipped);

    // Brotli compression (better compression, but slower)
    const brotlied = await brotliCompress(content, {
      params: {
        [zlib.constants.BROTLI_PARAM_QUALITY]: 11, // Max quality for static assets
      },
    });
    await fs.writeFile(`${filePath}.br`, brotlied);

    const gzipRatio = ((1 - gzipped.length / content.length) * 100).toFixed(1);
    const brotliRatio = ((1 - brotlied.length / content.length) * 100).toFixed(1);

    console.log(
      `📦 ${path.basename(filePath)}: ${content.length}b → gzip ${gzipped.length}b (${gzipRatio}%) | brotli ${brotlied.length}b (${brotliRatio}%)`
    );
  }

  async function walkDirectory(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        await walkDirectory(fullPath);
      } else if (
        entry.isFile() &&
        /\.(js|css|html|svg|json|xml|txt)$/.test(entry.name)
      ) {
        await compressFile(fullPath);
      }
    }
  }

  console.log(`🗜️  Pre-compressing assets in: ${directory}`);
  await walkDirectory(directory);
  console.log('✅ Pre-compression complete');
}

/**
 * Compression statistics middleware
 */
export function compressionStats() {
  let totalUncompressed = 0;
  let totalCompressed = 0;
  let requestCount = 0;

  return {
    middleware: (req: Request, res: Response, next: Function) => {
      const originalWrite = res.write;
      const originalEnd = res.end;
      let uncompressedSize = 0;

      // @ts-ignore
      res.write = function (chunk: any, ...args: any[]) {
        if (chunk) {
          uncompressedSize += chunk.length || 0;
        }
        // @ts-ignore
        return originalWrite.apply(res, [chunk, ...args]);
      };

      // @ts-ignore
      res.end = function (chunk: any, ...args: any[]) {
        if (chunk) {
          uncompressedSize += chunk.length || 0;
        }

        const compressedSize = parseInt(
          res.getHeader('Content-Length')?.toString() || '0'
        );

        if (uncompressedSize > 0) {
          totalUncompressed += uncompressedSize;
          totalCompressed += compressedSize || uncompressedSize;
          requestCount++;

          // Add compression ratio header (for debugging)
          if (compressedSize > 0 && compressedSize < uncompressedSize) {
            const ratio = ((1 - compressedSize / uncompressedSize) * 100).toFixed(1);
            res.setHeader('X-Compression-Ratio', `${ratio}%`);
          }
        }

        // @ts-ignore
        return originalEnd.apply(res, [chunk, ...args]);
      };

      next();
    },

    getStats: () => ({
      requestCount,
      totalUncompressed,
      totalCompressed,
      savedBytes: totalUncompressed - totalCompressed,
      compressionRatio:
        totalUncompressed > 0
          ? ((1 - totalCompressed / totalUncompressed) * 100).toFixed(1)
          : 0,
    }),
  };
}

export default setupCompression;
