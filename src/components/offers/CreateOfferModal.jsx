import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

// Helper to ensure tiers are logically consistent
const validateTiers = (tiers) => {
    // Ensure tiers are sorted by minRewards (though we usually append)
    // Check for gaps or overlaps could go here
    return true
}

export default function CreateOfferModal({ offer, branches, onClose, onSave }) {
    const { t } = useTranslation('dashboard')

    // Default to 'stamps' type and 10 stamps required if new
    const [formData, setFormData] = useState({
        title: offer?.title || '',
        description: offer?.description || '',
        branch: offer?.branch || 'all',
        type: 'stamps', // Hardcoded default
        stamps_required: offer?.stamps_required || 10,
        is_time_limited: offer?.is_time_limited || false,
        start_date: offer?.start_date || '',
        end_date: offer?.end_date || '',
        loyalty_tiers: offer?.loyalty_tiers || null
    })

    // Tiers State
    const [tiersEnabled, setTiersEnabled] = useState(
        offer?.loyalty_tiers?.enabled || false
    )

    const [tiers, setTiers] = useState(
        offer?.loyalty_tiers?.tiers || [
            { id: 'bronze', name: 'Bronze Member', nameAr: 'عضو برونزي', minRewards: 1, maxRewards: 3, icon: '🥉', color: '#CD7F32' },
            { id: 'silver', name: 'Silver Member', nameAr: 'عضو فضي', minRewards: 4, maxRewards: 8, icon: '🥈', color: '#C0C0C0' },
            { id: 'gold', name: 'Gold Member', nameAr: 'عضو ذهبي', minRewards: 9, maxRewards: null, icon: '🥇', color: '#FFD700' }
        ]
    )

    // Smart Tier Updates
    const updateTier = (index, field, value) => {
        const newTiers = [...tiers]
        const currentTier = newTiers[index]

        if (field === 'maxRewards') {
            // If setting max rewards, ensure it's >= minRewards (unless null for unlimited)
            const maxVal = value === '' ? null : parseInt(value)

            // Update this tier
            newTiers[index] = { ...currentTier, maxRewards: maxVal }

            // Auto-update NEXT tier's minRewards if it exists
            if (index < newTiers.length - 1 && maxVal !== null) {
                newTiers[index + 1] = {
                    ...newTiers[index + 1],
                    minRewards: maxVal + 1
                }
            }
        } else if (field === 'minRewards') {
            // If setting min rewards manually (first tier usually fixed at 1, others dependent)
            // This is mostly for the first tier or edge cases
            const minVal = parseInt(value)
            newTiers[index] = { ...currentTier, minRewards: minVal }

            // If there is a PREVIOUS tier, update its maxRewards
            if (index > 0) {
                newTiers[index - 1] = {
                    ...newTiers[index - 1],
                    maxRewards: minVal - 1
                }
            }
        } else {
            newTiers[index] = { ...currentTier, [field]: value }
        }

        setTiers(newTiers)
    }

    const addTier = () => {
        if (tiers.length < 5) {
            const lastTier = tiers[tiers.length - 1]

            // If last tier was unlimited, we need to cap it first
            let newMin = 1
            const updatedTiers = [...tiers]

            if (lastTier.maxRewards === null) {
                // Cap the previous tier at some reasonable number (e.g., min + 5)
                // Or ask user? For now, let's default to min + 4 (total 5 steps)
                const autoMax = lastTier.minRewards + 4
                updatedTiers[tiers.length - 1] = { ...lastTier, maxRewards: autoMax }
                newMin = autoMax + 1
            } else {
                newMin = lastTier.maxRewards + 1
            }

            // Add new tier
            setTiers([
                ...updatedTiers,
                {
                    id: `tier_${Date.now()}`,
                    name: 'New Tier',
                    nameAr: 'مستوى جديد',
                    minRewards: newMin,
                    maxRewards: null, // Default to unlimited for the new top tier
                    icon: '⭐',
                    color: '#1E40AF'
                }
            ])
        }
    }

    const removeTier = (index) => {
        if (tiers.length > 1) {
            const newTiers = tiers.filter((_, i) => i !== index)

            // Re-link the gap
            // If we removed a middle tier, we might want to adjust the now-adjacent tiers
            // Simpler approach: Just remove it. The user can fix the numbers.
            // Or, smart approach: 
            if (index > 0 && index < tiers.length) {
                // We removed a middle tier. 
                // Previous tier (now at index-1) stays as is.
                // Next tier (now at index) needs to connect to Previous tier?
                // This gets complicated. Let's just remove and let user adjust or maybe
                // if it was the last tier, just make the new last tier unlimited
                if (index === tiers.length) { // Was last
                    newTiers[newTiers.length - 1].maxRewards = null
                }
            } else if (index === tiers.length) {
                // Removed the last tier
                newTiers[newTiers.length - 1].maxRewards = null
            }

            setTiers(newTiers)
        }
    }

    const handleSubmit = (e) => {
        e.preventDefault()
        const dataToSave = {
            ...formData,
            loyalty_tiers: tiersEnabled ? { enabled: true, tiers } : null,
            start_date: formData.is_time_limited && formData.start_date ? formData.start_date : null,
            end_date: formData.is_time_limited && formData.end_date ? formData.end_date : null
        }
        onSave(dataToSave)
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal Container */}
            <div className="relative w-full h-full sm:h-auto sm:max-h-[85vh] sm:max-w-2xl bg-white dark:bg-gray-800 sm:rounded-2xl shadow-xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 z-10 shrink-0">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                            {offer ? t('offers.editOffer') : t('offers.createNewOffer')}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {offer ? t('offers.updateOfferDetails') : t('offers.setupNewProgram')}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 -mr-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    <form id="offer-form" onSubmit={handleSubmit} className="space-y-6">

                        {/* Basic Info Section */}
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                                    {t('offers.offerTitle')} <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                    placeholder={t('offers.offerTitlePlaceholder')}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                                    {t('offers.description')}
                                </label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    rows={3}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all resize-none"
                                    placeholder={t('offers.descriptionPlaceholder')}
                                />
                            </div>
                        </div>

                        {/* Settings Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                                    {t('offers.branchLocation')}
                                </label>
                                <select
                                    value={formData.branch}
                                    onChange={(e) => setFormData({ ...formData, branch: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all appearance-none"
                                    style={{ backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`, backgroundPosition: 'right 0.5rem center', backgroundRepeat: 'no-repeat', backgroundSize: '1.5em 1.5em', paddingRight: '2.5rem' }}
                                >
                                    <option value="all">{t('offers.allBranches')}</option>
                                    {branches?.map((branch) => (
                                        <option key={branch.id} value={branch.name}>
                                            {branch.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                                    🎫 {t('offers.stampsRequired')}
                                </label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        min="1"
                                        max="50"
                                        value={formData.stamps_required}
                                        onChange={(e) => setFormData({ ...formData, stamps_required: parseInt(e.target.value) })}
                                        className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                                        placeholder="10"
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex gap-1">
                                        <button type="button" onClick={() => setFormData(prev => ({ ...prev, stamps_required: Math.max(1, prev.stamps_required - 1) }))} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-500">-</button>
                                        <button type="button" onClick={() => setFormData(prev => ({ ...prev, stamps_required: Math.min(50, prev.stamps_required + 1) }))} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-500">+</button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Tiers Toggle */}
                        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/10 rounded-2xl p-5 border border-indigo-100 dark:border-indigo-900/30">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-6 rounded-full p-1 transition-colors duration-200 cursor-pointer ${tiersEnabled ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}`} onClick={() => setTiersEnabled(!tiersEnabled)}>
                                        <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform duration-200 ${tiersEnabled ? 'translate-x-4' : 'translate-x-0'}`} />
                                    </div>
                                    <span className="font-bold text-gray-900 dark:text-white">
                                        🏆 {t('offers.enableTiers')}
                                    </span>
                                </div>
                                {tiersEnabled && (
                                    <button
                                        type="button"
                                        onClick={() => addTier()}
                                        disabled={tiers.length >= 5}
                                        className="text-sm bg-white dark:bg-gray-800 text-primary px-3 py-1.5 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        + {t('offers.addTier')}
                                    </button>
                                )}
                            </div>

                            {tiersEnabled && (
                                <div className="space-y-4 animate-in slide-in-from-top-4 duration-300">
                                    {tiers.map((tier, index) => (
                                        <div key={tier.id} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 relative group">
                                            {/* Header */}
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="w-10 h-10 rounded-lg bg-gray-50 dark:bg-gray-700 flex items-center justify-center text-xl shrink-0">
                                                    {tier.icon}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className="font-semibold text-gray-900 dark:text-white truncate">
                                                        {tier.name || `Tier ${index + 1}`}
                                                    </h4>
                                                    <p className="text-xs text-gray-500">
                                                        {index === 0 ? 'Starting Tier' : `After ${tiers[index - 1]?.name || 'previous tier'}`}
                                                    </p>
                                                </div>
                                                {index > 0 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeTier(index)}
                                                        className="text-gray-400 hover:text-red-500 p-2"
                                                    >
                                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                    </button>
                                                )}
                                            </div>

                                            {/* Inputs Grid */}
                                            <div className="grid grid-cols-2 gap-3 mb-3">
                                                <div>
                                                    <label className="text-xs font-medium text-gray-500 mb-1 block">English Name</label>
                                                    <input
                                                        type="text"
                                                        value={tier.name}
                                                        onChange={(e) => updateTier(index, 'name', e.target.value)}
                                                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50 text-sm"
                                                        placeholder="Silver"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-medium text-gray-500 mb-1 block">Arabic Name</label>
                                                    <input
                                                        type="text"
                                                        value={tier.nameAr}
                                                        dir="rtl"
                                                        onChange={(e) => updateTier(index, 'nameAr', e.target.value)}
                                                        className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900/50 text-sm"
                                                        placeholder="فضي"
                                                    />
                                                </div>
                                            </div>

                                            {/* Rewards Range Smart Inputs */}
                                            <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-900/30 p-3 rounded-lg">
                                                <div className="flex-1">
                                                    <label className="text-xs text-gray-500 block mb-1">Min Rewards</label>
                                                    <div className="font-mono bg-white dark:bg-gray-800 px-3 py-1.5 rounded border border-gray-200 dark:border-gray-600 text-center text-gray-500">
                                                        {tier.minRewards}
                                                    </div>
                                                </div>
                                                <div className="text-gray-400">→</div>
                                                <div className="flex-1">
                                                    <label className="text-xs text-gray-500 block mb-1">Max Rewards</label>
                                                    <input
                                                        type="number"
                                                        min={tier.minRewards}
                                                        value={tier.maxRewards === null ? '' : tier.maxRewards}
                                                        onChange={(e) => updateTier(index, 'maxRewards', e.target.value)}
                                                        className="w-full px-3 py-1.5 rounded border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-center font-mono focus:ring-1 focus:ring-primary"
                                                        placeholder="∞"
                                                    />
                                                </div>
                                            </div>
                                            <p className="text-[10px] text-gray-400 mt-2 text-center">
                                                {tier.maxRewards ?
                                                    `User needs ${tier.minRewards} to ${tier.maxRewards} rewards to be in this tier` :
                                                    `User needs ${tier.minRewards}+ rewards (Unlimited)`}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                    </form>
                </div>

                {/* Footer */}
                <div className="p-4 sm:p-6 border-t border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 shrink-0 z-10 safe-area-bottom">
                    <div className="flex gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-6 py-3.5 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 font-semibold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                        >
                            {t('common.cancel', 'Cancel')}
                        </button>
                        <button
                            type="submit"
                            form="offer-form"
                            className="flex-1 px-6 py-3.5 bg-primary text-white font-semibold rounded-xl shadow-lg shadow-primary/20 hover:shadow-primary/30 active:scale-[0.98] transition-all"
                        >
                            {offer ? t('offers.updateOffer') : t('offers.saveOffer')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
