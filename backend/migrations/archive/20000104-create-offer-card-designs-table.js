/**
 * Migration: Create offer_card_designs table
 *
 * Purpose: Store visual customization data for wallet passes (Apple Wallet & Google Wallet)
 *
 * Features:
 * - Store colors, logos, hero images, and layout preferences
 * - Platform-specific configurations (JSONB)
 * - Template references
 * - Validation status tracking
 * - Version control for design changes
 *
 * Usage:
 *   node backend/migrations/006-create-offer-card-designs-table.js
 */

import sequelize from '../config/database.js'
import logger from '../config/logger.js'

export async function up() {
  try {
    logger.info('🎨 Creating offer_card_designs table...')

    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS offer_card_designs (
        -- Primary Key
        id SERIAL PRIMARY KEY,

        -- Relationships
        offer_id VARCHAR(50) NOT NULL,
        business_id VARCHAR(50) NOT NULL,

        -- Visual Design Assets (URLs to uploaded/processed images)
        logo_url VARCHAR(500),
        logo_google_url VARCHAR(500),  -- Circular cropped version (660x660px min)
        logo_apple_url VARCHAR(500),   -- Rectangular version (160x50px for 1x, 320x100px for 2x)
        hero_image_url VARCHAR(500),   -- Banner image (1032x336px)

        -- Color Scheme (Hex format #RRGGBB)
        background_color VARCHAR(7) NOT NULL DEFAULT '#3B82F6',
        foreground_color VARCHAR(7) NOT NULL DEFAULT '#FFFFFF',
        label_color VARCHAR(7) NOT NULL DEFAULT '#E0F2FE',

        -- Layout Preferences
        stamp_icon VARCHAR(10) DEFAULT '⭐',  -- Unicode emoji or symbol
        progress_display_style VARCHAR(20) DEFAULT 'bar' CHECK (progress_display_style IN ('bar', 'grid', 'circular')),

        -- Field Customization (JSONB for flexibility)
        field_labels JSONB DEFAULT '{}',
        -- Example: {"progress": "Stamps Collected", "reward": "Your Reward", "location": "Valid At"}

        -- Platform-Specific Overrides (JSONB for future flexibility)
        google_wallet_config JSONB DEFAULT '{}',
        -- Example: {"rewardsTier": "Gold", "programDetails": "Custom text"}

        apple_wallet_config JSONB DEFAULT '{}',
        -- Example: {"logoText": "Custom Logo Text", "relevantDate": "2025-12-31"}

        -- Template & Versioning
        template_id VARCHAR(50),  -- Reference to template used (e.g., 'coffee_classic', 'restaurant_rewards')
        is_custom BOOLEAN DEFAULT false,  -- True if user customized beyond template
        version INTEGER DEFAULT 1,  -- Increment when design changes significantly

        -- Validation & Compliance
        contrast_score DECIMAL(4,2),  -- WCAG contrast ratio (e.g., 4.50, 7.20)
        validation_status VARCHAR(20) DEFAULT 'pending' CHECK (validation_status IN ('valid', 'warning', 'error', 'pending')),
        validation_errors JSONB DEFAULT '[]',
        -- Example: [{"field": "background_color", "message": "Low contrast with foreground"}]

        -- Asset Metadata
        logo_file_size INTEGER,  -- Bytes
        hero_file_size INTEGER,  -- Bytes

        -- Timestamps
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_applied_at TIMESTAMP,  -- When this design was last used to generate a wallet pass

        -- Foreign Keys
        CONSTRAINT fk_offer_card_designs_offer
          FOREIGN KEY (offer_id)
          REFERENCES offers(public_id)
          ON DELETE CASCADE,

        CONSTRAINT fk_offer_card_designs_business
          FOREIGN KEY (business_id)
          REFERENCES businesses(public_id)
          ON DELETE CASCADE,

        -- Business Rules
        CONSTRAINT unique_offer_design
          UNIQUE (offer_id)  -- One design per offer for MVP (will relax for A/B testing in Phase 2)
      );
    `)

    logger.info('📇 Creating indexes on offer_card_designs table...')

    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_offer_card_designs_business ON offer_card_designs(business_id);
      CREATE INDEX IF NOT EXISTS idx_offer_card_designs_template ON offer_card_designs(template_id);
      CREATE INDEX IF NOT EXISTS idx_offer_card_designs_validation ON offer_card_designs(validation_status);
      CREATE INDEX IF NOT EXISTS idx_offer_card_designs_created ON offer_card_designs(created_at DESC);
    `)

    logger.info('💬 Adding column comments for documentation...')

    await sequelize.query(`
      COMMENT ON TABLE offer_card_designs IS 'Visual customization data for wallet passes (Apple & Google Wallet)';
      COMMENT ON COLUMN offer_card_designs.logo_url IS 'Original uploaded logo URL';
      COMMENT ON COLUMN offer_card_designs.logo_google_url IS 'Processed logo for Google Wallet (circular, 660x660px min)';
      COMMENT ON COLUMN offer_card_designs.logo_apple_url IS 'Processed logo for Apple Wallet (rectangular, 160x50px)';
      COMMENT ON COLUMN offer_card_designs.hero_image_url IS 'Full-width banner image (1032x336px optimal)';
      COMMENT ON COLUMN offer_card_designs.stamp_icon IS 'Emoji or symbol representing each stamp (e.g., ⭐, ☕, 🎁)';
      COMMENT ON COLUMN offer_card_designs.progress_display_style IS 'How progress is visually displayed: bar (linear), grid (stamp icons), circular (ring)';
      COMMENT ON COLUMN offer_card_designs.field_labels IS 'Custom labels for wallet pass fields (JSONB)';
      COMMENT ON COLUMN offer_card_designs.google_wallet_config IS 'Platform-specific settings for Google Wallet (JSONB)';
      COMMENT ON COLUMN offer_card_designs.apple_wallet_config IS 'Platform-specific settings for Apple Wallet (JSONB)';
      COMMENT ON COLUMN offer_card_designs.contrast_score IS 'WCAG contrast ratio between background and foreground colors';
      COMMENT ON COLUMN offer_card_designs.validation_status IS 'Design compliance status: valid, warning, error, pending';
      COMMENT ON COLUMN offer_card_designs.validation_errors IS 'List of validation errors or warnings (JSONB array)';
      COMMENT ON COLUMN offer_card_designs.last_applied_at IS 'Timestamp when this design was last used to generate a wallet pass';
    `)

    logger.info('✅ offer_card_designs table created successfully')
    logger.info('📊 Table structure:')
    logger.info('  - Design assets: logo_url, logo_google_url, logo_apple_url, hero_image_url')
    logger.info('  - Colors: background_color, foreground_color, label_color')
    logger.info('  - Layout: stamp_icon, progress_display_style')
    logger.info('  - Customization: field_labels (JSONB)')
    logger.info('  - Platform configs: google_wallet_config, apple_wallet_config (JSONB)')
    logger.info('  - Validation: contrast_score, validation_status, validation_errors')
    logger.info('  - Metadata: template_id, version, timestamps')

  } catch (error) {
    logger.error('❌ Failed to create offer_card_designs table:', error)
    throw error
  }
}

