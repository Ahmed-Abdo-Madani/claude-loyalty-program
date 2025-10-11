import { useState, useEffect } from 'react'
import BranchGrid from './BranchGrid'
import LocationAutocomplete from './LocationAutocomplete'
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
      <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 md:mb-8 space-y-3 md:space-y-0">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Branch Management</h2>
          <p className="text-sm md:text-base text-gray-600 dark:text-gray-400 mt-1">Manage your business locations and track performance</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-primary hover:bg-primary/90 text-white px-4 py-2.5 md:px-6 md:py-3 rounded-xl text-sm md:text-base font-medium transition-colors duration-200 flex items-center justify-center space-x-2 shadow-sm w-full md:w-auto"
        >
          <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 md:p-6 shadow-sm border border-gray-100 dark:border-gray-700 mb-6 md:mb-8">
        <h3 className="text-base md:text-lg font-semibold text-gray-900 dark:text-white mb-3 md:mb-4">Filter Branches</h3>
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
              <option>Inactive</option>
              <option>Maintenance</option>
            </select>
          </div>
          <div>
            <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 md:mb-2">City</label>
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="w-full px-3 py-2 md:px-4 md:py-3 text-sm md:text-base border border-gray-300 dark:border-gray-600 rounded-lg md:rounded-xl focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
            <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 md:mb-2">Search</label>
            <input
              type="text"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              placeholder="Search branches..."
              className="w-full px-3 py-2 md:px-4 md:py-3 text-sm md:text-base border border-gray-300 dark:border-gray-600 rounded-lg md:rounded-xl focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
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
    location: branch?.location || null,           // Location object from LocationAutocomplete
    region: branch?.region || '',                 // Auto-populated from location
    city: branch?.city || '',                     // Auto-populated from location
    district: branch?.district || '',             // Auto-populated from location
    street_name: branch?.address || '',           // Renamed from 'address' - street name only
    location_data: branch?.location_data || null, // Full location metadata
    phone: branch?.phone || '',
    email: branch?.email || '',
    manager_name: branch?.manager_name || '',
    isMain: branch?.isMain || false
  })

  // District management state
  const [loadingDistricts, setLoadingDistricts] = useState(false)
  const [districtOptions, setDistrictOptions] = useState([])
  const [showDistrictDropdown, setShowDistrictDropdown] = useState(false)

  // Initialize location data when editing existing branch
  useEffect(() => {
    if (branch && (branch.city || branch.region)) {
      console.log('🔧 Edit mode: Reconstructing location from branch data', branch)

      // Helper: Construct hierarchy if not stored
      const constructHierarchy = (district, city, region) => {
        const parts = []
        if (district) parts.push(district)
        if (city && city !== district) parts.push(city)
        if (region) parts.push(region)
        return parts.join('، ')
      }

      // Determine location type
      const locationType = branch.district ? 'district' : (branch.city ? 'city' : 'region')
      const locationName = branch.district || branch.city || branch.region || ''

      // Reconstruct location object from stored data
      const reconstructedLocation = {
        type: locationType,
        name_ar: locationName,
        name_en: locationName,
        hierarchy: branch.location_hierarchy ||
                   constructHierarchy(branch.district, branch.city, branch.region),
        id: branch.location_id || null,
        city_id: branch.location_id || null,
        district_id: branch.location_id || null,
        region_id: branch.location_id || null
      }

      console.log('✅ Reconstructed location object:', reconstructedLocation)

      // Update formData with reconstructed location
      setFormData(prev => ({
        ...prev,
        location: reconstructedLocation,
        region: branch.region || '',
        city: branch.city || '',
        district: branch.district || ''
      }))

      // Don't show district dropdown in edit mode (already selected)
      setShowDistrictDropdown(false)
    }
  }, [branch])

  // Extract region from location hierarchy
  const extractRegionFromHierarchy = (hierarchy) => {
    if (!hierarchy) return ''
    const parts = hierarchy.split('، ')
    return parts[parts.length - 1] // Last part is the region
  }

  // Load districts for a city with caching and smart defaults
  const loadDistrictsForCity = async (cityId, cityName) => {
    if (!cityId) return

    try {
      setLoadingDistricts(true)

      // Fetch from API
      const response = await fetch(`${endpoints.locationBase}/cities/${cityId}/districts`)
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const result = await response.json()
      const districts = result.success ? result.data : []

      handleDistrictsLoaded(districts, cityName)

    } catch (error) {
      console.error('Failed to load districts:', error)
      // Fallback: use city name as district
      setFormData(prev => ({ ...prev, district: cityName }))
      setShowDistrictDropdown(false)
    } finally {
      setLoadingDistricts(false)
    }
  }

  // Handle districts loaded with smart default behavior
  const handleDistrictsLoaded = (districts, cityName) => {
    if (districts.length === 0) {
      // No districts available - use city name as district
      setFormData(prev => ({ ...prev, district: cityName }))
      setShowDistrictDropdown(false)
      console.log('📍 No districts found, using city name as district')
    } else if (districts.length === 1) {
      // Auto-select single district
      const district = districts[0]
      const districtName = district.name_ar || district.name_en
      setFormData(prev => ({ ...prev, district: districtName }))
      setShowDistrictDropdown(false) // Hide dropdown since auto-selected
      console.log('📍 Single district auto-selected:', districtName)
    } else {
      // Multiple districts - show dropdown for selection
      setDistrictOptions(districts)
      setShowDistrictDropdown(true)
      setFormData(prev => ({ ...prev, district: '' })) // Reset district for user selection
      console.log('📍 Multiple districts loaded, showing dropdown')
    }
  }

  // Handle district selection from dropdown
  const handleDistrictSelect = (e) => {
    const districtName = e.target.value
    setFormData(prev => ({
      ...prev,
      district: districtName
    }))
  }

  // Handle location selection from autocomplete
  const handleLocationSelect = (location) => {
    console.log('🏙️ Branch location selected:', location)

    if (!location) return

    // Extract region from hierarchy
    const region = extractRegionFromHierarchy(location.hierarchy)

    if (location.type === 'city') {
      // City selected - auto-populate region, city, then load districts
      const cityName = location.name_ar || location.name_en
      const cityId = location.city_id || location.id

      setFormData(prev => ({
        ...prev,
        location: location,
        region: region,
        city: cityName,
        district: '', // Will be populated by loadDistrictsForCity
        location_data: {
          id: cityId,
          type: 'city',
          name_ar: location.name_ar,
          name_en: location.name_en,
          hierarchy: location.hierarchy
        }
      }))

      // Load districts for this city
      loadDistrictsForCity(cityId, cityName)

    } else if (location.type === 'district') {
      // District selected directly - extract city and region
      const districtName = location.name_ar || location.name_en

      // Try to extract city from hierarchy
      let cityName = ''
      if (location.hierarchy) {
        const parts = location.hierarchy.split('، ')
        if (parts.length >= 2) {
          cityName = parts[parts.length - 2] // Second to last part is city
        }
      }

      setFormData(prev => ({
        ...prev,
        location: location,
        region: region,
        city: cityName,
        district: districtName,
        location_data: {
          id: location.district_id || location.id,
          type: 'district',
          name_ar: location.name_ar,
          name_en: location.name_en,
          hierarchy: location.hierarchy
        }
      }))

      // District already selected - hide dropdown
      setShowDistrictDropdown(false)
      setDistrictOptions([])

    } else if (location.type === 'region') {
      // Region selected - set region only
      const regionName = location.name_ar || location.name_en

      setFormData(prev => ({
        ...prev,
        location: location,
        region: regionName,
        city: '',
        district: '',
        location_data: {
          id: location.region_id || location.id,
          type: 'region',
          name_ar: location.name_ar,
          name_en: location.name_en,
          hierarchy: location.hierarchy
        }
      }))

      // Region only - hide district dropdown
      setShowDistrictDropdown(false)
      setDistrictOptions([])
    }
  }

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

        {/* Form Content */}
        <div className="p-6">
          <form onSubmit={handleSubmit}>
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

                {/* Saudi Location Search */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    🗺️ Location (Region, City, or District) *
                  </label>
                  <LocationAutocomplete
                    value={formData.location}
                    onChange={handleLocationSelect}
                    language="ar"
                    placeholder="ابحث عن المنطقة أو المدينة أو الحي..."
                    placeholderEn="Search for region, city, or district..."
                    className="w-full"
                    required
                  />
                  {formData.location && (
                    <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <div className="text-sm text-blue-800 dark:text-blue-300">
                        <strong>Selected Location:</strong>
                        <div className="mt-1 flex flex-wrap gap-2">
                          {formData.region && (
                            <span className="inline-block bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200 px-2 py-1 rounded-md text-xs">
                              Region: {formData.region}
                            </span>
                          )}
                          {formData.city && (
                            <span className="inline-block bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 px-2 py-1 rounded-md text-xs">
                              City: {formData.city}
                            </span>
                          )}
                          {formData.district && (
                            <span className="inline-block bg-purple-100 dark:bg-purple-800 text-purple-800 dark:text-purple-200 px-2 py-1 rounded-md text-xs">
                              District: {formData.district}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* District Dropdown - shown when city is selected and multiple districts are available */}
                {showDistrictDropdown && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      🏘️ District (Neighborhood) *
                    </label>
                    {loadingDistricts ? (
                      // Skeleton loader
                      <div className="animate-pulse">
                        <div className="h-12 bg-gray-200 dark:bg-gray-700 rounded-xl"></div>
                      </div>
                    ) : (
                      <select
                        value={formData.district}
                        onChange={handleDistrictSelect}
                        required
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                      >
                        <option value="">Select a district...</option>
                        {districtOptions.map((district, index) => (
                          <option
                            key={district.district_id || district.id || index}
                            value={district.name_ar || district.name_en}
                          >
                            {district.name_ar} ({district.name_en})
                          </option>
                        ))}
                      </select>
                    )}
                    {loadingDistricts && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Loading districts for {formData.city}...
                      </p>
                    )}
                  </div>
                )}

                {/* Street Name */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    📍 Street Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.street_name}
                    onChange={(e) => setFormData({...formData, street_name: e.target.value})}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all duration-200"
                    placeholder="e.g., King Fahd Road, Al Tahlia Street"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Enter the street name only (location is selected above)
                  </p>
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