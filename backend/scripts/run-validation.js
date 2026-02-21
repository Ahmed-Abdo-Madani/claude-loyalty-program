import { sequelize } from '../config/database.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const validate = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ Database connection established');

        const sqlPath = path.join(__dirname, 'validate-schema.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // Split by DO block delimiters
        // The file uses `END $;` as a delimiter for each DO block.
        const statements = sql
            .split('END $;')
            .map(s => s.trim())
            .filter(s => s.length > 0)
            .map(s => s + 'END $;'); // Re-add the delimiter for validity

        for (const statement of statements) {
            // Check if it's a valid DO block before running
            if (statement.includes('DO $')) {
                await sequelize.query(statement);
            }
        }

        console.log(`✅ Validation script executed successfully (${statements.length} checks passed)`);

    } catch (error) {
        console.error('❌ Validation failed:', error);
        process.exit(1);
    } finally {
        await sequelize.close();
    }
};

validate();
