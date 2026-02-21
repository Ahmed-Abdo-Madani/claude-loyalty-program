import { sequelize } from '../config/database.js'
import AutoMigrationRunner from '../services/AutoMigrationRunner.js'

const AdminMigrationController = {
    getMigrationStatus: async (req, res) => {
        try {
            // 1. Get migration status
            const {
                status, total, applied, pending, failed,
                appliedMigrations, pendingMigrations, failedMigrations
            } = await AutoMigrationRunner.getMigrationStatus();

            // 2. Validate integrity
            const integrity = await AutoMigrationRunner.validateMigrationIntegrity();

            // 3. Live data stats
            let walletPassCount = 0;
            let recentPassCount = 0;
            let conversationsCount = 0;
            let messagesCount = 0;
            let autoEngagementCount = 0;

            try {
                const passResult = await sequelize.query(`SELECT COUNT(*) as count FROM wallet_passes`);
                walletPassCount = parseInt(passResult[0][0].count, 10);

                const recentPassResult = await sequelize.query(`SELECT COUNT(*) as count FROM wallet_passes WHERE created_at >= NOW() - INTERVAL '7 days'`);
                recentPassCount = parseInt(recentPassResult[0][0].count, 10);
            } catch (err) {
                console.warn('Could not fetch wallet passes count:', err.message);
            }

            try {
                const convResult = await sequelize.query(`SELECT COUNT(*) as count FROM conversations`);
                conversationsCount = parseInt(convResult[0][0].count, 10);
            } catch (err) {
                console.warn('Could not fetch conversations count:', err.message);
            }

            try {
                const msgResult = await sequelize.query(`SELECT COUNT(*) as count FROM messages`);
                messagesCount = parseInt(msgResult[0][0].count, 10);
            } catch (err) {
                console.warn('Could not fetch messages count:', err.message);
            }

            try {
                const aeResult = await sequelize.query(`SELECT COUNT(*) as count FROM auto_engagement_configs`);
                autoEngagementCount = parseInt(aeResult[0][0].count, 10);
            } catch (err) {
                console.warn('Could not fetch auto_engagement_configs count:', err.message);
            }

            // 4. Overall health
            let overallHealth = 'healthy';
            if (failed > 0) {
                overallHealth = 'critical';
            } else if (pending > 0 || !integrity.valid) {
                overallHealth = 'warning';
            }

            return res.json({
                success: true,
                data: {
                    migrations: { total, applied, pending, failed, appliedMigrations, pendingMigrations, failedMigrations },
                    integrity,
                    liveData: { walletPassCount, recentPassCount, conversationsCount, messagesCount, autoEngagementCount },
                    overallHealth
                }
            });
        } catch (error) {
            console.error('Error fetching migration status:', error);
            return res.status(500).json({ success: false, message: error.message });
        }
    }
};

export default AdminMigrationController;
