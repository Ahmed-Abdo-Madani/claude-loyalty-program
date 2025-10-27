import BranchCard from './BranchCard'

function BranchGrid({
  branches,
  loading,
  onEdit,
  onDelete,
  onToggleStatus,
  onDuplicate,
  onAnalytics,
  onManageOffers
}) {
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">Loading branches...</p>
      </div>
    )
  }

  if (!branches || branches.length === 0) {
    return (
      <div className="text-center py-16">
        <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="text-3xl">🏪</span>
        </div>
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
          No branches found
        </h3>
        <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
          You haven't created any branch locations yet. Start by adding your first business location to manage offers and track performance.
        </p>
        <div className="text-sm text-gray-500 dark:text-gray-400">
          Try adjusting your filters or add a new branch to get started.
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Branches Grid - Mobile-first: Single column → 2 cols → 3 cols */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
        {branches.map((branch) => (
          <BranchCard
            key={branch.public_id || branch.id}
            branch={branch}
            onEdit={onEdit}
            onDelete={onDelete}
            onToggleStatus={onToggleStatus}
            onDuplicate={onDuplicate}
            onAnalytics={onAnalytics}
            onManageOffers={onManageOffers}
          />
        ))}
      </div>

      {/* Grid Summary */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 sm:p-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 sm:gap-6 text-center">
          <div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {branches.length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Total Branches
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400 mb-1">
              {branches.filter(branch => branch.status === 'active').length}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Active Locations
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400 mb-1">
              {branches.reduce((sum, branch) => sum + (branch.customers || 0), 0)}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Total Customers
            </div>
          </div>
          <div>
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400 mb-1">
              {formatCurrency(branches.reduce((sum, branch) => sum + (branch.monthlyRevenue || 0), 0))}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Monthly Revenue
            </div>
          </div>
        </div>
      </div>
    </>
  )
}

export default BranchGrid