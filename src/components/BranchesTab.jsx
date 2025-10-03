import { useState, useEffect } from 'react'
import BranchGrid from './BranchGrid'
import { endpoints, secureApi } from '../config/api'
import { validateSecureBranchId } from '../utils/secureAuth'

function BranchesTab() {
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null)

  // Filter states
  const [statusFilter, setStatusFilter] = useState('All Status')
  const [cityFilter, setCityFilter] = useState('All Cities')
  const [searchFilter, setSearchFilter] = useState('')

  // Load branches on component mount
  useEffect(() => {
    loadBranches()
  }, [])

  const loadBranches = async () => {
    try {
      setLoading(true)
      setError('')
      console.log('🔒 Loading branches with secure authentication...')
      const response = await secureApi.get(endpoints.myBranches)
      const data = await response.json()
      
      if (data.success) {
        setBranches(data.data || [])
        console.log('🔒 Branches loaded successfully:', data.data?.length || 0)
      } else {
        throw new Error(data.message || 'Failed to load branches')
      }
    } catch (err) {
      setError(err.message || 'Failed to load branches')
      console.error('Error loading branches:', err)
    } finally {
      setLoading(false)
    }
  }


  const toggleBranchStatus = async (secureBranchId) => {
    try {
      console.log('🔒 Toggling branch status:', secureBranchId)
      const response = await secureApi.patch(`${endpoints.myBranches}/${secureBranchId}/status`)  // Use /status not /toggle-status
      const data = await response.json()
      
      if (data.success) {
        await loadBranches() // Reload to get updated data
        console.log('🔒 Branch status updated successfully')
      } else {
        throw new Error(data.message || 'Failed to update branch status')
      }
    } catch (err) {
      setError(err.message || 'Failed to update branch status')
      console.error('Error toggling branch status:', err)
    }
  }

  const deleteBranch = async (secureBranchId) => {
    try {
      console.log('🔒 Deleting branch:', secureBranchId)
      const response = await secureApi.delete(`${endpoints.myBranches}/${secureBranchId}`)
      const data = await response.json()
      
      if (data.success) {
        setShowDeleteConfirm(null)
        await loadBranches() // Reload to get updated data

        // If offers were deleted with the branch, show success message
        if (data.data && data.data.deletedOffers > 0) {
          console.log(`🔒 Branch deleted successfully. ${data.data.deletedOffers} associated offer(s) were also removed.`)
        }
      } else {
        throw new Error(data.message || 'Failed to delete branch')
      }
    } catch (err) {
      setError(err.message || 'Failed to delete branch')
      console.error('Error deleting branch:', err)
      setShowDeleteConfirm(null)
    }
  }

  const duplicateBranch = async (secureBranchId) => {
    try {
      console.log('🔒 Duplicating branch:', secureBranchId)
      const branch = branches.find(b => b.public_id === secureBranchId)
      if (branch) {
        const newBranch = {
          ...branch,
          name: `${branch.name} (Copy)`,
          isMain: false,
          status: 'inactive'
        }
        delete newBranch.public_id // Remove ID so API creates a new one
        delete newBranch.id // Remove any legacy ID
        
        const response = await secureApi.post(endpoints.myBranches, newBranch)
        const data = await response.json()
        
        if (data.success) {
          await loadBranches() // Reload to get updated data
          console.log('🔒 Branch duplicated successfully')
        } else {
          throw new Error(data.message || 'Failed to duplicate branch')
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to duplicate branch')
      console.error('Error duplicating branch:', err)
    }
  }


  // Filter branches based on selected filters
  const filteredBranches = branches.filter(branch => {
    const statusMatch = statusFilter === 'All Status' || branch.status === statusFilter.toLowerCase()
    const cityMatch = cityFilter === 'All Cities' || branch.city === cityFilter
    const searchMatch = searchFilter === '' ||
      branch.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
      branch.manager_name?.toLowerCase().includes(searchFilter.toLowerCase()) ||
      branch.address.toLowerCase().includes(searchFilter.toLowerCase())

    return statusMatch && cityMatch && searchMatch
  })

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading branches...</p>
      </div>
    )
  }

  return (
    <div>
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-8 space-y-4 md:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Branch Management</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your business locations and track performance</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-primary hover:bg-primary/90 text-white px-6 py-3 rounded-xl font-medium transition-colors duration-200 flex items-center space-x-2 shadow-sm"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span>Add Branch</span>
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
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 mb-8">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Filter Branches</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option>All Status</option>
              <option>Active</option>
              <option>Inactive</option>
              <option>Maintenance</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">City</label>
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option>All Cities</option>
              {[...new Set(branches?.map(branch => branch.city))].map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Search</label>
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search branches..."
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Branches Grid */}
      <BranchGrid
        branches={filteredBranches}
        loading={false}
        onEdit={setShowEditModal}
        onDelete={setShowDeleteConfirm}
        onToggleStatus={toggleBranchStatus}
        onDuplicate={duplicateBranch}
        onAnalytics={(branch) => {
          // Analytics functionality placeholder
          console.log('View analytics for branch:', branch.public_id || branch.id)
        }}
        onManageOffers={(branch) => {
          // Manage offers functionality placeholder
          console.log('Manage offers for branch:', branch.public_id || branch.id)
        }}
      />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Delete Branch</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete this branch? This action cannot be undone.
              All associated data will be lost.
            </p>
            <div className="flex space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteBranch(showDeleteConfirm)}
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
        <BranchModal
          branch={showEditModal}
          onClose={() => {
            setShowCreateModal(false)
            setShowEditModal(null)
          }}
          onSave={async (branchData) => {
            try {
              console.log('🔒 Saving branch data:', JSON.stringify(branchData, null, 2))
              
              if (showEditModal) {
                // Update existing branch using secure ID
                console.log('📝 Updating branch:', showEditModal.public_id)
                const response = await secureApi.put(`${endpoints.myBranches}/${showEditModal.public_id || showEditModal.id}`, branchData)
                const data = await response.json()
                
                if (!data.success) {
                  throw new Error(data.message || 'Failed to update branch')
                }
                console.log('✅ Branch updated successfully')
              } else {
                // Create new branch
                console.log('➕ Creating new branch')
                const response = await secureApi.post(endpoints.myBranches, branchData)
                const data = await response.json()
                
                if (!data.success) {
                  throw new Error(data.message || 'Failed to create branch')
                }
                console.log('✅ Branch created successfully:', data.data?.public_id)
              }
              await loadBranches() // Reload to get updated data
              setShowCreateModal(false)
              setShowEditModal(null)
            } catch (err) {
              setError(err.message || 'Failed to save branch')
              console.error('Error saving branch:', err)
            }
          }}
        />
      )}
    </div>
  )
}

