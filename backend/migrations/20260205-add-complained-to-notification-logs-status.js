
import { DataTypes } from 'sequelize'
import { sequelize } from '../config/database.js'
import logger from '../config/logger.js'

/**
 * Migration: Add 'complained' to NotificationLog status
 * Date: 2026-02-05
 * 
 * This migration handles:
 * 1. Creating the notification_logs table if it doesn't exist
 * 2. Adding 'complained' to the status ENUM if it exists
 * 3. Handling fallback VARCHAR + CHECK constraint if used
 */

export async function up(queryInterface, Sequelize) {
    const TABLE_NAME = 'notification_logs'
    const ENUM_NAME = 'enum_notification_logs_status'

    try {
        console.log(`🔧 Starting migration: Add 'complained' to ${TABLE_NAME} status...`)

        // 1. Check if table exists
        const [tableExists] = await sequelize.query(`
            SELECT EXISTS (
                SELECT FROM pg_tables 
                WHERE schemaname = 'public' 
                AND tablename = :TABLE_NAME
            );
        `, { replacements: { TABLE_NAME } })

        if (!tableExists[0].exists) {
            console.log(`➕ Table ${TABLE_NAME} not found. Creating table baseline...`)

            await queryInterface.createTable(TABLE_NAME, {
                id: {
                    type: DataTypes.INTEGER,
                    primaryKey: true,
                    autoIncrement: true
                },
                campaign_id: {
                    type: DataTypes.STRING(50),
                    allowNull: true,
                    references: { model: 'notification_campaigns', key: 'campaign_id' }
                },
                customer_id: {
                    type: DataTypes.STRING(50),
                    allowNull: false
                },
                business_id: {
                    type: DataTypes.STRING(50),
                    allowNull: false,
                    references: { model: 'businesses', key: 'public_id' }
                },
                notification_type: {
                    type: DataTypes.ENUM('campaign', 'trigger', 'manual', 'system', 'auto_reengagement'),
                    defaultValue: 'campaign'
                },
                channel: {
                    type: DataTypes.ENUM('email', 'sms', 'push', 'wallet', 'in_app'),
                    allowNull: false
                },
                subject: { type: DataTypes.STRING(500), allowNull: true },
                message_content: { type: DataTypes.TEXT, allowNull: false },
                message_template_id: { type: DataTypes.STRING(100), allowNull: true },
                recipient_email: { type: DataTypes.STRING(255), allowNull: true },
                recipient_phone: { type: DataTypes.STRING(20), allowNull: true },
                recipient_name: { type: DataTypes.STRING(255), allowNull: true },
                status: {
                    type: DataTypes.ENUM('pending', 'sent', 'delivered', 'opened', 'clicked', 'converted', 'failed', 'bounced', 'complained', 'unsubscribed'),
                    defaultValue: 'pending'
                },
                sent_at: { type: DataTypes.DATE, allowNull: true },
                delivered_at: { type: DataTypes.DATE, allowNull: true },
                opened_at: { type: DataTypes.DATE, allowNull: true },
                clicked_at: { type: DataTypes.DATE, allowNull: true },
                converted_at: { type: DataTypes.DATE, allowNull: true },
                failed_at: { type: DataTypes.DATE, allowNull: true },
                provider: { type: DataTypes.STRING(100), allowNull: true },
                external_id: { type: DataTypes.STRING(255), allowNull: true },
                external_status: { type: DataTypes.STRING(100), allowNull: true },
                error_message: { type: DataTypes.TEXT, allowNull: true },
                error_code: { type: DataTypes.STRING(50), allowNull: true },
                retry_count: { type: DataTypes.INTEGER, defaultValue: 0 },
                max_retries: { type: DataTypes.INTEGER, defaultValue: 3 },
                cost: { type: DataTypes.DECIMAL(6, 4), defaultValue: 0.0000 },
                currency: { type: DataTypes.STRING(3), defaultValue: 'SAR' },
                personalization_data: { type: DataTypes.JSON, allowNull: true },
                context_data: { type: DataTypes.JSON, allowNull: true },
                ab_test_variant: { type: DataTypes.ENUM('A', 'B'), allowNull: true },
                click_data: { type: DataTypes.JSON, allowNull: true },
                conversion_data: { type: DataTypes.JSON, allowNull: true },
                device_type: { type: DataTypes.STRING(50), allowNull: true },
                user_agent: { type: DataTypes.TEXT, allowNull: true },
                ip_address: { type: DataTypes.STRING(45), allowNull: true },
                location: { type: DataTypes.JSON, allowNull: true },
                delivery_latency: { type: DataTypes.INTEGER, allowNull: true },
                open_latency: { type: DataTypes.INTEGER, allowNull: true },
                unsubscribe_token: { type: DataTypes.STRING(255), allowNull: true, unique: true },
                gdpr_consent: { type: DataTypes.BOOLEAN, defaultValue: true },
                created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
                updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
            })

            console.log(`✅ Table ${TABLE_NAME} created successfully.`)

            // Add indexes
            console.log('📝 Adding indexes...')
            await queryInterface.addIndex(TABLE_NAME, ['campaign_id'])
            await queryInterface.addIndex(TABLE_NAME, ['customer_id'])
            await queryInterface.addIndex(TABLE_NAME, ['business_id'])
            await queryInterface.addIndex(TABLE_NAME, ['external_id'])
            await queryInterface.addIndex(TABLE_NAME, ['status'])
        } else {
            console.log(`📊 Table ${TABLE_NAME} exists. Checking status column...`)

            // Determine if status is ENUM or VARCHAR
            const [columnInfo] = await sequelize.query(`
                SELECT udt_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = :TABLE_NAME 
                AND column_name = 'status'
            `, { replacements: { TABLE_NAME } })

            const udtName = columnInfo[0].udt_name
            const dataType = columnInfo[0].data_type

            if (udtName === ENUM_NAME || dataType === 'USER-DEFINED') {
                console.log(`📝 Detected native ENUM: ${udtName}. Adding 'complained' value...`)

                // Check if value already exists in ENUM
                const [enumCheck] = await sequelize.query(`
                    SELECT 1 FROM pg_enum 
                    WHERE enumlabel = 'complained' 
                    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = :ENUM_NAME)
                `, { replacements: { ENUM_NAME } })

                if (enumCheck.length === 0) {
                    // ALTER TYPE ... ADD VALUE cannot run inside a transaction
                    await sequelize.query(`ALTER TYPE "${ENUM_NAME}" ADD VALUE 'complained'`)
                    console.log(`✅ Successfully added 'complained' to ${ENUM_NAME}`)
                } else {
                    console.log(`ℹ️  Value 'complained' already exists in ${ENUM_NAME}`)
                }
            } else if (dataType === 'character varying' || dataType === 'text') {
                console.log(`📝 Detected VARCHAR column. Updating CHECK constraint if exists...`)

                // Find check constraint name
                const [constraints] = await sequelize.query(`
                    SELECT conname 
                    FROM pg_constraint 
                    WHERE conrelid = :TABLE_NAME::regclass 
                    AND pg_get_constraintdef(oid) LIKE '%status%'
                `, { replacements: { TABLE_NAME } })

                for (const constraint of constraints) {
                    console.log(`♻️  Updating constraint ${constraint.conname}...`)
                    await sequelize.query(`ALTER TABLE ${TABLE_NAME} DROP CONSTRAINT ${constraint.conname}`)
                    await sequelize.query(`
                        ALTER TABLE ${TABLE_NAME} 
                        ADD CONSTRAINT ${constraint.conname} 
                        CHECK (status IN ('pending', 'sent', 'delivered', 'opened', 'clicked', 'converted', 'failed', 'bounced', 'complained', 'unsubscribed'))
                    `)
                }
                console.log('✅ VARCHAR constraints updated.')
            }
        }

        console.log('🎉 Migration completed successfully!')
    } catch (error) {
        console.error('❌ Migration failed:', error)
        throw error
    }
}

export async function down(queryInterface, Sequelize) {
    console.warn('⚠️  Rollback is not automatically supported for ENUM status additions.')
}

export default { up, down }
