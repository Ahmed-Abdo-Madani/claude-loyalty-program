import path from 'path';
import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { Op } from 'sequelize';
import { sequelize, Business, Product, OfferCardDesign } from '../models/index.js';
import R2StorageService from '../services/R2StorageService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDryRun = process.argv.includes('--dry-run');
const uploadsBaseDir = process.env.UPLOADS_DIR || path.join(__dirname, '../uploads');

const MIGRATION_TARGETS = [
  {
    localSubdir: 'uploads/logos/',
    r2Prefix: 'logos/',
  },
  {
    localSubdir: 'uploads/menus/',
    r2Prefix: 'menus/',
  },
  {
    localSubdir: 'uploads/designs/products/',
    r2Prefix: 'products/',
  },
  {
    localSubdir: 'uploads/designs/logos/',
    r2Prefix: 'designs/logos/',
  },
  {
    localSubdir: 'uploads/designs/processed/',
    r2Prefix: 'designs/processed/',
  }
];

function getContentType(filename) {
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case '.webp': return 'image/webp';
    case '.png': return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.pdf': return 'application/pdf';
    default: return 'application/octet-stream';
  }
}

const stats = {
  logos: { migrated: 0, skipped: 0, failed: 0 },
  menus: { migrated: 0, skipped: 0, failed: 0 },
  products: { migrated: 0, skipped: 0, failed: 0 },
  cardDesigns: { migrated: 0, skipped: 0, failed: 0 },
};

async function migrateLogos(isDryRun) {
  const dirPath = path.join(uploadsBaseDir, 'logos');
  try {
    await fs.access(dirPath);
  } catch (error) {
    console.log(`Directory ${dirPath} not found. Skipping.`);
    return;
  }

  const files = await fs.readdir(dirPath);
  for (const filename of files) {
    const filePath = path.join(dirPath, filename);
    const key = `logos/${filename}`;
    
    try {
      const businesses = await Business.findAll({
        where: { logo_url: { [Op.like]: '%' + filename + '%' } }
      });

      if (businesses.length === 0) {
        if (isDryRun) console.log(`[DRY RUN] Would skip logo ${filename} - no DB record matched.`);
        stats.logos.skipped++;
        continue;
      }
      
      if (businesses.length > 1) {
        console.log(`Ambiguous match for logo ${filename} - matched ${businesses.length} records. Skipping.`);
        stats.logos.skipped++;
        continue;
      }

      const business = businesses[0];

      if (isDryRun) {
        console.log(`[DRY RUN] Would upload logo ${filename} and update Business ${business.id}`);
        stats.logos.migrated++;
      } else {
        const buffer = await fs.readFile(filePath);
        const contentType = getContentType(filename);
        const r2Url = await R2StorageService.uploadFile(buffer, key, contentType);
        await business.update({ logo_url: r2Url, logo_filename: key });
        console.log(`Successfully migrated logo ${filename}`);
        stats.logos.migrated++;
      }
    } catch (error) {
      console.error(`Failed to migrate logo ${filename}:`, error);
      stats.logos.failed++;
    }
  }
}

async function migrateMenuPdfs(isDryRun) {
  const dirPath = path.join(uploadsBaseDir, 'menus');
  try {
    await fs.access(dirPath);
  } catch (error) {
    console.log(`Directory ${dirPath} not found. Skipping.`);
    return;
  }

  const files = await fs.readdir(dirPath);
  for (const filename of files) {
    const filePath = path.join(dirPath, filename);
    const key = `menus/${filename}`;
    
    try {
      const businesses = await Business.findAll({
        where: { menu_pdf_url: { [Op.like]: '%' + filename + '%' } }
      });

      if (businesses.length === 0) {
        if (isDryRun) console.log(`[DRY RUN] Would skip menu ${filename} - no DB record matched.`);
        stats.menus.skipped++;
        continue;
      }
      
      if (businesses.length > 1) {
        console.log(`Ambiguous match for menu ${filename} - matched ${businesses.length} records. Skipping.`);
        stats.menus.skipped++;
        continue;
      }

      const business = businesses[0];

      if (isDryRun) {
        console.log(`[DRY RUN] Would upload menu ${filename} and update Business ${business.id}`);
        stats.menus.migrated++;
      } else {
        const buffer = await fs.readFile(filePath);
        const contentType = getContentType(filename);
        const r2Url = await R2StorageService.uploadFile(buffer, key, contentType);
        await business.update({ menu_pdf_url: r2Url, menu_pdf_filename: key });
        console.log(`Successfully migrated menu ${filename}`);
        stats.menus.migrated++;
      }
    } catch (error) {
      console.error(`Failed to migrate menu ${filename}:`, error);
      stats.menus.failed++;
    }
  }
}

