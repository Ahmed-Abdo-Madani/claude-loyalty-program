/**
 * Migration: Create wallet_passes table
 *
 * Purpose: Track individual wallet passes (Apple/Google) for each customer-offer combination
 *
 * Usage:
 *   node migrations/create-wallet-passes-table.js
 */

import sequelize from '../config/database.js'
import logger from '../config/logger.js'

export async function up() {
  try {
    logger.info('📦 Creating wallet_passes table...')

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS wallet_passes (
        id SERIAL PRIMARY KEY,

        -- Relationships
        customer_id VARCHAR(50) NOT NULL,
        progress_id INTEGER NOT NULL,
        business_id VARCHAR(50) NOT NULL,
        offer_id VARCHAR(50) NOT NULL,

        -- Wallet Type & Identifiers
        wallet_type VARCHAR(20) NOT NULL CHECK (wallet_type IN ('apple', 'google')),
        wallet_serial VARCHAR(100) UNIQUE,
        wallet_object_id VARCHAR(200) UNIQUE,

        -- Status
        pass_status VARCHAR(20) DEFAULT 'active' CHECK (pass_status IN ('active', 'expired', 'revoked', 'deleted')),

        -- Metadata
        device_info JSONB DEFAULT '{}',
        last_updated_at TIMESTAMP,

        -- Timestamps
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

        -- Foreign Keys
        CONSTRAINT fk_wallet_passes_customer
          FOREIGN KEY (customer_id)
          REFERENCES customers(customer_id)
          ON DELETE CASCADE,

        CONSTRAINT fk_wallet_passes_progress
          FOREIGN KEY (progress_id)
          REFERENCES customer_progress(id)
          ON DELETE CASCADE,

        CONSTRAINT fk_wallet_passes_business
          FOREIGN KEY (business_id)
          REFERENCES businesses(public_id)
          ON DELETE CASCADE,

        CONSTRAINT fk_wallet_passes_offer
          FOREIGN KEY (offer_id)
          REFERENCES offers(public_id)
          ON DELETE CASCADE,

        -- Unique constraint: one wallet type per customer-offer combination
        CONSTRAINT unique_customer_offer_wallet
          UNIQUE (customer_id, offer_id, wallet_type)
      );
    `)

    logger.info('📇 Creating indexes on wallet_passes table...')

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_wallet_passes_customer ON wallet_passes(customer_id);
      CREATE INDEX IF NOT EXISTS idx_wallet_passes_progress ON wallet_passes(progress_id);
      CREATE INDEX IF NOT EXISTS idx_wallet_passes_business ON wallet_passes(business_id);
      CREATE INDEX IF NOT EXISTS idx_wallet_passes_wallet_type ON wallet_passes(wallet_type);
      CREATE INDEX IF NOT EXISTS idx_wallet_passes_status ON wallet_passes(pass_status);
    `)

    logger.info('✅ wallet_passes table created successfully')

  } catch (error) {
    logger.error('❌ Failed to create wallet_passes table:', error)
    throw error
  }
}

export async function down() {
  try {
    logger.info('🗑️  Dropping wallet_passes table...')

    await sequelize.query(`
      DROP TABLE IF EXISTS wallet_passes CASCADE;
    `)

    logger.info('✅ wallet_passes table dropped successfully')

  } catch (error) {
    logger.error('❌ Failed to drop wallet_passes table:', error)
    throw error
  }
}

// Run migration if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    try {
      await sequelize.authenticate()
      logger.info('✅ Database connection established')

      await up()

      logger.info('🎉 Migration completed successfully')
      process.exit(0)
    } catch (error) {
      logger.error('❌ Migration failed:', error)
      process.exit(1)
    }
  })()
}