export async function down() {
  try {
    logger.info('🗑️  Dropping offer_card_designs table...')

    await sequelize.query(`
      DROP TABLE IF EXISTS offer_card_designs CASCADE;
    `)

    logger.info('✅ offer_card_designs table dropped successfully')
    logger.warn('⚠️  All card design data has been removed')

  } catch (error) {
    logger.error('❌ Failed to drop offer_card_designs table:', error)
    throw error
  }
}

// Run migration if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    try {
      await sequelize.authenticate()
      logger.info('✅ Database connection established')

      // Check if table already exists
      const [results] = await sequelize.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = 'offer_card_designs'
        );
      `)

      if (results[0].exists) {
        logger.warn('⚠️  Table offer_card_designs already exists. Skipping migration.')
        logger.info('💡 To re-run, first execute: node backend/migrations/006-create-offer-card-designs-table.js --rollback')
        await sequelize.close()
        logger.info('✅ Database connection closed')
        process.exit(0)
      }

      await up()

      logger.info('🎉 Migration completed successfully')
      logger.info('✅ You can now create card designs for your offers')
      
      await sequelize.close()
      logger.info('✅ Database connection closed')
      process.exit(0)
    } catch (error) {
      logger.error('❌ Migration failed:', error)
      await sequelize.close()
      logger.info('✅ Database connection closed')
      process.exit(1)
    }
  })()
}

export default { up, down }
