/**
 * Migration: Add Loyalty Tiers to Offers
 * 
 * Adds a JSON column to the offers table to store customizable tier configuration
 * for perpetual loyalty passes.
 * 
 * Changes:
 * 1. offers table:
 *    - loyalty_tiers: JSON field for customizable tier/medal system
 * 
 * Default Tier Structure (when loyalty_tiers is null):
 * - Bronze: 1-2 completions, icon 🥉
 * - Silver: 3-5 completions, icon 🥈
 * - Gold: 6+ completions, icon 🥇
 * Note: Customers with 0 completions automatically get "New Member" tier (👋, #6B7280)
 * 
 * Custom Tier Structure (example):
 * {
 *   "enabled": true,
 *   "tiers": [
 *     {
 *       "id": "bronze",
 *       "name": "Bronze Member",
 *       "nameAr": "عضو برونزي",
 *       "minRewards": 1,
 *       "maxRewards": 2,
 *       "icon": "🥉",
 *       "color": "#CD7F32"
 *     },
 *     {
 *       "id": "silver",
 *       "name": "Silver Member",
 *       "nameAr": "عضو فضي",
 *       "minRewards": 3,
 *       "maxRewards": 5,
 *       "icon": "🥈",
 *       "color": "#C0C0C0"
 *     },
 *     {
 *       "id": "gold",
 *       "name": "Gold Member",
 *       "nameAr": "عضو ذهبي",
 *       "minRewards": 6,
 *       "maxRewards": null,
 *       "icon": "🥇",
 *       "color": "#FFD700"
 *     }
 *   ]
 * }
 * 
 * Usage:
 * - Run: node backend/migrations/20250129-add-loyalty-tiers-to-offers.js
 * - Or: npm run migrate:loyalty-tiers
 * - Or via pgAdmin: Copy SQL from comments below
 */

import sequelize from '../config/database.js'
import logger from '../config/logger.js'

async function up() {
  const queryInterface = sequelize.getQueryInterface()
  
  logger.info('🔄 Starting migration: Add loyalty_tiers to offers...')
  
  const transaction = await sequelize.transaction()
  
  try {
    // Add loyalty_tiers column
    await queryInterface.addColumn(
      'offers',
      'loyalty_tiers',
      {
        type: sequelize.Sequelize.JSON,
        allowNull: true,
        defaultValue: null
      },
      { transaction }
    )
    logger.info('✅ Added loyalty_tiers column to offers table')
    
    // Add column comment
    await sequelize.query(
      `COMMENT ON COLUMN offers.loyalty_tiers IS 'Customizable tier/medal system for perpetual loyalty passes'`,
      { transaction }
    )
    logger.info('✅ Added column comment')
    
    await transaction.commit()
    logger.info('✅ Migration completed successfully!')
    
  } catch (error) {
    await transaction.rollback()
    logger.error('❌ Migration failed:', error)
    throw error
  }
}

async function down() {
  const queryInterface = sequelize.getQueryInterface()
  
  logger.info('🔄 Rolling back migration: Remove loyalty_tiers from offers...')
  
  const transaction = await sequelize.transaction()
  
  try {
    // Remove loyalty_tiers column
    await queryInterface.removeColumn('offers', 'loyalty_tiers', { transaction })
    logger.info('✅ Removed loyalty_tiers column from offers table')
    
    await transaction.commit()
    logger.info('✅ Rollback completed successfully!')
    
  } catch (error) {
    await transaction.rollback()
    logger.error('❌ Rollback failed:', error)
    throw error
  }
}

// Run migration if executed directly
if (process.argv[1] === new URL(import.meta.url).pathname) {
  (async () => {
    try {
      await sequelize.authenticate()
      logger.info('✅ Database connection established')
      
      const command = process.argv[2]
      
      if (command === 'down') {
        await down()
      } else {
        await up()
      }
      
      // Close connection to prevent hanging
      await sequelize.close()
      logger.info('✅ Database connection closed')
      process.exit(0)
      
    } catch (error) {
      logger.error('❌ Migration script failed:', error)
      await sequelize.close()
      process.exit(1)
    }
  })()
}

export { up, down }

/* 
 * SQL for manual execution in pgAdmin:
 * 
 * -- Add loyalty_tiers column
 * ALTER TABLE offers 
 * ADD COLUMN loyalty_tiers JSON;
 * 
 * -- Add comment
 * COMMENT ON COLUMN offers.loyalty_tiers 
 * IS 'Customizable tier/medal system for perpetual loyalty passes';
 * 
 * -- Verify
 * SELECT column_name, data_type, is_nullable 
 * FROM information_schema.columns 
 * WHERE table_name = 'offers' AND column_name = 'loyalty_tiers';
 */
