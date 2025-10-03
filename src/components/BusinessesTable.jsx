import { useState, useEffect } from 'react'
import { endpoints } from '../config/api'

function BusinessesTable() {
  const [businesses, setBusinesses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState({
    status: 'all',
    region: 'all',
    search: '',
    business_type: 'all'
  })
  const [selectedBusinesses, setSelectedBusinesses] = useState([])
  const [selectedBusiness, setSelectedBusiness] = useState(null)
  const [showModal, setShowModal] = useState(false)

  // Fetch businesses from API
  useEffect(() => {
    fetchBusinesses()
  }, [filters])

  const getAuthHeaders = () => {
    const token = localStorage.getItem('adminAccessToken')
    const sessionToken = localStorage.getItem('adminSessionToken')
    return {
      'Authorization': `Bearer ${token}`,
      'X-Session-Token': sessionToken,
      'Content-Type': 'application/json'
    }
  }

  const fetchBusinesses = async () => {
    try {
      setLoading(true)

      // Build query parameters
      const params = new URLSearchParams()
      if (filters.status !== 'all') params.append('status', filters.status)
      if (filters.search) params.append('search', filters.search)
      if (filters.region !== 'all') params.append('region', filters.region)
      if (filters.business_type !== 'all') params.append('business_type', filters.business_type)

      const response = await fetch(`${endpoints.baseURL}/api/admin/businesses?${params}`, {
        headers: getAuthHeaders()
      })

      if (response.ok) {
        const data = await response.json()
        setBusinesses(data.data.businesses || [])
      } else {
        setError('Failed to fetch businesses')
      }
    } catch (error) {
      console.error('Error fetching businesses:', error)
      setError('Failed to load businesses')
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = async (businessId, newStatus) => {
    try {
      const response = await fetch(`${endpoints.baseURL}/api/admin/businesses/${businessId}/status`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({ status: newStatus })
      })

      if (response.ok) {
        // Refresh businesses list
        fetchBusinesses()
      } else {
        setError('Failed to update business status')
      }
    } catch (error) {
      console.error('Error updating business status:', error)
      setError('Failed to update business status')
    }
  }

  const handleSelectBusiness = (businessId) => {
    setSelectedBusinesses(prev =>
      prev.includes(businessId)
        ? prev.filter(id => id !== businessId)
        : [...prev, businessId]
    )
  }

  const handleSelectAll = () => {
    if (selectedBusinesses.length === businesses.length) {
      setSelectedBusinesses([])
    } else {
      setSelectedBusinesses(businesses.map(b => b.public_id))
    }
  }

  const handleBulkApprove = async () => {
    try {
      const response = await fetch(`${endpoints.baseURL}/api/admin/businesses/bulk-update`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          business_ids: selectedBusinesses,
          action: 'approve'
        })
      })

      if (response.ok) {
        fetchBusinesses()
        setSelectedBusinesses([])
      } else {
        setError('Failed to approve businesses')
      }
    } catch (error) {
      console.error('Error approving businesses:', error)
      setError('Failed to approve businesses')
    }
  }

  const handleViewBusiness = (business) => {
    setSelectedBusiness(business)
    setShowModal(true)
  }

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { color: 'bg-green-100 text-green-800', text: 'Active - نشط' },
      pending: { color: 'bg-yellow-100 text-yellow-800', text: 'Pending - معلق' },
      suspended: { color: 'bg-red-100 text-red-800', text: 'Suspended - معلق' }
    }

    const config = statusConfig[status] || statusConfig.pending
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
        {config.text}
      </span>
    )
  }

  const getRegionName = (region) => {
    const regionMap = {
      'Central Region': 'المنطقة الوسطى',
      'Western Region': 'المنطقة الغربية',
      'Eastern Region': 'المنطقة الشرقية',
      'Saudi Arabia - All Regions': 'جميع مناطق السعودية'
    }
    return regionMap[region] || region
  }

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
        <p className="mt-2 text-gray-600">Loading businesses... جاري تحميل الأعمال</p>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Business Management - إدارة الأعمال
      </h2>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex">
            <span className="text-red-400 mr-2">⚠️</span>
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search - بحث
            </label>
            <input
              type="text"
              placeholder="Business name or email..."
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
            />
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status - الحالة
            </label>
            <select
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
            >
              <option value="all">All Statuses - جميع الحالات</option>
              <option value="active">Active - نشط</option>
              <option value="pending">Pending - معلق</option>
              <option value="suspended">Suspended - معلق</option>
            </select>
          </div>

          {/* Region Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Region - المنطقة
            </label>
            <select
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              value={filters.region}
              onChange={(e) => setFilters(prev => ({ ...prev, region: e.target.value }))}
            >
              <option value="all">All Regions - جميع المناطق</option>
              <option value="Central Region">Central - الوسطى</option>
              <option value="Western Region">Western - الغربية</option>
              <option value="Eastern Region">Eastern - الشرقية</option>
            </select>
          </div>

          {/* Business Type Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type - النوع
            </label>
            <select
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
              value={filters.business_type}
              onChange={(e) => setFilters(prev => ({ ...prev, business_type: e.target.value }))}
            >
              <option value="all">All Types - جميع الأنواع</option>
              <option value="Restaurant & Cafe">Restaurant - مطعم</option>
              <option value="Coffee Shop">Coffee Shop - مقهى</option>
              <option value="Bakery & Sweets">Bakery - مخبز</option>
            </select>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedBusinesses.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-800">
              {selectedBusinesses.length} businesses selected - {selectedBusinesses.length} أعمال محددة
            </span>
            <div className="space-x-2">
              <button
                onClick={handleBulkApprove}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm transition-colors"
              >
                Approve Selected - موافقة على المحدد
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Businesses Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedBusinesses.length === businesses.length && businesses.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Business - الأعمال
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status - الحالة
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Region - المنطقة
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Performance - الأداء
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions - الإجراءات
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {businesses.map((business) => (
                <tr key={business.public_id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedBusinesses.includes(business.public_id)}
                      onChange={() => handleSelectBusiness(business.public_id)}
                      className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {business.business_name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {business.email}
                      </div>
                      <div className="text-xs text-gray-400">
                        Owner: {business.owner_name}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(business.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {getRegionName(business.region)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="space-y-1">
                      <div>{business.total_branches} branches - فرع</div>
                      <div>{business.total_customers} customers - عميل</div>
                      <div>{business.total_offers} offers - عرض</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                    <button
                      onClick={() => handleViewBusiness(business)}
                      className="text-purple-600 hover:text-purple-900 font-medium"
                    >
                      View - عرض
                    </button>
                    {business.status === 'pending' && (
                      <button
                        onClick={() => handleStatusChange(business.public_id, 'active')}
                        className="text-green-600 hover:text-green-900 font-medium"
                      >
                        Approve - موافقة
                      </button>
                    )}
                    {business.status === 'active' && (
                      <button
                        onClick={() => handleStatusChange(business.public_id, 'suspended')}
                        className="text-red-600 hover:text-red-900 font-medium"
                      >
                        Suspend - تعليق
                      </button>
                    )}
                    {business.status === 'suspended' && (
                      <button
                        onClick={() => handleStatusChange(business.public_id, 'active')}
                        className="text-green-600 hover:text-green-900 font-medium"
                      >
                        Activate - تفعيل
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {businesses.length === 0 && !loading && (
          <div className="text-center py-8">
            <div className="text-gray-400 text-4xl mb-4">🏢</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No businesses found</h3>
            <p className="text-gray-500">لا توجد أعمال تجارية مطابقة للفلاتر المحددة</p>
          </div>
        )}
      </div>

      {/* Business Detail Modal */}
      {showModal && selectedBusiness && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-screen overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Business Details - تفاصيل الأعمال
                </h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Business Name</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedBusiness.business_name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <div className="mt-1">{getStatusBadge(selectedBusiness.status)}</div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Owner</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedBusiness.owner_name}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phone</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedBusiness.phone}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedBusiness.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">License Number</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedBusiness.license_number}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Business Type</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedBusiness.business_type}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Region</label>
                    <p className="mt-1 text-sm text-gray-900">{getRegionName(selectedBusiness.region)}</p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium text-gray-900 mb-2">Performance Metrics - مقاييس الأداء</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-purple-600">{selectedBusiness.total_branches}</div>
                      <div className="text-sm text-gray-500">Branches - فروع</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-green-600">{selectedBusiness.total_customers}</div>
                      <div className="text-sm text-gray-500">Customers - عملاء</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-600">{selectedBusiness.total_offers}</div>
                      <div className="text-sm text-gray-500">Offers - عروض</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-orange-600">{selectedBusiness.total_redemptions}</div>
                      <div className="text-sm text-gray-500">Redemptions - استردادات</div>
                    </div>
                  </div>
                </div>

                {selectedBusiness.suspension_reason && (
                  <div className="border-t pt-4">
                    <h4 className="font-medium text-gray-900 mb-2">Suspension Reason - سبب التعليق</h4>
                    <p className="text-sm text-red-600">{selectedBusiness.suspension_reason}</p>
                  </div>
                )}
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowModal(false)}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-md"
                >
                  Close - إغلاق
                </button>
                {selectedBusiness.status === 'pending' && (
                  <button
                    onClick={() => {
                      handleStatusChange(selectedBusiness.public_id, 'active')
                      setShowModal(false)
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md"
                  >
                    Approve - موافقة
                  </button>
                )}
                {selectedBusiness.status === 'suspended' && (
                  <button
                    onClick={() => {
                      handleStatusChange(selectedBusiness.public_id, 'active')
                      setShowModal(false)
                    }}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md"
                  >
                    Activate - تفعيل
                  </button>
                )}
                {selectedBusiness.status === 'active' && (
                  <button
                    onClick={() => {
                      handleStatusChange(selectedBusiness.public_id, 'suspended')
                      setShowModal(false)
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md"
                  >
                    Suspend - تعليق
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default BusinessesTable