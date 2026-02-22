import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { apiBaseUrl } from '../config/api';

function MigrationHealthTab() {
    const { t } = useTranslation();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastChecked, setLastChecked] = useState(new Date());

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const response = await fetch(`${apiBaseUrl}/health/migrations`);
                if (!response.ok) {
                    throw new Error('Failed to fetch migration health');
                }
                const result = await response.json();

                let adminData = null;
                try {
                    const adminRes = await fetch(`${apiBaseUrl}/api/admin/migrations`, {
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('adminAccessToken')}`,
                            'X-Session-Token': localStorage.getItem('adminSessionToken'),
                            'Content-Type': 'application/json'
                        }
                    });
                    const adminJson = await adminRes.json();
                    if (adminJson.success) {
                        adminData = adminJson.data;
                    }
                } catch (adminErr) {
                    console.warn('Admin migration data not accessible:', adminErr);
                }

                setData({
                    ...result,
                    adminData
                });
                setLastChecked(new Date());
                setError(null);
            } catch (err) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        fetchStatus();
        const interval = setInterval(fetchStatus, 30000);
        return () => clearInterval(interval);
    }, []);

    if (loading && !data) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl shadow border border-red-100 dark:bg-red-900/20 dark:border-red-800/30 dark:text-red-400">
                <p className="font-bold">Error loading migration health</p>
                <p className="text-sm mt-1">{error}</p>
            </div>
        );
    }

    const { status, total, applied, pending, failed, appliedMigrations, pendingMigrations, failedMigrations, adminData } = data;

    return (
        <div className="space-y-6 animate-fade-in text-gray-800 dark:text-gray-200">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                <h2 className="text-2xl font-bold">🔄 Migration Health</h2>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                    Last checked: {lastChecked.toLocaleTimeString()}
                </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center">
                    <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">✅ Applied</div>
                    <div className="text-3xl font-bold text-green-600 dark:text-green-400">{applied || 0}</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center">
                    <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">⏳ Pending</div>
                    <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">{pending || 0}</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center">
                    <div className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">❌ Failed</div>
                    <div className="text-3xl font-bold text-red-600 dark:text-red-400">{failed || 0}</div>
                </div>
            </div>

            {failed > 0 && (
                <div className="bg-red-50 text-red-800 p-4 rounded-lg flex items-start gap-3 border border-red-200 dark:bg-red-900/20 dark:border-red-800/30 dark:text-red-400">
                    <span className="text-xl">⚠️</span>
                    <div>
                        <p className="font-bold">{failed} migration(s) failed.</p>
                        <p className="text-sm mt-1">Server may be in an inconsistent state.</p>
                    </div>
                </div>
            )}

            {pending > 0 && failed === 0 && (
                <div className="bg-amber-50 text-amber-800 p-4 rounded-lg flex items-start gap-3 border border-amber-200 dark:bg-amber-900/20 dark:border-amber-800/30 dark:text-amber-400">
                    <span className="text-xl">⏳</span>
                    <div>
                        <p className="font-bold">{pending} migration(s) are pending.</p>
                        <p className="text-sm mt-1">Run deploy to apply them.</p>
                    </div>
                </div>
            )}

            {pending === 0 && failed === 0 && (
                <div className="bg-green-50 text-green-800 p-4 rounded-lg flex items-start gap-3 border border-green-200 dark:bg-green-900/20 dark:border-green-800/30 dark:text-green-400">
                    <span className="text-xl">✅</span>
                    <div>
                        <p className="font-bold">All migrations applied.</p>
                        <p className="text-sm mt-1">Database is up to date.</p>
                    </div>
                </div>
            )}

            {/* Admin Integrity Banner */}
            {adminData?.integrity && (
                <div className={`p-4 rounded-lg flex items-start gap-3 border ${adminData.integrity.valid
                    ? 'bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800/30 dark:text-blue-400'
                    : 'bg-red-50 text-red-800 border-red-200 dark:bg-red-900/20 dark:border-red-800/30 dark:text-red-400'
                    }`}>
                    <span className="text-xl">{adminData.integrity.valid ? '🛡️' : '⚠️'}</span>
                    <div>
                        <p className="font-bold">
                            Integrity Check: {adminData.integrity.valid ? 'Valid' : 'Invalid'}
                        </p>
                        <p className="text-sm mt-1">
                            Checked {adminData.integrity.totalChecked} migrations.
                            {!adminData.integrity.valid && ` Mismatches: ${adminData.integrity.mismatches}`}
                        </p>
                    </div>
                </div>
            )}

            {/* Admin Live Data Stats */}
            {adminData?.liveData && (
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow border border-gray-100 dark:border-gray-700">
                    <h3 className="font-bold text-lg text-gray-800 dark:text-white mb-4">Live Data Stats</h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <div>
                            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Wallet Passes</div>
                            <div className="text-xl font-bold mt-1 text-gray-900 dark:text-white">{adminData.liveData.walletPassCount}</div>
                        </div>
                        <div>
                            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Recent (7d)</div>
                            <div className="text-xl font-bold mt-1 text-gray-900 dark:text-white">{adminData.liveData.recentPassCount}</div>
                        </div>
                        <div>
                            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Conversations</div>
                            <div className="text-xl font-bold mt-1 text-gray-900 dark:text-white">{adminData.liveData.conversationsCount}</div>
                        </div>
                        <div>
                            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Messages</div>
                            <div className="text-xl font-bold mt-1 text-gray-900 dark:text-white">{adminData.liveData.messagesCount}</div>
                        </div>
                        <div>
                            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Auto Engagements</div>
                            <div className="text-xl font-bold mt-1 text-gray-900 dark:text-white">{adminData.liveData.autoEngagementCount}</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Applied Migrations Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-hidden border border-gray-100 dark:border-gray-700">
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-gray-800 dark:text-white">Applied Migrations</h3>
                    <span className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs font-medium px-2.5 py-0.5 rounded-full">
                        {appliedMigrations?.length || 0} Total
                    </span>
                </div>
                <div className="overflow-x-auto max-h-96">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 relative">
                        <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Name
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Executed At
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Duration (ms)
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                            {appliedMigrations?.length > 0 ? (
                                appliedMigrations.slice().reverse().map((mig, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                                            {mig.migration_name}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {new Date(mig.applied_at).toLocaleString()}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {Math.round(mig.execution_time_ms)} ms
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="3" className="px-6 py-4 text-center text-sm text-gray-500 dark:text-gray-400">
                                        No applied migrations found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}

export default MigrationHealthTab;
