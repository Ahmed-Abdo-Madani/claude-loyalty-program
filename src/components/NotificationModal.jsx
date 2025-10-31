import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { endpoints, secureApi } from '../config/api'

function NotificationModal({ customers = [], notificationType = 'custom', offers = [], onClose, onSuccess }) {
  const { t } = useTranslation('cardDesign')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
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
      label: t('notification.types.custom.label'),
      icon: '💬',
      description: t('notification.types.custom.description'),
      fields: ['header', 'body']
    },
    offer: {
      label: t('notification.types.offer.label'),
      icon: '🎁',
      description: t('notification.types.offer.description'),
      fields: ['offer', 'header', 'body']
    },
    reminder: {
      label: t('notification.types.reminder.label'),
      icon: '⏰',
      description: t('notification.types.reminder.description'),
      fields: ['offer']
    },
    birthday: {
      label: t('notification.types.birthday.label'),
      icon: '🎂',
      description: t('notification.types.birthday.description'),
      fields: []
    },
    milestone: {
      label: t('notification.types.milestone.label'),
      icon: '🏆',
      description: t('notification.types.milestone.description'),
      fields: ['milestoneTitle', 'milestoneMessage']
    },
    reengagement: {
      label: t('notification.types.reengagement.label'),
      icon: '💙',
      description: t('notification.types.reengagement.description'),
      fields: ['incentiveHeader', 'incentiveBody']
    }
  }

  const currentType = notificationTypes[formData.type] || notificationTypes.custom

  // Auto-populate headers/bodies based on type
  useEffect(() => {
    if (formData.type === 'birthday' && !formData.header) {
      setFormData(prev => ({
        ...prev,
        header: t('notification.defaults.birthdayHeader'),
        body: t('notification.defaults.birthdayBody')
      }))
    } else if (formData.type === 'reengagement' && !formData.incentiveHeader) {
      setFormData(prev => ({
        ...prev,
        incentiveHeader: t('notification.defaults.reengagementHeader'),
        incentiveBody: t('notification.defaults.reengagementBody')
      }))
    }
  }, [formData.type, t])

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (customers.length === 0) {
      setError(t('notification.errors.noCustomers'))
      return
    }

    // Validation based on type
    if (currentType.fields.includes('header') && !formData.header.trim()) {
      setError(t('notification.errors.headerRequired'))
      return
    }

    if (currentType.fields.includes('body') && !formData.body.trim()) {
      setError(t('notification.errors.bodyRequired'))
      return
    }

    if (currentType.fields.includes('offer') && !formData.offerId) {
      setError(t('notification.errors.offerRequired'))
      return
    }

    if (currentType.fields.includes('milestoneTitle') && !formData.milestoneTitle.trim()) {
      setError(t('notification.errors.milestoneTitleRequired'))
      return
    }

    setLoading(true)
    setError('')

    try {
      let endpoint, payload

      switch (formData.type) {
        case 'offer':
          // Send to each customer individually for offer notifications
          const offerResults = []
          for (const customer of customers) {
            const result = await sendOfferNotification(customer.customer_id, formData.offerId, formData.header, formData.body)
            offerResults.push(result)
          }
          const successCount = offerResults.filter(r => r.success).length
          onSuccess({ successful_customers: successCount, total_customers: customers.length })
          return

        case 'reminder':
          // Send to each customer individually for reminder notifications
          const reminderResults = []
          for (const customer of customers) {
            const result = await sendReminderNotification(customer.customer_id, formData.offerId)
            reminderResults.push(result)
          }
          const reminderSuccessCount = reminderResults.filter(r => r.success).length
          onSuccess({ successful_customers: reminderSuccessCount, total_customers: customers.length })
          return

        case 'birthday':
          // Send to each customer individually
          const birthdayResults = []
          for (const customer of customers) {
            const result = await sendBirthdayNotification(customer.customer_id)
            birthdayResults.push(result)
          }
          const birthdaySuccessCount = birthdayResults.filter(r => r.success).length
          onSuccess({ successful_customers: birthdaySuccessCount, total_customers: customers.length })
          return

        case 'milestone':
          // Send to each customer individually
          const milestoneResults = []
          for (const customer of customers) {
            const result = await sendMilestoneNotification(customer.customer_id, formData.milestoneTitle, formData.body)
            milestoneResults.push(result)
          }
          const milestoneSuccessCount = milestoneResults.filter(r => r.success).length
          onSuccess({ successful_customers: milestoneSuccessCount, total_customers: customers.length })
          return

        case 'reengagement':
          // Send to each customer individually
          const reengagementResults = []
          for (const customer of customers) {
            const result = await sendReengagementNotification(customer.customer_id, formData.incentiveHeader, formData.incentiveBody)
            reengagementResults.push(result)
          }
          const reengagementSuccessCount = reengagementResults.filter(r => r.success).length
          onSuccess({ successful_customers: reengagementSuccessCount, total_customers: customers.length })
          return

        case 'custom':
        default:
          // Bulk notification for custom messages
          endpoint = endpoints.walletNotificationBulk
          payload = {
            customer_ids: customers.map(c => c.customer_id),
            message_header: formData.header,
            message_body: formData.body,
            message_type: 'custom'
          }
          break
      }

      const response = await secureApi.post(endpoint, payload)
      const data = await response.json()

      if (data.success) {
        onSuccess(data.data)
      } else {
        setError(data.message || t('notification.errors.sendFailed', { error: '' }))
      }

    } catch (err) {
      console.error('Notification send error:', err)
      setError(t('notification.errors.sendFailed', { error: err.message }))
    } finally {
      setLoading(false)
    }
  }

  // Helper functions for individual notification types
  const sendOfferNotification = async (customerId, offerId, title, description) => {
    try {
      const response = await secureApi.post(endpoints.walletNotificationOffer, {
        customer_id: customerId,
        offer_id: offerId,
        offer_title: title,
        offer_description: description
      })
      return await response.json()
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  const sendReminderNotification = async (customerId, offerId) => {
    try {
      const response = await secureApi.post(endpoints.walletNotificationReminder, {
        customer_id: customerId,
        offer_id: offerId
      })
      return await response.json()
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  const sendBirthdayNotification = async (customerId) => {
    try {
      const response = await secureApi.post(endpoints.walletNotificationBirthday, {
        customer_id: customerId
      })
      return await response.json()
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  const sendMilestoneNotification = async (customerId, title, message) => {
    try {
      const response = await secureApi.post(endpoints.walletNotificationMilestone, {
        customer_id: customerId,
        milestone_title: title,
        milestone_message: message
      })
      return await response.json()
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  const sendReengagementNotification = async (customerId, header, body) => {
    try {
      const response = await secureApi.post(endpoints.walletNotificationReengagement, {
        customer_id: customerId,
        incentive_header: header,
        incentive_body: body
      })
      return await response.json()
    } catch (err) {
      return { success: false, error: err.message }
    }
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
                {t('notification.sendingTo', { count: customers.length })}
              </p>
            </div>
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
              {t('notification.notificationType')}
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
                {t('notification.selectOffer')}
              </label>
              <select
                value={formData.offerId}
                onChange={(e) => setFormData({ ...formData, offerId: e.target.value })}
                required
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">{t('notification.chooseOffer')}</option>
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
                {t('notification.messageHeader')}
              </label>
              <input
                type="text"
                value={formData.header}
                onChange={(e) => setFormData({ ...formData, header: e.target.value.slice(0, HEADER_LIMIT) })}
                placeholder={t('notification.messageHeaderPlaceholder')}
                maxLength={HEADER_LIMIT}
                required
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary focus:border-transparent"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 text-right">
                {t('common:validation.characterLimit', { current: formData.header.length, max: HEADER_LIMIT })}
              </p>
            </div>
          )}

          {/* Message Body */}
          {currentType.fields.includes('body') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('notification.messageBody')}
              </label>
              <textarea
                value={formData.body}
                onChange={(e) => setFormData({ ...formData, body: e.target.value.slice(0, BODY_LIMIT) })}
                placeholder={t('notification.messageBodyPlaceholder')}
                rows={4}
                maxLength={BODY_LIMIT}
                required
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 text-right">
                {t('common:validation.characterLimit', { current: formData.body.length, max: BODY_LIMIT })}
              </p>
            </div>
          )}

          {/* Milestone Title */}
          {currentType.fields.includes('milestoneTitle') && (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {t('notification.milestoneTitle')}
              </label>
              <input
                type="text"
                value={formData.milestoneTitle}
                onChange={(e) => setFormData({ ...formData, milestoneTitle: e.target.value.slice(0, HEADER_LIMIT) })}
                placeholder={t('notification.milestoneTitlePlaceholder')}
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
                {t('notification.celebrationMessage')}
              </label>
              <textarea
                value={formData.body}
                onChange={(e) => setFormData({ ...formData, body: e.target.value.slice(0, BODY_LIMIT) })}
                placeholder={t('notification.celebrationPlaceholder')}
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
                  {t('notification.greetingHeader')}
                </label>
                <input
                  type="text"
                  value={formData.incentiveHeader}
                  onChange={(e) => setFormData({ ...formData, incentiveHeader: e.target.value.slice(0, HEADER_LIMIT) })}
                  placeholder={t('notification.greetingPlaceholder')}
                  maxLength={HEADER_LIMIT}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {t('notification.incentiveMessage')}
                </label>
                <textarea
                  value={formData.incentiveBody}
                  onChange={(e) => setFormData({ ...formData, incentiveBody: e.target.value.slice(0, BODY_LIMIT) })}
                  placeholder={t('notification.incentivePlaceholder')}
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
                {t('notification.walletPreview')}
              </h3>
              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow-sm">
                <div className="font-semibold text-gray-900 dark:text-white mb-1">
                  {formData.header || formData.milestoneTitle || formData.incentiveHeader || t('notification.yourNotificationHeader')}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {formData.body || formData.incentiveBody || t('notification.yourNotificationMessage')}
                </div>
              </div>
            </div>
          )}

          {/* Info Box */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4">
            <div className="flex items-start">
              <span className="text-blue-600 dark:text-blue-400 mr-3 mt-0.5">ℹ️</span>
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
              {t('notification.cancel')}
            </button>
            <button
              type="submit"
              disabled={loading || customers.length === 0}
              className="flex-1 px-6 py-3 bg-primary hover:bg-primary/90 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl font-medium transition-colors duration-200 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>{t('notification.sending')}</span>
                </>
              ) : (
                <>
                  <span>📤</span>
                  <span>{t('notification.sendNotification')}</span>
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
