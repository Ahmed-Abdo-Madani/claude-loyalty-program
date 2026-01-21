/**
 * Migration: Fix sale_number unique constraint
 * 
 * Problem:
 * - sale_number has a GLOBAL unique constraint (affects all businesses)
 * - This prevents multiple businesses from having the same sale numbers
 * - Example: Business A creates SALE-2025-00001, Business B cannot
 * 
 * Solution:
 * - Remove global unique constraint on sale_number
 * - Add composite unique constraint on (business_id, sale_number)
 * - Each business can now have independent sale numbering
 * 
 * Date: 2025-11-25
 */

import { Sequelize } from 'sequelize';
import sequelize from '../config/database.js';

export async function up(queryInterface, DataTypes) {
  console.log('🔧 Fixing sale_number unique constraint...');
  
  try {
    // Step 1: Drop the global unique constraint on sale_number
    console.log('📝 Step 1: Dropping global unique constraint on sale_number');
    await queryInterface.removeConstraint('sales', 'sales_sale_number_key', {
      transaction: null // Allow this to fail if constraint doesn't exist
    }).catch(err => {
      console.log('⚠️  Global constraint might not exist (this is okay):', err.message);
    });
    
    // Also try alternate constraint name patterns
    await queryInterface.sequelize.query(
      `ALTER TABLE sales DROP CONSTRAINT IF EXISTS sales_sale_number_key;`,
      { transaction: null }
    ).catch(err => {
      console.log('⚠️  Alternate constraint drop (okay if fails):', err.message);
    });
    
    // Step 2: Drop any existing unique index on sale_number alone
    console.log('📝 Step 2: Dropping any standalone sale_number index');
    await queryInterface.sequelize.query(
      `DROP INDEX IF EXISTS sales_sale_number;`,
      { transaction: null }
    ).catch(err => {
      console.log('⚠️  Index might not exist (this is okay):', err.message);
    });
    
    // Step 3: Create composite unique constraint
    console.log('📝 Step 3: Creating composite unique constraint (business_id, sale_number)');
    await queryInterface.addConstraint('sales', {
      fields: ['business_id', 'sale_number'],
      type: 'unique',
      name: 'unique_business_sale_number'
    });
    
    console.log('✅ Migration completed successfully');
    console.log('📊 Result: Each business can now have independent sale numbering');
    
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  }
}

export async function down(queryInterface, DataTypes) {
  console.log('🔙 Reverting sale_number constraint changes...');
  
  try {
    // Remove composite unique constraint
    await queryInterface.removeConstraint('sales', 'unique_business_sale_number');
    
    // Restore global unique constraint (NOT RECOMMENDED)
    await queryInterface.addConstraint('sales', {
      fields: ['sale_number'],
      type: 'unique',
      name: 'sales_sale_number_key'
    });
    
    console.log('✅ Rollback completed');
    console.log('⚠️  WARNING: Global unique constraint restored (not recommended for production)');
    
  } catch (error) {
    console.error('❌ Rollback failed:', error);
    throw error;
  }
}

// Run migration if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    console.log('🚀 Running migration: Fix sale_number unique constraint');
    await up(sequelize.getQueryInterface(), Sequelize.DataTypes);
    console.log('✅ Migration completed successfully');
    await sequelize.close();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    await sequelize.close();
    process.exit(1);
  }
}
