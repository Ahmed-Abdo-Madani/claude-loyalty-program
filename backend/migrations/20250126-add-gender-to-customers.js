import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Initialize Sequelize with DATABASE_URL if available (production), otherwise use discrete vars
const env = process.env.NODE_ENV || 'development';
let sequelize;

if (process.env.DATABASE_URL) {
  sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: console.log,
    dialectOptions: env === 'production' ? {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    } : {}
  });
} else {
  sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: console.log
  });
}

async function up() {
  const queryInterface = sequelize.getQueryInterface();
  const transaction = await sequelize.transaction();
  
  try {
    console.log('Starting migration: Add gender field to customers table...');
    
    // First, create the ENUM type manually
    await queryInterface.sequelize.query(
      `DO $$ BEGIN
        CREATE TYPE enum_customers_gender AS ENUM ('male', 'female');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;`,
      { transaction }
    );
    
    // Then add the column using the existing type
    await queryInterface.sequelize.query(
      `ALTER TABLE customers 
       ADD COLUMN gender enum_customers_gender NOT NULL DEFAULT 'male';`,
      { transaction }
    );
    
    // Add comment to the column
    await queryInterface.sequelize.query(
      `COMMENT ON COLUMN customers.gender IS 'Customer gender (male or female)';`,
      { transaction }
    );
    
    console.log('✓ Successfully added gender column to customers table');
    console.log('  - Type: ENUM(\'male\', \'female\')');
    console.log('  - NOT NULL with default value: \'male\'');
    console.log('  - All existing customers will have gender set to \'male\'');
    
    await transaction.commit();
    console.log('Migration completed successfully!');
  } catch (error) {
    await transaction.rollback();
    console.error('Migration failed:', error);
    throw error;
  }
}

async function down() {
  const queryInterface = sequelize.getQueryInterface();
  const transaction = await sequelize.transaction();
  
  try {
    console.log('Starting rollback: Remove gender field from customers table...');
    
    // Remove gender column
    await queryInterface.removeColumn('customers', 'gender', { transaction });
    
    // Drop the ENUM type to avoid orphaning it in PostgreSQL
    await queryInterface.sequelize.query(
      'DROP TYPE IF EXISTS "enum_customers_gender"',
      { transaction }
    );
    
    console.log('✓ Successfully removed gender column from customers table');
    console.log('✓ Successfully dropped enum_customers_gender type');
    
    await transaction.commit();
    console.log('Rollback completed successfully!');
  } catch (error) {
    await transaction.rollback();
    console.error('Rollback failed:', error);
    throw error;
  }
}

// Direct execution support
if (import.meta.url === `file://${process.argv[1]}`) {
  (async () => {
    try {
      console.log('Authenticating database connection...');
      await sequelize.authenticate();
      console.log('✓ Database authenticated');
      
      if (process.argv[2] === 'down') {
        await down();
      } else {
        await up();
      }
      
      await sequelize.close();
      console.log('✅ Database connection closed');
      process.exit(0);
    } catch (error) {
      console.error('Migration failed:', error);
      await sequelize.close();
      console.log('✅ Database connection closed');
      process.exit(1);
    }
  })();
}

export { up, down };
