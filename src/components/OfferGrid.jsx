import OfferCard from './OfferCard'

function OfferGrid({
  offers,
  loading,
  onEdit,
  onDelete,
  onToggleStatus,
  onQRCode,
  onAnalytics,
  onDuplicate
}) {

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">Loading offers...</p>
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
          No offers found
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
          You haven't created any loyalty offers yet. Start by creating your first offer to engage customers and build loyalty.
        </p>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Try adjusting your filters or create a new offer to get started.
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Offers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
        {offers.map((offer) => (
          <OfferCard
            key={offer.public_id || offer.id}
            offer={offer}
            onEdit={onEdit}
            onDelete={onDelete}
            onToggleStatus={onToggleStatus}
            onQRCode={onQRCode}
            onAnalytics={onAnalytics}
            onDuplicate={onDuplicate}
          />
        ))}
      </div>

      {/* Grid Summary */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 sm:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 text-center">
          <div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {offers.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Total Offers
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400 mb-1">
              {offers.filter(offer => offer.status === 'active').length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Active Offers
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mb-1">
              {offers.reduce((sum, offer) => sum + (offer.redeemed || 0), 0)}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Total Redemptions
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default OfferGrid