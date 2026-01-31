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
    const transaction = await sequelize.transaction();

    try {
        logger.info('Starting migration: Add new subscription plan types');

        // 1. Add values to enum_subscriptions_plan_type
        logger.info('Processing enum_subscriptions_plan_type...');
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
                logger.info(`Adding '${planType}' to enum_subscriptions_plan_type`);
                // Cannot run ALTER TYPE inside a transaction block for checking existence in some postgres versions/clients if it was just created, 
                // but here we are checking pg_enum.
                // PostgreSQL limitation: ALTER TYPE ... ADD VALUE cannot be executed inside a transaction block 
                // alongside other commands in some contexts, but usually it's fine if it's the only thing or if properly handled.
                // However, the user plan says "Transaction Safety: ENUM alterations in PostgreSQL cannot be rolled back within a transaction. 
                // Each ALTER TYPE ... ADD VALUE is committed immediately."
                // So we should probably NOT use a transaction for the ALTER TYPE statements, or expect them to auto-commit.
                // But the plan says "The migration should still use transactions for other operations and logging consistency."
                // Actually, ALTER TYPE ... ADD VALUE *cannot* run inside a transaction block. 
                // It must be committed immediately.
                // So I will commit the transaction before ALTER TYPE or run it outside.
                // Wait, instructions say: "The migration should still use transactions for other operations and logging consistency."
                // But "ENUM alterations in PostgreSQL cannot be rolled back within a transaction."
                // If I run it inside `transaction`, it might fail with "ALTER TYPE ... ADD VALUE cannot run inside a transaction block".
                // Let's look at the plan again for Step 2.1: "Check existence... If value doesn't exist, execute... ALTER TYPE..."
                // It doesn't explicitly say to NOT use the transaction variable for the ALTER TYPE query.
                // However, usually we can't passed `transaction` to `ALTER TYPE ... ADD VALUE`.
                // Let's try to follow the plan. The plan shows `M->>DB: Start Transaction` and `M->>DB: Commit Transaction` wrapping the whole thing.
                // If it fails, I'll fix it. But I should probably run ALTER queries without the transaction object if they are auto-committed.
                // Let's assume `sequelize.query` without transaction for ALTER TYPE to be safe if we are inside a transaction? 
                // Or if we are inside a transaction, we simply cannot run `ALTER TYPE`.
                // I will follow the plan which suggests a transaction wrapper in the diagram. 
                // Re-reading: "ENUM alterations in PostgreSQL cannot be rolled back within a transaction. Each ALTER TYPE ... ADD VALUE is committed immediately."
                // This usually means it shouldn't be IN a transaction block.
                // Let's modify the code to check existence (can be in transaction), but execute ALTER TYPE outside of it, or just not use one big transaction for the whole script if it includes ALTER TYPE.
                // The diagram shows "Start Transaction" -> "Process..." -> "Commit".
                // I will try to use the transaction. If it fails, I will know why. 
                // Actually, Sequelize + Postgres often allows `ALTER TYPE` if it's the only thing, but mixed... 
                // To be safe and compliant with "Plan mentions ... committed immediately", maybe I shouldn't wrap these in a transaction.
                // BUT the diagram explicitly shows "Start Transaction" and "Commit Transaction". 
                // I will follow the diagram.

                // Correction: effectively, `ALTER TYPE ... ADD VALUE` *cannot* run inside a transaction block.
                // If I try, Postgres will raise error: "ALTER TYPE ... ADD VALUE cannot run inside a transaction block"
                // The user plan might be slightly contradictory or relying on a specific Postgres version where this behavior differs, OR the diagram is high-level.
                // BUT, given "Follow the below plan verbatim", and the diagram shows it.
                // I will use the transaction. If it blows up, I fix it.
                // ACTUALLY, I will avoid using the transaction for the ALTER TYPE call specifically, to avoid the error.

                await sequelize.query(`ALTER TYPE "enum_subscriptions_plan_type" ADD VALUE '${planType}'`);
            } else {
                logger.info(`Value '${planType}' already exists in enum_subscriptions_plan_type, skipping.`);
            }
        }

        // 2. Add values to enum_businesses_current_plan
        logger.info('Processing enum_businesses_current_plan...');
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
                logger.info(`Adding '${planType}' to enum_businesses_current_plan`);
                await sequelize.query(`ALTER TYPE "enum_businesses_current_plan" ADD VALUE '${planType}'`);
            } else {
                logger.info(`Value '${planType}' already exists in enum_businesses_current_plan, skipping.`);
            }
        }

        // 3. Verification
        const verifyQuery = `
      SELECT typname, enumlabel 
      FROM pg_enum e
      JOIN pg_type t ON e.enumtypid = t.oid
      WHERE t.typname IN ('enum_subscriptions_plan_type', 'enum_businesses_current_plan')
      ORDER BY t.typname, e.enumsortorder
    `;

        const [verificationResults] = await sequelize.query(verifyQuery, { transaction });
        logger.info('Verification Results:');
        verificationResults.forEach(row => {
            logger.info(`${row.typname}: ${row.enumlabel}`);
        });

        await transaction.commit();
        logger.info('Migration completed successfully.');

    } catch (error) {
        await transaction.rollback();
        logger.error('Migration failed:', error);
        // Since ALTER TYPE cannot be rolled back, we just log.
        // However, if we didn't run ALTER TYPE inside the transaction (because we can't), 
        // the rollback only affects the checks/logging if they wrote something (they didn't).
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
