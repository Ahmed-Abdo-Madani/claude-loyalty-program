
import { DataTypes } from 'sequelize'

export async function up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction()
    try {
        console.log('🔧 Starting migration: Create missing tables...')

        // 1. Add public_id to core tables if missing
        const tables = ['businesses', 'branches', 'offers']
        for (const table of tables) {
            const tableInfo = await queryInterface.describeTable(table)
            if (!tableInfo.public_id) {
                console.log(`➕ Adding public_id to ${table}...`)
                await queryInterface.addColumn(table, 'public_id', {
                    type: DataTypes.STRING(50),
                    unique: true,
                    allowNull: true // Allow null initially
                }, { transaction })

                await queryInterface.addIndex(table, ['public_id'], {
                    transaction,
                    unique: true,
                    name: `idx_${table}_public_id`
                })
            }
        }

        // 2. Create customer_segments table
        console.log('Checking customer_segments table...')
        try {
            await queryInterface.describeTable('customer_segments')
            console.log('✅ customer_segments already exists')
        } catch (e) {
            console.log('➕ Creating customer_segments table...')
            await queryInterface.createTable('customer_segments', {
                id: {
                    type: DataTypes.INTEGER,
                    primaryKey: true,
                    autoIncrement: true
                },
                segment_id: {
                    type: DataTypes.STRING(50),
                    allowNull: false,
                    unique: true
                },
                business_id: {
                    type: DataTypes.STRING(50),
                    allowNull: false
                    // Intentionally skipping foreign key constraint to avoid issues if public_id isn't populated/unique yet
                    // But technically it should reference businesses(public_id)
                },
                name: {
                    type: DataTypes.STRING(255),
                    allowNull: false
                },
                description: {
                    type: DataTypes.TEXT,
                    allowNull: true
                },
                type: {
                    type: DataTypes.ENUM('static', 'dynamic', 'behavioral', 'demographic', 'engagement'),
                    defaultValue: 'dynamic'
                },
                is_predefined: {
                    type: DataTypes.BOOLEAN,
                    defaultValue: false
                },
                auto_update: {
                    type: DataTypes.BOOLEAN,
                    defaultValue: true
                },
                criteria: {
                    type: DataTypes.JSON,
                    allowNull: false,
                    defaultValue: {}
                },
                // Criteria fields
                age_range: DataTypes.JSON,
                gender: {
                    type: DataTypes.ENUM('male', 'female', 'other', 'any'),
                    defaultValue: 'any'
                },
                location_criteria: DataTypes.JSON,
                visit_frequency: DataTypes.JSON,
                spending_range: DataTypes.JSON,
                last_activity_days: DataTypes.INTEGER,
                engagement_score_range: DataTypes.JSON,
                loyalty_tier: {
                    type: DataTypes.ENUM('new', 'bronze', 'silver', 'gold', 'platinum'),
                    allowNull: true
                },
                communication_preferences: DataTypes.JSON,
                lifecycle_stages: DataTypes.JSON,
                customer_status: DataTypes.JSON,
                signup_date_range: DataTypes.JSON,
                birthday_month: DataTypes.INTEGER,
                offer_preferences: DataTypes.JSON,
                device_types: DataTypes.JSON,
                tags_filter: DataTypes.JSON,

                // Metrics
                customer_count: {
                    type: DataTypes.INTEGER,
                    defaultValue: 0
                },
                last_calculated_at: DataTypes.DATE,
                calculation_status: {
                    type: DataTypes.ENUM('pending', 'calculating', 'completed', 'error'),
                    defaultValue: 'pending'
                },
                campaign_usage_count: {
                    type: DataTypes.INTEGER,
                    defaultValue: 0
                },
                avg_engagement_rate: {
                    type: DataTypes.DECIMAL(5, 2),
                    defaultValue: 0.00
                },
                avg_conversion_rate: {
                    type: DataTypes.DECIMAL(5, 2),
                    defaultValue: 0.00
                },
                growth_rate: {
                    type: DataTypes.DECIMAL(5, 2),
                    defaultValue: 0.00
                },
                churn_rate: {
                    type: DataTypes.DECIMAL(5, 2),
                    defaultValue: 0.00
                },
                last_notification_sent_at: DataTypes.DATE, // Adding this here as 20250131 checks for it

                // Settings
                refresh_frequency: {
                    type: DataTypes.ENUM('real_time', 'hourly', 'daily', 'weekly', 'manual'),
                    defaultValue: 'daily'
                },
                exclude_unsubscribed: {
                    type: DataTypes.BOOLEAN,
                    defaultValue: true
                },
                exclude_inactive: {
                    type: DataTypes.BOOLEAN,
                    defaultValue: false
                },
                created_by: DataTypes.STRING(50),
                is_active: {
                    type: DataTypes.BOOLEAN,
                    defaultValue: true
                },
                tags: {
                    type: DataTypes.JSON,
                    defaultValue: []
                },
                notes: DataTypes.TEXT,

                created_at: {
                    type: DataTypes.DATE,
                    allowNull: false,
                    defaultValue: DataTypes.NOW
                },
                updated_at: {
                    type: DataTypes.DATE,
                    allowNull: false,
                    defaultValue: DataTypes.NOW
                }
            }, { transaction })

            // Add indexes
            await queryInterface.addIndex('customer_segments', ['segment_id'], { transaction, unique: true, name: 'idx_customer_segments_segment_id' })
            await queryInterface.addIndex('customer_segments', ['business_id'], { transaction, name: 'idx_customer_segments_business_id' })
        }

        // 3. Create notification_campaigns table
        console.log('Checking notification_campaigns table...')
        try {
            await queryInterface.describeTable('notification_campaigns')
            console.log('✅ notification_campaigns already exists')
        } catch (e) {
            console.log('➕ Creating notification_campaigns table...')
            await queryInterface.createTable('notification_campaigns', {
                id: {
                    type: DataTypes.INTEGER,
                    primaryKey: true,
                    autoIncrement: true
                },
                campaign_id: {
                    type: DataTypes.STRING(50),
                    allowNull: false,
                    unique: true
                },
                business_id: {
                    type: DataTypes.STRING(50),
                    allowNull: false
                },
                name: {
                    type: DataTypes.STRING(255),
                    allowNull: false
                },
                description: DataTypes.TEXT,
                type: {
                    type: DataTypes.ENUM('manual', 'automated', 'scheduled'),
                    defaultValue: 'manual'
                },
                campaign_type: DataTypes.STRING(50), // Added here as 20250131 checks for it
                channels: {
                    type: DataTypes.JSON,
                    defaultValue: ['email']
                },
                status: {
                    type: DataTypes.ENUM('draft', 'active', 'paused', 'completed', 'cancelled'),
                    defaultValue: 'draft'
                },
                target_type: {
                    type: DataTypes.ENUM('all_customers', 'segment', 'individual', 'custom_filter'),
                    defaultValue: 'all_customers'
                },
                target_segment_id: DataTypes.STRING(50),
                target_customer_ids: DataTypes.JSON,
                target_criteria: DataTypes.JSON,
                linked_offer_id: DataTypes.STRING(50), // Added here as 20250131 checks for it

                message_template: {
                    type: DataTypes.JSON,
                    defaultValue: {}
                },
                personalization_fields: DataTypes.JSON,
                send_immediately: {
                    type: DataTypes.BOOLEAN,
                    defaultValue: true
                },
                scheduled_at: DataTypes.DATE,
                timezone: {
                    type: DataTypes.STRING(50),
                    defaultValue: 'Asia/Riyadh'
                },
                trigger_type: {
                    type: DataTypes.ENUM('birthday', 'progress_milestone', 'reward_completion', 'inactivity', 'new_customer', 'custom'),
                    allowNull: true
                },
                trigger_conditions: DataTypes.JSON,
                is_ab_test: {
                    type: DataTypes.BOOLEAN,
                    defaultValue: false
                },
                ab_test_split: DataTypes.INTEGER,
                ab_test_variant: {
                    type: DataTypes.ENUM('A', 'B'),
                    allowNull: true
                },
                ab_test_parent_id: DataTypes.STRING(50),

                // Metrics
                total_recipients: { type: DataTypes.INTEGER, defaultValue: 0 },
                total_sent: { type: DataTypes.INTEGER, defaultValue: 0 },
                total_delivered: { type: DataTypes.INTEGER, defaultValue: 0 },
                total_opened: { type: DataTypes.INTEGER, defaultValue: 0 },
                total_clicked: { type: DataTypes.INTEGER, defaultValue: 0 },
                total_converted: { type: DataTypes.INTEGER, defaultValue: 0 },
                total_failed: { type: DataTypes.INTEGER, defaultValue: 0 },

                started_at: DataTypes.DATE,
                completed_at: DataTypes.DATE,

                budget_limit: DataTypes.DECIMAL(10, 2),
                cost_per_message: DataTypes.DECIMAL(6, 4),
                total_cost: DataTypes.DECIMAL(10, 2),

                frequency_cap: DataTypes.JSON,
                unsubscribe_handling: {
                    type: DataTypes.BOOLEAN,
                    defaultValue: true
                },
                created_by: DataTypes.STRING(50),
                tags: DataTypes.JSON,
                notes: DataTypes.TEXT,

                created_at: {
                    type: DataTypes.DATE,
                    allowNull: false,
                    defaultValue: DataTypes.NOW
                },
                updated_at: {
                    type: DataTypes.DATE,
                    allowNull: false,
                    defaultValue: DataTypes.NOW
                }
            }, { transaction })

            await queryInterface.addIndex('notification_campaigns', ['campaign_id'], { transaction, unique: true, name: 'idx_notification_campaigns_campaign_id' })
            await queryInterface.addIndex('notification_campaigns', ['business_id'], { transaction, name: 'idx_notification_campaigns_business_id' })
        }

        await transaction.commit()
        console.log('✅ Missing tables created successfully')
    } catch (error) {
        await transaction.rollback()
        console.error('❌ Migration failed:', error)
        throw error
    }
}

export async function down({ context: queryInterface }) {
    // Not implemented for rescue migration
}
