import { useTranslation } from 'react-i18next'
import OfferCard from './OfferCard'

function OfferGrid({
  offers,
  loading,
  onEdit,
  onDelete,
  onToggleStatus,
  onQRCode,
  onAnalytics,
  onDesignCard
}) {
  const { t } = useTranslation('dashboard')

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">{t('offers.loading')}</p>
      </div>
    )
  }

  if (!offers || offers.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-3xl">🎁</span>
        </div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          {t('offers.noOffersFound')}
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
          {t('offers.noOffersDesc')}
        </p>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          {t('offers.tryAdjustingFilters')}
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Offers Grid - Compact spacing */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-4 sm:mb-6">
        {offers.map((offer) => (
          <OfferCard
            key={offer.public_id || offer.id}
            offer={offer}
            onEdit={onEdit}
            onDelete={onDelete}
            onToggleStatus={onToggleStatus}
            onQRCode={onQRCode}
            onAnalytics={onAnalytics}
            onDesignCard={onDesignCard}
          />
        ))}
      </div>

      {/* Grid Summary - Compact horizontal bar */}
      <div className="flex items-center justify-around gap-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg px-3 py-2.5 border border-gray-200 dark:border-gray-700">
        <div className="flex-1 text-center border-r border-gray-200 dark:border-gray-700 last:border-0">
          <div className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
            {offers.length}
          </div>
          <div className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">
            {t('offers.totalOffers')}
          </div>
        </div>
        <div className="flex-1 text-center border-r border-gray-200 dark:border-gray-700 last:border-0">
          <div className="text-lg sm:text-xl font-bold text-green-600 dark:text-green-400">
            {offers.filter(offer => offer.status === 'active').length}
          </div>
          <div className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">
            {t('offers.active')}
          </div>
        </div>
        <div className="flex-1 text-center">
          <div className="text-lg sm:text-xl font-bold text-purple-600 dark:text-purple-400">
            {offers.reduce((sum, offer) => sum + (offer.redeemed || 0), 0)}
          </div>
          <div className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">
            {t('offers.redeemed')}
          </div>
        </div>
      </div>
    </>
  )
}

export default OfferGrid