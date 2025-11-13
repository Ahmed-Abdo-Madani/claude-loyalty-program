import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { endpoints } from '../../config/api'
import { managerApiRequest } from '../../utils/secureAuth'

/**
 * Receipt Preview Modal
 * Displays formatted receipt with business logo, items, totals, and loyalty QR
 * Allows download as PDF and print
 */
export default function ReceiptPreviewModal({ isOpen, onClose, saleId, receiptData }) {
  const { t, i18n } = useTranslation('pos')
  const [receipt, setReceipt] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Load receipt data when modal opens
  useEffect(() => {
    if (!isOpen) return

    const loadReceipt = async () => {
      // Use provided receiptData if available
      if (receiptData) {
        setReceipt(receiptData)
        return
      }

      // Otherwise, fetch from API
      setLoading(true)
      setError(null)

      try {
        const response = await managerApiRequest(
          `${endpoints.posReceiptPreview(saleId)}`,
          {
            headers: {
              'Accept-Language': i18n.language || 'ar'
            }
          }
        )

        // Parse JSON response
        const data = await response.json()

        if (data.success) {
          setReceipt(data.receipt)
        } else {
          setError(data.message || 'Failed to load receipt')
        }
      } catch (err) {
        console.error('Failed to load receipt:', err)
        setError(err.message || 'Failed to load receipt')
      } finally {
        setLoading(false)
      }
    }

    loadReceipt()
  }, [saleId, isOpen, receiptData, i18n.language])

  // Download receipt as PDF
  const handleDownloadPDF = async () => {
    try {
      const response = await managerApiRequest(
        `${endpoints.posReceipt(saleId)}?format=pdf`,
        { method: 'GET' }
      )

      if (!response.ok) {
        throw new Error('Failed to download PDF')
      }

      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `receipt-${receipt.sale.sale_number}.pdf`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (err) {
      console.error('Failed to download PDF:', err)
      alert(t('receipt.error'))
    }
  }

  // Print receipt
  const handlePrint = async () => {
    try {
      await managerApiRequest(endpoints.posReceiptPrint(saleId), {
        method: 'POST'
      })
      alert(t('checkout.success.printSuccess'))
    } catch (err) {
      console.error('Failed to print receipt:', err)
      alert(t('checkout.error.receiptActionFailed'))
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('receipt.preview')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">{t('receipt.loading')}</p>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-600">{t('receipt.error')}: {error}</p>
            </div>
          ) : receipt ? (
            <div className="space-y-6">
              {/* Business Header */}
              <div className="text-center border-b border-gray-200 dark:border-gray-700 pb-4">
                {receipt.business.logo_url && (
                  <img
                    src={receipt.business.logo_url}
                    alt="Business Logo"
                    className="h-16 mx-auto mb-3 object-contain"
                  />
                )}
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  {i18n.language === 'ar' && receipt.business.name_ar ? receipt.business.name_ar : receipt.business.name}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  {receipt.business.address}, {receipt.business.city}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  {receipt.business.phone}
                </p>
              </div>

              {/* Receipt Info */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-gray-700 dark:text-gray-300">
                    {t('receipt.receiptNumber')}
                  </span>
                  <span className="text-gray-900 dark:text-white font-bold">
                    {receipt.sale.sale_number}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-gray-700 dark:text-gray-300">
                    {t('receipt.date')}
                  </span>
                  <span className="text-gray-900 dark:text-white">
                    {new Date(receipt.sale.sale_date).toLocaleString(i18n.language === 'ar' ? 'ar-SA' : 'en-US')}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="font-semibold text-gray-700 dark:text-gray-300">
                    {t('receipt.branch')}
                  </span>
                  <span className="text-gray-900 dark:text-white">
                    {receipt.branch.name}
                  </span>
                </div>
              </div>

              {/* Items Table */}
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 dark:bg-gray-700">
                    <tr>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                        {t('receipt.item')}
                      </th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                        {t('receipt.quantity')}
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                        {t('receipt.price')}
                      </th>
                      <th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">
                        {t('receipt.total')}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {receipt.items.map((item, idx) => (
                      <tr key={idx} className="bg-white dark:bg-gray-800">
                        <td className="py-3 px-4 text-gray-900 dark:text-white">
                          {i18n.language === 'ar' && item.name_ar ? item.name_ar : item.name}
                        </td>
                        <td className="text-center py-3 px-4 text-gray-900 dark:text-white">
                          {item.quantity}
                        </td>
                        <td className="text-right py-3 px-4 text-gray-900 dark:text-white">
                          {item.unit_price.toFixed(2)}
                        </td>
                        <td className="text-right py-3 px-4 text-gray-900 dark:text-white font-semibold">
                          {item.total.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="space-y-2 pt-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">{t('receipt.subtotal')}:</span>
                  <span className="text-gray-900 dark:text-white">{receipt.totals.subtotal.toFixed(2)} SAR</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">{t('receipt.tax')}:</span>
                  <span className="text-gray-900 dark:text-white">{receipt.totals.tax_amount.toFixed(2)} SAR</span>
                </div>
                {receipt.totals.discount_amount > 0 && (
                  <div className="flex justify-between text-sm text-green-600">
                    <span>{t('receipt.discount')}:</span>
                    <span>-{receipt.totals.discount_amount.toFixed(2)} SAR</span>
                  </div>
                )}
                <div className="flex justify-between text-xl font-bold border-t-2 border-gray-300 dark:border-gray-600 pt-3 mt-2">
                  <span className="text-gray-900 dark:text-white">{t('receipt.grandTotal')}:</span>
                  <span className="text-gray-900 dark:text-white">{receipt.totals.total.toFixed(2)} SAR</span>
                </div>
              </div>

              {/* Payment Method */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border-t border-gray-200 dark:border-gray-600">
                <div className="flex justify-between text-sm mb-2">
                  <span className="font-semibold text-gray-700 dark:text-gray-300">
                    {t('receipt.paymentMethod')}:
                  </span>
                  <span className="text-gray-900 dark:text-white font-semibold capitalize">
                    {receipt.sale.payment_method}
                  </span>
                </div>
                {receipt.sale.payment_method === 'cash' && receipt.sale.payment_details && (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600 dark:text-gray-400">{t('receipt.cashReceived')}:</span>
                      <span className="text-gray-900 dark:text-white">
                        {(receipt.sale.payment_details.received || 0).toFixed(2)} SAR
                      </span>
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-gray-600 dark:text-gray-400">{t('receipt.change')}:</span>
                      <span className="text-gray-900 dark:text-white">
                        {(receipt.sale.payment_details.change || 0).toFixed(2)} SAR
                      </span>
                    </div>
                  </>
                )}
              </div>

              {/* Loyalty QR Code */}
              {receipt.loyalty && receipt.loyalty.qr_code_data_url && (
                <div className="text-center border-t border-gray-200 dark:border-gray-700 pt-6">
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {t('receipt.loyaltyQR')}
                  </p>
                  <img
                    src={receipt.loyalty.qr_code_data_url}
                    alt="Loyalty QR"
                    className="w-40 h-40 mx-auto"
                  />
                </div>
              )}

              {/* Footer */}
              <div className="text-center text-sm text-gray-600 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 pt-4">
                <p className="font-semibold">{t('receipt.thankYou')}</p>
              </div>
            </div>
          ) : null}
        </div>

        {/* Action Buttons */}
        {receipt && (
          <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleDownloadPDF}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-semibold transition-colors"
            >
              📄 {t('receipt.downloadPDF')}
            </button>
            <button
              onClick={handlePrint}
              className="flex-1 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 font-semibold transition-colors"
            >
              🖨️ {t('receipt.print')}
            </button>
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-500 font-semibold transition-colors"
            >
              {t('receipt.close')}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
