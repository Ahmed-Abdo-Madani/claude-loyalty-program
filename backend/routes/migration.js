/**
 * Migration endpoint - Run database migrations through the API
 * This uses the existing database connection from the running server
 */

import express from 'express'
import sequelize from '../config/database.js'
import logger from '../config/logger.js'

const router = express.Router()

// Migration endpoint - only for development
router.post('/run-card-designs-migration', async (req, res) => {
    try {
        logger.info('🎨 Starting offer_card_designs table migration...')

        // Check if table already exists
        const [results] = await sequelize.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'offer_card_designs'
      );
    `)

        if (results[0].exists) {
            logger.warn('⚠️  Table offer_card_designs already exists')
            return res.json({
                success: true,
                message: 'Table already exists',
                alreadyExists: true
            })
        }

        logger.info('📝 Creating table...')

        await sequelize.query(`
      CREATE TABLE IF NOT EXISTS offer_card_designs (
        id SERIAL PRIMARY KEY,
        offer_id VARCHAR(50) NOT NULL,
        business_id VARCHAR(50) NOT NULL,
        logo_url VARCHAR(500),
        logo_google_url VARCHAR(500),
        logo_apple_url VARCHAR(500),
        hero_image_url VARCHAR(500),
        background_color VARCHAR(7) NOT NULL DEFAULT '#3B82F6',
        foreground_color VARCHAR(7) NOT NULL DEFAULT '#FFFFFF',
        label_color VARCHAR(7) NOT NULL DEFAULT '#E0F2FE',
        stamp_icon VARCHAR(10) DEFAULT '⭐',
        progress_display_style VARCHAR(20) DEFAULT 'bar' CHECK (progress_display_style IN ('bar', 'grid', 'circular')),
        field_labels JSONB DEFAULT '{}',
        google_wallet_config JSONB DEFAULT '{}',
        apple_wallet_config JSONB DEFAULT '{}',
        template_id VARCHAR(50),
        is_custom BOOLEAN DEFAULT false,
        version INTEGER DEFAULT 1,
        contrast_score DECIMAL(4,2),
        validation_status VARCHAR(20) DEFAULT 'pending' CHECK (validation_status IN ('valid', 'warning', 'error', 'pending')),
        validation_errors JSONB DEFAULT '[]',
        logo_file_size INTEGER,
        hero_file_size INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_applied_at TIMESTAMP,
        CONSTRAINT fk_offer_card_designs_offer
          FOREIGN KEY (offer_id)
          REFERENCES offers(public_id)
          ON DELETE CASCADE,
        CONSTRAINT fk_offer_card_designs_business
          FOREIGN KEY (business_id)
          REFERENCES businesses(public_id)
          ON DELETE CASCADE,
        CONSTRAINT unique_offer_design
          UNIQUE (offer_id)
      );
    `)

        logger.info('📇 Creating indexes...')

        await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_offer_card_designs_business ON offer_card_designs(business_id);
      CREATE INDEX IF NOT EXISTS idx_offer_card_designs_template ON offer_card_designs(template_id);
      CREATE INDEX IF NOT EXISTS idx_offer_card_designs_validation ON offer_card_designs(validation_status);
      CREATE INDEX IF NOT EXISTS idx_offer_card_designs_created ON offer_card_designs(created_at DESC);
    `)

        logger.info('✅ Migration completed successfully')

        res.json({
            success: true,
            message: 'offer_card_designs table created successfully'
        })
    } catch (error) {
        logger.error('❌ Migration failed:', error)
        res.status(500).json({
            success: false,
            message: 'Migration failed',
            error: error.message
        })
    }
})

export default router
