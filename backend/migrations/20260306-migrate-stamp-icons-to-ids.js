/**
 * Migration: Convert legacy emoji stamp_icons to manifest IDs
 */

export const up = async (queryInterface, Sequelize) => {
    console.log('🔧 Starting migration: converting legacy emoji stamp icons to manifest IDs...');

    // Convert ⭐ to gift-01, and everything else that has emojis or short texts 
    // to a safe manifest ID fallback since gift-01 and crown are available.
    // It's a one-time migration for legacy records.

    // gift-01 is our new universal default
    await queryInterface.sequelize.query(`
        UPDATE offer_card_designs
        SET stamp_icon = 'gift-01'
        WHERE stamp_icon = '⭐' OR stamp_icon IS NULL OR stamp_icon = '' OR length(stamp_icon) <= 2;
    `);

    console.log('✅ Conversion to manifest IDs completed.');
}

export const down = async (queryInterface, Sequelize) => {
    console.log('🔧 Starting rollback: reverting manifest IDs to ⭐ default...');

    await queryInterface.sequelize.query(`
        UPDATE offer_card_designs
        SET stamp_icon = '⭐'
        WHERE stamp_icon = 'gift-01' OR stamp_icon = 'crown' OR stamp_icon = 'balloon';
    `);

    console.log('✅ Rollback to emojis completed.');
}
