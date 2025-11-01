import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { endpoints, secureApi } from '../config/api'

function NotificationModal({ 
  customers = [], 
  notificationType = 'custom', 
  offers = [], 
  segmentData = null,
  segmentId = null,
  onClose, 
  onSuccess 
}) {
  const { t } = useTranslation() // Use default namespace or 'notification'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  // Progress tracking
  const [sendingProgress, setSendingProgress] = useState(0)
  const [estimatedTime, setEstimatedTime] = useState(null)
  const [sendResults, setSendResults] = useState(null)
  const [showResults, setShowResults] = useState(false)
  
  const [formData, setFormData] = useState({
    type: notificationType,
    header: '',
    body: '',
    offerId: '',
    milestoneTitle: '',
    incentiveHeader: '',
    incentiveBody: ''
  })

  // Character limits for wallet notifications
  const HEADER_LIMIT = 50
  const BODY_LIMIT = 200

  // Notification type configurations
  const notificationTypes = {
    custom: {
      label: t('notification.types.custom.label', { defaultValue: 'Custom Message' }),
      icon: '💬',
      description: t('notification.types.custom.description', { defaultValue: 'Send a custom message to customers' }),
      fields: ['header', 'body']
    },
    offer: {
      label: t('notification.types.offer.label', { defaultValue: 'Offer Announcement' }),
      icon: '🎁',
      description: t('notification.types.offer.description', { defaultValue: 'Announce a new offer or promotion' }),
      fields: ['offer', 'header', 'body']
    },
    reminder: {
      label: t('notification.types.reminder.label', { defaultValue: 'Progress Reminder' }),
      icon: '⏰',
      description: t('notification.types.reminder.description', { defaultValue: 'Remind customers of their progress' }),
      fields: ['offer']
    },
    birthday: {
      label: t('notification.types.birthday.label', { defaultValue: 'Birthday Greeting' }),
      icon: '🎂',
      description: t('notification.types.birthday.description', { defaultValue: 'Send birthday wishes to customers' }),
      fields: []
    },
    milestone: {
      label: t('notification.types.milestone.label', { defaultValue: 'Milestone Achievement' }),
      icon: '🏆',
      description: t('notification.types.milestone.description', { defaultValue: 'Celebrate customer milestones' }),
      fields: ['milestoneTitle', 'milestoneMessage']
    },
    reengagement: {
      label: t('notification.types.reengagement.label', { defaultValue: 'Re-engagement Incentive' }),
      icon: '💙',
      description: t('notification.types.reengagement.description', { defaultValue: 'Win back inactive customers' }),
      fields: ['incentiveHeader', 'incentiveBody']
    }
  }

  const currentType = notificationTypes[formData.type] || notificationTypes.custom

  // Estimate delivery time based on customer count
  const estimateDeliveryTime = (count) => {
    // Bulk API can send to 100 customers in ~2 seconds (rate limits apply)
    const secondsPerBatch = 2
    const batchSize = 100
    const batches = Math.ceil(count / batchSize)
    const totalSeconds = batches * secondsPerBatch
    
    if (totalSeconds < 5) return t('notification.estimatedTime.instant', { defaultValue: 'Instant' })
    if (totalSeconds < 60) return t('notification.estimatedTime.seconds', { defaultValue: `~${totalSeconds} seconds`, seconds: totalSeconds })
    
    const minutes = Math.ceil(totalSeconds / 60)
    return t('notification.estimatedTime.minutes', { defaultValue: `~${minutes} minute${minutes > 1 ? 's' : ''}`, minutes })
  }

  // Compute estimated time on modal open
  const recipientCount = segmentData ? segmentData.customerCount : customers.length
  const precomputedEstimate = estimateDeliveryTime(recipientCount)

  // Auto-populate headers/bodies based on type
  useEffect(() => {
    if (formData.type === 'birthday' && !formData.header) {
      setFormData(prev => ({
        ...prev,
        header: t('notification.defaults.birthdayHeader', { defaultValue: '🎂 Happy Birthday!' }),
        body: t('notification.defaults.birthdayBody', { defaultValue: 'Wishing you a wonderful birthday! Enjoy a special reward on us.' })
      }))
    } else if (formData.type === 'reengagement' && !formData.incentiveHeader) {
      setFormData(prev => ({
        ...prev,
        incentiveHeader: t('notification.defaults.reengagementHeader', { defaultValue: 'We miss you!' }),
        incentiveBody: t('notification.defaults.reengagementBody', { defaultValue: 'Come back and enjoy exclusive rewards!' })
      }))
    }
  }, [formData.type, t])

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!segmentId && customers.length === 0) {
      setError(t('notification.errors.noCustomers', { defaultValue: 'No customers selected' }))
      return
    }

    // Validation based on type
    if (currentType.fields.includes('header') && !formData.header.trim()) {
      setError(t('notification.errors.headerRequired', { defaultValue: 'Header is required' }))
      return
    }

    if (currentType.fields.includes('body') && !formData.body.trim()) {
      setError(t('notification.errors.bodyRequired', { defaultValue: 'Message body is required' }))
      return
    }

    if (currentType.fields.includes('offer') && !formData.offerId) {
      setError(t('notification.errors.offerRequired', { defaultValue: 'Please select an offer' }))
      return
    }

    if (currentType.fields.includes('milestoneTitle') && !formData.milestoneTitle.trim()) {
      setError(t('notification.errors.milestoneTitleRequired', { defaultValue: 'Milestone title is required' }))
      return
    }

    if (currentType.fields.includes('milestoneMessage') && !formData.body.trim()) {
      setError(t('notification.errors.milestoneMessageRequired', { defaultValue: 'Milestone message is required' }))
      return
    }

    setLoading(true)
    setError('')
    setSendingProgress(10) // Start with visible progress
    
    // Calculate estimated time
    const totalCustomers = segmentData ? segmentData.customerCount : customers.length
    const timeEstimate = estimateDeliveryTime(totalCustomers)
    setEstimatedTime(timeEstimate)

    // Animate progress to 90% while loading
    const progressInterval = setInterval(() => {
      setSendingProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval)
          return 90
        }
        return prev + 10
      })
    }, 200)

    try {
      let response, data

      // Use unified bulk endpoint for all notification types
      const basePayload = {
        customer_ids: segmentId ? undefined : customers.map(c => c.customer_id),
        segment_id: segmentId || undefined
      }

      switch (formData.type) {
        case 'custom':
          response = await secureApi.post(endpoints.walletNotificationBulk, {
            ...basePayload,
            message_header: formData.header,
            message_body: formData.body,
            message_type: 'custom'
          })
          break

        case 'offer':
          response = await secureApi.post(endpoints.walletNotificationBulk, {
            ...basePayload,
            message_header: formData.header,
            message_body: formData.body,
            message_type: 'offer',
            offer_id: formData.offerId
          })
          break

        case 'reminder':
          response = await secureApi.post(endpoints.walletNotificationBulk, {
            ...basePayload,
            message_header: 'Progress Reminder',
            message_body: 'Check your progress on our loyalty program!',
            message_type: 'reminder',
            offer_id: formData.offerId
          })
          break

        case 'birthday':
          response = await secureApi.post(endpoints.walletNotificationBulk, {
            ...basePayload,
            message_header: formData.header,
            message_body: formData.body,
            message_type: 'birthday'
          })
          break

        case 'milestone':
          response = await secureApi.post(endpoints.walletNotificationBulk, {
            ...basePayload,
            message_header: formData.milestoneTitle,
            message_body: formData.body,
            message_type: 'milestone'
          })
          break

        case 'reengagement':
          response = await secureApi.post(endpoints.walletNotificationBulk, {
            ...basePayload,
            message_header: formData.incentiveHeader,
            message_body: formData.incentiveBody,
            message_type: 'reengagement'
          })
          break

        case 'segment':
          // Segment-based notification
          if (!segmentId) {
            throw new Error('Segment ID is required for segment notifications')
          }
          response = await secureApi.post(endpoints.segmentSendNotification(segmentId), {
            message_header: formData.header,
            message_body: formData.body,
            message_type: formData.type === 'segment' ? 'custom' : formData.type
          })
          break

        default:
          throw new Error(`Unknown notification type: ${formData.type}`)
      }

      // Check response status
      if (!response.ok) {
        // Parse error message
        let errorMessage
        try {
          const errorData = await response.json()
          errorMessage = errorData.message || response.statusText
        } catch {
          errorMessage = response.statusText
        }
        throw new Error(errorMessage)
      }

      // Parse JSON response with error handling
      try {
        data = await response.json()
      } catch (jsonError) {
        throw new Error('Invalid JSON response from server')
      }

      // Clear progress animation and set to 100%
      clearInterval(progressInterval)
      setSendingProgress(100)

      if (data.success) {
        // For segment notifications, extract result from nested structure
        const resultData = formData.type === 'segment' && data.data.result 
          ? data.data.result 
          : data.data

        // Store results and show results view
        setSendResults({
          successful: resultData.successful_customers || resultData.successful || 0,
          failed: resultData.failed_customers || resultData.failed || 0,
          total: resultData.total_customers || resultData.total || segmentData?.customerCount || customers.length,
          details: resultData.details || [],
          errors: resultData.errors || []
        })
        setShowResults(true)
        
        // Call onSuccess after short delay to show results
        setTimeout(() => {
          onSuccess(data.data)
        }, 3000)
      } else {
        setError(data.message || t('notification.errors.sendFailed', { defaultValue: 'Failed to send notification', error: '' }))
      }

    } catch (err) {
      console.error('Notification send error:', err)
      clearInterval(progressInterval)
      setError(t('notification.errors.sendFailed', { defaultValue: 'Failed to send notification', error: err.message }))
      setSendingProgress(0)
    } finally {
      setLoading(false)
    }
  }

  // Results View Component
  const ResultsView = () => {
    if (!sendResults) return null

    const successRate = sendResults.total > 0 
      ? ((sendResults.successful / sendResults.total) * 100).toFixed(1)
      : 0

    return (
      <div className="p-6 space-y-4">
        {/* Success Summary */}
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-green-900 dark:text-green-100">
              {t('notification.results.success', { defaultValue: 'Delivery Complete' })}
            </h3>
            <span className="text-2xl">✅</span>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                {sendResults.successful}
              </div>
              <div className="text-xs text-green-600 dark:text-green-400">
                {t('notification.results.successful', { defaultValue: 'Successful' })}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-700 dark:text-red-300">
                {sendResults.failed}
              </div>
              <div className="text-xs text-red-600 dark:text-red-400">
                {t('notification.results.failed', { defaultValue: 'Failed' })}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-700 dark:text-gray-300">
                {successRate}%
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                {t('notification.results.successRate', { defaultValue: 'Success Rate' })}
              </div>
            </div>
          </div>
        </div>

        {/* Errors (if any) */}
        {sendResults.errors && sendResults.errors.length > 0 && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <h4 className="font-semibold text-red-900 dark:text-red-100 mb-2">
              {t('notification.results.errors', { defaultValue: 'Errors' })}
            </h4>
            <ul className="list-disc list-inside text-sm text-red-700 dark:text-red-300 space-y-1">
              {sendResults.errors.slice(0, 5).map((error, idx) => (
                <li key={idx}>{error}</li>
              ))}
              {sendResults.errors.length > 5 && (
                <li className="text-red-600 dark:text-red-400">
                  {t('notification.results.moreErrors', { 
                    defaultValue: `... and ${sendResults.errors.length - 5} more errors`,
                    count: sendResults.errors.length - 5 
                  })}
                </li>
              )}
            </ul>
          </div>
        )}

        {/* Close Button */}
        <button
          onClick={onClose}
          className="w-full py-3 bg-primary hover:bg-primary/90 text-white rounded-lg font-medium transition-all"
        >
          {t('notification.results.close', { defaultValue: 'Close' })}
        </button>
      </div>
    )
  }

  // Show results view if available
  if (showResults) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              {t('notification.results.title', { defaultValue: 'Notification Results' })}
            </h2>
          </div>
          <ResultsView />
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <span className="text-2xl">{currentType.icon}</span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {currentType.label}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {segmentData 
                  ? t('notification.sendingToSegment', { 
                      defaultValue: `Sending to segment: ${segmentData.segmentName} (${segmentData.customerCount} customers)`,
                      name: segmentData.segmentName,
                      count: segmentData.customerCount
                    })
                  : t('notification.sendingTo', { defaultValue: `Sending to ${customers.length} customers`, count: customers.length })
                }
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress Indicator */}
        {loading && (
          <div className="px-6 py-4 bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                {t('notification.progress.sending', { defaultValue: 'Sending notifications...' })}
              </span>
              {sendingProgress > 0 && (
                <span className="text-sm text-blue-700 dark:text-blue-300">
                  {sendingProgress}%
                </span>
              )}
            </div>
            <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2">
              <div 
                className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all duration-300"
                style={{ width: sendingProgress > 0 ? `${sendingProgress}%` : '100%' }}
              />
            </div>
            {estimatedTime && (
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                {t('notification.progress.estimatedTime', { 
                  defaultValue: `Estimated time: ${estimatedTime}`,
                  time: estimatedTime 
                })}
              </p>
            )}
          </div>
        )}

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error Display */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-4">
              <div className="flex items-center">
                <span className="text-red-600 dark:text-red-400 mr-3">⚠️</span>
                <span className="text-red-800 dark:text-red-300">{error}</span>
              </div>
            </div>
          )}

          {/* Type Selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {t('notification.notificationType', { defaultValue: 'Notification Type' })}
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
            >
              {Object.entries(notificationTypes).map(([key, type]) => (
                <option key={key} value={key}>
                  {type.icon} {type.label}
                </option>
              ))}
            </select>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {currentType.description}
            </p>
          </div>

          {/* Offer Selection (for offer and reminder types) */}
          {currentType.fields.includes('offer') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('notification.selectOffer', { defaultValue: 'Select Offer' })}
              </label>
              <select
                value={formData.offerId}
                onChange={(e) => setFormData({ ...formData, offerId: e.target.value })}
                required
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">{t('notification.chooseOffer', { defaultValue: 'Choose an offer...' })}</option>
                {offers.map((offer) => (
                  <option key={offer.public_id} value={offer.public_id}>
                    {offer.title}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Message Header */}
          {currentType.fields.includes('header') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('notification.messageHeader', { defaultValue: 'Message Header' })}
              </label>
              <input
                type="text"
                value={formData.header}
                onChange={(e) => setFormData({ ...formData, header: e.target.value.slice(0, HEADER_LIMIT) })}
                placeholder={t('notification.messageHeaderPlaceholder', { defaultValue: 'Enter notification header...' })}
                maxLength={HEADER_LIMIT}
                required
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 text-right">
                {t('common:validation.characterLimit', { defaultValue: `${formData.header.length} / ${HEADER_LIMIT}`, current: formData.header.length, max: HEADER_LIMIT })}
              </p>
            </div>
          )}

          {/* Message Body */}
          {currentType.fields.includes('body') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('notification.messageBody', { defaultValue: 'Message Body' })}
              </label>
              <textarea
                value={formData.body}
                onChange={(e) => setFormData({ ...formData, body: e.target.value.slice(0, BODY_LIMIT) })}
                placeholder={t('notification.messageBodyPlaceholder', { defaultValue: 'Enter notification message...' })}
                rows={4}
                maxLength={BODY_LIMIT}
                required
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 text-right">
                {t('common:validation.characterLimit', { defaultValue: `${formData.body.length} / ${BODY_LIMIT}`, current: formData.body.length, max: BODY_LIMIT })}
              </p>
            </div>
          )}

          {/* Milestone Title */}
          {currentType.fields.includes('milestoneTitle') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('notification.milestoneTitle', { defaultValue: 'Milestone Title' })}
              </label>
              <input
                type="text"
                value={formData.milestoneTitle}
                onChange={(e) => setFormData({ ...formData, milestoneTitle: e.target.value.slice(0, HEADER_LIMIT) })}
                placeholder={t('notification.milestoneTitlePlaceholder', { defaultValue: 'e.g., "10 Visits Achieved!"' })}
                maxLength={HEADER_LIMIT}
                required
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
          )}

          {/* Milestone Message */}
          {currentType.fields.includes('milestoneMessage') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('notification.celebrationMessage', { defaultValue: 'Celebration Message' })}
              </label>
              <textarea
                value={formData.body}
                onChange={(e) => setFormData({ ...formData, body: e.target.value.slice(0, BODY_LIMIT) })}
                placeholder={t('notification.celebrationPlaceholder', { defaultValue: 'Congratulate your customer...' })}
                rows={3}
                maxLength={BODY_LIMIT}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
              />
            </div>
          )}

          {/* Re-engagement Fields */}
          {currentType.fields.includes('incentiveHeader') && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('notification.greetingHeader', { defaultValue: 'Greeting Header' })}
                </label>
                <input
                  type="text"
                  value={formData.incentiveHeader}
                  onChange={(e) => setFormData({ ...formData, incentiveHeader: e.target.value.slice(0, HEADER_LIMIT) })}
                  placeholder={t('notification.greetingPlaceholder', { defaultValue: 'We miss you!' })}
                  maxLength={HEADER_LIMIT}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('notification.incentiveMessage', { defaultValue: 'Incentive Message' })}
                </label>
                <textarea
                  value={formData.incentiveBody}
                  onChange={(e) => setFormData({ ...formData, incentiveBody: e.target.value.slice(0, BODY_LIMIT) })}
                  placeholder={t('notification.incentivePlaceholder', { defaultValue: 'Offer them a reason to return...' })}
                  rows={3}
                  maxLength={BODY_LIMIT}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                />
              </div>
            </>
          )}

          {/* Preview */}
          {(formData.header || formData.body || formData.milestoneTitle || formData.incentiveHeader) && (
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 border border-gray-200 dark:border-gray-600">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                <span className="mr-2">📱</span>
                {t('notification.walletPreview', { defaultValue: 'Wallet Preview' })}
              </h3>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                <div className="font-semibold text-gray-900 dark:text-white mb-1">
                  {formData.header || formData.milestoneTitle || formData.incentiveHeader || t('notification.yourNotificationHeader', { defaultValue: 'Your notification header' })}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {formData.body || formData.incentiveBody || t('notification.yourNotificationMessage', { defaultValue: 'Your notification message will appear here' })}
                </div>
              </div>
            </div>
          )}

          {/* Info Box */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
            <div className="flex items-start">
              <span className="text-blue-600 dark:text-blue-400 mr-3 mt-0.5">ℹ️</span>
              <div className="text-sm text-blue-800 dark:text-blue-300">
                <p className="font-medium mb-1">{t('notification.importantNotes', { defaultValue: 'Important Notes' })}</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>{t('notification.rateLimit', { defaultValue: 'Rate limits apply (max 10 notifications per second)' })}</li>
                  <li>{t('notification.activeWalletOnly', { defaultValue: 'Only customers with active wallet passes will receive notifications' })}</li>
                  <li>{t('notification.appearsInWallets', { defaultValue: 'Notifications appear on lock screen and in wallet app' })}</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Pre-send Summary */}
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {t('notification.summary.recipientCount', { 
                    defaultValue: `Recipients: ${recipientCount}`,
                    count: recipientCount 
                  })}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {t('notification.summary.estimatedDelivery', { 
                    defaultValue: `Estimated delivery time: ${precomputedEstimate}`,
                    time: precomputedEstimate 
                  })}
                </p>
              </div>
              <div className="text-3xl">⚡</div>
            </div>
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
            <div className="flex items-start gap-3">
              <span className="text-blue-600 dark:text-blue-400 text-xl flex-shrink-0">ℹ️</span>
              <div className="text-sm text-blue-800 dark:text-blue-300">
                <p className="font-medium mb-1">{t('notification.importantNotes')}</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>{t('notification.rateLimit')}</li>
                  <li>{t('notification.activeWalletOnly')}</li>
                  <li>{t('notification.appearsInWallets')}</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors duration-200"
            >
              {t('notification.cancel', { defaultValue: 'Cancel' })}
            </button>
            <button
              type="submit"
              disabled={loading || (!segmentId && customers.length === 0)}
              className="flex-1 px-6 py-3 bg-primary hover:bg-primary/90 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors duration-200 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>{t('notification.sending', { defaultValue: 'Sending...' })}</span>
                </>
              ) : (
                <>
                  <span>📤</span>
                  <span>{t('notification.sendNotification', { defaultValue: 'Send Notification' })}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default NotificationModal
