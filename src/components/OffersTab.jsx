import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import QRCodeModal from './QRCodeModal'
import OfferGrid from './OfferGrid'

import { endpoints, secureApi } from '../config/api'
import { CardDesignProvider } from '../contexts/CardDesignContext'
import SimpleLoyaltyCardDesigner from './cardDesign/SimpleLoyaltyCardDesigner'
import OfferAnalyticsModal from './OfferAnalyticsModal'
import PlanLimitModal from './PlanLimitModal'
import UsageIndicator from './UsageIndicator'
import CreateOfferModal from './offers/CreateOfferModal'

function OffersTab({ analytics, demoData, onAddOffer, user }) {
  // ... existing code ...

  const { t } = useTranslation('dashboard')
  const [offers, setOffers] = useState(demoData || [])
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(!demoData)
  const [error, setError] = useState('')

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null)
  const [showEditModal, setShowEditModal] = useState(null)
  const [showQRModal, setShowQRModal] = useState(null)
  const [showCardDesigner, setShowCardDesigner] = useState(null)
  const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false)
  const [selectedOfferForAnalytics, setSelectedOfferForAnalytics] = useState(null)

  // Plan limit modal state
  const [showPlanLimitModal, setShowPlanLimitModal] = useState(false)
  const [planLimitInfo, setPlanLimitInfo] = useState(null)

  // Filter states - use internal constants, not translated strings
  const [statusFilter, setStatusFilter] = useState('all')
  const [branchFilter, setBranchFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')
  const [filtersExpanded, setFiltersExpanded] = useState(() => {
    const saved = localStorage.getItem('offersFiltersExpanded')
    return saved ? JSON.parse(saved) : false
  })

  // Persist filters expanded state
  const toggleFiltersExpanded = () => {
    setFiltersExpanded(prev => {
      const newValue = !prev
      localStorage.setItem('offersFiltersExpanded', JSON.stringify(newValue))
      return newValue
    })
  }

  // Load offers and branches on component mount
  useEffect(() => {
    if (!demoData) {
      loadOffers()
      loadBranches()
    } else {
      // For demo mode, we might want dummy branches too if filtered
      setBranches([{ id: 'demo-branch', name: 'Main Branch (Demo)' }])
    }
  }, [demoData])

  const loadOffers = async () => {
    try {
      setLoading(true)
      setError('')

      console.log('🔒 Loading offers with secure authentication...')
      const response = await secureApi.get(endpoints.myOffers)
      const data = await response.json()

      if (data.success) {
        setOffers(data.data || [])
        console.log('🔒 Offers loaded successfully:', data.data?.length || 0)
      } else {
        throw new Error(data.message || 'Failed to load offers')
      }
    } catch (err) {
      setError(err.message || 'Failed to load offers')
      console.error('Error loading offers:', err)
    } finally {
      setLoading(false)
    }
  }

  const loadBranches = async () => {
    try {
      console.log('🔒 Loading branches with secure authentication...')
      const response = await secureApi.get(endpoints.myBranches)
      const data = await response.json()

      if (data.success) {
        setBranches(data.data || [])
        console.log('🔒 Branches loaded successfully:', data.data?.length || 0)
      }
    } catch (err) {
      console.error('Error loading branches:', err)
      // Don't set error here as it's secondary data
    }
  }


  const toggleOfferStatus = async (secureOfferId, currentStatus) => {
    try {
      console.log('🔒 Toggling offer status:', { secureOfferId, currentStatus })
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active'

      const response = await secureApi.patch(`${endpoints.myOffers}/${secureOfferId}/status`, {
        status: newStatus
      })
      const data = await response.json()

      if (data.success) {
        setOffers(offers.map(offer =>
          offer.public_id === secureOfferId
            ? { ...offer, status: newStatus }
            : offer
        ))
        console.log('🔒 Offer status updated successfully')
      } else {
        alert(data.message || t('offers.statusUpdateFailed'))
      }
    } catch (err) {
      console.error('Error updating offer status:', err)
      alert(err.message || t('offers.statusUpdateFailed'))
    }
  }

  const deleteOffer = async (secureOfferId) => {
    try {
      console.log('🔒 Deleting offer:', secureOfferId)
      const response = await secureApi.delete(`${endpoints.myOffers}/${secureOfferId}`)
      const data = await response.json()

      if (data.success) {
        setShowDeleteConfirm(null)
        await loadOffers() // Reload to get updated data
        console.log('🔒 Offer deleted successfully')
      } else {
        throw new Error(data.message || t('offers.deleteFailed'))
      }
    } catch (err) {
      setError(err.message || t('offers.deleteFailed'))
      console.error('Error deleting offer:', err)
      setShowDeleteConfirm(null)
    }
  }

  const duplicateOffer = async (secureOfferId) => {
    try {
      console.log('🔒 Duplicating offer:', secureOfferId)
      const offer = offers.find(o => o.public_id === secureOfferId)
      if (offer) {
        const newOffer = {
          ...offer,
          title: `${offer.title} (Copy)`,
          status: 'active' // Duplicated offers should be active by default
        }
        delete newOffer.public_id // Remove ID so API creates a new one
        delete newOffer.id // Remove any legacy ID

        const response = await secureApi.post(endpoints.myOffers, newOffer)
        const data = await response.json()

        if (data.success) {
          await loadOffers() // Reload to get updated data
          console.log('🔒 Offer duplicated successfully')
        } else {
          throw new Error(data.message || 'Failed to duplicate offer')
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to duplicate offer')
      console.error('Error duplicating offer:', err)
    }
  }

  const handleAnalytics = (offer) => {
    console.log('📊 Opening analytics for offer:', offer.public_id)
    setSelectedOfferForAnalytics(offer)
    setAnalyticsModalOpen(true)
  }

  // Filter offers based on selected filters - use constants for comparison
  const filteredOffers = offers.filter(offer => {
    const statusMatch = statusFilter === 'all' || offer.status === statusFilter
    const branchMatch = branchFilter === 'all' || offer.branch === branchFilter
    const typeMatch = typeFilter === 'all' || offer.type === typeFilter

    return statusMatch && branchMatch && typeMatch
  })

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-gray-600">{t('offers.loading')}</p>
      </div>
    )
  }

  return (
    <div className="compact-spacing">


      {/* Header Section - Mobile-first: Stack vertically */}
      <div className="flex flex-col space-y-3 compact-header">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">{t('offers.activeOffers')}</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{t('offers.managePrograms')}</p>
        </div>
        <button
          onClick={() => onAddOffer ? onAddOffer() : setShowCreateModal(true)}
          className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl font-medium transition-colors duration-200 flex items-center justify-center gap-2 shadow-lg min-h-[44px] active:scale-95"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span>{t('offers.createOffer')}</span>
        </button>
      </div>

      {/* Plan Usage Indicator */}
      {analytics?.planLimits && analytics.planLimits.offers !== Infinity && (
        <UsageIndicator
          label={t('dashboard:usage.offers', 'Offers')}
          current={analytics.totalOffers || offers.length}
          max={analytics.planLimits.offers}
          type="offers"
        />
      )}

      {/* Error Display */}
      {error && (
        <div className="mb-4 sm:mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <span className="text-red-600 mr-2">⚠️</span>
            <span className="text-red-800">{error}</span>
            <button
              onClick={() => setError('')}
              className="ml-auto text-red-600 hover:text-red-800"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Collapsible Filters */}
      <div className="mb-4">
        {/* Filter Toggle Button with Quick Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={toggleFiltersExpanded}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors min-h-[44px]"
          >
            <span>🔍</span>
            <span className="font-medium text-gray-900 dark:text-white">{t('offers.filters')}</span>
            {(statusFilter !== 'all' || branchFilter !== 'all' || typeFilter !== 'all') && (
              <span className="bg-primary text-white text-xs px-2 py-0.5 rounded-full">
                {[statusFilter !== 'all', branchFilter !== 'all', typeFilter !== 'all'].filter(Boolean).length}
              </span>
            )}
            <svg
              className={`w-4 h-4 transition-transform ${filtersExpanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {/* Quick Filter Pills */}
          <button
            onClick={() => { setStatusFilter('all'); setBranchFilter('all'); setTypeFilter('all'); }}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${statusFilter === 'all' && branchFilter === 'all' && typeFilter === 'all'
              ? 'bg-primary text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
          >
            {t('offers.all')}
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${statusFilter === 'active'
              ? 'bg-green-500 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
          >
            {t('offers.active')}
          </button>
          <button
            onClick={() => setStatusFilter('inactive')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${statusFilter === 'inactive'
              ? 'bg-yellow-500 text-white'
              : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
          >
            {t('offers.inactive')}
          </button>
        </div>

        {/* Expandable Filter Panel */}
        <div className={`filter-transition ${filtersExpanded ? 'filter-expanded mt-3' : 'filter-collapsed'}`}>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value)
                    if (window.innerWidth < 640) {
                      setFiltersExpanded(false)
                    }
                  }}
                  className="w-full px-3 py-2 text-sm min-h-[44px] border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="all">{t('offers.allStatus')}</option>
                  <option value="active">{t('offers.active')}</option>
                  <option value="inactive">{t('offers.inactive')}</option>
                  <option value="scheduled">{t('offers.scheduled')}</option>
                  <option value="expired">{t('offers.expired')}</option>
                </select>
              </div>
              <div>
                <select
                  value={branchFilter}
                  onChange={(e) => {
                    setBranchFilter(e.target.value)
                    if (window.innerWidth < 640) {
                      setFiltersExpanded(false)
                    }
                  }}
                  className="w-full px-3 py-2 text-sm min-h-[44px] border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="all">{t('offers.allBranches')}</option>
                  {branches?.map((branch) => (
                    <option key={branch.public_id || branch.id} value={branch.name}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <select
                  value={typeFilter}
                  onChange={(e) => {
                    setTypeFilter(e.target.value)
                    if (window.innerWidth < 640) {
                      setFiltersExpanded(false)
                    }
                  }}
                  className="w-full px-3 py-2 text-sm min-h-[44px] border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="all">{t('offers.allTypes')}</option>
                  <option value="stamps">{t('offers.stampCards')}</option>
                  <option value="discount">{t('offers.discounts')}</option>
                  <option value="points">{t('offers.points')}</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Offers Grid */}
      <OfferGrid
        offers={filteredOffers}
        loading={false}
        onEdit={setShowEditModal}
        onDelete={setShowDeleteConfirm}
        onToggleStatus={toggleOfferStatus}
        onQRCode={setShowQRModal}
        onAnalytics={handleAnalytics}
        onDesignCard={setShowCardDesigner}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">{t('offers.deleteConfirmTitle')}</h3>
            <p className="text-gray-600 mb-6">
              {t('offers.deleteConfirmMessage')}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={() => deleteOffer(showDeleteConfirm)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || showEditModal) && (
        <CreateOfferModal
          offer={showEditModal}
          branches={branches}
          onClose={() => {
            setShowCreateModal(false)
            setShowEditModal(null)
          }}
          onSave={async (offerData) => {
            try {
              console.log('💾 Saving offer data:', JSON.stringify(offerData, null, 2))

              if (showEditModal) {
                // Update existing offer using secure ID
                console.log('📝 Updating offer:', showEditModal.public_id)
                const response = await secureApi.put(`${endpoints.myOffers}/${showEditModal.public_id}`, offerData)
                const data = await response.json()

                if (!data.success) {
                  throw new Error(data.message || t('offers.saveFailed'))
                }
                console.log('✅ Offer updated successfully')
              } else {
                // Create new offer
                console.log('➕ Creating new offer')
                const response = await secureApi.post(endpoints.myOffers, offerData)
                const data = await response.json()

                if (!data.success) {
                  // Check for plan limit error in response
                  if (data.code === 'PLAN_LIMIT_REACHED' && data.limits) {
                    setPlanLimitInfo({
                      limitType: data.limitType || 'offers',
                      currentUsage: data.limits.current,
                      planLimit: data.limits.max,
                      currentPlan: data.limits.plan,
                      suggestedPlan: data.limits.suggestedPlan
                    })
                    setShowPlanLimitModal(true)
                    setShowCreateModal(false)
                    return
                  }

                  // Verification required check
                  if (data.code === 'VERIFICATION_REQUIRED') {
                    setError(t('offers.verificationRequired', 'Please complete your business profile to create offers'))
                    return
                  }

                  throw new Error(data.message || t('offers.saveFailed'))
                }
                console.log('✅ Offer created successfully:', data.data?.public_id)
              }
              await loadOffers() // Reload to get updated data
              setShowCreateModal(false)
              setShowEditModal(null)
            } catch (err) {
              console.error('❌ Error saving offer:', {
                message: err.message,
                response: err.response,
                data: err.response?.data,
                status: err.response?.status
              })

              // Check if this is a plan limit error - detect from error message (fallback)
              if (err.message?.includes('Plan limit')) {
                setPlanLimitInfo({
                  limitType: 'offers',
                  currentUsage: offers.length,
                  planLimit: offers.length,
                  currentPlan: 'free',
                  suggestedPlan: 'professional'
                })
                setShowPlanLimitModal(true)
                setShowCreateModal(false)
                return
              }

              setError(err.message || t('offers.saveFailed'))
            }
          }}
        />
      )}

      {/* QR Code Modal */}
      {showQRModal && (
        <QRCodeModal
          offer={showQRModal}
          onClose={() => setShowQRModal(null)}
        />
      )}

      {/* Card Design Editor Modal */}
      {showCardDesigner && (
        <CardDesignProvider>
          <SimpleLoyaltyCardDesigner
            offer={showCardDesigner}
            businessName={user?.businessName}
            onClose={() => setShowCardDesigner(null)}
            onSave={(savedDesign) => {
              console.log('💾 Card design saved:', savedDesign)
              setShowCardDesigner(null)
              // Optionally reload offers to get updated data
              // loadOffers()
            }}
          />
        </CardDesignProvider>
      )}

      {/* Offer Analytics Modal */}
      {analyticsModalOpen && selectedOfferForAnalytics && (
        <OfferAnalyticsModal
          isOpen={analyticsModalOpen}
          onClose={() => {
            setAnalyticsModalOpen(false)
            setSelectedOfferForAnalytics(null)
          }}
          offer={selectedOfferForAnalytics}
        />
      )}

      {/* Plan Limit Modal */}
      {showPlanLimitModal && planLimitInfo && (
        <PlanLimitModal
          isOpen={showPlanLimitModal}
          onClose={() => {
            setShowPlanLimitModal(false)
            setPlanLimitInfo(null)
          }}
          limitType={planLimitInfo.limitType}
          currentUsage={planLimitInfo.currentUsage}
          planLimit={planLimitInfo.planLimit}
          currentPlan={planLimitInfo.currentPlan}
          suggestedPlan={planLimitInfo.suggestedPlan}
        />
      )}
    </div>
  )
}

export default OffersTab