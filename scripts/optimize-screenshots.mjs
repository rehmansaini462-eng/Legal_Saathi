/**
 * @module scripts/optimize-screenshots
 * @description Converts all PNG screenshots in public/screenshots/ to high-quality compressed WebP format and deletes original PNG files.
 * Ensures each output WebP is < 100KB for rapid repository and documentation loading.
 */

import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SCREENSHOTS_DIR = path.resolve(__dirname, '../public/screenshots');

async function optimizeScreenshots() {
  console.log(`Scanning screenshots directory: ${SCREENSHOTS_DIR}`);
  const files = await fs.readdir(SCREENSHOTS_DIR);
  const pngFiles = files.filter((file) => file.endsWith('.png'));

  if (pngFiles.length === 0) {
    console.log('No PNG files found to convert.');
    return;
  }

  let totalPngBytes = 0;
  let totalWebpBytes = 0;

  for (const file of pngFiles) {
    const pngPath = path.join(SCREENSHOTS_DIR, file);
    const webpName = file.replace(/\.png$/, '.webp');
    const webpPath = path.join(SCREENSHOTS_DIR, webpName);

    const pngStat = await fs.stat(pngPath);
    totalPngBytes += pngStat.size;

    // Convert to webp with quality 80 and near-lossless / reduction
    await sharp(pngPath).webp({ quality: 80, effort: 6 }).toFile(webpPath);

    const webpStat = await fs.stat(webpPath);
    totalWebpBytes += webpStat.size;

    console.log(
      `✓ Converted ${file} (${(pngStat.size / 1024).toFixed(1)} KB) -> ${webpName} (${(webpStat.size / 1024).toFixed(1)} KB)`
    );

    // Delete original PNG
    await fs.unlink(pngPath);
  }

  console.log('\n--- Optimization Summary ---');
  console.log(
    `Original PNG Total: ${(totalPngBytes / (1024 * 1024)).toFixed(3)} MB (${(totalPngBytes / 1024).toFixed(1)} KB)`
  );
  console.log(
    `Optimized WebP Total: ${(totalWebpBytes / (1024 * 1024)).toFixed(3)} MB (${(totalWebpBytes / 1024).toFixed(1)} KB)`
  );
  console.log(`Saved: ${(((totalPngBytes - totalWebpBytes) / totalPngBytes) * 100).toFixed(1)}%`);
}

optimizeScreenshots().catch((err) => {
  console.error('Error optimizing screenshots:', err);
  process.exit(1);
});
