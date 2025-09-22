import { useState } from 'react'
import QRCodeModal from './QRCodeModal'

function OffersTab() {
  const [offers, setOffers] = useState([
    {
      id: 1,
      title: "🍕 Buy 10 Pizzas, Get 1 FREE",
      description: "Collect 10 stamps and get your 11th pizza absolutely free!",
      branch: "Downtown Branch",
      type: "stamps",
      stampsRequired: 10,
      status: "active",
      customers: 23,
      redeemed: 5,
      createdAt: "2 weeks ago",
      startDate: "2024-01-01",
      endDate: null,
      isTimeLimited: false
    },
    {
      id: 2,
      title: "☕ Free Coffee After 5 Visits",
      description: "Visit us 5 times and get your 6th coffee for free!",
      branch: "All Branches",
      type: "stamps",
      stampsRequired: 5,
      status: "active",
      customers: 67,
      redeemed: 12,
      createdAt: "1 month ago",
      startDate: "2024-01-01",
      endDate: null,
      isTimeLimited: false
    },
    {
      id: 3,
      title: "🎂 Birthday Special - 20% Off",
      description: "Special birthday discount for loyal customers",
      branch: "Westside Branch",
      type: "discount",
      stampsRequired: 1,
      status: "paused",
      customers: 2,
      redeemed: 0,
      createdAt: "3 days ago",
      startDate: "2024-01-15",
      endDate: "2024-02-14",
      isTimeLimited: true
    },
    {
      id: 4,
      title: "🏃 Happy Hour - Double Points",
      description: "Earn double stamps during happy hour (3-6 PM)",
      branch: "Downtown Branch",
      type: "stamps",
      stampsRequired: 5,
      status: "scheduled",
      customers: 8,
      redeemed: 1,
      createdAt: "1 day ago",
      startDate: "2024-02-01",
      endDate: "2024-02-29",
      isTimeLimited: true
    }
  ])

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null)
  const [showEditModal, setShowEditModal] = useState(null)
  const [showQRModal, setShowQRModal] = useState(null)

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'paused': return 'bg-yellow-100 text-yellow-800'
      case 'scheduled': return 'bg-blue-100 text-blue-800'
      case 'expired': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return '🟢'
      case 'paused': return '⏸️'
      case 'scheduled': return '⏰'
      case 'expired': return '⏹️'
      default: return '⚪'
    }
  }

  const toggleOfferStatus = (offerId) => {
    setOffers(offers.map(offer => {
      if (offer.id === offerId) {
        const newStatus = offer.status === 'active' ? 'paused' : 'active'
        return { ...offer, status: newStatus }
      }
      return offer
    }))
  }

  const deleteOffer = (offerId) => {
    setOffers(offers.filter(offer => offer.id !== offerId))
    setShowDeleteConfirm(null)
  }

  const duplicateOffer = (offerId) => {
    const offer = offers.find(o => o.id === offerId)
    if (offer) {
      const newOffer = {
        ...offer,
        id: Math.max(...offers.map(o => o.id)) + 1,
        title: `${offer.title} (Copy)`,
        customers: 0,
        redeemed: 0,
        createdAt: 'just now',
        status: 'paused'
      }
      setOffers([newOffer, ...offers])
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'No end date'
    return new Date(dateString).toLocaleDateString()
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold">My Loyalty Offers</h2>
          <p className="text-gray-600">Manage your loyalty programs and track performance</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary"
        >
          + Create New Offer
        </button>
      </div>

      {/* Filters */}
      <div className="flex space-x-4 mb-6">
        <select className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
          <option>All Status</option>
          <option>Active</option>
          <option>Paused</option>
          <option>Scheduled</option>
          <option>Expired</option>
        </select>
        <select className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
          <option>All Branches</option>
          <option>Downtown Branch</option>
          <option>Westside Branch</option>
        </select>
        <select className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
          <option>All Types</option>
          <option>Stamp Cards</option>
          <option>Discounts</option>
          <option>Points</option>
        </select>
      </div>

      {/* Offers List */}
      <div className="space-y-4">
        {offers.map((offer) => (
          <div key={offer.id} className="border rounded-lg p-6 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-semibold">{offer.title}</h3>
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(offer.status)}`}>
                    {getStatusIcon(offer.status)} {offer.status.charAt(0).toUpperCase() + offer.status.slice(1)}
                  </span>
                  {offer.isTimeLimited && (
                    <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded text-xs">
                      ⏰ Time Limited
                    </span>
                  )}
                </div>

                <p className="text-gray-600 mb-2">{offer.description}</p>

                <div className="flex flex-wrap gap-4 text-sm text-gray-500 mb-3">
                  <span>🏪 {offer.branch}</span>
                  <span>📅 Created {offer.createdAt}</span>
                  <span>👥 {offer.customers} customers</span>
                  <span>🎁 {offer.redeemed} rewards redeemed</span>
                </div>

                {offer.isTimeLimited && (
                  <div className="flex gap-4 text-sm text-gray-500">
                    <span>📅 Start: {formatDate(offer.startDate)}</span>
                    <span>📅 End: {formatDate(offer.endDate)}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-2 ml-4">
                {/* QR Code */}
                <button
                  onClick={() => setShowQRModal(offer)}
                  className="p-2 text-primary hover:bg-blue-50 rounded-lg transition-colors"
                  title="Generate QR Code"
                >
                  📱
                </button>

                {/* Analytics */}
                <button className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors" title="View Analytics">
                  📊
                </button>

                {/* Pause/Resume */}
                <button
                  onClick={() => toggleOfferStatus(offer.id)}
                  className={`p-2 rounded-lg transition-colors ${
                    offer.status === 'active'
                      ? 'text-yellow-600 hover:bg-yellow-50'
                      : 'text-green-600 hover:bg-green-50'
                  }`}
                  title={offer.status === 'active' ? 'Pause Offer' : 'Resume Offer'}
                >
                  {offer.status === 'active' ? '⏸️' : '▶️'}
                </button>

                {/* Edit */}
                <button
                  onClick={() => setShowEditModal(offer)}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title="Edit Offer"
                >
                  ✏️
                </button>

                {/* Duplicate */}
                <button
                  onClick={() => duplicateOffer(offer.id)}
                  className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                  title="Duplicate Offer"
                >
                  📋
                </button>

                {/* Delete */}
                <button
                  onClick={() => setShowDeleteConfirm(offer.id)}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete Offer"
                >
                  🗑️
                </button>
              </div>
            </div>

            {/* Performance Bar */}
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Redemption Rate</span>
                <span>{offer.customers > 0 ? Math.round((offer.redeemed / offer.customers) * 100) : 0}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full"
                  style={{width: `${offer.customers > 0 ? Math.min((offer.redeemed / offer.customers) * 100, 100) : 0}%`}}
                ></div>
              </div>
            </div>
          </div>
        ))}
      </div>

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
          onClose={() => {
            setShowCreateModal(false)
            setShowEditModal(null)
          }}
          onSave={(offerData) => {
            if (showEditModal) {
              // Update existing offer
              setOffers(offers.map(o => o.id === showEditModal.id ? {...o, ...offerData} : o))
            } else {
              // Create new offer
              const newOffer = {
                ...offerData,
                id: Math.max(...offers.map(o => o.id)) + 1,
                customers: 0,
                redeemed: 0,
                createdAt: 'just now',
                status: 'paused'
              }
              setOffers([newOffer, ...offers])
            }
            setShowCreateModal(false)
            setShowEditModal(null)
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

function CreateOfferModal({ offer, onClose, onSave }) {
  const [formData, setFormData] = useState({
    title: offer?.title || '',
    description: offer?.description || '',
    branch: offer?.branch || 'All Branches',
    type: offer?.type || 'stamps',
    stampsRequired: offer?.stampsRequired || 10,
    isTimeLimited: offer?.isTimeLimited || false,
    startDate: offer?.startDate || '',
    endDate: offer?.endDate || ''
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">
          {offer ? 'Edit Offer' : 'Create New Offer'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Offer Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="e.g., Buy 10 Get 1 Free"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              rows="3"
              placeholder="Describe your loyalty offer..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Branch Location
              </label>
              <select
                value={formData.branch}
                onChange={(e) => setFormData({...formData, branch: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option>All Branches</option>
                <option>Downtown Branch</option>
                <option>Westside Branch</option>
                <option>Northside Branch</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Program Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({...formData, type: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="stamps">Stamp Card</option>
                <option value="points">Points System</option>
                <option value="discount">Discount Code</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {formData.type === 'stamps' ? 'Stamps Required' : 'Points Required'}
            </label>
            <input
              type="number"
              min="1"
              max="50"
              value={formData.stampsRequired}
              onChange={(e) => setFormData({...formData, stampsRequired: parseInt(e.target.value)})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Time Limits */}
          <div>
            <div className="flex items-center mb-4">
              <input
                type="checkbox"
                id="timeLimited"
                checked={formData.isTimeLimited}
                onChange={(e) => setFormData({...formData, isTimeLimited: e.target.checked})}
                className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
              />
              <label htmlFor="timeLimited" className="ml-2 text-sm text-gray-700">
                Set time limits for this offer
              </label>
            </div>

            {formData.isTimeLimited && (
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    required={formData.isTimeLimited}
                    value={formData.startDate}
                    onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date *
                  </label>
                  <input
                    type="date"
                    required={formData.isTimeLimited}
                    value={formData.endDate}
                    onChange={(e) => setFormData({...formData, endDate: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-600"
            >
              {offer ? 'Update Offer' : 'Create Offer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default OffersTab