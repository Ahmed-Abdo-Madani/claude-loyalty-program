'use strict';

export const up = async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('businesses', 'menu_phone', {
        type: Sequelize.STRING,
        allowNull: true,
        comment: 'Phone number specifically for the public menu display'
    });
};

export const down = async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('businesses', 'menu_phone');
};
