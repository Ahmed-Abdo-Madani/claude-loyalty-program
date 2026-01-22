/**
 * Migration: Relax constraints for simplified business registration
 * 
 * Changes:
 * 1. Make branch location fields nullable (address, city, state, zip_code)
 * 2. Add is_verified and profile_completion fields to businesses
 */

export const up = async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
        // 1. Make branch location fields nullable
        console.log('🔄 Making branch columns nullable...');
        await queryInterface.sequelize.query('ALTER TABLE "branches" ALTER COLUMN "address" DROP NOT NULL', { transaction });
        await queryInterface.sequelize.query('ALTER TABLE "branches" ALTER COLUMN "city" DROP NOT NULL', { transaction });
        await queryInterface.sequelize.query('ALTER TABLE "branches" ALTER COLUMN "state" DROP NOT NULL', { transaction });
        await queryInterface.sequelize.query('ALTER TABLE "branches" ALTER COLUMN "zip_code" DROP NOT NULL', { transaction });

        // 2. Add verification and profile completion fields to businesses
        console.log('🔄 Adding verification fields to businesses...');

        // Use raw SQL to add columns if they don't exist
        await queryInterface.sequelize.query(`
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='businesses' AND column_name='is_verified') THEN
          ALTER TABLE "businesses" ADD COLUMN "is_verified" BOOLEAN DEFAULT false;
        END IF;
        
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='businesses' AND column_name='profile_completion') THEN
          ALTER TABLE "businesses" ADD COLUMN "profile_completion" INTEGER DEFAULT 0;
        END IF;
      END $$;
    `, { transaction });

        await transaction.commit();
        console.log('✅ Migration completed successfully');
    } catch (error) {
        console.error('❌ Migration error details:', error);
        await transaction.rollback();
        throw error;
    }
};

export const down = async (queryInterface, Sequelize) => {
    const transaction = await queryInterface.sequelize.transaction();

    try {
        // 1. Restore branch location fields constraints (CAUTION: This might fail if nulls exist)
        // For safety, we only drop the columns we added
        await queryInterface.removeColumn('businesses', 'is_verified', { transaction });
        await queryInterface.removeColumn('businesses', 'profile_completion', { transaction });

        // We don't restore NOT NULL constraints in down() to avoid breaking data integrity if nulls were introduced

        await transaction.commit();
    } catch (error) {
        await transaction.rollback();
        throw error;
    }
};
