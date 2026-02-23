import { fileURLToPath, pathToFileURL } from 'url';
import path from 'path';
import logger from '../config/logger.js';
import sequelize from '../config/database.js';
import AutoMigrationRunner from '../services/AutoMigrationRunner.js';
import { up as applyInitialSchema } from '../migrations/00000000-initial-schema.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    if (process.env.NODE_ENV !== 'production') {
        logger.error('❌ This script can only be run in production environment.');
        process.exit(1);
    }

    if (!process.env.DATABASE_URL) {
        logger.error('❌ DATABASE_URL environment variable is required.');
        process.exit(1);
    }

    if (!process.argv.includes('--force')) {
        logger.warn('⚠️  This script requires the --force flag to run in production.');
        process.exit(1);
    }

    try {
        logger.info('🔄 Step 1: Connecting to database...');
        await sequelize.authenticate();
        logger.info('✅ Connected');

        logger.info('🔄 Step 2: Applying initial schema...');
        await applyInitialSchema(sequelize.getQueryInterface(), sequelize.Sequelize);
        logger.info('✅ Initial schema applied');

        logger.info('🔄 Step 3: Running incremental migrations...');
        const result = await AutoMigrationRunner.runPendingMigrations({ stopOnError: true, lockTimeout: 60000 });

        if (result.failed > 0) {
            logger.error('❌ Some migrations failed:');
            if (result.results) {
                result.results
                    .filter(r => r.status === 'failed')
                    .forEach(r => {
                        logger.error(`   - ${r.migration}: ${r.error}`);
                    });
            }
            process.exit(1);
        }

        logger.info(`✅ Applied ${result.applied} migrations (Total: ${result.total})`);

    } catch (error) {
        logger.error('❌ Error recovering schema:', error);
        process.exit(1);
    } finally {
        try {
            await sequelize.close();
        } catch (closeError) {
            logger.error('⚠️ Could not close database connection:', closeError.message);
        }
    }
}

// Script timeout (10 minutes)
setTimeout(() => {
    logger.error('⏳ Script timed out after 10 minutes.');
    process.exit(1);
}, 600000); // 10 minutes

// Run if executed directly
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    main()
        .then(() => {
            process.exit(0);
        })
        .catch((error) => {
            logger.error('❌ Script failed:', error);
            process.exit(1);
        });
}

export default main;
