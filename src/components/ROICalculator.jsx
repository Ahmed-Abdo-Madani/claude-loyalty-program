
import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';

const ROICalculator = () => {
    const { t } = useTranslation('landing');

    const [revenue, setRevenue] = useState(50000);
    const [retention, setRetention] = useState(20);
    const [transaction, setTransaction] = useState(100);
    const [savings, setSavings] = useState(0);
    const [roi, setRoi] = useState(0);

    // Constants for calculation (assumptions)
    // Implementing a simple model:
    // Improved retention -> Increased visits -> Increased Revenue
    // 5% increase in retention can lead to 25-95% profit increase (Bain & Co)
    // Let's assume conservatively: 
    // - Loyalty program increases retention by existing retention rate * 0.2
    // - Returning customers spend 67% more
    const calculateROI = () => {
        // Simple mock calculation logic
        // Estimated Revenue Increase = Revenue * (Retention/100) * 0.15 (15% boost due to loyalty)
        const estimatedBoost = revenue * (retention / 100) * 0.15;
        const planCost = 299; // Assume pro plan cost
        const calculatedRoi = ((estimatedBoost - planCost) / planCost) * 100;

        setSavings(Math.floor(estimatedBoost));
        setRoi(Math.floor(calculatedRoi));
    };

    useEffect(() => {
        calculateROI();
    }, [revenue, retention, transaction]);

    return (
        <div className="bg-gradient-to-br from-primary/5 to-purple-500/5 dark:from-primary/10 dark:to-purple-900/20 rounded-2xl p-6 md:p-10 border border-primary/10">
            <div className="text-center mb-10">
                <h2 className="text-2xl md:text-3xl font-bold text-gray-900 dark:text-white mb-4">
                    {t('pricing.roi.title')}
                </h2>
                <p className="text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
                    {t('pricing.roi.subtitle')}
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                {/* Inputs */}
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {t('pricing.roi.inputs.revenue')} (SAR)
                        </label>
                        <input
                            type="range"
                            min="1000"
                            max="500000"
                            step="1000"
                            value={revenue}
                            onChange={(e) => setRevenue(Number(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-primary"
                        />
                        <div className="mt-2 text-primary font-bold">{revenue.toLocaleString()} SAR</div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {t('pricing.roi.inputs.retention')}
                        </label>
                        <input
                            type="range"
                            min="0"
                            max="100"
                            value={retention}
                            onChange={(e) => setRetention(Number(e.target.value))}
                            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-primary"
                        />
                        <div className="mt-2 text-primary font-bold">{retention}%</div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            {t('pricing.roi.inputs.transaction')} (SAR)
                        </label>
                        <input
                            type="number"
                            value={transaction}
                            onChange={(e) => setTransaction(Number(e.target.value))}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary dark:bg-gray-800 dark:text-white"
                        />
                    </div>
                </div>

                {/* Results */}
                <div className="flex flex-col justify-center space-y-6 bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700">
                    <div className="text-center">
                        <h3 className="text-lg font-medium text-gray-500 dark:text-gray-400 mb-2">
                            {t('pricing.roi.outputs.savings')}
                        </h3>
                        <div className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-primary to-purple-600">
                            {savings.toLocaleString()} SAR
                        </div>
                    </div>

                    <div className="h-px bg-gray-200 dark:bg-gray-700 w-full" />

                    <div className="text-center">
                        <h3 className="text-lg font-medium text-gray-500 dark:text-gray-400 mb-2">
                            {t('pricing.roi.outputs.roi')}
                        </h3>
                        <div className="text-3xl font-bold text-green-500">
                            {roi}%
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ROICalculator;
