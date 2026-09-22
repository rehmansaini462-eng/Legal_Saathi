import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const screenshotsDir = path.resolve('public/screenshots');

async function convertScreenshots() {
  const files = fs.readdirSync(screenshotsDir);
  for (const file of files) {
    if (file.endsWith('.png')) {
      const inputPath = path.join(screenshotsDir, file);
      const outputPath = path.join(screenshotsDir, file.replace(/\.png$/, '.webp'));

      console.log(`Converting ${file} -> WebP...`);
      await sharp(inputPath).webp({ quality: 85, effort: 6 }).toFile(outputPath);

      const oldSize = fs.statSync(inputPath).size;
      const newSize = fs.statSync(outputPath).size;
      const savings = (((oldSize - newSize) / oldSize) * 100).toFixed(1);
      console.log(
        `Saved ${(oldSize / 1024).toFixed(1)}KB -> ${(newSize / 1024).toFixed(1)}KB (${savings}% reduction)`
      );

      fs.unlinkSync(inputPath);
    }
  }
  console.log('All screenshots converted to WebP successfully.');
}

convertScreenshots().catch(console.error);
