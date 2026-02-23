import { Sequelize, DataTypes } from 'sequelize'

export async function up(queryInterface, Sequelize) {
    const transaction = await queryInterface.sequelize.transaction()
    try {
        // 1. ADD MISSING 'id' COLUMNS (For legacy pgAdmin compatibility)

        const tables = [
            'businesses',
            'offers',
            'customers',
            'scanner_accounts',
            'notification_campaigns',
            'notification_messages',
            'platform_admins'
        ]

        for (const table of tables) {
            try {
                // Step A: Add column IF NOT EXISTS
                await queryInterface.sequelize.query(`
                    ALTER TABLE public.${table} ADD COLUMN IF NOT EXISTS id SERIAL;
                `, { transaction })

                // Step B: Check if primary key exists
                const [pkExists] = await queryInterface.sequelize.query(`
                    SELECT 1 FROM pg_constraint
                    WHERE conrelid = 'public.${table}'::regclass
                    AND contype = 'p'
                `, { transaction })

                // Step C: Add primary key only if none exists
                if (pkExists.length === 0) {
                    await queryInterface.sequelize.query(`
                        ALTER TABLE public.${table} ADD PRIMARY KEY (id);
                    `, { transaction })
                    console.log(`✅ Success: Added primary key to ${table}.id`)
                } else {
                    console.log(`ℹ️ Info: Table ${table} already has a primary key. Skipping PK assignment to 'id'.`)
                }
            } catch (error) {
                // Only re-throw if it's not a "already exists" related error
                if (!error.message.includes('already exists') && !error.message.includes('multiple primary keys')) {
                    console.error(`❌ Error updating table ${table}:`, error)
                    throw error
                }
                console.warn(`⚠️ Warning: Handled expectation on table ${table}: ${error.message}`)
            }
        }

        // 2. ADD MISSING BUSINESS PROPERTIES

        const businessesDesc = await queryInterface.describeTable('businesses').catch(() => null)
        const offersDesc = await queryInterface.describeTable('offers').catch(() => null)

        // Add lemon_squeezy fields to businesses
        if (businessesDesc && !businessesDesc.lemon_squeezy_customer_id) {
            await queryInterface.addColumn('businesses', 'lemon_squeezy_customer_id', {
                type: DataTypes.STRING,
                allowNull: true
            }, { transaction })
        }

        if (businessesDesc && !businessesDesc.lemon_squeezy_subscription_id) {
            await queryInterface.addColumn('businesses', 'lemon_squeezy_subscription_id', {
                type: DataTypes.STRING,
                allowNull: true
            }, { transaction })
        }

        if (businessesDesc) {
            // 1. Fix subscription_status
            if (!businessesDesc.subscription_status) {
                await queryInterface.sequelize.query(`
                    DO $$ 
                    BEGIN
                        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_businesses_subscription_status') THEN
                            CREATE TYPE "enum_businesses_subscription_status" AS ENUM('trial', 'active', 'past_due', 'cancelled', 'expired');
                        END IF;
                    END $$;
                `, { transaction })
                await queryInterface.sequelize.query(`
                    ALTER TABLE businesses ADD COLUMN subscription_status "enum_businesses_subscription_status" NOT NULL DEFAULT 'trial';
                `, { transaction })
                console.log("✅ Success: Added subscription_status with proper ENUM type")
            } else if (
                businessesDesc.subscription_status.type === 'CHARACTER VARYING' ||
                businessesDesc.subscription_status.type === 'TEXT'
            ) {
                await queryInterface.sequelize.query(`
                    DO $$ 
                    BEGIN
                        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_businesses_subscription_status') THEN
                            CREATE TYPE "enum_businesses_subscription_status" AS ENUM('trial', 'active', 'past_due', 'cancelled', 'expired');
                        END IF;
                    END $$;
                `, { transaction })
                await queryInterface.sequelize.query(`
                    ALTER TABLE businesses ALTER COLUMN subscription_status TYPE "enum_businesses_subscription_status" USING subscription_status::"enum_businesses_subscription_status";
                `, { transaction })
                console.log("✅ Success: Converted existing subscription_status column to proper ENUM type")
            }

            // 2. Fix current_plan / subscription_plan
            if (businessesDesc.current_plan) {
                console.log("ℹ️ Info: current_plan already exists. Skipping.")
            } else if (!businessesDesc.current_plan && businessesDesc.subscription_plan) {
                await queryInterface.sequelize.query(`
                    DO $$ 
                    BEGIN
                        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_businesses_current_plan') THEN
                            CREATE TYPE "enum_businesses_current_plan" AS ENUM('free', 'professional', 'enterprise', 'loyalty_starter', 'loyalty_growth', 'loyalty_professional', 'pos_business', 'pos_enterprise', 'pos_premium');
                        END IF;
                    END $$;
                `, { transaction })
                await queryInterface.sequelize.query(`
                    ALTER TABLE businesses RENAME COLUMN subscription_plan TO current_plan;
                `, { transaction })
                await queryInterface.sequelize.query(`
                    ALTER TABLE businesses ALTER COLUMN current_plan TYPE "enum_businesses_current_plan" USING current_plan::"enum_businesses_current_plan";
                `, { transaction })
                console.warn("⚠️ Warning: Renamed stale subscription_plan to current_plan and cast to ENUM")
            } else {
                await queryInterface.sequelize.query(`
                    DO $$ 
                    BEGIN
                        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_businesses_current_plan') THEN
                            CREATE TYPE "enum_businesses_current_plan" AS ENUM('free', 'professional', 'enterprise', 'loyalty_starter', 'loyalty_growth', 'loyalty_professional', 'pos_business', 'pos_enterprise', 'pos_premium');
                        END IF;
                    END $$;
                `, { transaction })
                await queryInterface.sequelize.query(`
                    ALTER TABLE businesses ADD COLUMN current_plan "enum_businesses_current_plan" NOT NULL DEFAULT 'free';
                `, { transaction })
                console.log("✅ Success: Added current_plan with proper ENUM type")
            }
        }

        // Ensure reset password token fields for businesses
        if (businessesDesc && !businessesDesc.reset_password_token) {
            await queryInterface.addColumn('businesses', 'reset_password_token', {
                type: DataTypes.STRING,
                allowNull: true
            }, { transaction })
        }

        if (businessesDesc && !businessesDesc.reset_password_expires) {
            await queryInterface.addColumn('businesses', 'reset_password_expires', {
                type: DataTypes.DATE,
                allowNull: true
            }, { transaction })
        }

        // 3. ADD MISSING OFFERS PROPERTIES

        // Add branch_id to offers (needed by active_offers view!)
        if (offersDesc && !offersDesc.branch_id) {
            await queryInterface.addColumn('offers', 'branch_id', {
                type: DataTypes.INTEGER,
                allowNull: true
            }, { transaction })
        }

        await transaction.commit()
        console.log('✅ Success: Appended missing db columns (id, branch_id, lemon_squeezy)')
    } catch (error) {
        await transaction.rollback()
        console.error('Migration failed:', error)
        throw error
    }
}

export async function down(queryInterface, Sequelize) {
    // Not implemented
}
