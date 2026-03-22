export async function up(queryInterface, Sequelize) {
    // Check if table exists first
    const tableExists = await queryInterface.sequelize.query(
        "SELECT to_regclass('public.page_views');"
    );

    if (tableExists[0][0].to_regclass) {
        console.log('Page Views table already exists, skipping creation.');
        return;
    }

    await queryInterface.createTable('page_views', {
        id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER
        },
        session_id: {
            type: Sequelize.STRING(100),
            allowNull: false
        },
        page_path: {
            type: Sequelize.STRING(500),
            allowNull: false
        },
        page_name: {
            type: Sequelize.STRING(100),
            allowNull: true
        },
        referrer_path: {
            type: Sequelize.STRING(500),
            allowNull: true
        },
        user_agent: {
            type: Sequelize.STRING(500),
            allowNull: true
        },
        visited_at: {
            allowNull: false,
            type: Sequelize.DATE,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        }
    });

    // Add indexes
    await queryInterface.addIndex('page_views', ['session_id']);
    await queryInterface.addIndex('page_views', ['page_path']);
    await queryInterface.addIndex('page_views', ['visited_at']);
}

export async function down(queryInterface, Sequelize) {
    await queryInterface.dropTable('page_views');
}

export default { up, down }
