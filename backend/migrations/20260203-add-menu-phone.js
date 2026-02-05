'use strict';

export const up = async (queryInterface, Sequelize) => {
    try {
        await queryInterface.addColumn('businesses', 'menu_phone', {
            type: Sequelize.STRING,
            allowNull: true,
            comment: 'Phone number specifically for the public menu display'
        });
    } catch (error) {
        if (error.original && error.original.code === '42701') { // duplicate_column
            console.log('⚠️ Column menu_phone already exists, skipping');
            return;
        }
        if (error.message.includes('already exists')) {
            console.log('⚠️ Column menu_phone already exists, skipping');
            return;
        }
        throw error;
    }
};

export const down = async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('businesses', 'menu_phone');
};
