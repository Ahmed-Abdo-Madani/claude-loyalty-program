import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { endpoints } from '../../config/api'
import { managerApiRequest } from '../../utils/secureAuth'
import EnhancedQRScanner from '../EnhancedQRScanner'

export default function CheckoutModal({
  isOpen,
  onClose,
  cart,
  totals,
  onComplete,
  branchInfo,
  onLoyaltyDiscountChange
}) {
  const { t, i18n } = useTranslation('pos')
  
  // State
  const [paymentMethod, setPaymentMethod] = useState(null)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState(null)
  const [cashReceived, setCashReceived] = useState('')
  const [changeAmount, setChangeAmount] = useState(0)
  const [showReceiptOptions, setShowReceiptOptions] = useState(false)
  const [completedSale, setCompletedSale] = useState(null)
  const [showScanner, setShowScanner] = useState(false)
  const [scannedCustomer, setScannedCustomer] = useState(null)
  const [loyaltyProgress, setLoyaltyProgress] = useState(null)
  const [loyaltyOffer, setLoyaltyOffer] = useState(null)
  const [applyLoyaltyDiscount, setApplyLoyaltyDiscount] = useState(false)
  const [loyaltyLoading, setLoyaltyLoading] = useState(false)
  const [loyaltyError, setLoyaltyError] = useState(null)

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setPaymentMethod(null)
      setProcessing(false)
      setError(null)
      setCashReceived('')
      setChangeAmount(0)
      setShowReceiptOptions(false)
      setCompletedSale(null)
      setShowScanner(false)
      setScannedCustomer(null)
      setLoyaltyProgress(null)
      setLoyaltyOffer(null)
      setApplyLoyaltyDiscount(false)
      setLoyaltyError(null)
      if (onLoyaltyDiscountChange) {
        onLoyaltyDiscountChange(0)
      }
    }
  }, [isOpen, onLoyaltyDiscountChange])

  const handlePaymentMethodSelect = (method) => {
    setPaymentMethod(method)
    setError(null)
    
    // Reset cash fields when switching away from cash
    if (method !== 'cash') {
      setCashReceived('')
      setChangeAmount(0)
    }
  }

  const calculateChange = (received) => {
    const receivedAmount = parseFloat(received) || 0
    const change = receivedAmount - totals.total
    setChangeAmount(change >= 0 ? change : 0)
  }

  const handleCashReceivedChange = (e) => {
    const value = e.target.value
    setCashReceived(value)
    calculateChange(value)
  }

  const handleScanSuccess = async (customerToken, offerHash) => {
    setShowScanner(false)
    setLoyaltyLoading(true)
    setLoyaltyError(null)
    
    try {
      // Call loyalty validation endpoint
      const response = await managerApiRequest(endpoints.posLoyaltyValidate, {
        method: 'POST',
        body: JSON.stringify({ customerToken, offerHash })
      })
      
      const json = await response.json()
      
      if (json.success) {
        setScannedCustomer(json.customer)
        setLoyaltyProgress(json.progress)
        setLoyaltyOffer(json.offer)
        
        // Auto-select gift_offer payment if reward is available
        if (json.canRedeemReward) {
          setPaymentMethod('gift_offer')
          setApplyLoyaltyDiscount(true)
          if (onLoyaltyDiscountChange) {
            onLoyaltyDiscountChange(totals.total)
          }
        }
      } else {
        setLoyaltyError(json.error || 'Failed to validate loyalty')
      }
    } catch (err) {
      console.error('Loyalty validation failed:', err)
      setLoyaltyError('Failed to validate customer loyalty')
    } finally {
      setLoyaltyLoading(false)
    }
  }

  const handleScanError = (error) => {
    setShowScanner(false)
    setLoyaltyError(error)
  }

  const handleClearLoyalty = () => {
    setScannedCustomer(null)
    setLoyaltyProgress(null)
    setLoyaltyOffer(null)
    setApplyLoyaltyDiscount(false)
    setLoyaltyError(null)
    if (paymentMethod === 'gift_offer') {
      setPaymentMethod(null)
    }
    if (onLoyaltyDiscountChange) {
      onLoyaltyDiscountChange(0)
    }
  }

  const handleCompleteSale = async () => {
    // Validation
    if (!paymentMethod) {
      setError(t('checkout.validation.selectPaymentMethod'))
      return
    }

    if (paymentMethod === 'cash') {
      if (!cashReceived || parseFloat(cashReceived) < totals.total) {
        setError(t('checkout.validation.insufficientAmount'))
        return
      }
    }

    try {
      setProcessing(true)
      setError(null)

      // Prepare sale data
      const saleData = {
        items: cart.map(item => ({
          productId: item.product.public_id,
          quantity: item.quantity,
          notes: ''
        })),
        paymentMethod: paymentMethod,
        paymentDetails: paymentMethod === 'cash' ? {
          received: parseFloat(cashReceived),
          change: changeAmount
        } : null,
        customerId: scannedCustomer?.customer_id || null,
        loyaltyRedemption: applyLoyaltyDiscount && scannedCustomer && loyaltyProgress?.is_completed ? {
          customerId: scannedCustomer.customer_id,
          offerId: loyaltyOffer.public_id,
          rewardValue: totals.total
        } : null,
        notes: ''
      }

      // Call API
      const response = await managerApiRequest(endpoints.posSales, {
        method: 'POST',
        body: JSON.stringify(saleData)
      })

      // Parse response JSON
      const json = await response.json()

      if (json.success) {
        // Store completed sale data
        setCompletedSale(json.sale)
        
        // Show receipt options instead of closing immediately
        setShowReceiptOptions(true)
        setProcessing(false)
      } else {
        // API returned error
        setError(json.message || json.error || t('checkout.error.message'))
      }

    } catch (err) {
      console.error('Sale failed:', err)
      
      // Determine error message
      let errorMessage = t('checkout.error.message')
      if (err.message?.includes('network') || err.message?.includes('fetch')) {
        errorMessage = t('checkout.error.networkError')
      } else if (err.message?.includes('500') || err.message?.includes('server')) {
        errorMessage = t('checkout.error.serverError')
      }
      
      setError(errorMessage)
    } finally {
      setProcessing(false)
    }
  }

  const handleReceiptAction = async (action) => {
    try {
      switch (action) {
        case 'preview':
          // Open receipt preview modal (parent component will handle this)
          onComplete(completedSale, { action: 'preview' })
          break
          
        case 'print':
          // Call print endpoint
          await managerApiRequest(endpoints.posReceiptPrint(completedSale.public_id), {
            method: 'POST'
          })
          // Show success message
          alert(t('checkout.success.printSuccess'))
          onComplete(completedSale, { action: 'print' })
          break
          
        case 'email':
          // Prompt for email
          const email = prompt(t('checkout.success.enterEmail'))
          if (email) {
            await managerApiRequest(endpoints.posReceiptEmail(completedSale.public_id), {
              method: 'POST',
              body: JSON.stringify({ email })
            })
            alert(t('checkout.success.emailSuccess'))
          }
          onComplete(completedSale, { action: 'email' })
          break
          
        case 'both':
          // Prompt for email first
          const emailForBoth = prompt(t('checkout.success.enterEmail'))
          if (emailForBoth) {
            // Print first
            await managerApiRequest(endpoints.posReceiptPrint(completedSale.public_id), {
              method: 'POST'
            })
            // Then email
            await managerApiRequest(endpoints.posReceiptEmail(completedSale.public_id), {
              method: 'POST',
              body: JSON.stringify({ email: emailForBoth })
            })
            alert(t('checkout.success.bothSuccess'))
          }
          onComplete(completedSale, { action: 'both' })
          break
          
        case 'skip':
          // Just complete without receipt action
          onComplete(completedSale, { action: 'skip' })
          break
      }
      
      // Close modal after action
      onClose()
      
    } catch (error) {
      console.error('Receipt action failed:', error)
      alert(t('checkout.error.receiptActionFailed'))
    }
  }

  // Keyboard shortcuts
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose()
      } else if (e.key === 'Enter' && !processing) {
        handleCompleteSale()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, processing, paymentMethod, cashReceived])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" dir={i18n.dir()}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('checkout.title')}
          </h2>
          <button 
            onClick={onClose} 
            disabled={processing}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-2xl transition-colors disabled:opacity-50"
            aria-label={t('common.close')}
          >
            ✕
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6">
          {/* Order Summary */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
              {t('checkout.orderSummary')}
            </h3>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              <div className="space-y-2">
                {cart.map(item => (
                  <div key={item.product.public_id} className="flex justify-between text-sm text-gray-700 dark:text-gray-300">
                    <span>
                      {i18n.language === 'ar' && item.product.name_ar 
                        ? item.product.name_ar 
                        : item.product.name} × {item.quantity}
                    </span>
                    <span>{item.total.toFixed(2)} {t('common.sar')}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-200 dark:border-gray-600 mt-3 pt-3 space-y-1">
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                  <span>{t('cart.subtotal')}</span>
                  <span>{totals.subtotal.toFixed(2)} {t('common.sar')}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
                  <span>{t('cart.tax')}</span>
                  <span>{totals.tax.toFixed(2)} {t('common.sar')}</span>
                </div>
                {applyLoyaltyDiscount && loyaltyProgress?.is_completed && (
                  <div className="flex justify-between text-green-600 dark:text-green-400">
                    <span>{t('checkout.loyalty.discount')}</span>
                    <span>-{totals.total.toFixed(2)} {t('common.sar')}</span>
                  </div>
                )}
                <div className="flex justify-between text-xl font-bold text-gray-900 dark:text-white pt-2 border-t border-gray-200 dark:border-gray-600">
                  <span>{t('cart.total')}</span>
                  <span>
                    {applyLoyaltyDiscount && loyaltyProgress?.is_completed 
                      ? '0.00' 
                      : totals.total.toFixed(2)} {t('common.sar')}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Loyalty Scanner Section */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('checkout.loyalty.title')}
              </h3>
              {scannedCustomer && (
                <button
                  onClick={handleClearLoyalty}
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  {t('checkout.loyalty.clear')}
                </button>
              )}
            </div>
            
            {!scannedCustomer ? (
              <button
                onClick={() => setShowScanner(true)}
                disabled={processing}
                className="w-full h-16 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-primary hover:bg-primary/5 transition-all disabled:opacity-50 flex items-center justify-center gap-3"
              >
                <span className="text-3xl">📱</span>
                <span className="font-semibold text-gray-700 dark:text-gray-300">
                  {t('checkout.loyalty.scanCard')}
                </span>
              </button>
            ) : (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <span className="text-2xl">👤</span>
                  <div className="flex-1">
                    <p className="font-semibold text-blue-900 dark:text-blue-100">
                      {scannedCustomer.name || 'Customer'}
                    </p>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                      {t('checkout.loyalty.progress', { 
                        current: loyaltyProgress.current_stamps, 
                        max: loyaltyProgress.max_stamps 
                      })}
                    </p>
                    {loyaltyProgress.is_completed && (
                      <div className="mt-2 p-2 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded">
                        <p className="text-sm font-semibold text-green-900 dark:text-green-100">
                          ✅ {t('checkout.loyalty.rewardAvailable')}
                        </p>
                        <label className="flex items-center gap-2 mt-2">
                          <input
                            type="checkbox"
                            checked={applyLoyaltyDiscount}
                            onChange={(e) => {
                              setApplyLoyaltyDiscount(e.target.checked)
                              if (e.target.checked) {
                                setPaymentMethod('gift_offer')
                                if (onLoyaltyDiscountChange) {
                                  onLoyaltyDiscountChange(totals.total)
                                }
                              } else {
                                if (onLoyaltyDiscountChange) {
                                  onLoyaltyDiscountChange(0)
                                }
                              }
                            }}
                            className="w-5 h-5"
                          />
                          <span className="text-sm text-green-800 dark:text-green-200">
                            {t('checkout.loyalty.applyReward')}
                          </span>
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {loyaltyError && (
              <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-sm text-red-900 dark:text-red-100">
                  ⚠️ {loyaltyError}
                </p>
              </div>
            )}
          </div>
          
          {/* Payment Method Selection */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">
              {t('checkout.paymentMethod')}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Cash Button */}
              <button
                onClick={() => handlePaymentMethodSelect('cash')}
                disabled={processing}
                className={`h-24 rounded-lg border-2 transition-all disabled:opacity-50 ${
                  paymentMethod === 'cash'
                    ? 'border-primary bg-primary/10'
                    : 'border-gray-300 dark:border-gray-600 hover:border-primary/50'
                }`}
              >
                <div className="text-3xl mb-1">💵</div>
                <div className="font-semibold text-gray-900 dark:text-white">
                  {t('checkout.payment.cash')}
                </div>
              </button>
              
              {/* Card Button */}
              <button
                onClick={() => handlePaymentMethodSelect('card')}
                disabled={processing}
                className={`h-24 rounded-lg border-2 transition-all disabled:opacity-50 ${
                  paymentMethod === 'card'
                    ? 'border-primary bg-primary/10'
                    : 'border-gray-300 dark:border-gray-600 hover:border-primary/50'
                }`}
              >
                <div className="text-3xl mb-1">💳</div>
                <div className="font-semibold text-gray-900 dark:text-white">
                  {t('checkout.payment.card')}
                </div>
              </button>
              
              {/* Gift Offer Button */}
              <button
                onClick={() => handlePaymentMethodSelect('gift_offer')}
                disabled={processing}
                className={`h-24 rounded-lg border-2 transition-all disabled:opacity-50 ${
                  paymentMethod === 'gift_offer'
                    ? 'border-primary bg-primary/10'
                    : 'border-gray-300 dark:border-gray-600 hover:border-primary/50'
                }`}
              >
                <div className="text-3xl mb-1">🎁</div>
                <div className="font-semibold text-gray-900 dark:text-white">
                  {t('checkout.payment.giftOffer')}
                </div>
              </button>
            </div>
          </div>
          
          {/* Cash Payment Details */}
          {paymentMethod === 'cash' && (
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                {t('checkout.payment.cashReceived')}
              </label>
              <input
                type="number"
                step="0.01"
                min={totals.total}
                value={cashReceived}
                onChange={handleCashReceivedChange}
                disabled={processing}
                className="w-full px-4 py-3 text-lg border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary disabled:opacity-50"
                placeholder={t('checkout.payment.cashReceivedPlaceholder')}
                autoFocus
              />
              {cashReceived && parseFloat(cashReceived) >= totals.total && (
                <div className="mt-3 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-green-900 dark:text-green-100">
                      {t('checkout.payment.change')}:
                    </span>
                    <span className="text-xl font-bold text-green-600 dark:text-green-400">
                      {changeAmount.toFixed(2)} {t('common.sar')}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Gift Offer Note (Future Feature) */}
          {paymentMethod === 'gift_offer' && (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              {applyLoyaltyDiscount && scannedCustomer ? (
                <p className="text-sm text-green-900 dark:text-green-100">
                  ✅ {t('checkout.loyalty.redeemingReward', { customer: scannedCustomer.name })}
                </p>
              ) : (
                <p className="text-sm text-blue-900 dark:text-blue-100">
                  ℹ️ {t('checkout.payment.giftOfferNote')}
                </p>
              )}
            </div>
          )}
          
          {/* Receipt Options (shown after successful sale) */}
          {showReceiptOptions && completedSale && (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-center mb-3">
                <span className="text-2xl mr-2">✅</span>
                <h3 className="text-lg font-semibold text-green-900 dark:text-green-100">
                  {t('checkout.success.title')}
                </h3>
              </div>
              <p className="text-sm text-green-800 dark:text-green-200 mb-4">
                {t('checkout.success.message')}
              </p>
              <p className="text-sm font-semibold mb-3 text-green-900 dark:text-green-100">
                {t('checkout.success.saleNumber')}: {completedSale.sale_number}
              </p>
              
              {/* Receipt Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => handleReceiptAction('preview')}
                  className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-semibold"
                >
                  📄 {t('checkout.success.previewReceipt')}
                </button>
                <button
                  onClick={() => handleReceiptAction('print')}
                  className="px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-semibold"
                >
                  🖨️ {t('checkout.success.printReceipt')}
                </button>
                <button
                  onClick={() => handleReceiptAction('email')}
                  className="px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-semibold"
                >
                  📧 {t('checkout.success.emailReceipt')}
                </button>
                <button
                  onClick={() => handleReceiptAction('both')}
                  className="px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-semibold"
                >
                  🖨️📧 {t('checkout.success.bothReceipt')}
                </button>
                <button
                  onClick={() => handleReceiptAction('skip')}
                  className="px-4 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 text-sm font-semibold col-span-2"
                >
                  ⏭️ {t('checkout.success.skip')}
                </button>
              </div>
            </div>
          )}
          
          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-900 dark:text-red-100">
                ⚠️ {error}
              </p>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="flex gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            disabled={processing}
            className="flex-1 h-14 px-6 text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 font-semibold transition-colors disabled:opacity-50"
          >
            {t('checkout.cancel')}
          </button>
          {!showReceiptOptions && (
            <button
              onClick={handleCompleteSale}
              disabled={!paymentMethod || processing || (paymentMethod === 'cash' && (!cashReceived || parseFloat(cashReceived) < totals.total))}
              className="flex-1 h-14 px-6 text-white bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  {t('checkout.processing')}
                </span>
              ) : (
                `${t('checkout.completeSale')} (${totals.total.toFixed(2)} ${t('common.sar')})`
              )}
            </button>
          )}
        </div>
      </div>
      
      {/* QR Scanner Modal */}
      {showScanner && (
        <EnhancedQRScanner
          isActive={showScanner}
          onScanSuccess={handleScanSuccess}
          onScanError={handleScanError}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  )
}