function BranchModal({ branch, onClose, onSave }) {
  const [formData, setFormData] = useState({
    name: branch?.name || '',
    address: branch?.address || '',
    city: branch?.city || '',
    state: branch?.state || '',
    zip_code: branch?.zip_code || '',
    phone: branch?.phone || '',
    email: branch?.email || '',
    manager_name: branch?.manager_name || '',
    isMain: branch?.isMain || false,
    openingHours: branch?.openingHours || {
      monday: "9:00 AM - 9:00 PM",
      tuesday: "9:00 AM - 9:00 PM",
      wednesday: "9:00 AM - 9:00 PM",
      thursday: "9:00 AM - 9:00 PM",
      friday: "9:00 AM - 10:00 PM",
      saturday: "10:00 AM - 10:00 PM",
      sunday: "10:00 AM - 8:00 PM"
    }
  })

  const [activeTab, setActiveTab] = useState('basic')

  const handleSubmit = (e) => {
    e.preventDefault()
    onSave(formData)
  }

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
  const dayEmojis = {
    monday: '📅',
    tuesday: '📅',
    wednesday: '📅',
    thursday: '📅',
    friday: '🎉',
    saturday: '🎉',
    sunday: '☀️'
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
              {branch ? '🏢 Edit Branch' : '🏪 Add New Branch'}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {branch ? 'Update your branch information and settings' : 'Create a new branch location for your business'}
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

        {/* Enhanced Tab Navigation */}
        <div className="px-6 pt-6">
          <div className="flex space-x-2 p-1 bg-gray-100 dark:bg-gray-700 rounded-xl">
            <button
              onClick={() => setActiveTab('basic')}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold text-sm transition-all duration-200 ${
                activeTab === 'basic'
                  ? 'bg-white dark:bg-gray-800 text-primary shadow-sm border border-gray-200 dark:border-gray-600'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              📍 Basic Info
            </button>
            <button
              onClick={() => setActiveTab('hours')}
              className={`flex-1 py-3 px-4 rounded-lg font-semibold text-sm transition-all duration-200 ${
                activeTab === 'hours'
                  ? 'bg-white dark:bg-gray-800 text-primary shadow-sm border border-gray-200 dark:border-gray-600'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              ⏰ Operating Hours
            </button>
          </div>
        </div>

        {/* Form Content */}
        <div className="p-6">
          <form onSubmit={handleSubmit}>
            {activeTab === 'basic' && (
              <div className="space-y-6">
                {/* Branch Name and Manager */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      🏪 Branch Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                      placeholder="e.g., Downtown Branch"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      👤 Manager
                    </label>
                    <input
                      type="text"
                      value={formData.manager_name}
                      onChange={(e) => setFormData({...formData, manager_name: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                      placeholder="Manager name"
                    />
                  </div>
                </div>

                {/* Address */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    📍 Address *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                    placeholder="Street address"
                  />
                </div>

                {/* Location Details */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      🏙️ City *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.city}
                      onChange={(e) => setFormData({...formData, city: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                      placeholder="City"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      🗺️ State *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.state}
                      onChange={(e) => setFormData({...formData, state: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                      placeholder="State"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      📮 ZIP Code *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.zip_code}
                      onChange={(e) => setFormData({...formData, zip_code: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                      placeholder="ZIP"
                    />
                  </div>
                </div>

                {/* Contact Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      📞 Phone Number
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                      placeholder="(555) 123-4567"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      📧 Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                      placeholder="branch@business.com"
                    />
                  </div>
                </div>

                {/* Main Branch Setting */}
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="isMain"
                      checked={formData.isMain}
                      onChange={(e) => setFormData({...formData, isMain: e.target.checked})}
                      className="h-5 w-5 text-primary focus:ring-primary border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                    />
                    <label htmlFor="isMain" className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center">
                      ⭐ Set as main branch
                      <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">(Primary location)</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'hours' && (
              <div className="space-y-6">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-200 dark:border-blue-800">
                  <p className="text-sm text-blue-800 dark:text-blue-400 mb-0">
                    💡 Set operating hours for this branch. Enter "Closed" for non-operating days or leave blank.
                  </p>
                </div>

                <div className="space-y-4">
                  {days.map((day) => (
                    <div key={day} className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300 capitalize flex items-center sm:w-32">
                        {dayEmojis[day]} {day}
                      </label>
                      <input
                        type="text"
                        value={formData.openingHours[day]}
                        onChange={(e) => setFormData({
                          ...formData,
                          openingHours: {
                            ...formData.openingHours,
                            [day]: e.target.value
                          }
                        })}
                        className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                        placeholder="9:00 AM - 5:00 PM or Closed"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 pt-6 mt-6 border-t border-gray-200 dark:border-gray-700">
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
                {branch ? '✨ Update Branch' : '🎉 Add Branch'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default BranchesTab