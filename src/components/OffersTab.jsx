import { useState, useEffect } from 'react'
import QRCodeModal from './QRCodeModal'
import OfferGrid from './OfferGrid'
import { endpoints, secureApi } from '../config/api'
import { validateSecureOfferId } from '../utils/secureAuth'

function OffersTab() {
  const [offers, setOffers] = useState([])
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null)
  const [showEditModal, setShowEditModal] = useState(null)
  const [showQRModal, setShowQRModal] = useState(null)

  // Filter states
  const [statusFilter, setStatusFilter] = useState('All Status')
  const [branchFilter, setBranchFilter] = useState('All Branches')
  const [typeFilter, setTypeFilter] = useState('All Types')

  // Load offers and branches on component mount
  useEffect(() => {
    loadOffers()
    loadBranches()
  }, [])

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
        alert('Failed to update offer status')
      }
    } catch (err) {
      console.error('Error updating offer status:', err)
      alert('Error updating offer status')
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
        throw new Error(data.message || 'Failed to delete offer')
      }
    } catch (err) {
      setError(err.message || 'Failed to delete offer')
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
          status: 'paused'
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


  // Filter offers based on selected filters
  const filteredOffers = offers.filter(offer => {
    const statusMatch = statusFilter === 'All Status' || offer.status === statusFilter.toLowerCase()
    const branchMatch = branchFilter === 'All Branches' || offer.branch === branchFilter
    const typeMatch = typeFilter === 'All Types' ||
      (typeFilter === 'Stamp Cards' && offer.type === 'stamps') ||
      (typeFilter === 'Discounts' && offer.type === 'discount') ||
      (typeFilter === 'Points' && offer.type === 'points')

    return statusMatch && branchMatch && typeMatch
  })

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading offers...</p>
      </div>
    )
  }

  return (
    <div>
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 md:mb-8 space-y-3 md:space-y-0">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Active Offers</h2>
          <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mt-1">Manage your loyalty programs and track performance</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-primary hover:bg-primary/90 text-white px-4 py-2.5 md:px-6 md:py-3 rounded-xl text-sm md:text-base font-medium transition-colors duration-200 flex items-center justify-center space-x-2 shadow-sm w-full md:w-auto"
        >
          <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span>Create Offer</span>
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
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

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 shadow-sm border border-gray-100 dark:border-gray-700 mb-6 md:mb-8">
        <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white mb-3 md:mb-4">Filter Offers</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
          <div>
            <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 md:mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 md:px-4 md:py-3 text-sm md:text-base border border-gray-300 dark:border-gray-600 rounded-lg md:rounded-xl focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option>All Status</option>
              <option>Active</option>
              <option>Paused</option>
              <option>Scheduled</option>
              <option>Expired</option>
            </select>
          </div>
          <div>
            <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 md:mb-2">Branch</label>
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="w-full px-3 py-2 md:px-4 md:py-3 text-sm md:text-base border border-gray-300 dark:border-gray-600 rounded-lg md:rounded-xl focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option>All Branches</option>
              {branches?.map((branch) => (
                <option key={branch.id} value={branch.name}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 md:mb-2">Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full px-3 py-2 md:px-4 md:py-3 text-sm md:text-base border border-gray-300 dark:border-gray-600 rounded-lg md:rounded-xl focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option>All Types</option>
              <option>Stamp Cards</option>
              <option>Discounts</option>
              <option>Points</option>
            </select>
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
        onAnalytics={(offer) => {
          // Analytics functionality placeholder
          console.log('View analytics for offer:', offer.public_id || offer.id)
        }}
        onDuplicate={duplicateOffer}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Delete Offer</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this offer? This action cannot be undone.
              All customer progress will be lost.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteOffer(showDeleteConfirm)}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
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
              console.log('� Saving offer data:', JSON.stringify(offerData, null, 2))
              
              if (showEditModal) {
                // Update existing offer using secure ID
                console.log('📝 Updating offer:', showEditModal.public_id)
                const response = await secureApi.put(`${endpoints.myOffers}/${showEditModal.public_id}`, offerData)
                const data = await response.json()
                
                if (!data.success) {
                  throw new Error(data.message || 'Failed to update offer')
                }
                console.log('✅ Offer updated successfully')
              } else {
                // Create new offer
                console.log('➕ Creating new offer')
                const response = await secureApi.post(endpoints.myOffers, offerData)
                const data = await response.json()
                
                if (!data.success) {
                  throw new Error(data.message || 'Failed to create offer')
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
              setError(err.message || 'Failed to save offer')
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
    </div>
  )
}

function CreateOfferModal({ offer, branches, onClose, onSave }) {
  const [formData, setFormData] = useState({
    title: offer?.title || '',
    description: offer?.description || '',
    branch: offer?.branch || 'All Branches',
    type: offer?.type || 'stamps',
    stamps_required: offer?.stamps_required || 10,
    is_time_limited: offer?.is_time_limited || false,
    start_date: offer?.start_date || '',
    end_date: offer?.end_date || ''
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
              {offer ? 'Edit Offer' : 'Create New Offer'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {offer ? 'Update your loyalty offer details' : 'Set up a new loyalty program for your customers'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form Content */}
        <div className="p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Offer Title */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Offer Title *
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                placeholder="e.g., Buy 10 Get 1 Free Coffee"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200 resize-none"
                rows="3"
                placeholder="Describe your loyalty offer and its benefits..."
              />
            </div>

            {/* Branch and Program Type Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Branch Location
                </label>
                <select
                  value={formData.branch}
                  onChange={(e) => setFormData({...formData, branch: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                >
                  <option value="All Branches">All Branches</option>
                  {branches?.map((branch) => (
                    <option key={branch.id} value={branch.name}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Program Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                >
                  <option value="stamps">🎫 Stamp Card</option>
                  <option value="points">⭐ Points System</option>
                  <option value="discount">💰 Discount Code</option>
                </select>
              </div>
            </div>

            {/* Requirements */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                {formData.type === 'stamps' ? '🎫 Stamps Required' : formData.type === 'points' ? '⭐ Points Required' : '💰 Minimum Purchase'}
              </label>
              <input
                type="number"
                min="1"
                max="50"
                value={formData.stamps_required}
                onChange={(e) => setFormData({...formData, stamps_required: parseInt(e.target.value)})}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                placeholder={formData.type === 'stamps' ? 'e.g., 10' : formData.type === 'points' ? 'e.g., 100' : 'e.g., 50'}
              />
            </div>

            {/* Time Limits Section */}
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  id="timeLimited"
                  checked={formData.is_time_limited}
                  onChange={(e) => setFormData({...formData, is_time_limited: e.target.checked})}
                  className="h-5 w-5 text-primary focus:ring-primary border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                />
                <label htmlFor="timeLimited" className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                  ⏰ Set time limits for this offer
                </label>
              </div>

              {formData.is_time_limited && (
                <div className="p-6 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        Start Date *
                      </label>
                      <input
                        type="date"
                        required={formData.is_time_limited}
                        value={formData.start_date}
                        onChange={(e) => setFormData({...formData, start_date: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                        End Date *
                      </label>
                      <input
                        type="date"
                        required={formData.is_time_limited}
                        value={formData.end_date}
                        onChange={(e) => setFormData({...formData, end_date: e.target.value})}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-all duration-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-6 py-3 bg-gradient-to-r from-primary to-blue-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:focus:ring-offset-gray-800 transition-all duration-200 transform hover:scale-[1.02] shadow-lg"
              >
                {offer ? '✨ Update Offer' : '🎉 Create Offer'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default OffersTab