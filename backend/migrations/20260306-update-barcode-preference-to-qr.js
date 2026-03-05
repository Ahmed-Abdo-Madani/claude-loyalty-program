/**
 * Migration: Update barcode_preference to QR_CODE for existing offers
 */

export const up = async (queryInterface, Sequelize) => {
    console.log('🔧 Starting migration: Updating default barcode_preference to QR_CODE for existing offers...');

    // Using raw query to update existing offers
    await queryInterface.sequelize.query(`
        UPDATE offers 
        SET barcode_preference = 'QR_CODE' 
        WHERE barcode_preference = 'PDF417' OR barcode_preference IS NULL;
    `);

    console.log('✅ QR_CODE update completed.');
}

export const down = async (queryInterface, Sequelize) => {
    console.log('🔧 Starting rollback: Reverting barcode_preference to PDF417...');

    await queryInterface.sequelize.query(`
        UPDATE offers 
        SET barcode_preference = 'PDF417' 
        WHERE barcode_preference = 'QR_CODE';
    `);

    console.log('✅ Rollback to PDF417 completed.');
}
