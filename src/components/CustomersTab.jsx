import { useState, useEffect } from 'react'
import { endpoints, secureApi } from '../config/api'

function CustomersTab() {
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [analytics, setAnalytics] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [selectedCustomers, setSelectedCustomers] = useState(new Set())

  // Load customers and analytics on component mount
  useEffect(() => {
    loadCustomers()
    loadCustomerAnalytics()
  }, [])

  const loadCustomers = async () => {
    try {
      setLoading(true)
      setError('')
      console.log('🔒 Loading customers with secure authentication...')

      const response = await secureApi.get(endpoints.customers)
      const data = await response.json()

      if (data.success) {
        // Map API response to expected format
        const customersData = data.data.customers.map(customer => ({
          customer_id: customer.customer_id,
          name: `${customer.first_name} ${customer.last_name}`,
          email: customer.email,
          phone: customer.phone,
          status: customer.status,
          lifecycle_stage: customer.lifecycle_stage || 'new_customer',
          total_visits: customer.total_visits || 0,
          total_stamps_earned: customer.total_stamps_earned || 0,
          total_rewards_claimed: customer.total_rewards_claimed || 0,
          total_lifetime_value: parseFloat(customer.total_lifetime_value || 0),
          last_activity_date: customer.last_activity_date || customer.created_at,
          created_at: customer.created_at
        }))

        setCustomers(customersData)
        console.log('🔒 Customers loaded successfully:', customersData.length)
      } else {
        throw new Error(data.message || 'Failed to load customers')
      }

    } catch (err) {
      console.error('Failed to load customers:', err)
      setError('Failed to load customers: ' + err.message)

      // Fallback to empty array on error
      setCustomers([])
    } finally {
      setLoading(false)
    }
  }

  const loadCustomerAnalytics = async () => {
    try {
      console.log('🔒 Loading customer analytics...')

      const response = await secureApi.get(endpoints.customerAnalytics)
      const data = await response.json()

      if (data.success) {
        const analyticsData = data.data.analytics
        setAnalytics({
          totalCustomers: analyticsData.total_customers || 0,
          activeCustomers: analyticsData.active_customers || 0,
          newThisMonth: analyticsData.new_this_month || 0,
          vipCustomers: analyticsData.vip_customers || 0,
          avgLifetimeValue: parseFloat(analyticsData.avg_lifetime_value || 0),
          avgEngagementScore: analyticsData.avg_engagement_score || 0
        })
        console.log('🔒 Customer analytics loaded successfully')
      } else {
        throw new Error(data.message || 'Failed to load analytics')
      }
    } catch (err) {
      console.error('Failed to load customer analytics:', err)
      // Use fallback data on error
      setAnalytics({
        totalCustomers: 0,
        activeCustomers: 0,
        newThisMonth: 0,
        vipCustomers: 0,
        avgLifetimeValue: 0,
        avgEngagementScore: 0
      })
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/20'
      case 'vip': return 'text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/20'
      case 'inactive': return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-700'
      case 'churning': return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/20'
      default: return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-700'
    }
  }

  const getLifecycleIcon = (stage) => {
    switch (stage) {
      case 'new_customer': return '🌱'
      case 'repeat_customer': return '🔄'
      case 'loyal_customer': return '❤️'
      case 'vip_customer': return '👑'
      default: return '👤'
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'SAR'
    }).format(amount)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // Filter customers based on search and status
  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = !searchTerm ||
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.includes(searchTerm)

    const matchesStatus = filterStatus === 'all' || customer.status === filterStatus

    return matchesSearch && matchesStatus
  })

  const toggleCustomerSelection = (customerId) => {
    const newSelected = new Set(selectedCustomers)
    if (newSelected.has(customerId)) {
      newSelected.delete(customerId)
    } else {
      newSelected.add(customerId)
    }
    setSelectedCustomers(newSelected)
  }

  const selectAllCustomers = () => {
    if (selectedCustomers.size === filteredCustomers.length) {
      setSelectedCustomers(new Set())
    } else {
      setSelectedCustomers(new Set(filteredCustomers.map(c => c.customer_id)))
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">Loading customers...</p>
      </div>
    )
  }

  return (
    <div>
      {/* Header Section */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Customer Management</h2>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your customers and send targeted notifications</p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <div className="flex items-center">
            <span className="text-red-600 dark:text-red-400 mr-3">⚠️</span>
            <span className="text-red-800 dark:text-red-300">{error}</span>
          </div>
        </div>
      )}

      <div className="space-y-8">
        {/* Analytics Cards */}
        {analytics && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-primary to-blue-600 text-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">👥</span>
                </div>
              </div>
              <div className="text-3xl font-bold mb-2">{analytics.totalCustomers}</div>
              <div className="text-white/80 text-sm">Total Customers</div>
            </div>

            <div className="bg-gradient-to-br from-green-500 to-emerald-600 text-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">✅</span>
                </div>
              </div>
              <div className="text-3xl font-bold mb-2">{analytics.activeCustomers}</div>
              <div className="text-white/80 text-sm">Active Customers</div>
            </div>

            <div className="bg-gradient-to-br from-purple-500 to-indigo-600 text-white rounded-xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-white/20 rounded-lg flex items-center justify-center">
                  <span className="text-2xl">👑</span>
                </div>
              </div>
              <div className="text-3xl font-bold mb-2">{analytics.vipCustomers}</div>
              <div className="text-white/80 text-sm">VIP Customers</div>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            {/* Search Input */}
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Search customers by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>

            {/* Status Filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="vip">VIP</option>
              <option value="inactive">Inactive</option>
              <option value="churning">At Risk</option>
            </select>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                disabled={selectedCustomers.size === 0}
                className="px-4 py-3 bg-primary hover:bg-primary/90 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors duration-200 flex items-center space-x-2"
              >
                <span className="text-sm">📧</span>
                <span>Send Notification</span>
              </button>
              <button className="px-4 py-3 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium transition-colors duration-200">
                Export
              </button>
            </div>
          </div>

          {/* Selected Count */}
          {selectedCustomers.size > 0 && (
            <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <span className="text-blue-800 dark:text-blue-300 text-sm">
                {selectedCustomers.size} customer{selectedCustomers.size !== 1 ? 's' : ''} selected
              </span>
            </div>
          )}

          {/* Customer Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700">
                  <th className="text-left py-3 px-2">
                    <input
                      type="checkbox"
                      checked={selectedCustomers.size === filteredCustomers.length && filteredCustomers.length > 0}
                      onChange={selectAllCustomers}
                      className="rounded border-gray-300 text-primary focus:ring-primary"
                    />
                  </th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-gray-700 dark:text-gray-300">Customer</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-gray-700 dark:text-gray-300">Status</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-gray-700 dark:text-gray-300">Activity</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-gray-700 dark:text-gray-300">Value</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-gray-700 dark:text-gray-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer, index) => (
                  <tr
                    key={customer.customer_id}
                    className={`border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 ${
                      index === filteredCustomers.length - 1 ? 'border-b-0' : ''
                    }`}
                  >
                    <td className="py-4 px-2">
                      <input
                        type="checkbox"
                        checked={selectedCustomers.has(customer.customer_id)}
                        onChange={() => toggleCustomerSelection(customer.customer_id)}
                        className="rounded border-gray-300 text-primary focus:ring-primary"
                      />
                    </td>
                    <td className="py-4 px-2">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-primary to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                          {customer.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">{customer.name}</div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">{customer.email}</div>
                          <div className="text-xs text-gray-400 dark:text-gray-500">{customer.phone}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-2">
                      <div className="space-y-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(customer.status)}`}>
                          {customer.status}
                        </span>
                        <div className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400">
                          <span>{getLifecycleIcon(customer.lifecycle_stage)}</span>
                          <span>{customer.lifecycle_stage.replace('_', ' ')}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-2">
                      <div className="text-sm space-y-1">
                        <div className="text-gray-900 dark:text-white">{customer.total_visits} visits</div>
                        <div className="text-gray-500 dark:text-gray-400">{customer.total_stamps_earned} stamps</div>
                        <div className="text-xs text-gray-400 dark:text-gray-500">
                          Last: {formatDate(customer.last_activity_date)}
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-2">
                      <div className="text-sm space-y-1">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {formatCurrency(customer.total_lifetime_value)}
                        </div>
                        <div className="text-gray-500 dark:text-gray-400">
                          {customer.total_rewards_claimed} rewards
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-2">
                      <div className="flex items-center space-x-2">
                        <button className="p-2 text-gray-400 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <button className="p-2 text-gray-400 hover:text-primary hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredCustomers.length === 0 && (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl">👥</span>
                </div>
                <h3 className="text-lg font-medium text-gray-600 dark:text-gray-400 mb-2">No customers found</h3>
                <p className="text-gray-500 dark:text-gray-400">
                  {searchTerm || filterStatus !== 'all'
                    ? 'Try adjusting your search or filter criteria.'
                    : 'Customers will appear here as they sign up for your loyalty program.'
                  }
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
          <h3 className="font-semibold text-blue-800 dark:text-blue-300 mb-4 flex items-center">
            <span className="mr-2">🚀</span>
            Quick Actions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button className="flex items-center space-x-3 p-4 bg-white dark:bg-gray-800 rounded-xl hover:shadow-md transition-all duration-200 text-left">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/40 rounded-lg flex items-center justify-center">
                <span className="text-xl">🎂</span>
              </div>
              <div>
                <div className="font-medium text-gray-900 dark:text-white">Birthday Offers</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Send to upcoming birthdays</div>
              </div>
            </button>
            <button className="flex items-center space-x-3 p-4 bg-white dark:bg-gray-800 rounded-xl hover:shadow-md transition-all duration-200 text-left">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/40 rounded-lg flex items-center justify-center">
                <span className="text-xl">📧</span>
              </div>
              <div>
                <div className="font-medium text-gray-900 dark:text-white">Re-engagement</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Win back inactive customers</div>
              </div>
            </button>
            <button className="flex items-center space-x-3 p-4 bg-white dark:bg-gray-800 rounded-xl hover:shadow-md transition-all duration-200 text-left">
              <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/40 rounded-lg flex items-center justify-center">
                <span className="text-xl">👑</span>
              </div>
              <div>
                <div className="font-medium text-gray-900 dark:text-white">VIP Rewards</div>
                <div className="text-sm text-gray-500 dark:text-gray-400">Special offers for VIP customers</div>
              </div>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default CustomersTab