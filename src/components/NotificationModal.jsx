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
  const { t } = useTranslation('notification')
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
      label: t('types.custom.label'),
      icon: '💬',
      description: t('types.custom.description'),
      fields: ['header', 'body']
    },
    offer: {
      label: t('types.offer.label'),
      icon: '🎁',
      description: t('types.offer.description'),
      fields: ['offer', 'header', 'body']
    },
    reminder: {
      label: t('types.reminder.label'),
      icon: '⏰',
      description: t('types.reminder.description'),
      fields: ['offer']
    },
    birthday: {
      label: t('types.birthday.label'),
      icon: '🎂',
      description: t('types.birthday.description'),
      fields: []
    },
    milestone: {
      label: t('types.milestone.label'),
      icon: '🏆',
      description: t('types.milestone.description'),
      fields: ['milestoneTitle', 'milestoneMessage']
    },
    reengagement: {
      label: t('types.reengagement.label'),
      icon: '💙',
      description: t('types.reengagement.description'),
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
    
    if (totalSeconds < 5) return t('estimatedTime.instant')
    if (totalSeconds < 60) return t('estimatedTime.seconds', { seconds: totalSeconds })
    
    const minutes = Math.ceil(totalSeconds / 60)
    return t('estimatedTime.minutes', { count: minutes })
  }

  // Compute estimated time on modal open
  const recipientCount = segmentData ? segmentData.customerCount : customers.length
  const precomputedEstimate = estimateDeliveryTime(recipientCount)

  // Auto-populate headers/bodies based on type
  useEffect(() => {
    if (formData.type === 'birthday' && !formData.header) {
      setFormData(prev => ({
        ...prev,
        header: t('defaults.birthdayHeader'),
        body: t('defaults.birthdayBody')
      }))
    } else if (formData.type === 'reengagement' && !formData.incentiveHeader) {
      setFormData(prev => ({
        ...prev,
        incentiveHeader: t('defaults.reengagementHeader'),
        incentiveBody: t('defaults.reengagementBody')
      }))
    }
  }, [formData.type, t])

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!segmentId && customers.length === 0) {
      setError(t('errors.noCustomers'))
      return
    }

    // Validation based on type
    if (currentType.fields.includes('header') && !formData.header.trim()) {
      setError(t('errors.headerRequired'))
      return
    }

    if (currentType.fields.includes('body') && !formData.body.trim()) {
      setError(t('errors.bodyRequired'))
      return
    }

    if (currentType.fields.includes('offer') && !formData.offerId) {
      setError(t('errors.offerRequired'))
      return
    }

    if (currentType.fields.includes('milestoneTitle') && !formData.milestoneTitle.trim()) {
      setError(t('errors.milestoneTitleRequired'))
      return
    }

    if (currentType.fields.includes('milestoneMessage') && !formData.body.trim()) {
      setError(t('errors.milestoneMessageRequired'))
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

      // Gate all segment sends: if segmentId is present, use segment endpoint for ANY type
      if (segmentId) {
        // Determine message header and body based on type
        let messageHeader, messageBody, messageType

        switch (formData.type) {
          case 'custom':
          case 'segment':
            messageHeader = formData.header
            messageBody = formData.body
            messageType = 'custom'
            break

          case 'offer':
            messageHeader = formData.header
            messageBody = formData.body
            messageType = 'offer'
            break

          case 'reminder':
            messageHeader = t('defaults.reminderHeader')
            messageBody = t('defaults.reminderBody')
            messageType = 'reminder'
            break

          case 'birthday':
            messageHeader = formData.header
            messageBody = formData.body
            messageType = 'birthday'
            break

          case 'milestone':
            messageHeader = formData.milestoneTitle
            messageBody = formData.body
            messageType = 'milestone'
            break

          case 'reengagement':
            messageHeader = formData.incentiveHeader
            messageBody = formData.incentiveBody
            messageType = 'reengagement'
            break

          default:
            throw new Error(`Unknown notification type: ${formData.type}`)
        }

        // Use segment-specific endpoint for all types when segmentId is present
        response = await secureApi.post(endpoints.segmentSendNotification(segmentId), {
          message_header: messageHeader,
          message_body: messageBody,
          message_type: messageType
        })
      } else {
        // Use bulk endpoint with customer_ids for non-segment sends
        const basePayload = {
          customer_ids: customers.map(c => c.customer_id)
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
              message_header: t('defaults.reminderHeader'),
              message_body: t('defaults.reminderBody'),
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

          default:
            throw new Error(`Unknown notification type: ${formData.type}`)
        }
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
        setError(data.message || t('errors.sendFailed', { error: '' }))
      }

    } catch (err) {
      console.error('Notification send error:', err)
      clearInterval(progressInterval)
      setError(t('errors.sendFailed', { error: err.message }))
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
              {t('results.success')}
            </h3>
            <span className="text-2xl">✅</span>
          </div>
          <div className="grid grid-cols-3 gap-4 mt-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                {sendResults.successful}
              </div>
              <div className="text-xs text-green-600 dark:text-green-400">
                {t('results.successful')}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-700 dark:text-red-300">
                {sendResults.failed}
              </div>
              <div className="text-xs text-red-600 dark:text-red-400">
                {t('results.failed')}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-700 dark:text-gray-300">
                {successRate}%
              </div>
              <div className="text-xs text-gray-600 dark:text-gray-400">
                {t('results.successRate')}
              </div>
            </div>
          </div>
        </div>

        {/* Errors (if any) */}
        {sendResults.errors && sendResults.errors.length > 0 && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <h4 className="font-semibold text-red-900 dark:text-red-100 mb-2">
              {t('results.errors')}
            </h4>
            <ul className="list-disc list-inside text-sm text-red-700 dark:text-red-300 space-y-1">
              {sendResults.errors.slice(0, 5).map((error, idx) => (
                <li key={idx}>{error}</li>
              ))}
              {sendResults.errors.length > 5 && (
                <li className="text-red-600 dark:text-red-400">
                  {t('results.moreErrors', { 
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
          {t('results.close')}
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
              {t('results.title')}
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
                  ? t('sendingToSegment', { 
                      name: segmentData.segmentName,
                      count: segmentData.customerCount
                    })
                  : t('sendingTo', { count: customers.length })
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
                {t('progress.sending')}
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
                {t('progress.estimatedTime', { time: estimatedTime })}
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
              {t('notificationType')}
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
                {t('selectOffer')}
              </label>
              <select
                value={formData.offerId}
                onChange={(e) => setFormData({ ...formData, offerId: e.target.value })}
                required
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">{t('chooseOffer')}</option>
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
                {t('messageHeader')}
              </label>
              <input
                type="text"
                value={formData.header}
                onChange={(e) => setFormData({ ...formData, header: e.target.value.slice(0, HEADER_LIMIT) })}
                placeholder={t('messageHeaderPlaceholder')}
                maxLength={HEADER_LIMIT}
                required
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 text-right">
                {t('headerLimit', { current: formData.header.length, max: HEADER_LIMIT })}
              </p>
            </div>
          )}

          {/* Message Body */}
          {currentType.fields.includes('body') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('messageBody')}
              </label>
              <textarea
                value={formData.body}
                onChange={(e) => setFormData({ ...formData, body: e.target.value.slice(0, BODY_LIMIT) })}
                placeholder={t('messageBodyPlaceholder')}
                rows={4}
                maxLength={BODY_LIMIT}
                required
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 text-right">
                {t('bodyLimit', { current: formData.body.length, max: BODY_LIMIT })}
              </p>
            </div>
          )}

          {/* Milestone Title */}
          {currentType.fields.includes('milestoneTitle') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('milestoneTitle')}
              </label>
              <input
                type="text"
                value={formData.milestoneTitle}
                onChange={(e) => setFormData({ ...formData, milestoneTitle: e.target.value.slice(0, HEADER_LIMIT) })}
                placeholder={t('milestoneTitlePlaceholder')}
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
                {t('celebrationMessage')}
              </label>
              <textarea
                value={formData.body}
                onChange={(e) => setFormData({ ...formData, body: e.target.value.slice(0, BODY_LIMIT) })}
                placeholder={t('celebrationPlaceholder')}
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
                  {t('greetingHeader')}
                </label>
                <input
                  type="text"
                  value={formData.incentiveHeader}
                  onChange={(e) => setFormData({ ...formData, incentiveHeader: e.target.value.slice(0, HEADER_LIMIT) })}
                  placeholder={t('greetingHeaderPlaceholder')}
                  maxLength={HEADER_LIMIT}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('incentiveMessage')}
                </label>
                <textarea
                  value={formData.incentiveBody}
                  onChange={(e) => setFormData({ ...formData, incentiveBody: e.target.value.slice(0, BODY_LIMIT) })}
                  placeholder={t('incentivePlaceholder')}
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
                {t('walletPreview')}
              </h3>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                <div className="font-semibold text-gray-900 dark:text-white mb-1">
                  {formData.header || formData.milestoneTitle || formData.incentiveHeader || t('yourNotificationHeader')}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {formData.body || formData.incentiveBody || t('yourNotificationMessage')}
                </div>
              </div>
            </div>
          )}

          {/* Info Box */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
            <div className="flex items-start">
              <span className="text-blue-600 dark:text-blue-400 mr-3 mt-0.5">ℹ️</span>
              <div className="text-sm text-blue-800 dark:text-blue-300">
                <p className="font-medium mb-1">{t('importantNotes')}</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>{t('rateLimit')}</li>
                  <li>{t('activeWalletOnly')}</li>
                  <li>{t('appearsInWallets')}</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Pre-send Summary */}
          <div className="bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {t('summary.recipientCount', { count: recipientCount })}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {t('summary.estimatedDelivery', { time: precomputedEstimate })}
                </p>
              </div>
              <div className="text-3xl">⚡</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 rounded-xl text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 font-medium transition-colors duration-200"
            >
              {t('cancel')}
            </button>
            <button
              type="submit"
              disabled={loading || (!segmentId && customers.length === 0)}
              className="flex-1 px-6 py-3 bg-primary hover:bg-primary/90 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors duration-200 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>{t('sending')}</span>
                </>
              ) : (
                <>
                  <span>📤</span>
                  <span>{t('sendNotification')}</span>
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
