import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { endpoints, secureApi } from '../config/api'

function CampaignBuilder({ onClose, onSuccess, initialData = null }) {
  const { t } = useTranslation()
  
  // State management
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [createdCampaign, setCreatedCampaign] = useState(null)
  const [segments, setSegments] = useState([])
  const [offers, setOffers] = useState([])
  const [validationErrors, setValidationErrors] = useState({})
  
  const [formData, setFormData] = useState(initialData || {
    name: '',
    description: '',
    campaign_type: '',
    target_type: 'all_customers',
    target_segment_id: null,
    target_criteria: {},
    linked_offer_id: null,
    message_header: '',
    message_body: '',
    channels: ['wallet'],
    send_immediately: true,
    scheduled_at: null,
    tags: []
  })

  // Character limits
  const HEADER_LIMIT = 50
  const BODY_LIMIT = 200

  // Load segments and offers on mount
  useEffect(() => {
    loadSegments()
    loadOffers()
  }, [])

  const loadSegments = async () => {
    try {
      const response = await secureApi.get(endpoints.segments)
      const data = await response.json()
      if (data.success && data.data) {
        const segmentsArray = data.data.segments || []
        const activeSegments = segmentsArray.filter(s => s.is_active)
        setSegments(activeSegments)
      }
    } catch (err) {
      console.error('Failed to load segments:', err)
    }
  }

  const loadOffers = async () => {
    try {
      const response = await secureApi.get(endpoints.myOffers)
      const data = await response.json()
      if (data.success && data.data) {
        // Handle both array and object shapes
        let offersArray = []
        
        if (Array.isArray(data.data)) {
          offersArray = data.data
        } else if (data.data.offers && Array.isArray(data.data.offers)) {
          offersArray = data.data.offers
        }
        
        const activeOffers = offersArray.filter(o => o.is_active)
        setOffers(activeOffers)
      }
    } catch (err) {
      console.error('Failed to load offers:', err)
    }
  }

  // Validation functions
  const validateStep = (step) => {
    const errors = {}
    
    if (step === 1) {
      if (!formData.name.trim()) errors.name = 'Campaign name is required'
      if (!formData.campaign_type) errors.campaign_type = 'Campaign type is required'
    }
    
    if (step === 2) {
      if (!formData.target_type) errors.target_type = 'Target type is required'
      if (formData.target_type === 'segment' && !formData.target_segment_id) {
        errors.target_segment_id = 'Please select a segment'
      }
      if (formData.target_type === 'custom_filter' && Object.keys(formData.target_criteria).length === 0) {
        errors.target_criteria = 'Please define custom criteria'
      }
    }
    
    if (step === 3) {
      if (!formData.message_header.trim()) errors.message_header = 'Header is required'
      if (formData.message_header.length > HEADER_LIMIT) {
        errors.message_header = `Header must be ${HEADER_LIMIT} characters or less`
      }
      if (!formData.message_body.trim()) errors.message_body = 'Message body is required'
      if (formData.message_body.length > BODY_LIMIT) {
        errors.message_body = `Body must be ${BODY_LIMIT} characters or less`
      }
    }
    
    if (step === 4) {
      if (!formData.send_immediately && !formData.scheduled_at) {
        errors.scheduled_at = 'Please select a schedule date'
      }
      if (formData.scheduled_at && new Date(formData.scheduled_at) <= new Date()) {
        errors.scheduled_at = 'Schedule date must be in the future'
      }
    }
    
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1)
    }
  }

  const handleBack = () => {
    setCurrentStep(prev => prev - 1)
  }

  const handleSubmit = async () => {
    if (!validateStep(4)) return

    setLoading(true)
    setError('')

    try {
      const payload = {
        name: formData.name,
        description: formData.description,
        campaign_type: formData.campaign_type,
        message_header: formData.message_header,
        message_body: formData.message_body,
        target_type: formData.target_type,
        target_segment_id: formData.target_segment_id,
        target_criteria: formData.target_criteria,
        linked_offer_id: formData.linked_offer_id,
        channels: formData.channels,
        send_immediately: formData.send_immediately,
        scheduled_at: formData.scheduled_at,
        tags: formData.tags
      }

      const response = await secureApi.post(endpoints.notificationCampaignsPromotional, payload)
      const data = await response.json()

      if (data.success) {
        setSuccess(true)
        setCreatedCampaign(data.data.campaign)
        if (onSuccess) {
          onSuccess(data.data.campaign)
        }
      } else {
        setError(data.message || 'Failed to create campaign')
      }
    } catch (err) {
      console.error('Campaign creation error:', err)
      setError(err.message || 'Failed to create campaign')
    } finally {
      setLoading(false)
    }
  }

  const getPlaceholder = (field) => {
    const placeholders = {
      new_offer_announcement: {
        header: '🎁 New Offer Available!',
        body: 'Check out our latest promotion just for you!'
      },
      custom_promotion: {
        header: '✨ Special Promotion',
        body: 'Exclusive offer for our valued customers!'
      },
      seasonal_campaign: {
        header: '🎉 Seasonal Special',
        body: 'Celebrate with us this season with amazing rewards!'
      }
    }
    
    return placeholders[formData.campaign_type]?.[field] || ''
  }

  // Success View
  if (success && createdCampaign) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-8 text-center">
            <div className="text-6xl mb-4">✅</div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              Campaign Created Successfully!
            </h2>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              {formData.send_immediately 
                ? 'Your campaign has been created and is being sent to customers.'
                : 'Your campaign has been scheduled and will be sent at the specified time.'}
            </p>
            
            <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-6 mb-6 text-left">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Campaign Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Campaign ID:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{createdCampaign.campaign_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Name:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{createdCampaign.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Type:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{createdCampaign.campaign_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Status:</span>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    createdCampaign.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {createdCampaign.status}
                  </span>
                </div>
                {createdCampaign.total_recipients && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Recipients:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{createdCampaign.total_recipients}</span>
                  </div>
                )}
                {formData.send_immediately && createdCampaign.total_sent !== undefined && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Sent:</span>
                      <span className="font-medium text-green-600">{createdCampaign.total_sent}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Failed:</span>
                      <span className="font-medium text-red-600">{createdCampaign.total_failed || 0}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => {
                  setSuccess(false)
                  setCreatedCampaign(null)
                  setCurrentStep(1)
                  setFormData({
                    name: '',
                    description: '',
                    campaign_type: '',
                    target_type: 'all_customers',
                    target_segment_id: null,
                    target_criteria: {},
                    linked_offer_id: null,
                    message_header: '',
                    message_body: '',
                    channels: ['wallet'],
                    send_immediately: true,
                    scheduled_at: null,
                    tags: []
                  })
                }}
                className="flex-1 px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-medium transition-colors"
              >
                Create Another Campaign
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Create Promotional Campaign
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Step {currentStep} of 4
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress Indicator */}
        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center justify-between">
            {[1, 2, 3, 4].map((step) => (
              <div key={step} className="flex items-center flex-1">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                  step <= currentStep
                    ? 'bg-primary border-primary text-white'
                    : 'border-gray-300 dark:border-gray-600 text-gray-400'
                }`}>
                  {step}
                </div>
                {step < 4 && (
                  <div className={`flex-1 h-1 mx-2 ${
                    step < currentStep ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'
                  }`} />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-xs text-gray-600 dark:text-gray-400">
            <span>Type</span>
            <span>Target</span>
            <span>Message</span>
            <span>Schedule</span>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mx-6 mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl">
            <div className="flex items-center">
              <span className="text-red-600 dark:text-red-400 mr-3">⚠️</span>
              <span className="text-red-800 dark:text-red-300">{error}</span>
            </div>
          </div>
        )}

        {/* Form Content */}
        <form className="p-6 space-y-6">
          {/* Step 1: Campaign Type */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Campaign Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Summer Sale Announcement"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                {validationErrors.name && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief description of the campaign..."
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Campaign Type *
                </label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, campaign_type: 'new_offer_announcement' })}
                    className={`p-4 border-2 rounded-xl text-left transition-all ${
                      formData.campaign_type === 'new_offer_announcement'
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-3xl mb-2">🎁</div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                      New Offer Announcement
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Announce a new offer or promotion to your customers
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, campaign_type: 'custom_promotion' })}
                    className={`p-4 border-2 rounded-xl text-left transition-all ${
                      formData.campaign_type === 'custom_promotion'
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-3xl mb-2">💬</div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                      Custom Promotion
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Create a custom promotional message for any occasion
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, campaign_type: 'seasonal_campaign' })}
                    className={`p-4 border-2 rounded-xl text-left transition-all ${
                      formData.campaign_type === 'seasonal_campaign'
                        ? 'border-primary bg-primary/5'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-3xl mb-2">🎉</div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-1">
                      Seasonal Campaign
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Seasonal promotions like holidays, events, or special occasions
                    </p>
                  </button>
                </div>
                {validationErrors.campaign_type && (
                  <p className="mt-2 text-sm text-red-600">{validationErrors.campaign_type}</p>
                )}
              </div>

              {formData.campaign_type === 'new_offer_announcement' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Link to Offer (Optional)
                  </label>
                  <select
                    value={formData.linked_offer_id || ''}
                    onChange={(e) => setFormData({ ...formData, linked_offer_id: e.target.value || null })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="">No linked offer</option>
                    {offers.map((offer) => (
                      <option key={offer.public_id} value={offer.public_id}>
                        {offer.title} ({offer.stamps_required} stamps)
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Link an offer to track conversions from this campaign
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Targeting */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Target Audience *
                </label>
                <div className="space-y-3">
                  <label className={`flex items-start p-4 border-2 rounded-xl cursor-pointer transition-all ${
                    formData.target_type === 'all_customers'
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}>
                    <input
                      type="radio"
                      name="target_type"
                      value="all_customers"
                      checked={formData.target_type === 'all_customers'}
                      onChange={(e) => setFormData({ ...formData, target_type: e.target.value })}
                      className="mt-1 mr-3"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">👥</span>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          All Customers
                        </h3>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Send to all active customers in your database
                      </p>
                    </div>
                  </label>

                  <label className={`flex items-start p-4 border-2 rounded-xl cursor-pointer transition-all ${
                    formData.target_type === 'segment'
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}>
                    <input
                      type="radio"
                      name="target_type"
                      value="segment"
                      checked={formData.target_type === 'segment'}
                      onChange={(e) => setFormData({ ...formData, target_type: e.target.value })}
                      className="mt-1 mr-3"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">🎯</span>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          Specific Segment
                        </h3>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Target a specific customer segment
                      </p>
                      {formData.target_type === 'segment' && (
                        <select
                          value={formData.target_segment_id || ''}
                          onChange={(e) => setFormData({ ...formData, target_segment_id: e.target.value })}
                          className="mt-3 w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                          <option value="">Select a segment...</option>
                          {segments.map((segment) => (
                            <option key={segment.segment_id} value={segment.segment_id}>
                              {segment.name} ({segment.customer_count || 0} customers)
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </label>

                  <label className={`flex items-start p-4 border-2 rounded-xl cursor-pointer transition-all ${
                    formData.target_type === 'custom_filter'
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                  }`}>
                    <input
                      type="radio"
                      name="target_type"
                      value="custom_filter"
                      checked={formData.target_type === 'custom_filter'}
                      onChange={(e) => setFormData({ ...formData, target_type: e.target.value })}
                      className="mt-1 mr-3"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">🔍</span>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          Custom Filter
                        </h3>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Define custom targeting criteria
                      </p>
                      {formData.target_type === 'custom_filter' && (
                        <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-sm text-gray-600 dark:text-gray-400">
                          Custom filter builder coming soon. Use segments for now.
                        </div>
                      )}
                    </div>
                  </label>
                </div>
                {validationErrors.target_type && (
                  <p className="mt-2 text-sm text-red-600">{validationErrors.target_type}</p>
                )}
                {validationErrors.target_segment_id && (
                  <p className="mt-2 text-sm text-red-600">{validationErrors.target_segment_id}</p>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Message Composition */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Message Header * ({formData.message_header.length}/{HEADER_LIMIT})
                </label>
                <input
                  type="text"
                  value={formData.message_header}
                  onChange={(e) => setFormData({ ...formData, message_header: e.target.value.slice(0, HEADER_LIMIT) })}
                  placeholder={getPlaceholder('header')}
                  maxLength={HEADER_LIMIT}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
                />
                {validationErrors.message_header && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.message_header}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Message Body * ({formData.message_body.length}/{BODY_LIMIT})
                </label>
                <textarea
                  value={formData.message_body}
                  onChange={(e) => setFormData({ ...formData, message_body: e.target.value.slice(0, BODY_LIMIT) })}
                  placeholder={getPlaceholder('body')}
                  rows={4}
                  maxLength={BODY_LIMIT}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                />
                {validationErrors.message_body && (
                  <p className="mt-1 text-sm text-red-600">{validationErrors.message_body}</p>
                )}
              </div>

              {/* Message Preview */}
              {(formData.message_header || formData.message_body) && (
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                    <span className="mr-2">📱</span>
                    Wallet Preview
                  </h3>
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                    <div className="font-semibold text-gray-900 dark:text-white mb-1">
                      {formData.message_header || 'Your notification header'}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {formData.message_body || 'Your notification message will appear here'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Schedule & Review */}
          {currentStep === 4 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  Scheduling Options
                </label>
                <div className="space-y-3">
                  <label className={`flex items-start p-4 border-2 rounded-xl cursor-pointer transition-all ${
                    formData.send_immediately
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}>
                    <input
                      type="radio"
                      name="send_immediately"
                      checked={formData.send_immediately}
                      onChange={() => setFormData({ ...formData, send_immediately: true, scheduled_at: null })}
                      className="mt-1 mr-3"
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xl">⚡</span>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          Send Now
                        </h3>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Send immediately after creation
                      </p>
                    </div>
                  </label>

                  <label className={`flex items-start p-4 border-2 rounded-xl cursor-pointer transition-all ${
                    !formData.send_immediately
                      ? 'border-primary bg-primary/5'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}>
                    <input
                      type="radio"
                      name="send_immediately"
                      checked={!formData.send_immediately}
                      onChange={() => setFormData({ ...formData, send_immediately: false })}
                      className="mt-1 mr-3"
                    />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">📅</span>
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          Schedule for Later
                        </h3>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                        Schedule campaign for a specific date and time
                      </p>
                      {!formData.send_immediately && (
                        <input
                          type="datetime-local"
                          value={formData.scheduled_at || ''}
                          onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                          min={new Date().toISOString().slice(0, 16)}
                          className="mt-3 w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        />
                      )}
                    </div>
                  </label>
                </div>
                {validationErrors.scheduled_at && (
                  <p className="mt-2 text-sm text-red-600">{validationErrors.scheduled_at}</p>
                )}
              </div>

              {/* Campaign Summary */}
              <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-xl p-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                  Campaign Summary
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Campaign Name:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{formData.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Type:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formData.campaign_type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Target:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formData.target_type === 'all_customers' && 'All Customers'}
                      {formData.target_type === 'segment' && segments.find(s => s.segment_id === formData.target_segment_id)?.name}
                      {formData.target_type === 'custom_filter' && 'Custom Filter'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Schedule:</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {formData.send_immediately ? 'Send Now' : new Date(formData.scheduled_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handleBack}
                className="px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors"
              >
                Back
              </button>
            )}
            <div className="flex-1" />
            {currentStep < 4 ? (
              <button
                type="button"
                onClick={handleNext}
                className="px-6 py-3 bg-primary hover:bg-primary/90 text-white rounded-xl font-medium transition-colors"
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="px-6 py-3 bg-primary hover:bg-primary/90 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors flex items-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <span>
                      {formData.send_immediately ? 'Create & Send Campaign' : 'Create Campaign'}
                    </span>
                  </>
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}

export default CampaignBuilder
