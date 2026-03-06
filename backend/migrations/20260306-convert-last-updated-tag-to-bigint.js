/**
 * Migration: Convert last_updated_tag to BIGINT for numeric querying
 */

export const up = async (queryInterface, Sequelize) => {
    console.log('🔧 Starting migration: converting last_updated_tag to BIGINT...');

    // Use NULLIF and explicit casting to safely convert existing tags or set them to null
    // We remove any non-numeric characters first to ensure safe casting for any bad data
    await queryInterface.sequelize.query(`
        ALTER TABLE wallet_passes 
        ALTER COLUMN last_updated_tag TYPE BIGINT 
        USING (NULLIF(regexp_replace(last_updated_tag::text, '\\D', '', 'g'), ''))::BIGINT;
    `);

    console.log('✅ Conversion to BIGINT completed.');
}

export const down = async (queryInterface, Sequelize) => {
    console.log('🔧 Starting rollback: reverting last_updated_tag to VARCHAR(50)...');

    // Cast back to varchar
    await queryInterface.sequelize.query(`
        ALTER TABLE wallet_passes 
        ALTER COLUMN last_updated_tag TYPE VARCHAR(50) 
        USING last_updated_tag::VARCHAR(50);
    `);

    console.log('✅ Rollback to VARCHAR(50) completed.');
}
