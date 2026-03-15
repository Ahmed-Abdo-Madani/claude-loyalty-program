import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { endpoints, secureApi } from '../config/api';

function AutoEngagementSettings() {
    const { t } = useTranslation(['dashboard']);

    const [config, setConfig] = useState({
        enabled: false,
        inactivity_days: 30,
        message_template: {
            header: '',
            body: ''
        },
        channels: ['wallet']
    });

    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [runningNow, setRunningNow] = useState(false);

    // Pagination for history
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [status, setStatus] = useState(null); // to hold last_run_at, etc.

    useEffect(() => {
        fetchConfig();
        fetchHistory(1);
    }, []);

    const fetchConfig = async () => {
        try {
            const res = await secureApi.get(endpoints.autoEngagementConfig);
            const data = await res.json();
            if (data.success && data.data) {
                setConfig(prev => ({ ...prev, ...data.data }));

                setStatus({
                    last_run_at: data.data.last_run_at,
                    last_run_status: data.data.last_run_status,
                    last_run_error: data.data.last_run_error,
                    total_customers_notified: data.data.total_customers_notified || 0
                });
            }
        } catch (err) {
            if (err.status !== 404) {
                console.error('Error fetching config:', err);
            }
        } finally {
            setLoading(false);
        }
    };

    const fetchHistory = async (page) => {
        try {
            const res = await secureApi.get(`${endpoints.autoEngagementHistory}?page=${page}&limit=10`);
            const data = await res.json();
            if (data.success) {
                setHistory(data.data?.data || []);
                setTotalPages(data.data?.total_pages || 1);
                setCurrentPage(page);
            }
        } catch (err) {
            console.error('Error fetching history:', err);
        }
    };

    const handleSave = async () => {
        if (!config.channels || config.channels.length === 0) {
            setError(t('dashboard:customers.autoEngagement.channelRequiredError', 'At least one channel must be selected.'));
            return;
        }

        setSaving(true);
        setError('');
        setSuccessMessage('');
        try {
            const res = await secureApi.post(endpoints.autoEngagementConfig, config);
            const data = await res.json();
            if (data.success) {
                setSuccessMessage(t('dashboard:customers.autoEngagement.saveSuccess', 'Configuration saved successfully.'));
                fetchConfig();
            } else {
                throw new Error(data.message || 'Failed to save configuration');
            }
        } catch (err) {
            setError(err.message || 'Error saving configuration');
        } finally {
            setSaving(false);
        }
    };

    const handleRunNow = async () => {
        setRunningNow(true);
        setError('');
        setSuccessMessage('');
        try {
            const res = await secureApi.post(endpoints.autoEngagementRun, {});
            const data = await res.json();
            if (data.success) {
                setSuccessMessage(t('dashboard:customers.autoEngagement.runNowSuccess', { count: data.data.notified_count, defaultValue: `Manual check complete. Notified ${data.data.notified_count} customers.` }));
                fetchConfig();
                fetchHistory(1);
            } else {
                throw new Error(data.message || t('dashboard:customers.autoEngagement.runNowFailed', 'Failed to run auto-engagement'));
            }
        } catch (err) {
            setError(err.message || t('dashboard:customers.autoEngagement.runNowError', 'Error running auto-engagement manually'));
        } finally {
            setRunningNow(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Never';
        return new Date(dateString).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getStatusBadge = (runStatus) => {
        switch (runStatus) {
            case 'success':
            case 'completed': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">{t('dashboard:customers.autoEngagement.statusSuccess', 'Success')}</span>;
            case 'failed': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400">{t('dashboard:customers.autoEngagement.statusFailed', 'Failed')}</span>;
            case 'running': return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">{t('dashboard:customers.autoEngagement.statusRunning', 'Running')}</span>;
            default: return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">{t('dashboard:customers.autoEngagement.statusPending', 'Pending')}</span>;
        }
    };

    if (loading) {
        return (
            <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-gray-600 dark:text-gray-400">{t('dashboard:loading', 'Loading...')}</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 flex-1 w-full max-w-full">
            {/* Configuration Form Card */}
            <div className="compact-card mobile-compact p-4 sm:p-6 w-full">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-2">
                    🤖 {t('dashboard:customers.autoEngagement.title', 'Auto Re-engagement')}
                </h3>

                {error && (
                    <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-800 dark:text-red-300">
                        {error}
                    </div>
                )}

                {successMessage && (
                    <div className="mb-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 text-green-800 dark:text-green-300">
                        {successMessage}
                    </div>
                )}

                <div className="space-y-6">
                    {/* Enable Toggle */}
                    <div className="flex items-center justify-between">
                        <div>
                            <label className="text-sm font-medium text-gray-900 dark:text-white">
                                {t('dashboard:customers.autoEngagement.enableToggle', 'Enable auto re-engagement')}
                            </label>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                                {t('dashboard:customers.autoEngagement.enableDesc', 'Automatically send notifications to inactive customers.')}
                            </p>
                        </div>
                        <button
                            type="button"
                            className={`${config.enabled ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
                                } relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2`}
                            onClick={() => setConfig({ ...config, enabled: !config.enabled })}
                        >
                            <span className="sr-only">Toggle auto engagement</span>
                            <span
                                className={`${config.enabled ? 'translate-x-5' : 'translate-x-0'
                                    } pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out`}
                            />
                        </button>
                    </div>

                    {/* Inactivity Threshold */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {t('dashboard:customers.autoEngagement.inactivityThreshold', 'Inactivity threshold (days)')}
                        </label>
                        <input
                            type="number"
                            min="1"
                            max="365"
                            value={config.inactivity_days}
                            onChange={(e) => setConfig({ ...config, inactivity_days: parseInt(e.target.value, 10) || 1 })}
                            className="w-full sm:w-1/3 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary touch-target"
                        />
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {t('dashboard:customers.autoEngagement.inactivityHelp', 'Number of days since last visit (1-365)')}
                        </p>
                    </div>

                    {/* Message Template */}
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                        <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">
                            {t('dashboard:customers.autoEngagement.messageTemplate', 'Message Template')}
                        </h4>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {t('dashboard:customers.autoEngagement.templateHeader', 'Header')}
                                </label>
                                <input
                                    type="text"
                                    value={config.message_template.header}
                                    onChange={(e) => setConfig({
                                        ...config,
                                        message_template: { ...config.message_template, header: e.target.value }
                                    })}
                                    placeholder={t('dashboard:customers.autoEngagement.templateHeaderPlaceholder', 'e.g. We miss you!')}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent touch-target"
                                    maxLength={64}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                    {t('dashboard:customers.autoEngagement.templateBody', 'Body')}
                                </label>
                                <textarea
                                    value={config.message_template.body}
                                    onChange={(e) => setConfig({
                                        ...config,
                                        message_template: { ...config.message_template, body: e.target.value }
                                    })}
                                    placeholder={t('dashboard:customers.autoEngagement.templateBodyPlaceholder', 'e.g. Come back and enjoy a special treat... (Optional)')}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                                    maxLength={256}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Channels */}
                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                        <h4 className="text-md font-medium text-gray-900 dark:text-white mb-3">
                            {t('dashboard:customers.autoEngagement.channels', 'Channels')}
                        </h4>

                        <div className="flex flex-wrap gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={config.channels.includes('wallet')}
                                    onChange={(e) => {
                                        let newChannels = [...config.channels];
                                        if (e.target.checked) {
                                            if (!newChannels.includes('wallet')) newChannels.push('wallet');
                                        } else {
                                            newChannels = newChannels.filter(c => c !== 'wallet');
                                        }

                                        // Enforce at least one channel
                                        if (newChannels.length === 0) {
                                            setError('At least one channel must be selected.');
                                            return;
                                        }

                                        setError(''); // Clear error if valid
                                        setConfig({ ...config, channels: newChannels });
                                    }}
                                    className="rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                <span className="text-sm text-gray-900 dark:text-white">✅ Wallet</span>
                            </label>

                            <label className="flex items-center gap-2 cursor-not-allowed opacity-50" title="Coming soon">
                                <input type="checkbox" disabled className="rounded border-gray-300" />
                                <span className="text-sm text-gray-900 dark:text-white">☐ Email</span>
                            </label>

                            <label className="flex items-center gap-2 cursor-not-allowed opacity-50" title="Coming soon">
                                <input type="checkbox" disabled className="rounded border-gray-300" />
                                <span className="text-sm text-gray-900 dark:text-white">☐ SMS</span>
                            </label>

                            <label className="flex items-center gap-2 cursor-not-allowed opacity-50" title="Coming soon">
                                <input type="checkbox" disabled className="rounded border-gray-300" />
                                <span className="text-sm text-gray-900 dark:text-white">☐ Push</span>
                            </label>
                        </div>
                    </div>

                    {/* Save Action */}
                    <div className="pt-6 flex justify-end">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-6 py-2 min-h-[44px] bg-primary hover:bg-primary/90 active:scale-95 disabled:opacity-50 text-white rounded-lg font-medium transition-all w-full sm:w-auto text-center"
                        >
                            {saving ? t('dashboard:customers.autoEngagement.saving', 'Saving...') : t('dashboard:customers.autoEngagement.saveButton', 'Save Configuration')}
                        </button>
                    </div>
                </div>
            </div>

            {/* Status Card */}
            {status && (
                <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 w-full overflow-hidden">
                            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                                {t('dashboard:customers.autoEngagement.lastRunAt', 'Last Run')}
                            </h4>
                            <div className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                                {formatDate(status.last_run_at)}
                            </div>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 w-full overflow-hidden">
                            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                                {t('dashboard:customers.autoEngagement.lastRunStatus', 'Status')}
                            </h4>
                            <div className="mt-1">
                                {getStatusBadge(status.last_run_status)}
                            </div>
                            {status.last_run_error && (
                                <p className="text-xs text-red-500 mt-1 truncate" title={status.last_run_error}>
                                    {status.last_run_error}
                                </p>
                            )}
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 w-full overflow-hidden">
                            <h4 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                                {t('dashboard:customers.autoEngagement.totalNotified', 'Total Notified')}
                            </h4>
                            <div className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                                {status.total_customers_notified}
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end items-center bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                        {config.enabled ? (
                            <button
                                onClick={handleRunNow}
                                disabled={runningNow}
                                className="text-sm px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 dark:hover:bg-blue-900/60 rounded flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
                            >
                                {runningNow ? t('dashboard:customers.autoEngagement.runningNow', 'Running...') : t('dashboard:customers.autoEngagement.runNow', '🚀 Run Now')}
                            </button>
                        ) : (
                            <p className="text-sm text-gray-500">{t('dashboard:customers.autoEngagement.enableToRun', 'Enable to run manually')}</p>
                        )}
                    </div>
                </div>
            )}

            {/* History Table */}
            <div className="compact-card mobile-compact overflow-hidden w-full">
                <div className="px-4 py-5 border-b border-gray-200 dark:border-gray-700">
                    <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">
                        {t('dashboard:customers.autoEngagement.historyTitle', 'Notification History')}
                    </h3>
                </div>

                <div className="overflow-x-auto w-full">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                                    {t('dashboard:customers.autoEngagement.tableDate', 'Date Sent')}
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                                    {t('dashboard:customers.autoEngagement.tableCustomer', 'Customer')}
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                                    {t('dashboard:customers.autoEngagement.tableChannel', 'Channel')}
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                                    {t('dashboard:customers.autoEngagement.tableStatus', 'Status')}
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider whitespace-nowrap">
                                    {t('dashboard:customers.autoEngagement.tableMessage', 'Message')}
                                </th>
                            </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                            {history.length > 0 ? (
                                history.map((log) => (
                                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                            {formatDate(log.sent_at)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            {log.customer?.name || log.customer?.phone || (log.customer_id ? `${log.customer_id.substring(0, 8)}...` : '-')}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                            <span className="capitalize">{log.channel}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${log.status === 'delivered' || log.status === 'sent' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                                                : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                                                }`}>
                                                {log.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 truncate max-w-[200px]">
                                            {log.subject || log.message_content || '-'}
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                                        {t('dashboard:customers.autoEngagement.noHistory', 'No notifications have been sent yet.')}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="bg-white dark:bg-gray-800 px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between sm:px-6">
                        <div className="flex-1 flex justify-between sm:justify-end gap-2">
                            <button
                                onClick={() => fetchHistory(currentPage - 1)}
                                disabled={currentPage === 1}
                                className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {t('common:previous', 'Previous')}
                            </button>
                            <button
                                onClick={() => fetchHistory(currentPage + 1)}
                                disabled={currentPage === totalPages}
                                className="relative inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 text-sm font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {t('common:next', 'Next')}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default AutoEngagementSettings;
