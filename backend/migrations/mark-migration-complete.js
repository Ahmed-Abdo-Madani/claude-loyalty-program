/**
 * Manually mark a migration as completed
 * 
 * Use this when you've applied a migration manually via pgAdmin or SQL
 * and need to register it in the schema_migrations tracking table
 * 
 * Usage: node backend/migrations/mark-migration-complete.js <migration-name>
 * Example: node backend/migrations/mark-migration-complete.js 20250221-add-grace-period-end-to-subscriptions
 */

import sequelize from '../config/database.js';
import logger from '../config/logger.js';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function markMigrationComplete(migrationName) {
  try {
    console.log(`\n🔍 Marking migration as complete: ${migrationName}\n`);
    
    // Find migration file
    const migrationFile = path.join(__dirname, `${migrationName}.js`);
    
    if (!fs.existsSync(migrationFile)) {
      throw new Error(`Migration file not found: ${migrationFile}`);
    }
    
    // Calculate checksum
    const fileContent = fs.readFileSync(migrationFile, 'utf8');
    const checksum = crypto.createHash('sha256').update(fileContent).digest('hex');
    
    console.log(`   📄 Migration file: ${migrationFile}`);
    console.log(`   🔐 Checksum: ${checksum.substring(0, 16)}...`);
    
    // Check if already registered
    const [existing] = await sequelize.query(
      `SELECT migration_name, status, applied_at 
       FROM schema_migrations 
       WHERE migration_name = :name`,
      {
        replacements: { name: migrationName },
        type: sequelize.QueryTypes.SELECT
      }
    );
    
    if (existing) {
      console.log(`\n   ⚠️  Migration already registered:`);
      console.log(`      Status: ${existing.status}`);
      console.log(`      Applied: ${existing.applied_at}`);
      
      if (existing.status === 'success') {
        console.log(`\n   ✅ Migration already marked as successful. No action needed.\n`);
        return;
      }
      
      // Update existing record
      console.log(`\n   📝 Updating status to 'success'...`);
      await sequelize.query(
        `UPDATE schema_migrations 
         SET status = 'success',
             applied_at = NOW(),
             execution_time_ms = 0,
             error_message = NULL,
             checksum = :checksum
         WHERE migration_name = :name`,
        {
          replacements: { name: migrationName, checksum }
        }
      );
      
      console.log(`   ✅ Migration status updated to 'success'\n`);
      
    } else {
      // Insert new record
      console.log(`\n   📝 Inserting new migration record...`);
      await sequelize.query(
        `INSERT INTO schema_migrations (migration_name, status, applied_at, execution_time_ms, checksum)
         VALUES (:name, 'success', NOW(), 0, :checksum)`,
        {
          replacements: { name: migrationName, checksum }
        }
      );
      
      console.log(`   ✅ Migration registered as successful\n`);
    }
    
    // Verify
    const [verified] = await sequelize.query(
      `SELECT migration_name, status, applied_at 
       FROM schema_migrations 
       WHERE migration_name = :name`,
      {
        replacements: { name: migrationName },
        type: sequelize.QueryTypes.SELECT
      }
    );
    
    console.log(`   ✅ Verification:`);
    console.log(`      Migration: ${verified.migration_name}`);
    console.log(`      Status: ${verified.status}`);
    console.log(`      Applied: ${verified.applied_at}\n`);
    
  } catch (error) {
    console.error(`\n   ❌ Error:`, error.message);
    throw error;
  } finally {
    await sequelize.close();
  }
}

// Get migration name from command line
const migrationName = process.argv[2];

if (!migrationName) {
  console.error(`\n❌ Usage: node mark-migration-complete.js <migration-name>`);
  console.error(`   Example: node mark-migration-complete.js 20250221-add-grace-period-end-to-subscriptions\n`);
  process.exit(1);
}

// Run
markMigrationComplete(migrationName)
  .then(() => {
    console.log('✅ Done!\n');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Failed:', err);
    process.exit(1);
  });
