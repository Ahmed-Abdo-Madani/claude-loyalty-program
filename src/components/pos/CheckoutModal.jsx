import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { endpoints } from '../../config/api'
import { managerApiRequest, getManagerAuthData } from '../../utils/secureAuth'
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
  const [prizeConfirmationStatus, setPrizeConfirmationStatus] = useState(null) // 'pending', 'confirmed', 'failed'
  const [totalCompletions, setTotalCompletions] = useState(null)
  const [tierInfo, setTierInfo] = useState(null)

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
      setPrizeConfirmationStatus(null)
      setTotalCompletions(null)
      setTierInfo(null)
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

  const handleScanSuccess = async (customerToken, offerHash, rawData, format) => {
    console.log('🛒 POS loyalty scan:', { format, customerToken: customerToken.substring(0, 20) + '...', offerHash })
    
    setShowScanner(false)
    setLoyaltyLoading(true)
    setLoyaltyError(null)
    
    try {
      const managerData = getManagerAuthData()
      
      // 🔄 REUSE BRANCH SCANNER LOGIC: Call scan endpoint to add stamp and update passes
      // Construct URL based on whether offerHash is present (new format) or null (legacy format)
      const scanUrl = offerHash 
        ? `${endpoints.branchManagerScan}/${customerToken}/${offerHash}`
        : `${endpoints.branchManagerScan}/${customerToken}`
      
      console.log(`🔗 POS calling scan API with format: ${offerHash ? 'new (token:hash)' : 'legacy (token-only)'}`)
      
      const response = await fetch(scanUrl, {
        method: 'POST',
        headers: {
          'x-branch-id': managerData.branchId,
          'x-manager-token': managerData.managerToken,
          'Content-Type': 'application/json'
        }
      })
      
      const json = await response.json()
      
      console.log('🛒 POS scan response:', {
        success: json.success,
        rewardEarned: json.rewardEarned,
        customerId: json.customerId,
        offerId: json.offerId,
        progress: json.progress
      })
      
      if (json.success) {
        // Map scan response to loyalty state
        setScannedCustomer({
          customer_id: json.customerId,
          first_name: json.progress?.customerName || 'Customer'
        })
        
        setLoyaltyOffer({
          public_id: json.offerId,
          title: json.progress?.offerTitle || 'Loyalty Offer'
        })
        
        // Handle reward earned - auto-confirm prize
        if (json.rewardEarned) {
          console.log('🔄 POS auto-confirming prize for customer:', json.customerId, 'offer:', json.offerId)
          setPrizeConfirmationStatus('pending')
          
          // Auto-confirm prize (mirroring BranchScanner logic)
          try {
            const confirmResponse = await fetch(
              `${endpoints.branchManagerConfirmPrize}/${json.customerId}/${json.offerId}`,
              {
                method: 'POST',
                headers: {
                  'x-branch-id': managerData.branchId,
                  'x-manager-token': managerData.managerToken,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({ notes: '' })
              }
            )

            // Check response status before parsing JSON
            if (!confirmResponse.ok) {
              throw new Error(`Prize confirmation failed: ${confirmResponse.status}`)
            }

            const confirmData = await confirmResponse.json()

            if (confirmData.success) {
              console.log('✅ POS prize confirmed, stamps reset, wallet updated', confirmData.progress)
              
              // Update with FRESH progress data (reset stamps)
              setLoyaltyProgress({
                current_stamps: confirmData.progress?.currentStamps || 0,
                max_stamps: confirmData.progress?.maxStamps || 10,
                is_completed: confirmData.progress?.isCompleted || false
              })
              
              setPrizeConfirmationStatus('confirmed')
              setTotalCompletions(confirmData.totalCompletions)
              setTierInfo({
                tier: confirmData.tier,
                tierUpgrade: confirmData.tierUpgrade
              })
              
              // Auto-select gift_offer payment
              setPaymentMethod('gift_offer')
              setApplyLoyaltyDiscount(true)
              if (onLoyaltyDiscountChange) {
                onLoyaltyDiscountChange(totals.total)
              }
              
              console.log('🛒 Setting loyalty progress to:', {
                current_stamps: confirmData.progress?.currentStamps,
                max_stamps: confirmData.progress?.maxStamps,
                is_completed: confirmData.progress?.isCompleted
              })
            } else {
              console.error('⚠️ POS prize confirmation failed but stamp was added:', confirmData.error)
              
              // Prize confirmation failed, use scan data
              setLoyaltyProgress({
                current_stamps: json.progress?.currentStamps || 0,
                max_stamps: json.progress?.maxStamps || 10,
                is_completed: json.rewardEarned || false
              })
              
              setPrizeConfirmationStatus('failed')
              setLoyaltyError('Prize confirmed but wallet update may be delayed')
              
              // Still auto-select gift_offer payment
              setPaymentMethod('gift_offer')
              setApplyLoyaltyDiscount(true)
              if (onLoyaltyDiscountChange) {
                onLoyaltyDiscountChange(totals.total)
              }
            }
          } catch (confirmError) {
            console.error('⚠️ POS prize confirmation failed but stamp was added:', confirmError)
            
            // Handle auto-confirm errors without blocking flow
            setLoyaltyProgress({
              current_stamps: json.progress?.currentStamps || 0,
              max_stamps: json.progress?.maxStamps || 10,
              is_completed: json.rewardEarned || false
            })
            
            setPrizeConfirmationStatus('failed')
            setLoyaltyError('Prize confirmed but wallet update may be delayed')
            
            // Still auto-select gift_offer payment
            setPaymentMethod('gift_offer')
            setApplyLoyaltyDiscount(true)
            if (onLoyaltyDiscountChange) {
              onLoyaltyDiscountChange(totals.total)
            }
          }
        } else {
          // Regular stamp added (no reward earned)
          setLoyaltyProgress({
            current_stamps: json.progress?.currentStamps || 0,
            max_stamps: json.progress?.maxStamps || 10,
            is_completed: json.rewardEarned || false
          })
          
          console.log('✅ POS scan successful, stamps updated and pass synced')
        }
      } else {
        setLoyaltyError(json.error || 'Failed to process loyalty scan')
      }
    } catch (err) {
      console.error('Loyalty scan failed:', err)
      setLoyaltyError('Failed to process customer loyalty')
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
    setPrizeConfirmationStatus(null)
    setTotalCompletions(null)
    setTierInfo(null)
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
        loyaltyRedemption: applyLoyaltyDiscount && scannedCustomer && (loyaltyProgress?.is_completed || prizeConfirmationStatus === 'confirmed') ? {
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4" dir={i18n.dir()}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white dark:bg-gray-800 flex justify-between items-center p-3 sm:p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">
            {t('checkout.title')}
          </h2>
          <button 
            onClick={onClose} 
            disabled={processing}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 text-xl sm:text-2xl transition-colors disabled:opacity-50"
            aria-label={t('common.close')}
          >
            ✕
          </button>
        </div>
        
        {/* Content */}
        <div className="p-3 sm:p-4">
          {/* Order Summary - Compact */}
          <div className="mb-3 sm:mb-4">
            <h3 className="text-base sm:text-lg font-semibold mb-2 text-gray-900 dark:text-white">
              {t('checkout.orderSummary')}
            </h3>
            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
              <div className="space-y-1">
                {cart.map(item => (
                  <div key={item.product.public_id} className="flex justify-between text-xs sm:text-sm text-gray-700 dark:text-gray-300">
                    <span className="truncate mr-2">
                      {i18n.language === 'ar' && item.product.name_ar 
                        ? item.product.name_ar 
                        : item.product.name} × {item.quantity}
                    </span>
                    <span className="whitespace-nowrap">{item.total.toFixed(2)} {t('common.sar')}</span>
                  </div>
                ))}
              </div>
              <div className="border-t border-gray-200 dark:border-gray-600 mt-2 pt-2 space-y-1">
                <div className="flex justify-between text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  <span>{t('cart.subtotal')}</span>
                  <span>{totals.subtotal.toFixed(2)} {t('common.sar')}</span>
                </div>
                <div className="flex justify-between text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  <span>{t('cart.tax')}</span>
                  <span>{totals.tax.toFixed(2)} {t('common.sar')}</span>
                </div>
                {applyLoyaltyDiscount && (loyaltyProgress?.is_completed || prizeConfirmationStatus === 'confirmed') && (
                  <div className="flex justify-between text-xs sm:text-sm text-green-600 dark:text-green-400">
                    <span>{t('checkout.loyalty.discount')}</span>
                    <span>-{totals.total.toFixed(2)} {t('common.sar')}</span>
                  </div>
                )}
                <div className="flex justify-between text-base sm:text-lg font-bold text-gray-900 dark:text-white pt-1 border-t border-gray-200 dark:border-gray-600">
                  <span>{t('cart.total')}</span>
                  <span>
                    {applyLoyaltyDiscount && (loyaltyProgress?.is_completed || prizeConfirmationStatus === 'confirmed')
                      ? '0.00' 
                      : totals.total.toFixed(2)} {t('common.sar')}
                  </span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Loyalty Scanner Section - Compact */}
          <div className="mb-3 sm:mb-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                {t('checkout.loyalty.title')}
              </h3>
              {scannedCustomer && (
                <button
                  onClick={handleClearLoyalty}
                  className="text-xs sm:text-sm text-red-600 hover:text-red-700"
                >
                  {t('checkout.loyalty.clear')}
                </button>
              )}
            </div>
            
            {!scannedCustomer ? (
              <button
                onClick={() => setShowScanner(true)}
                disabled={processing}
                className="w-full h-12 sm:h-14 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:border-primary hover:bg-primary/5 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <span className="text-xl sm:text-2xl">📱</span>
                <span className="text-sm sm:text-base font-semibold text-gray-700 dark:text-gray-300">
                  {t('checkout.loyalty.scanCard')}
                </span>
              </button>
            ) : (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <span className="text-xl sm:text-2xl">👤</span>
                  <div className="flex-1">
                    <p className="text-sm sm:text-base font-semibold text-blue-900 dark:text-blue-100">
                      {scannedCustomer.name || scannedCustomer.first_name || 'Customer'}
                    </p>
                    
                    {/* Prize Confirmed - Show New Cycle */}
                    {prizeConfirmationStatus === 'confirmed' && (
                      <div className="mt-2 space-y-2">
                        <div className="p-2 bg-gradient-to-r from-green-100 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 border border-green-300 dark:border-green-700 rounded">
                          <p className="text-xs sm:text-sm font-bold text-green-900 dark:text-green-100">
                            🎉 {t('checkout.loyalty.rewardConfirmed') || 'Reward Earned & Confirmed!'}
                          </p>
                          <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                            {t('checkout.loyalty.newCycle') || 'New cycle started'}: {loyaltyProgress.current_stamps}/{loyaltyProgress.max_stamps} {t('checkout.loyalty.stamps') || 'stamps'}
                          </p>
                          {totalCompletions && (
                            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                              🌟 {t('checkout.loyalty.totalRewards') || 'Total rewards earned'}: {totalCompletions}
                            </p>
                          )}
                          {tierInfo?.tierUpgrade && (
                            <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                              🏆 {t('checkout.loyalty.tierUpgrade') || 'Upgraded to'} {tierInfo.tier}!
                            </p>
                          )}
                        </div>
                        <label className="flex items-center gap-2 p-2 bg-white dark:bg-gray-700 rounded">
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
                            className="w-4 h-4"
                          />
                          <span className="text-xs sm:text-sm font-semibold text-green-800 dark:text-green-200">
                            {t('checkout.loyalty.applyReward') || 'Apply reward to this order'}
                          </span>
                        </label>
                      </div>
                    )}
                    
                    {/* Prize Pending/Failed - Show Warning */}
                    {(prizeConfirmationStatus === 'pending' || prizeConfirmationStatus === 'failed') && loyaltyProgress && loyaltyProgress.is_completed && (
                      <div className="mt-2 space-y-2">
                        <div className="p-2 bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 rounded">
                          <p className="text-xs sm:text-sm font-semibold text-yellow-900 dark:text-yellow-100">
                            ⚠️ {t('checkout.loyalty.rewardPending') || 'Reward earned - confirmation pending'}
                          </p>
                          <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                            {loyaltyProgress.current_stamps}/{loyaltyProgress.max_stamps} {t('checkout.loyalty.stamps') || 'stamps'} - {t('checkout.loyalty.readyToRedeem') || 'Ready to redeem'}
                          </p>
                          <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                            {t('checkout.loyalty.walletUpdateDelay') || 'Wallet will update shortly'}
                          </p>
                        </div>
                        <label className="flex items-center gap-2 p-2 bg-white dark:bg-gray-700 rounded">
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
                            className="w-4 h-4"
                          />
                          <span className="text-xs sm:text-sm font-semibold text-yellow-800 dark:text-yellow-200">
                            {t('checkout.loyalty.applyReward') || 'Apply reward to this order'}
                          </span>
                        </label>
                      </div>
                    )}
                    
                    {/* Regular Progress - No Reward Yet */}
                    {!loyaltyProgress.is_completed && prizeConfirmationStatus !== 'confirmed' && (
                      <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-300 mt-1">
                        {t('checkout.loyalty.progress', { 
                          current: loyaltyProgress.current_stamps, 
                          max: loyaltyProgress.max_stamps 
                        })}
                      </p>
                    )}
                    
                    {/* Old Completed State (shouldn't happen with auto-confirm, but fallback) */}
                    {loyaltyProgress.is_completed && !prizeConfirmationStatus && (
                      <div className="mt-2 p-2 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded">
                        <p className="text-xs sm:text-sm font-semibold text-green-900 dark:text-green-100">
                          ✅ {t('checkout.loyalty.rewardAvailable') || 'Reward Available'}
                        </p>
                        <label className="flex items-center gap-2 mt-1">
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
                            className="w-4 h-4"
                          />
                          <span className="text-xs sm:text-sm text-green-800 dark:text-green-200">
                            {t('checkout.loyalty.applyReward') || 'Apply reward to this order'}
                          </span>
                        </label>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {loyaltyError && (
              <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <p className="text-xs sm:text-sm text-red-900 dark:text-red-100">
                  ⚠️ {loyaltyError}
                </p>
              </div>
            )}
          </div>
          
          {/* Payment Method Selection - Compact */}
          <div className="mb-3 sm:mb-4">
            <h3 className="text-base sm:text-lg font-semibold mb-2 text-gray-900 dark:text-white">
              {t('checkout.paymentMethod')}
            </h3>
            <div className="grid grid-cols-3 gap-2">
              {/* Cash Button */}
              <button
                onClick={() => handlePaymentMethodSelect('cash')}
                disabled={processing}
                className={`h-16 sm:h-20 rounded-lg border-2 transition-all disabled:opacity-50 flex flex-col items-center justify-center ${
                  paymentMethod === 'cash'
                    ? 'border-primary bg-primary/10'
                    : 'border-gray-300 dark:border-gray-600 hover:border-primary/50'
                }`}
              >
                <div className="text-2xl sm:text-3xl mb-0.5">💵</div>
                <div className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">
                  {t('checkout.payment.cash')}
                </div>
              </button>
              
              {/* Card Button */}
              <button
                onClick={() => handlePaymentMethodSelect('card')}
                disabled={processing}
                className={`h-16 sm:h-20 rounded-lg border-2 transition-all disabled:opacity-50 flex flex-col items-center justify-center ${
                  paymentMethod === 'card'
                    ? 'border-primary bg-primary/10'
                    : 'border-gray-300 dark:border-gray-600 hover:border-primary/50'
                }`}
              >
                <div className="text-2xl sm:text-3xl mb-0.5">💳</div>
                <div className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">
                  {t('checkout.payment.card')}
                </div>
              </button>
              
              {/* Gift Offer Button */}
              <button
                onClick={() => handlePaymentMethodSelect('gift_offer')}
                disabled={processing}
                className={`h-16 sm:h-20 rounded-lg border-2 transition-all disabled:opacity-50 flex flex-col items-center justify-center ${
                  paymentMethod === 'gift_offer'
                    ? 'border-primary bg-primary/10'
                    : 'border-gray-300 dark:border-gray-600 hover:border-primary/50'
                }`}
              >
                <div className="text-2xl sm:text-3xl mb-0.5">🎁</div>
                <div className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">
                  {t('checkout.payment.giftOffer')}
                </div>
              </button>
            </div>
          </div>
          
          {/* Cash Payment Details - Compact */}
          {paymentMethod === 'cash' && (
            <div className="mb-3 sm:mb-4">
              <label className="block text-xs sm:text-sm font-medium mb-1.5 text-gray-900 dark:text-white">
                {t('checkout.payment.cashReceived')}
              </label>
              <input
                type="number"
                step="0.01"
                min={totals.total}
                value={cashReceived}
                onChange={handleCashReceivedChange}
                disabled={processing}
                className="w-full px-3 py-2 sm:py-2.5 text-base sm:text-lg border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary disabled:opacity-50"
                placeholder={t('checkout.payment.cashReceivedPlaceholder')}
                autoFocus
              />
              {cashReceived && parseFloat(cashReceived) >= totals.total && (
                <div className="mt-2 p-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-xs sm:text-sm font-semibold text-green-900 dark:text-green-100">
                      {t('checkout.payment.change')}:
                    </span>
                    <span className="text-base sm:text-lg font-bold text-green-600 dark:text-green-400">
                      {changeAmount.toFixed(2)} {t('common.sar')}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Gift Offer Note - Compact */}
          {paymentMethod === 'gift_offer' && (
            <div className="mb-3 sm:mb-4 p-2.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              {applyLoyaltyDiscount && scannedCustomer ? (
                <p className="text-xs sm:text-sm text-green-900 dark:text-green-100">
                  ✅ {t('checkout.loyalty.redeemingReward', { customer: scannedCustomer.name })}
                </p>
              ) : (
                <p className="text-xs sm:text-sm text-blue-900 dark:text-blue-100">
                  ℹ️ {t('checkout.payment.giftOfferNote')}
                </p>
              )}
            </div>
          )}
          
          {/* Receipt Options - Compact */}
          {showReceiptOptions && completedSale && (
            <div className="mb-3 sm:mb-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-center mb-2">
                <span className="text-xl sm:text-2xl mr-2">✅</span>
                <h3 className="text-base sm:text-lg font-semibold text-green-900 dark:text-green-100">
                  {t('checkout.success.title')}
                </h3>
              </div>
              <p className="text-xs sm:text-sm text-green-800 dark:text-green-200 mb-2">
                {t('checkout.success.message')}
              </p>
              <p className="text-xs sm:text-sm font-semibold mb-2 text-green-900 dark:text-green-100">
                {t('checkout.success.saleNumber')}: {completedSale.sale_number}
              </p>
              
              {/* Receipt Action Buttons */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => handleReceiptAction('preview')}
                  className="px-2 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs sm:text-sm font-semibold"
                >
                  📄 <span className="hidden sm:inline">{t('checkout.success.previewReceipt')}</span><span className="sm:hidden">Preview</span>
                </button>
                <button
                  onClick={() => handleReceiptAction('print')}
                  className="px-2 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-xs sm:text-sm font-semibold"
                >
                  🖨️ <span className="hidden sm:inline">{t('checkout.success.printReceipt')}</span><span className="sm:hidden">Print</span>
                </button>
                <button
                  onClick={() => handleReceiptAction('skip')}
                  className="px-2 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 text-xs sm:text-sm font-semibold"
                >
                  ⏭️ <span className="hidden sm:inline">{t('checkout.success.skip')}</span><span className="sm:hidden">Skip</span>
                </button>
              </div>
            </div>
          )}
          
          {/* Error Message - Compact */}
          {error && (
            <div className="mb-3 p-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-xs sm:text-sm text-red-900 dark:text-red-100">
                ⚠️ {error}
              </p>
            </div>
          )}
        </div>
        
        {/* Footer - Compact & Sticky */}
        <div className="sticky bottom-0 bg-white dark:bg-gray-800 flex gap-2 p-3 sm:p-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            disabled={processing}
            className="flex-1 h-11 sm:h-12 px-3 sm:px-4 text-sm sm:text-base text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 font-semibold transition-colors disabled:opacity-50"
          >
            {t('checkout.cancel')}
          </button>
          {!showReceiptOptions && (
            <button
              onClick={handleCompleteSale}
              disabled={!paymentMethod || processing || (paymentMethod === 'cash' && (!cashReceived || parseFloat(cashReceived) < totals.total))}
              className="flex-1 h-11 sm:h-12 px-3 sm:px-4 text-sm sm:text-base text-white bg-green-600 hover:bg-green-700 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {processing ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin h-4 w-4 sm:h-5 sm:w-5 mr-1.5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span className="hidden sm:inline">{t('checkout.processing')}</span>
                  <span className="sm:hidden">...</span>
                </span>
              ) : (
                <>
                  <span className="hidden sm:inline">{t('checkout.completeSale')} ({totals.total.toFixed(2)} {t('common.sar')})</span>
                  <span className="sm:hidden">{totals.total.toFixed(2)} {t('common.sar')}</span>
                </>
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
