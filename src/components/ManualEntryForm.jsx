import React from 'react';
import { useTranslation } from 'react-i18next';

const ManualEntryForm = ({ formData, handleInputChange, businessCategories }) => {
    const { t, i18n } = useTranslation('common');

    return (
        <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-700 mt-4">
            <h4 className="text-md font-medium text-gray-900 dark:text-white">
                {t('registration.manualEntry.manualDetails')}
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t('registration.businessInfo.businessType')}
                    </label>
                    <select
                        name="business_type"
                        value={formData.business_type}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-primary focus:border-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white sm:text-sm"
                    >
                        <option value="">{t('registration.businessInfo.businessTypePlaceholder')}</option>
                        {businessCategories.map(category => (
                            <option key={category.id} value={category.id}>
                                {i18n.language === 'ar' ? category.name : category.nameEn}
                            </option>
                        ))}
                    </select>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t('registration.businessInfo.phone')}
                    </label>
                    <input
                        type="text"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-primary focus:border-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white sm:text-sm"
                        placeholder="05xxxxxxxx"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t('registration.ownerInfo.ownerName')}
                    </label>
                    <input
                        type="text"
                        name="owner_name"
                        value={formData.owner_name}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-primary focus:border-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white sm:text-sm"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        {t('registration.businessInfo.crNumber')}
                    </label>
                    <input
                        type="text"
                        name="license_number"
                        value={formData.license_number}
                        onChange={handleInputChange}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-primary focus:border-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white sm:text-sm"
                        placeholder="1010xxxxxx"
                    />
                </div>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('registration.businessInfo.businessDescription')}
                </label>
                <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-primary focus:border-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white sm:text-sm"
                />
            </div>
        </div>
    );
};

export default ManualEntryForm;
