import sharp from 'sharp';
import { readFileSync } from 'fs';
import { join } from 'path';

const iconsPath = 'C:\\Users\\Design_Bench_12\\Documents\\claude-loyalty-program\\uploads\\icons\\stamps';
const previewsPath = join(iconsPath, 'previews');

// Coffee preview
const coffeeSvg = readFileSync(join(iconsPath, 'coffee-filled.svg'));
await sharp(coffeeSvg)
  .resize(50, 50, {
    fit: 'contain',
    background: { r: 255, g: 255, b: 255, alpha: 0 }
  })
  .png()
  .toFile(join(previewsPath, 'coffee-preview.png'));

console.log('✅ Coffee preview generated');

// Gift preview
const giftSvg = readFileSync(join(iconsPath, 'gift-filled.svg'));
await sharp(giftSvg)
  .resize(50, 50, {
    fit: 'contain',
    background: { r: 255, g: 255, b: 255, alpha: 0 }
  })
  .png()
  .toFile(join(previewsPath, 'gift-preview.png'));

console.log('✅ Gift preview generated');
console.log('🎉 All previews generated!');
