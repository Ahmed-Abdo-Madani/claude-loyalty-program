import { sequelize } from '../config/database.js';
import logger from '../config/logger.js';
import { fileURLToPath } from 'url';

/**
 * Migration: Add new subscription plan types
 * Date: 2026-01-30
 * 
 * Purpose: 
 * Add new subscription plan types to support loyalty and POS tiers.
 * This migration adds values to the following ENUM types:
 * - enum_subscriptions_plan_type
 * - enum_businesses_current_plan
 * 
 * New Plan Types:
 * - loyalty_starter
 * - loyalty_growth
 * - loyalty_professional
 * - pos_business
 * - pos_enterprise
 * - pos_premium
 */

const NEW_PLAN_TYPES = [
    'loyalty_starter',
    'loyalty_growth',
    'loyalty_professional',
    'pos_business',
    'pos_enterprise',
    'pos_premium'
];

/**
 * Applies the migration
 */
const up = async () => {
    let committed = false;
    const transaction = await sequelize.transaction();

    try {
        logger.info('Starting migration: Add new subscription plan types');

        // Phase 1 — Collect (inside transaction)
        const toAddToSubscriptions = [];
        const toAddToBusinesses = [];

        logger.info('Checking for missing values in enum_subscriptions_plan_type...');
        for (const planType of NEW_PLAN_TYPES) {
            const checkQuery = `
                SELECT 1 FROM pg_enum 
                WHERE enumlabel = :planType
                AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_subscriptions_plan_type')
            `;

            const [results] = await sequelize.query(checkQuery, {
                replacements: { planType },
                transaction
            });

            if (results.length === 0) {
                toAddToSubscriptions.push(planType);
            }
        }

        logger.info('Checking for missing values in enum_businesses_current_plan...');
        for (const planType of NEW_PLAN_TYPES) {
            const checkQuery = `
                SELECT 1 FROM pg_enum 
                WHERE enumlabel = :planType
                AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'enum_businesses_current_plan')
            `;

            const [results] = await sequelize.query(checkQuery, {
                replacements: { planType },
                transaction
            });

            if (results.length === 0) {
                toAddToBusinesses.push(planType);
            }
        }

        await transaction.commit();
        committed = true;
        logger.info('Phase 1 complete: Transaction committed.');

        // Phase 2 — Alter (outside any transaction)
        for (const planType of toAddToSubscriptions) {
            logger.info(`Adding '${planType}' to enum_subscriptions_plan_type`);
            await sequelize.query(`ALTER TYPE "enum_subscriptions_plan_type" ADD VALUE '${planType}'`);
        }

        for (const planType of toAddToBusinesses) {
            logger.info(`Adding '${planType}' to enum_businesses_current_plan`);
            await sequelize.query(`ALTER TYPE "enum_businesses_current_plan" ADD VALUE '${planType}'`);
        }

        // Phase 3 — Verify (no transaction needed)
        const verifyQuery = `
            SELECT typname, enumlabel 
            FROM pg_enum e
            JOIN pg_type t ON e.enumtypid = t.oid
            WHERE t.typname IN ('enum_subscriptions_plan_type', 'enum_businesses_current_plan')
            ORDER BY t.typname, e.enumsortorder
        `;

        const [verificationResults] = await sequelize.query(verifyQuery);
        logger.info('Verification Results:');
        verificationResults.forEach(row => {
            logger.info(`${row.typname}: ${row.enumlabel}`);
        });

        logger.info('Migration completed successfully.');

    } catch (error) {
        if (!committed) {
            await transaction.rollback();
        }
        logger.error('Migration failed:', error);
        throw error;
    }
};

/**
 * Reverts the migration (Not supported safely)
 */
const down = async () => {
    logger.warn('WARNING: Removing ENUM values is not supported safely in PostgreSQL.');
    logger.warn('To rollback, you must manually:');
    logger.warn('1. Ensure no subscriptions or businesses use the new plan types');
    logger.warn('2. Create new ENUM types without new values');
    logger.warn('3. Migrate data to temporary columns');
    logger.warn('4. Drop old ENUM types');
    logger.warn('5. Recreate with old values only');
    logger.warn('6. Migrate data back');
    logger.warn('RECOMMENDATION: Database backup before attempting manual rollback.');

    // Exit gracefully
    return Promise.resolve();
};

// Execution Logic
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const args = process.argv.slice(2);
    const command = args[0] || 'up';

    (async () => {
        try {
            await sequelize.authenticate();
            logger.info('Database connection established.');

            if (command === 'down') {
                await down();
            } else {
                await up();
            }

            await sequelize.close();
            process.exit(0);
        } catch (error) {
            logger.error('Execution failed:', error);
            await sequelize.close();
            process.exit(1);
        }
    })();
}

export { up, down };
