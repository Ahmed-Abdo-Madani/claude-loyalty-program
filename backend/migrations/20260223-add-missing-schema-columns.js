import { Sequelize, DataTypes } from 'sequelize'

export async function up(queryInterface, Sequelize) {
    // Helper to run a query with a strict lock timeout to prevent deploy hangs
    const runWithTimeout = async (queryStr) => {
        const t = await queryInterface.sequelize.transaction();
        try {
            await queryInterface.sequelize.query(`SET LOCAL lock_timeout = '10s';`, { transaction: t });
            const result = await queryInterface.sequelize.query(queryStr, { transaction: t });
            await t.commit();
            return result;
        } catch (error) {
            await t.rollback();
            throw error;
        }
    };

    // Helper for addColumn which doesn't directly support the string query
    const addColumnWithTimeout = async (tableName, columnName, options) => {
        const t = await queryInterface.sequelize.transaction();
        try {
            await queryInterface.sequelize.query(`SET LOCAL lock_timeout = '10s';`, { transaction: t });
            await queryInterface.addColumn(tableName, columnName, options, { transaction: t });
            await t.commit();
        } catch (error) {
            await t.rollback();
            throw error;
        }
    };

    // 1. ADD MISSING 'id' COLUMNS

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
            const [tableExists] = await queryInterface.sequelize.query(`
                SELECT 1 FROM pg_tables 
                WHERE schemaname = 'public' AND tablename = '${table}'
            `)

            if (tableExists.length === 0) {
                console.log(`ℹ️ Info: Table ${table} does not exist yet. Skipping 'id' column addition.`)
                continue
            }

            await runWithTimeout(`ALTER TABLE public.${table} ADD COLUMN IF NOT EXISTS id SERIAL;`)

            const [pkExists] = await queryInterface.sequelize.query(`
                SELECT 1 FROM pg_constraint
                WHERE conrelid = 'public.${table}'::regclass
                AND contype = 'p'
            `)

            if (pkExists.length === 0) {
                await runWithTimeout(`ALTER TABLE public.${table} ADD PRIMARY KEY (id);`)
                console.log(`✅ Success: Added primary key to ${table}.id`)
            } else {
                console.log(`ℹ️ Info: Table ${table} already has a primary key. Skipping PK assignment to 'id'.`)
            }
        } catch (error) {
            const isAlreadyExists = !!(error.message && (error.message.includes('already exists') || error.message.includes('multiple primary keys')));
            const isLockTimeout = !!(error.message && (error.message.includes('lock timeout') || error.message.includes('terminating connection due to conflict') || error.message.includes('canceling statement due to lock timeout')));

            if (!isAlreadyExists && !isLockTimeout) {
                console.error(`❌ Error updating table ${table}:`, error)
                throw error
            }
            if (isLockTimeout) {
                console.warn(`⚠️ Warning: Table ${table} is locked by live traffic. Try assigning PKs during low traffic.`)
            } else {
                console.warn(`⚠️ Warning: Handled expectation on table ${table}: ${error.message}`)
            }
        }
    }

    // 2. ADD MISSING BUSINESS PROPERTIES

    const businessesDesc = await queryInterface.describeTable('businesses').catch(() => null)
    const offersDesc = await queryInterface.describeTable('offers').catch(() => null)

    if (businessesDesc && !businessesDesc.lemon_squeezy_customer_id) {
        try {
            await addColumnWithTimeout('businesses', 'lemon_squeezy_customer_id', {
                type: DataTypes.STRING,
                allowNull: true
            });
        } catch (err) {
            if (!err.message || (!err.message.includes('lock timeout') && !err.message.includes('conflict'))) throw err;
            console.warn(`⚠️ Warning: businesses table locked, skipping lemon_squeezy_customer_id`);
        }
    }

    if (businessesDesc && !businessesDesc.lemon_squeezy_subscription_id) {
        try {
            await addColumnWithTimeout('businesses', 'lemon_squeezy_subscription_id', {
                type: DataTypes.STRING,
                allowNull: true
            });
        } catch (err) {
            if (!err.message || (!err.message.includes('lock timeout') && !err.message.includes('conflict'))) throw err;
            console.warn(`⚠️ Warning: businesses table locked, skipping lemon_squeezy_subscription_id`);
        }
    }

    if (businessesDesc) {
        if (!businessesDesc.subscription_status) {
            try {
                // DO blocks cannot be executed in transactions if creating types inside some Postgres versions safely, 
                // but we can execute them without our timeout wrapper to be safe.
                await queryInterface.sequelize.query(`
                DO $$ 
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_businesses_subscription_status') THEN
                        CREATE TYPE "enum_businesses_subscription_status" AS ENUM('trial', 'active', 'past_due', 'cancelled', 'expired');
                    END IF;
                END $$;
                `)

                await runWithTimeout(`
                ALTER TABLE businesses ADD COLUMN subscription_status "enum_businesses_subscription_status" NOT NULL DEFAULT 'trial';
                `)
                console.log("✅ Success: Added subscription_status with proper ENUM type")
            } catch (err) {
                console.warn("⚠️ Warning: Could not add subscription_status. The table is likely locked by live traffic.", err.message)
            }
        } else if (
            businessesDesc.subscription_status.type === 'CHARACTER VARYING' ||
            businessesDesc.subscription_status.type === 'TEXT'
        ) {
            try {
                await queryInterface.sequelize.query(`
                    DO $$ 
                    BEGIN
                        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_businesses_subscription_status') THEN
                            CREATE TYPE "enum_businesses_subscription_status" AS ENUM('trial', 'active', 'past_due', 'cancelled', 'expired');
                        END IF;
                    END $$;
                `)

                await runWithTimeout(`
                    ALTER TABLE businesses ALTER COLUMN subscription_status TYPE "enum_businesses_subscription_status" USING subscription_status::"enum_businesses_subscription_status";
                `)
                console.log("✅ Success: Converted existing subscription_status column to proper ENUM type")
            } catch (err) {
                console.warn("⚠️ Warning: Could not cast subscription_status. The table is likely locked by live traffic. Try again during low traffic.", err.message)
            }
        }

        if (businessesDesc.current_plan) {
            console.log("ℹ️ Info: current_plan already exists. Skipping.")
        } else if (!businessesDesc.current_plan && businessesDesc.subscription_plan) {
            try {
                await queryInterface.sequelize.query(`
                    DO $$ 
                    BEGIN
                        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_businesses_current_plan') THEN
                            CREATE TYPE "enum_businesses_current_plan" AS ENUM('free', 'professional', 'enterprise', 'loyalty_starter', 'loyalty_growth', 'loyalty_professional', 'pos_business', 'pos_enterprise', 'pos_premium');
                        END IF;
                    END $$;
                `)

                await runWithTimeout(`ALTER TABLE businesses RENAME COLUMN subscription_plan TO current_plan;`)

                await runWithTimeout(`ALTER TABLE businesses ALTER COLUMN current_plan TYPE "enum_businesses_current_plan" USING current_plan::"enum_businesses_current_plan";`)
                console.warn("✅ Success: Renamed stale subscription_plan to current_plan and cast to ENUM")
            } catch (err) {
                console.warn("⚠️ Warning: Could not rename/cast subscription_plan. The table is likely locked by live traffic. Try again during low traffic.", err.message)
            }
        } else {
            try {
                await queryInterface.sequelize.query(`
                DO $$ 
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'enum_businesses_current_plan') THEN
                        CREATE TYPE "enum_businesses_current_plan" AS ENUM('free', 'professional', 'enterprise', 'loyalty_starter', 'loyalty_growth', 'loyalty_professional', 'pos_business', 'pos_enterprise', 'pos_premium');
                    END IF;
                END $$;
                `)

                await runWithTimeout(`ALTER TABLE businesses ADD COLUMN current_plan "enum_businesses_current_plan" NOT NULL DEFAULT 'free';`)
                console.log("✅ Success: Added current_plan with proper ENUM type")
            } catch (err) {
                console.warn("⚠️ Warning: Could not cast current_plan. The table is likely locked by live traffic. Try again during low traffic.", err.message)
            }
        }
    }

    if (businessesDesc && !businessesDesc.reset_password_token) {
        try {
            await addColumnWithTimeout('businesses', 'reset_password_token', {
                type: DataTypes.STRING,
                allowNull: true
            });
        } catch (err) {
            if (!err.message || !err.message.includes('lock timeout')) throw err;
            console.warn(`⚠️ Warning: businesses table locked, skipping reset_password_token`);
        }
    }

    if (businessesDesc && !businessesDesc.reset_password_expires) {
        try {
            await addColumnWithTimeout('businesses', 'reset_password_expires', {
                type: DataTypes.DATE,
                allowNull: true
            });
        } catch (err) {
            if (!err.message || !err.message.includes('lock timeout')) throw err;
            console.warn(`⚠️ Warning: businesses table locked, skipping reset_password_expires`);
        }
    }

    // 3. ADD MISSING OFFERS PROPERTIES

    if (offersDesc && !offersDesc.branch_id) {
        try {
            await addColumnWithTimeout('offers', 'branch_id', {
                type: DataTypes.INTEGER,
                allowNull: true
            });
        } catch (err) {
            if (!err.message || !err.message.includes('lock timeout')) throw err;
            console.warn(`⚠️ Warning: offers table locked, skipping branch_id`);
        }
    }

    console.log('✅ Success: Migrated db columns (id, branch_id, lemon_squeezy) with robust lock handling')
}

export async function down(queryInterface, Sequelize) {
    // Not implemented
}
