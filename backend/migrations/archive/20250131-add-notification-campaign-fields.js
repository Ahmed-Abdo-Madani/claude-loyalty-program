import { DataTypes } from 'sequelize'

/**
 * Migration: Add notification campaign fields
 * 
 * Adds missing columns to customer_segments and notification_campaigns tables:
 * - customer_segments.last_notification_sent_at (TIMESTAMP)
 * - notification_campaigns.campaign_type (VARCHAR with CHECK constraint)
 * - notification_campaigns.linked_offer_id (VARCHAR with FK to offers)
 * 
 * These fields exist in Sequelize models but were missing from database schema.
 */

export async function up() {
  console.log('🔧 Starting migration: Add notification campaign fields...')

  // Dynamic import for sequelize instance (standardized named import)
  const { default: sequelize } = await import('../config/database.js')
  
  let transaction

  try {
    // Start transaction
    transaction = await sequelize.transaction()
    console.log('📦 Transaction started')

    // Step 1: Check existing columns to avoid duplicate column errors
    console.log('📋 Checking for existing columns...')
    
    const [customerSegmentCols] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'customer_segments' 
      AND column_name = 'last_notification_sent_at'
    `, { transaction })

    const [campaignCols] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'notification_campaigns' 
      AND column_name IN ('campaign_type', 'linked_offer_id')
    `, { transaction })

    const existingCols = campaignCols.map(row => row.column_name)

    // Track what needs to be done
    let hasLastNotification = customerSegmentCols.length > 0
    let hasCampaignType = existingCols.includes('campaign_type')
    let hasLinkedOfferId = existingCols.includes('linked_offer_id')

    // Check if any column already exists
    if (hasLastNotification) {
      console.log('⚠️  Column last_notification_sent_at already exists in customer_segments, skipping column creation...')
    }
    if (hasCampaignType) {
      console.log('⚠️  Column campaign_type already exists in notification_campaigns, skipping column creation...')
    }
    if (hasLinkedOfferId) {
      console.log('⚠️  Column linked_offer_id already exists in notification_campaigns, skipping column creation...')
    }

    // Step 2: Add last_notification_sent_at to customer_segments table
    if (!hasLastNotification) {
      console.log('➕ Adding last_notification_sent_at column to customer_segments...')
      
      await sequelize.query(`
        ALTER TABLE customer_segments 
        ADD COLUMN last_notification_sent_at TIMESTAMP WITH TIME ZONE
      `, { transaction })

      await sequelize.query(`
        COMMENT ON COLUMN customer_segments.last_notification_sent_at 
        IS 'Timestamp of last notification sent to this segment'
      `, { transaction })

      console.log('✅ Added last_notification_sent_at column')
    }

    // Step 2b: Check and create index for last_notification_sent_at (independent of column creation)
    console.log('🔍 Checking for idx_customer_segments_last_notification index...')
    const [lastNotifIndexCheck] = await sequelize.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'customer_segments' 
      AND indexname = 'idx_customer_segments_last_notification'
    `, { transaction })

    if (lastNotifIndexCheck.length === 0) {
      console.log('➕ Creating idx_customer_segments_last_notification index...')
      await sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_customer_segments_last_notification 
        ON customer_segments (last_notification_sent_at) 
        WHERE last_notification_sent_at IS NOT NULL
      `, { transaction })
      console.log('✅ Created idx_customer_segments_last_notification index')
    } else {
      console.log('⚠️  Index idx_customer_segments_last_notification already exists, skipping...')
    }

    // Step 3: Add campaign_type to notification_campaigns table
    if (!hasCampaignType) {
      console.log('➕ Adding campaign_type column to notification_campaigns...')
      
      await sequelize.query(`
        ALTER TABLE notification_campaigns 
        ADD COLUMN campaign_type VARCHAR(50)
      `, { transaction })

      await sequelize.query(`
        COMMENT ON COLUMN notification_campaigns.campaign_type 
        IS 'Specific campaign category for promotional and marketing campaigns'
      `, { transaction })

      console.log('✅ Added campaign_type column')
    }

    // Step 3b: Drop ALL existing CHECK constraints on campaign_type, normalize data, then create new constraint
    console.log('🔍 Querying ALL CHECK constraints on campaign_type...')
    const [existingConstraints] = await sequelize.query(`
      SELECT con.conname AS constraint_name
      FROM pg_constraint con
      INNER JOIN pg_class rel ON rel.oid = con.conrelid
      INNER JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
      INNER JOIN pg_attribute attr ON attr.attnum = ANY(con.conkey) AND attr.attrelid = con.conrelid
      WHERE rel.relname = 'notification_campaigns'
      AND con.contype = 'c'
      AND attr.attname = 'campaign_type'
    `, { transaction })

    console.log(`📋 Found ${existingConstraints.length} CHECK constraint(s) on campaign_type`)

    // Drop all existing CHECK constraints on campaign_type
    if (existingConstraints.length > 0) {
      for (const constraint of existingConstraints) {
        console.log(`🗑️  Dropping legacy CHECK constraint: ${constraint.constraint_name}`)
        await sequelize.query(`
          ALTER TABLE notification_campaigns 
          DROP CONSTRAINT IF EXISTS ${constraint.constraint_name}
        `, { transaction })
        console.log(`✅ Dropped constraint: ${constraint.constraint_name}`)
      }
    } else {
      console.log('✅ No existing CHECK constraints found on campaign_type')
    }

    // Normalize legacy data: map invalid values to 'lifecycle'
    console.log('🔄 Normalizing legacy campaign_type values to lifecycle...')
    const [updateResult] = await sequelize.query(`
      UPDATE notification_campaigns 
      SET campaign_type = 'lifecycle'
      WHERE campaign_type IS NULL 
      OR campaign_type NOT IN (
        'lifecycle', 
        'promotional', 
        'transactional', 
        'new_offer_announcement', 
        'custom_promotion', 
        'seasonal_campaign'
      )
    `, { transaction })
    console.log(`✅ Normalized ${updateResult.rowCount || 0} rows to 'lifecycle'`)

    // Create the new CHECK constraint with all 6 values
    console.log('➕ Creating check_campaign_type constraint with 6 allowed values...')
    await sequelize.query(`
      ALTER TABLE notification_campaigns 
      ADD CONSTRAINT check_campaign_type 
      CHECK (campaign_type IN (
        'lifecycle', 
        'promotional', 
        'transactional', 
        'new_offer_announcement', 
        'custom_promotion', 
        'seasonal_campaign'
      ))
    `, { transaction })
    console.log('✅ Created check_campaign_type constraint with 6 values')

    // Verify constraint was created correctly
    console.log('🔍 Verifying constraint creation...')
    const [verifyConstraint] = await sequelize.query(`
      SELECT con.conname, pg_get_constraintdef(con.oid) AS constraint_def
      FROM pg_constraint con
      INNER JOIN pg_class rel ON rel.oid = con.conrelid
      INNER JOIN pg_attribute attr ON attr.attnum = ANY(con.conkey) AND attr.attrelid = con.conrelid
      WHERE rel.relname = 'notification_campaigns'
      AND con.contype = 'c'
      AND attr.attname = 'campaign_type'
      AND con.conname = 'check_campaign_type'
    `, { transaction })

    if (verifyConstraint.length === 1) {
      console.log('✅ Constraint verified:', verifyConstraint[0].constraint_def)
    } else {
      console.warn('⚠️  Warning: Could not verify constraint creation')
    }

    // Step 3c: Check and create index for campaign_type (independent of column creation)
    console.log('🔍 Checking for idx_notification_campaigns_campaign_type index...')
    const [campaignTypeIndexCheck] = await sequelize.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'notification_campaigns' 
      AND indexname = 'idx_notification_campaigns_campaign_type'
    `, { transaction })

    if (campaignTypeIndexCheck.length === 0) {
      console.log('➕ Creating idx_notification_campaigns_campaign_type index...')
      await sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_notification_campaigns_campaign_type 
        ON notification_campaigns (campaign_type) 
        WHERE campaign_type IS NOT NULL
      `, { transaction })
      console.log('✅ Created idx_notification_campaigns_campaign_type index')
    } else {
      console.log('⚠️  Index idx_notification_campaigns_campaign_type already exists, skipping...')
    }

    // Step 4: Add linked_offer_id to notification_campaigns table
    if (!hasLinkedOfferId) {
      console.log('➕ Adding linked_offer_id column to notification_campaigns...')
      
      await sequelize.query(`
        ALTER TABLE notification_campaigns 
        ADD COLUMN linked_offer_id VARCHAR(50)
      `, { transaction })

      await sequelize.query(`
        COMMENT ON COLUMN notification_campaigns.linked_offer_id 
        IS 'Optional offer ID for tracking conversions from campaign'
      `, { transaction })

      console.log('✅ Added linked_offer_id column')
    }

    // Step 4b: Check and create foreign key constraint for linked_offer_id (independent of column creation)
    console.log('🔍 Checking for fk_notification_campaigns_offer constraint...')
    const [linkedOfferFKCheck] = await sequelize.query(`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name = 'notification_campaigns' 
      AND constraint_name = 'fk_notification_campaigns_offer'
    `, { transaction })

    if (linkedOfferFKCheck.length === 0) {
      console.log('➕ Creating fk_notification_campaigns_offer constraint...')
      await sequelize.query(`
        ALTER TABLE notification_campaigns 
        ADD CONSTRAINT fk_notification_campaigns_offer 
        FOREIGN KEY (linked_offer_id) 
        REFERENCES offers(public_id) 
        ON DELETE SET NULL
      `, { transaction })
      console.log('✅ Created fk_notification_campaigns_offer constraint')
    } else {
      console.log('⚠️  Constraint fk_notification_campaigns_offer already exists, skipping...')
    }

    // Step 4c: Check and create index for linked_offer_id (independent of column creation)
    console.log('🔍 Checking for idx_notification_campaigns_linked_offer index...')
    const [linkedOfferIndexCheck] = await sequelize.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'notification_campaigns' 
      AND indexname = 'idx_notification_campaigns_linked_offer'
    `, { transaction })

    if (linkedOfferIndexCheck.length === 0) {
      console.log('➕ Creating idx_notification_campaigns_linked_offer index...')
      await sequelize.query(`
        CREATE INDEX IF NOT EXISTS idx_notification_campaigns_linked_offer 
        ON notification_campaigns (linked_offer_id) 
        WHERE linked_offer_id IS NOT NULL
      `, { transaction })
      console.log('✅ Created idx_notification_campaigns_linked_offer index')
    } else {
      console.log('⚠️  Index idx_notification_campaigns_linked_offer already exists, skipping...')
    }

    // Commit transaction
    await transaction.commit()
    console.log('✅ Transaction committed')
    console.log('🎉 Migration completed successfully!')

  } catch (error) {
    // Rollback transaction on error
    if (transaction) {
      await transaction.rollback()
      console.log('⏪ Transaction rolled back')
    }
    console.error('❌ Migration failed:', error)
    throw error
  }
}

export async function down() {
  console.log('🔧 Rolling back migration: Remove notification campaign fields...')

  const { default: sequelize } = await import('../config/database.js')
  let transaction

  try {
    // Start transaction
    transaction = await sequelize.transaction()
    console.log('📦 Transaction started')

    // Step 1: Remove indexes first
    console.log('🗑️  Removing indexes...')
    
    await sequelize.query(`
      DROP INDEX IF EXISTS idx_customer_segments_last_notification
    `, { transaction })

    await sequelize.query(`
      DROP INDEX IF EXISTS idx_notification_campaigns_campaign_type
    `, { transaction })

    await sequelize.query(`
      DROP INDEX IF EXISTS idx_notification_campaigns_linked_offer
    `, { transaction })

    console.log('✅ Indexes removed')

    // Step 2: Remove foreign key constraint
    console.log('🗑️  Removing foreign key constraint...')
    
    await sequelize.query(`
      ALTER TABLE notification_campaigns 
      DROP CONSTRAINT IF EXISTS fk_notification_campaigns_offer
    `, { transaction })

    console.log('✅ Foreign key constraint removed')

    // Step 3: Remove CHECK constraint
    console.log('🗑️  Removing CHECK constraint...')
    
    await sequelize.query(`
      ALTER TABLE notification_campaigns 
      DROP CONSTRAINT IF EXISTS check_campaign_type
    `, { transaction })

    console.log('✅ CHECK constraint removed')

    // Step 4: Remove columns
    console.log('🗑️  Removing columns...')
    
    await sequelize.query(`
      ALTER TABLE customer_segments 
      DROP COLUMN IF EXISTS last_notification_sent_at
    `, { transaction })

    await sequelize.query(`
      ALTER TABLE notification_campaigns 
      DROP COLUMN IF EXISTS campaign_type
    `, { transaction })

    await sequelize.query(`
      ALTER TABLE notification_campaigns 
      DROP COLUMN IF EXISTS linked_offer_id
    `, { transaction })

    console.log('✅ Columns removed')

    // Commit transaction
    await transaction.commit()
    console.log('✅ Transaction committed')
    console.log('🎉 Rollback completed successfully!')

  } catch (error) {
    // Rollback transaction on error
    if (transaction) {
      await transaction.rollback()
      console.log('⏪ Transaction rolled back')
    }
    console.error('❌ Rollback failed:', error)
    throw error
  }
}

export default { up, down }