async function migrateProductImages(isDryRun) {
  const dirPath = path.join(uploadsBaseDir, 'designs', 'products');
  try {
    await fs.access(dirPath);
  } catch (error) {
    console.log(`Directory ${dirPath} not found. Skipping.`);
    return;
  }

  const files = await fs.readdir(dirPath);
  
  for (const filename of files) {
    const filePath = path.join(dirPath, filename);
    const key = `products/${filename}`;
    
    let fieldName = null;
    if (filename.includes('_original.webp')) fieldName = 'image_original_url';
    else if (filename.includes('_large.webp')) fieldName = 'image_large_url';
    else if (filename.includes('_thumb.webp')) fieldName = 'image_thumbnail_url';
    else {
      // not a recognized product image variant
      continue;
    }
    
    try {
      const products = await Product.findAll({
        where: { [fieldName]: { [Op.like]: '%' + filename + '%' } }
      });

      if (products.length === 0) {
        if (isDryRun) console.log(`[DRY RUN] Would skip product image ${filename} - no DB record matched.`);
        stats.products.skipped++;
        continue;
      }
      
      if (products.length > 1) {
        console.log(`Ambiguous match for product image ${filename} - matched ${products.length} records. Skipping.`);
        stats.products.skipped++;
        continue;
      }

      const product = products[0];

      if (isDryRun) {
        console.log(`[DRY RUN] Would upload product image ${filename} and update Product ${product.id} field ${fieldName}`);
        stats.products.migrated++;
      } else {
        const buffer = await fs.readFile(filePath);
        const contentType = getContentType(filename);
        const r2Url = await R2StorageService.uploadFile(buffer, key, contentType);
        await product.update({ [fieldName]: r2Url });
        console.log(`Successfully migrated product image ${filename}`);
        stats.products.migrated++;
      }
    } catch (error) {
      console.error(`Failed to migrate product image ${filename}:`, error);
      stats.products.failed++;
    }
  }
}

function padStat(stat) {
  return stat.toString().padEnd(4);
}

async function migrateCardDesigns(isDryRun) {
  const dirs = [
    { localDir: 'designs/logos', prefix: 'designs/logos/' },
    { localDir: 'designs/processed', prefix: 'designs/processed/' }
  ];

  for (const { localDir, prefix } of dirs) {
    const dirPath = path.join(uploadsBaseDir, localDir);
    try {
      await fs.access(dirPath);
    } catch (error) {
      console.log(`Directory ${dirPath} not found. Skipping.`);
      continue;
    }

    const files = await fs.readdir(dirPath);
    for (const filename of files) {
      const filePath = path.join(dirPath, filename);
      const key = `${prefix}${filename}`;
      
      let fieldName = null;
      if (filename.includes('_original')) fieldName = 'logo_url';
      else if (filename.includes('_apple')) fieldName = 'logo_apple_url';
      else if (filename.includes('_google')) fieldName = 'logo_google_url';
      else if (filename.includes('_hero')) fieldName = 'hero_image_url';
      else {
        if (prefix === 'designs/logos/') fieldName = 'logo_url';
        else continue;
      }

      try {
        const designs = await OfferCardDesign.findAll({
          where: { [fieldName]: { [Op.like]: '%' + filename + '%' } }
        });

        if (designs.length === 0) {
          if (isDryRun) console.log(`[DRY RUN] Would skip card design asset ${filename} - no DB record matched.`);
          stats.cardDesigns.skipped++;
          continue;
        }
        
        if (designs.length > 1) {
          console.log(`Ambiguous match for card design asset ${filename} - matched ${designs.length} records. Skipping.`);
          stats.cardDesigns.skipped++;
          continue;
        }

        const design = designs[0];

        if (isDryRun) {
          console.log(`[DRY RUN] Would upload card design asset ${filename} and update OfferCardDesign ${design.id} field ${fieldName}`);
          stats.cardDesigns.migrated++;
        } else {
          const buffer = await fs.readFile(filePath);
          const contentType = getContentType(filename);
          const r2Url = await R2StorageService.uploadFile(buffer, key, contentType);
          await design.update({ [fieldName]: r2Url });
          console.log(`Successfully migrated card design asset ${filename}`);
          stats.cardDesigns.migrated++;
        }
      } catch (error) {
        console.error(`Failed to migrate card design asset ${filename}:`, error);
        stats.cardDesigns.failed++;
      }
    }
  }
}

async function main() {
  try {
    await sequelize.authenticate();
    
    if (isDryRun) {
      console.log('╔══════════════════════════════════════════════════════════════════╗');
      console.log('║ 🔍 DRY RUN — no files will be uploaded or DB records updated     ║');
      console.log('╚══════════════════════════════════════════════════════════════════╝');
    } else {
      console.log('Starting migration to R2...\n');
    }

    await migrateLogos(isDryRun);
    await migrateMenuPdfs(isDryRun);
    await migrateProductImages(isDryRun);
    await migrateCardDesigns(isDryRun);

    console.log('');
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║  📦 Migration Summary                                          ║');
    console.log('╠════════════════════════════════════════════════════════════════╣');
    console.log(`║  Logos      │ migrated: ${padStat(stats.logos.migrated)} │ skipped: ${padStat(stats.logos.skipped)} │ failed: ${padStat(stats.logos.failed)} ║`);
    console.log(`║  Menus      │ migrated: ${padStat(stats.menus.migrated)} │ skipped: ${padStat(stats.menus.skipped)} │ failed: ${padStat(stats.menus.failed)} ║`);
    console.log(`║  Products   │ migrated: ${padStat(stats.products.migrated)} │ skipped: ${padStat(stats.products.skipped)} │ failed: ${padStat(stats.products.failed)} ║`);
    console.log(`║  Designs    │ migrated: ${padStat(stats.cardDesigns.migrated)} │ skipped: ${padStat(stats.cardDesigns.skipped)} │ failed: ${padStat(stats.cardDesigns.failed)} ║`);
    console.log('╚════════════════════════════════════════════════════════════════╝');

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    await sequelize.close();
    process.exit(1);
  }
}

main();
