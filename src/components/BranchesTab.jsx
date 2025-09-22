import { useState } from 'react'

function BranchesTab() {
  const [branches, setBranches] = useState([
    {
      id: 1,
      name: "Downtown Branch",
      address: "123 Main Street, Downtown",
      city: "New York",
      state: "NY",
      zipCode: "10001",
      phone: "(555) 123-4567",
      email: "downtown@johnspizza.com",
      manager: "Sarah Johnson",
      status: "active",
      isMain: true,
      customers: 247,
      activeOffers: 3,
      monthlyRevenue: 25000,
      openingHours: {
        monday: "9:00 AM - 10:00 PM",
        tuesday: "9:00 AM - 10:00 PM",
        wednesday: "9:00 AM - 10:00 PM",
        thursday: "9:00 AM - 10:00 PM",
        friday: "9:00 AM - 11:00 PM",
        saturday: "10:00 AM - 11:00 PM",
        sunday: "10:00 AM - 9:00 PM"
      },
      createdAt: "2023-06-01"
    },
    {
      id: 2,
      name: "Westside Branch",
      address: "456 Oak Avenue, Westside",
      city: "New York",
      state: "NY",
      zipCode: "10002",
      phone: "(555) 987-6543",
      email: "westside@johnspizza.com",
      manager: "Mike Rodriguez",
      status: "active",
      isMain: false,
      customers: 89,
      activeOffers: 2,
      monthlyRevenue: 12000,
      openingHours: {
        monday: "10:00 AM - 9:00 PM",
        tuesday: "10:00 AM - 9:00 PM",
        wednesday: "10:00 AM - 9:00 PM",
        thursday: "10:00 AM - 9:00 PM",
        friday: "10:00 AM - 10:00 PM",
        saturday: "11:00 AM - 10:00 PM",
        sunday: "11:00 AM - 8:00 PM"
      },
      createdAt: "2023-08-15"
    },
    {
      id: 3,
      name: "Northside Branch",
      address: "789 Pine Street, Northside",
      city: "New York",
      state: "NY",
      zipCode: "10003",
      phone: "(555) 456-7890",
      email: "northside@johnspizza.com",
      manager: "Lisa Chen",
      status: "inactive",
      isMain: false,
      customers: 45,
      activeOffers: 0,
      monthlyRevenue: 0,
      openingHours: {
        monday: "Closed",
        tuesday: "Closed",
        wednesday: "Closed",
        thursday: "Closed",
        friday: "Closed",
        saturday: "Closed",
        sunday: "Closed"
      },
      createdAt: "2023-12-01"
    }
  ])

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null)
  const [viewMode, setViewMode] = useState('cards') // 'cards' or 'table'

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800'
      case 'inactive': return 'bg-red-100 text-red-800'
      case 'maintenance': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active': return '🟢'
      case 'inactive': return '🔴'
      case 'maintenance': return '🟡'
      default: return '⚪'
    }
  }

  const toggleBranchStatus = (branchId) => {
    setBranches(branches.map(branch => {
      if (branch.id === branchId) {
        const newStatus = branch.status === 'active' ? 'inactive' : 'active'
        return { ...branch, status: newStatus }
      }
      return branch
    }))
  }

  const deleteBranch = (branchId) => {
    const branch = branches.find(b => b.id === branchId)

    // Safety checks
    if (branch.isMain) {
      alert("Cannot delete the main branch!")
      setShowDeleteConfirm(null)
      return
    }

    if (branches.filter(b => b.status === 'active').length <= 1) {
      alert("Cannot delete the last active branch!")
      setShowDeleteConfirm(null)
      return
    }

    if (branch.activeOffers > 0) {
      alert("Cannot delete branch with active offers! Please reassign or pause offers first.")
      setShowDeleteConfirm(null)
      return
    }

    setBranches(branches.filter(branch => branch.id !== branchId))
    setShowDeleteConfirm(null)
  }

  const duplicateBranch = (branchId) => {
    const branch = branches.find(b => b.id === branchId)
    if (branch) {
      const newBranch = {
        ...branch,
        id: Math.max(...branches.map(b => b.id)) + 1,
        name: `${branch.name} (Copy)`,
        isMain: false,
        customers: 0,
        activeOffers: 0,
        monthlyRevenue: 0,
        status: 'inactive',
        createdAt: new Date().toISOString().split('T')[0]
      }
      setBranches([newBranch, ...branches])
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString()
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-semibold">Branch Management</h2>
          <p className="text-gray-600">Manage your business locations and track performance</p>
        </div>
        <div className="flex items-center space-x-3">
          {/* View Toggle */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('cards')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                viewMode === 'cards' ? 'bg-white text-primary shadow-sm' : 'text-gray-600'
              }`}
            >
              📱 Cards
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                viewMode === 'table' ? 'bg-white text-primary shadow-sm' : 'text-gray-600'
              }`}
            >
              📊 Table
            </button>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary"
          >
            + Add New Branch
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="text-2xl font-bold text-primary">{branches.length}</div>
          <div className="text-gray-600 text-sm">Total Branches</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="text-2xl font-bold text-green-600">
            {branches.filter(b => b.status === 'active').length}
          </div>
          <div className="text-gray-600 text-sm">Active Locations</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="text-2xl font-bold text-blue-600">
            {branches.reduce((sum, b) => sum + b.customers, 0)}
          </div>
          <div className="text-gray-600 text-sm">Total Customers</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="text-2xl font-bold text-accent">
            {formatCurrency(branches.reduce((sum, b) => sum + b.monthlyRevenue, 0))}
          </div>
          <div className="text-gray-600 text-sm">Monthly Revenue</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex space-x-4 mb-6">
        <select className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
          <option>All Status</option>
          <option>Active</option>
          <option>Inactive</option>
          <option>Maintenance</option>
        </select>
        <select className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary">
          <option>All Cities</option>
          <option>New York</option>
          <option>Brooklyn</option>
          <option>Queens</option>
        </select>
        <input
          type="text"
          placeholder="Search branches..."
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      {/* Branches List */}
      {viewMode === 'cards' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {branches.map((branch) => (
            <div key={branch.id} className="bg-white rounded-lg shadow border hover:shadow-lg transition-shadow">
              <div className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-lg font-semibold">{branch.name}</h3>
                      {branch.isMain && (
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-medium">
                          🏠 Main
                        </span>
                      )}
                    </div>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(branch.status)}`}>
                      {getStatusIcon(branch.status)} {branch.status.charAt(0).toUpperCase() + branch.status.slice(1)}
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => toggleBranchStatus(branch.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        branch.status === 'active'
                          ? 'text-red-600 hover:bg-red-50'
                          : 'text-green-600 hover:bg-green-50'
                      }`}
                      title={branch.status === 'active' ? 'Deactivate Branch' : 'Activate Branch'}
                    >
                      {branch.status === 'active' ? '⏸️' : '▶️'}
                    </button>

                    <button
                      onClick={() => setShowEditModal(branch)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Edit Branch"
                    >
                      ✏️
                    </button>

                    <button
                      onClick={() => duplicateBranch(branch.id)}
                      className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                      title="Duplicate Branch"
                    >
                      📋
                    </button>

                    {!branch.isMain && (
                      <button
                        onClick={() => setShowDeleteConfirm(branch.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete Branch"
                      >
                        🗑️
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <div className="flex items-center">
                    <span className="w-4">📍</span>
                    <span className="ml-2">{branch.address}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="w-4">📞</span>
                    <span className="ml-2">{branch.phone}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="w-4">👤</span>
                    <span className="ml-2">{branch.manager}</span>
                  </div>
                </div>

                {/* Performance Metrics */}
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="text-center">
                    <div className="text-lg font-bold text-primary">{branch.customers}</div>
                    <div className="text-xs text-gray-500">Customers</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-600">{branch.activeOffers}</div>
                    <div className="text-xs text-gray-500">Active Offers</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-accent">
                      {formatCurrency(branch.monthlyRevenue)}
                    </div>
                    <div className="text-xs text-gray-500">Monthly</div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex space-x-2">
                  <button className="flex-1 text-xs px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors">
                    📊 Analytics
                  </button>
                  <button className="flex-1 text-xs px-3 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors">
                    🎯 Manage Offers
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Table View */
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Branch
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Manager
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Performance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {branches.map((branch) => (
                <tr key={branch.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="flex items-center">
                        <div className="text-sm font-medium text-gray-900">{branch.name}</div>
                        {branch.isMain && (
                          <span className="ml-2 bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">Main</span>
                        )}
                      </div>
                      <div className="text-sm text-gray-500">{branch.address}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(branch.status)}`}>
                      {getStatusIcon(branch.status)} {branch.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {branch.manager}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div>{branch.customers} customers</div>
                    <div>{formatCurrency(branch.monthlyRevenue)}/month</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => toggleBranchStatus(branch.id)}
                        className="text-primary hover:text-blue-600"
                      >
                        {branch.status === 'active' ? 'Pause' : 'Activate'}
                      </button>
                      <button
                        onClick={() => setShowEditModal(branch)}
                        className="text-primary hover:text-blue-600"
                      >
                        Edit
                      </button>
                      {!branch.isMain && (
                        <button
                          onClick={() => setShowDeleteConfirm(branch.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

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
          onSave={(branchData) => {
            if (showEditModal) {
              setBranches(branches.map(b => b.id === showEditModal.id ? {...b, ...branchData} : b))
            } else {
              const newBranch = {
                ...branchData,
                id: Math.max(...branches.map(b => b.id)) + 1,
                customers: 0,
                activeOffers: 0,
                monthlyRevenue: 0,
                status: 'inactive',
                createdAt: new Date().toISOString().split('T')[0]
              }
              setBranches([newBranch, ...branches])
            }
            setShowCreateModal(false)
            setShowEditModal(null)
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
    zipCode: branch?.zipCode || '',
    phone: branch?.phone || '',
    email: branch?.email || '',
    manager: branch?.manager || '',
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">
          {branch ? 'Edit Branch' : 'Add New Branch'}
        </h3>

        {/* Tab Navigation */}
        <div className="flex space-x-4 mb-6 border-b">
          <button
            onClick={() => setActiveTab('basic')}
            className={`pb-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'basic' ? 'border-primary text-primary' : 'border-transparent text-gray-500'
            }`}
          >
            Basic Info
          </button>
          <button
            onClick={() => setActiveTab('hours')}
            className={`pb-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'hours' ? 'border-primary text-primary' : 'border-transparent text-gray-500'
            }`}
          >
            Operating Hours
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {activeTab === 'basic' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Branch Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="e.g., Downtown Branch"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Manager
                  </label>
                  <input
                    type="text"
                    value={formData.manager}
                    onChange={(e) => setFormData({...formData, manager: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="Manager name"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address *
                </label>
                <input
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  placeholder="Street address"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    City *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({...formData, city: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    State *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.state}
                    onChange={(e) => setFormData({...formData, state: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ZIP Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.zipCode}
                    onChange={(e) => setFormData({...formData, zipCode: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="(555) 123-4567"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="branch@business.com"
                  />
                </div>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isMain"
                  checked={formData.isMain}
                  onChange={(e) => setFormData({...formData, isMain: e.target.checked})}
                  className="h-4 w-4 text-primary focus:ring-primary border-gray-300 rounded"
                />
                <label htmlFor="isMain" className="ml-2 text-sm text-gray-700">
                  Set as main branch
                </label>
              </div>
            </div>
          )}

          {activeTab === 'hours' && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600 mb-4">
                Set operating hours for this branch. Leave blank or enter "Closed" for closed days.
              </p>
              {days.map((day) => (
                <div key={day} className="grid grid-cols-2 gap-4 items-center">
                  <label className="text-sm font-medium text-gray-700 capitalize">
                    {day}
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
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                    placeholder="9:00 AM - 5:00 PM or Closed"
                  />
                </div>
              ))}
            </div>
          )}

          <div className="flex space-x-3 pt-6 mt-6 border-t">
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
              {branch ? 'Update Branch' : 'Add Branch'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default BranchesTab