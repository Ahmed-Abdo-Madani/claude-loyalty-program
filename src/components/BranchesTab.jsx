import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import BranchGrid from './BranchGrid'
import LocationAutocomplete from './LocationAutocomplete'
import CompactStatsBar from './CompactStatsBar'
import { endpoints, secureApi } from '../config/api'
import { validateSecureBranchId } from '../utils/secureAuth'
import BranchAnalyticsModal from './BranchAnalyticsModal'

function BranchesTab({ analytics }) {
  const { t } = useTranslation('dashboard')
  const [branches, setBranches] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null)
  const [analyticsModalOpen, setAnalyticsModalOpen] = useState(false)
  const [selectedBranchForAnalytics, setSelectedBranchForAnalytics] = useState(null)

  // Filter states - use internal constants, not translated strings
  const [statusFilter, setStatusFilter] = useState('all')
  const [cityFilter, setCityFilter] = useState('all')
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


  const toggleBranchStatus = async (secureBranchId, currentStatus) => {
    try {
      console.log('🔒 Toggling branch status:', { secureBranchId, currentStatus })
      const newStatus = currentStatus === 'active' ? 'inactive' : 'active'
      
      const response = await secureApi.patch(`${endpoints.myBranches}/${secureBranchId}/status`, {
        status: newStatus
      })
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
        throw new Error(data.message || t('branches.failedToDelete'))
      }
    } catch (err) {
      setError(err.message || t('branches.failedToDelete'))
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

  const handleAnalytics = (branch) => {
    console.log('📊 Opening analytics for branch:', branch.public_id)
    setSelectedBranchForAnalytics(branch)
    setAnalyticsModalOpen(true)
  }

  // Filter branches based on selected filters - use constants for comparison
  const filteredBranches = branches.filter(branch => {
    const statusMatch = statusFilter === 'all' || branch.status === statusFilter
    const cityMatch = cityFilter === 'all' || branch.city === cityFilter
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
        <p className="mt-4 text-gray-600">{t('branches.loading')}</p>
      </div>
    )
  }

  return (
    <div className="compact-spacing">
      {/* Compact Stats Bar - Space-efficient metrics */}
      {analytics && <CompactStatsBar analytics={analytics} />}
      
      {/* Header Section - Mobile-first: Stack vertically */}
      <div className="flex flex-col space-y-4 compact-header">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{t('branches.branchManagement')}</h2>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mt-1">{t('branches.manageLocations')}</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-primary hover:bg-primary/90 active:scale-95 text-white px-6 py-3.5 rounded-xl text-base font-medium transition-all duration-200 flex items-center justify-center gap-2 shadow-sm min-h-[44px] w-full sm:w-auto sm:self-start touch-target"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span>{t('branches.addBranch')}</span>
        </button>
      </div>

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


      {/* Search Bar - Always Visible */}
      <div className="mb-3">
        <div className="relative">
          <input
            type="text"
            value={searchFilter}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder={t('branches.searchPlaceholder')}
            className="w-full pl-10 pr-4 py-2 text-sm min-h-[44px] border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
          />
          <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Inline Filters - Always Visible */}
      <div className="mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Quick Filter Pills */}
          <button
            onClick={() => { setStatusFilter('all'); setCityFilter('all'); }}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap min-h-[44px] touch-manipulation ${
              statusFilter === 'all' && cityFilter === 'all'
                ? 'bg-primary text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {t('branches.all')}
          </button>
          <button
            onClick={() => setStatusFilter('active')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap min-h-[44px] touch-manipulation ${
              statusFilter === 'active'
                ? 'bg-green-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {t('branches.active')}
          </button>
          <button
            onClick={() => setStatusFilter('inactive')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors whitespace-nowrap min-h-[44px] touch-manipulation ${
              statusFilter === 'inactive'
                ? 'bg-red-500 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            {t('branches.inactive')}
          </button>

          {/* City Filter Dropdown */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-full min-h-[44px]">
            <span className="text-lg">📍</span>
            <select
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              className="text-sm font-medium bg-transparent border-none focus:outline-none focus:ring-0 text-gray-900 dark:text-white pr-6"
            >
              <option value="all">{t('branches.allCities')}</option>
              {[...new Set(branches?.map(branch => branch.city).filter(Boolean))].map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </select>
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
        onAnalytics={handleAnalytics}
        onManageOffers={(branch) => {
          // Manage offers functionality placeholder
          console.log('Manage offers for branch:', branch.public_id || branch.id)
        }}
      />

      {/* Delete Confirmation Modal - Full-screen on mobile */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl">
            <div className="p-6">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">{t('branches.deleteBranchTitle')}</h3>
              <p className="text-base text-gray-600 dark:text-gray-400 mb-6">
                {t('branches.deleteBranchMessage')}
              </p>
              <div className="flex flex-col-reverse sm:flex-row gap-3">
                <button
                  onClick={() => setShowDeleteConfirm(null)}
                  className="w-full sm:flex-1 px-6 py-3 min-h-[44px] border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all touch-target"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={() => deleteBranch(showDeleteConfirm)}
                  className="w-full sm:flex-1 px-6 py-3 min-h-[44px] bg-red-600 text-white rounded-xl font-medium hover:bg-red-700 active:scale-95 transition-all shadow-lg touch-target"
                >
                  {t('common.delete')}
                </button>
              </div>
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
              
              const branchId = showEditModal?.public_id || showEditModal?.id
              
              // Phase 1: Handle PIN update via dedicated endpoint (if needed)
              // Only update PIN if manager access is enabled, PIN is provided, and format is valid
              if (branchData.manager_pin_enabled === true && 
                  branchData.manager_pin && 
                  branchData.manager_pin.trim() !== '' && 
                  branchId) {
                // Validate PIN format
                if (!/^\d{4,6}$/.test(branchData.manager_pin)) {
                  throw new Error(t('branches.pinMustBe4to6Digits'))
                }
                
                console.log('🔐 Updating manager PIN via dedicated endpoint')
                
                const pinResponse = await secureApi.put(
                  `${endpoints.myBranches}/${branchId}/manager-pin`,
                  { manager_pin: branchData.manager_pin }
                )
                
                const pinData = await pinResponse.json()
                
                if (!pinData.success) {
                  throw new Error(pinData.message || t('branches.failedToSetPin'))
                }
                
                console.log('✅ Manager PIN updated and hashed')
              }
              
              // Phase 2: Remove PIN from general update to prevent plaintext storage
              const { manager_pin, ...cleanedBranchData } = branchData
              
              if (showEditModal) {
                // Update existing branch using secure ID
                console.log('📝 Updating branch:', showEditModal.public_id)
                const response = await secureApi.put(`${endpoints.myBranches}/${branchId}`, cleanedBranchData)
                const data = await response.json()
                
                if (!data.success) {
                  throw new Error(data.message || 'Failed to update branch')
                }
                console.log('✅ Branch updated successfully')
              } else {
                // Create new branch
                console.log('➕ Creating new branch')
                const response = await secureApi.post(endpoints.myBranches, cleanedBranchData)
                const data = await response.json()
                
                if (!data.success) {
                  throw new Error(data.message || 'Failed to create branch')
                }
                
                const newBranchId = data.data?.public_id
                console.log('✅ Branch created successfully:', newBranchId)
                
                // Phase 3: If PIN was provided in create mode AND manager access is enabled, save it now
                if (branchData.manager_pin_enabled === true &&
                    manager_pin && 
                    manager_pin.trim() !== '' && 
                    newBranchId) {
                  if (!/^\d{4,6}$/.test(manager_pin)) {
                    throw new Error(t('branches.pinMustBe4to6Digits'))
                  }
                  
                  try {
                    console.log('🔐 Setting manager PIN for new branch')
                    
                    const pinResponse = await secureApi.put(
                      `${endpoints.myBranches}/${newBranchId}/manager-pin`,
                      { manager_pin: manager_pin }
                    )
                    
                    const pinData = await pinResponse.json()
                    
                    if (!pinData.success) {
                      console.error('⚠️ Branch saved but PIN failed:', pinData.message)
                      setError(t('branches.savedButPinFailed'))
                    } else {
                      console.log('✅ Manager PIN set for new branch')
                    }
                  } catch (pinError) {
                    console.error('⚠️ Branch saved but PIN failed:', pinError)
                    setError(t('branches.savedButPinFailed'))
                  }
                }
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

      {/* Branch Analytics Modal */}
      {analyticsModalOpen && selectedBranchForAnalytics && (
        <BranchAnalyticsModal
          isOpen={analyticsModalOpen}
          onClose={() => {
            setAnalyticsModalOpen(false)
            setSelectedBranchForAnalytics(null)
          }}
          branch={selectedBranchForAnalytics}
        />
      )}
    </div>
  )
}

function BranchModal({ branch, onClose, onSave }) {
  const { t } = useTranslation('dashboard')
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
    isMain: branch?.isMain || false,
    manager_pin_enabled: branch?.manager_pin_enabled || false,
    manager_pin: ''
  })

  // Manager PIN state
  const [showPin, setShowPin] = useState(false)
  const [pinValidated, setPinValidated] = useState(false)

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
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white dark:bg-gray-800 w-full h-full sm:h-auto sm:max-w-2xl sm:max-h-[90vh] sm:rounded-2xl shadow-2xl border-0 sm:border sm:border-gray-200 dark:border-gray-700 flex flex-col">
        {/* Header - Fixed */}
        <div className="flex-shrink-0 flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
              {branch ? '🏢 ' + t('branches.editBranch') : '🏪 ' + t('branches.addNewBranch')}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {branch ? t('branches.updateBranchInfo') : t('branches.createNewBranchLocation')}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 active:scale-95 transition-all min-w-[44px] min-h-[44px] flex items-center justify-center touch-target"
          >
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form Content - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <form id="branch-form" onSubmit={handleSubmit}>
            <div className="space-y-4 sm:space-y-6">
                {/* Branch Name and Manager */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      🏪 {t('branches.branchName')} *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full px-4 py-3 min-h-[44px] border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary transition-all touch-target"
                      placeholder={t('branches.branchNamePlaceholder')}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      👤 {t('branches.manager')}
                    </label>
                    <input
                      type="text"
                      value={formData.manager_name}
                      onChange={(e) => setFormData({...formData, manager_name: e.target.value})}
                      className="w-full px-4 py-3 min-h-[44px] border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary transition-all touch-target"
                      placeholder={t('branches.managerNamePlaceholder')}
                    />
                  </div>
                </div>

                {/* Saudi Location Search */}
                <div>
                  <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                    🗺️ {t('branches.locationLabel')} *
                  </label>
                  <LocationAutocomplete
                    value={formData.location}
                    onChange={handleLocationSelect}
                    language="ar"
                    placeholder={t('branches.locationPlaceholderAr')}
                    placeholderEn={t('branches.locationPlaceholderEn')}
                    className="w-full"
                    required
                  />
                  {formData.location && (
                    <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                      <div className="text-sm text-blue-800 dark:text-blue-300">
                        <strong>{t('branches.selectedLocation')}:</strong>
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
                      <div className="animate-pulse">
                        <div className="h-[44px] bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                      </div>
                    ) : (
                      <select
                        value={formData.district}
                        onChange={handleDistrictSelect}
                        required
                        className="w-full px-4 py-3 min-h-[44px] border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary transition-all touch-target"
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
                    className="w-full px-4 py-3 min-h-[44px] border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary transition-all touch-target"
                    placeholder="e.g., King Fahd Road"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Enter the street name only
                  </p>
                </div>

                {/* Contact Information */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      📞 {t('branches.phoneNumber')}
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="w-full px-4 py-3 min-h-[44px] border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary transition-all touch-target"
                      placeholder={t('branches.phonePlaceholder')}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                      📧 {t('branches.email')}
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full px-4 py-3 min-h-[44px] border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary transition-all touch-target"
                      placeholder={t('branches.emailPlaceholder')}
                    />
                  </div>
                </div>

                {/* Manager Access Section */}
                <div className="p-4 bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-lg border-2 border-purple-200 dark:border-purple-800">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-bold text-purple-900 dark:text-purple-200 flex items-center">
                        🔐 {t('branches.managerAccess')}
                      </h3>
                      <p className="text-xs text-purple-700 dark:text-purple-300 mt-1">
                        {t('branches.managerAccessDesc')}
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      id="manager_pin_enabled"
                      checked={formData.manager_pin_enabled}
                      onChange={(e) => setFormData({...formData, manager_pin_enabled: e.target.checked})}
                      className="h-6 w-6 min-h-[24px] min-w-[24px] text-purple-600 focus:ring-purple-500 border-purple-300 dark:border-purple-600 rounded bg-white dark:bg-gray-700"
                    />
                  </div>

                  {formData.manager_pin_enabled && (
                    <div className="space-y-4 mt-4 pt-4 border-t border-purple-200 dark:border-purple-700">
                      {/* PIN Input */}
                      <div>
                        <label className="block text-sm font-semibold text-purple-900 dark:text-purple-200 mb-2">
                          📱 {t('branches.managerPin')}
                        </label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <input
                              type={showPin ? "text" : "password"}
                              value={formData.manager_pin}
                              onChange={(e) => {
                                const value = e.target.value.replace(/\D/g, '').substring(0, 6)
                                setFormData({...formData, manager_pin: value})
                                setPinValidated(false) // Clear validation when PIN changes
                              }}
                              maxLength={6}
                              pattern="[0-9]{4,6}"
                              className="w-full px-4 py-3 min-h-[44px] border border-purple-300 dark:border-purple-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-purple-400 dark:placeholder-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all touch-target font-mono text-lg tracking-widest"
                              placeholder={t('branches.pinPlaceholder')}
                            />
                            <button
                              type="button"
                              onClick={() => setShowPin(!showPin)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300"
                            >
                              {showPin ? '👁️' : '👁️‍🗨️'}
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (formData.manager_pin && /^\d{4,6}$/.test(formData.manager_pin)) {
                                setPinValidated(true)
                              }
                            }}
                            disabled={!formData.manager_pin || !/^\d{4,6}$/.test(formData.manager_pin)}
                            className="px-4 py-3 min-h-[44px] bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 active:scale-95 transition-all shadow-md disabled:opacity-50 whitespace-nowrap"
                          >
                            {pinValidated ? '✓ ' + t('branches.set') : '💾 ' + t('branches.setPin')}
                          </button>
                        </div>
                        <p className="text-xs text-purple-700 dark:text-purple-300 mt-2">
                          {pinValidated
                            ? `✓ ${formData.manager_pin.length}-digit PIN validated and ready to save`
                            : formData.manager_pin && /^\d{4,6}$/.test(formData.manager_pin)
                            ? `✓ ${formData.manager_pin.length}-digit PIN ready to validate`
                            : 'Enter 4-6 numeric digits'}
                        </p>
                      </div>

                      {/* Branch Login QR Code */}
                      {branch?.public_id && (
                        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-purple-200 dark:border-purple-700">
                          <h4 className="text-sm font-semibold text-purple-900 dark:text-purple-200 mb-2">
                            📱 Manager Login QR Code
                          </h4>
                          <div className="flex items-center gap-4">
                            <div className="bg-white p-2 rounded-lg border border-gray-200">
                              <img
                                src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(
                                  `${window.location.origin}/branch-manager-login?branch=${branch.public_id}`
                                )}`}
                                alt="Branch Manager Login QR Code"
                                className="w-[120px] h-[120px]"
                              />
                            </div>
                            <div className="flex-1">
                              <p className="text-xs text-purple-700 dark:text-purple-300 mb-2">
                                Branch managers can scan this QR code to access the login page
                              </p>
                              <div className="bg-purple-50 dark:bg-purple-900/30 p-2 rounded border border-purple-200 dark:border-purple-700">
                                <code className="text-xs text-purple-900 dark:text-purple-200 break-all">
                                  {branch.public_id}
                                </code>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Main Branch Setting */}
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-200 dark:border-gray-600">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="isMain"
                      checked={formData.isMain}
                      onChange={(e) => setFormData({...formData, isMain: e.target.checked})}
                      className="h-5 w-5 min-h-[20px] min-w-[20px] text-primary focus:ring-primary border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700"
                    />
                    <label htmlFor="isMain" className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center">
                      ⭐ Set as main branch
                      <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">(Primary location)</span>
                    </label>
                  </div>
                </div>
              </div>
          </form>
        </div>

        {/* Footer - Fixed with action buttons */}
        <div className="flex-shrink-0 p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <div className="flex flex-col-reverse sm:flex-row gap-3">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:flex-1 px-6 py-3 min-h-[44px] border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-50 dark:hover:bg-gray-700 active:scale-95 transition-all touch-target"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              form="branch-form"
              className="w-full sm:flex-1 px-6 py-3 min-h-[44px] bg-gradient-to-r from-primary to-blue-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 active:scale-95 transition-all shadow-lg touch-target"
            >
              {branch ? '✨ ' + t('branches.updateBranch') : '🎉 ' + t('branches.addBranch')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default BranchesTab