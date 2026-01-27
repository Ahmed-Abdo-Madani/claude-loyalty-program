import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useTranslation } from 'react-i18next'
import { updateBranchManagerPin, secureApiRequest, getSecureAuthHeaders } from '../utils/secureAuth'
import { endpoints } from '../config/api'
import QRCodeGenerator from '../utils/qrCodeGenerator'

function BranchManagerAccessModal({ branch, isOpen, onClose, onSuccess }) {
  const { t } = useTranslation('dashboard')

  // State management
  const [showPin, setShowPin] = useState(false)
  const [pinValidated, setPinValidated] = useState(false)
  const [pinSaving, setPinSaving] = useState(false)
  const [pinSaveError, setPinSaveError] = useState(null)
  const [pinSavedSuccessfully, setPinSavedSuccessfully] = useState(false)
  const [managerPinEnabled, setManagerPinEnabled] = useState(branch?.manager_pin_enabled || false)
  const [posAccessEnabled, setPosAccessEnabled] = useState(branch?.pos_access_enabled ?? true)
  const [showPosDisableConfirm, setShowPosDisableConfirm] = useState(false)
  const [managerPin, setManagerPin] = useState('')
  const [toggleSaving, setToggleSaving] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [managerQrData, setManagerQrData] = useState(null)
  const [managerQrLoading, setManagerQrLoading] = useState(false)
  const [linkCopied, setLinkCopied] = useState(false)
  const [copyError, setCopyError] = useState(null)

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }

    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isOpen])

  // Mounting delay protection to prevent immediate closure
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        setIsMounted(true)
      }, 100)
      return () => clearTimeout(timer)
    } else {
      setIsMounted(false)
    }
  }, [isOpen, branch?.public_id])


  // Sync state with branch prop
  useEffect(() => {
    if (isOpen && branch) {
      setManagerPinEnabled(branch.manager_pin_enabled || false)
      setPosAccessEnabled(branch.pos_access_enabled ?? true)
    }
  }, [isOpen, branch?.public_id])

  // Generate QR code when modal opens, branch changes, or manager access is enabled
  useEffect(() => {
    const generateManagerLoginQR = async () => {
      if (!branch?.public_id) return

      try {
        setManagerQrLoading(true)
        const result = await QRCodeGenerator.generateManagerLoginQRCode(
          branch.public_id,
          { size: 120 }
        )

        if (result.success) {
          setManagerQrData(result.data)
        } else {
          console.error('Failed to generate manager login QR:', result.error)
          setManagerQrData(null)
        }
      } catch (error) {
        console.error('Error generating manager login QR:', error)
        setManagerQrData(null)
      } finally {
        setManagerQrLoading(false)
      }
    }

    if (isOpen && branch?.public_id && managerPinEnabled) {
      generateManagerLoginQR()
    }
  }, [isOpen, branch?.public_id, managerPinEnabled])

  // Defensive close handler
  const handleClose = () => {
    if (isMounted) {
      // Refresh branch list when closing modal to sync any changes
      if (onSuccess) {
        onSuccess()
      }
      onClose()
    }
  }

  // Handle PIN save
  const handleSavePin = async () => {
    if (!branch?.public_id) {
      return
    }

    if (managerPin && /^\d{4,6}$/.test(managerPin)) {
      setPinSaving(true)
      setPinSaveError(null)

      const result = await updateBranchManagerPin(branch.public_id, managerPin)

      setPinSaving(false)

      if (result.success) {
        setPinValidated(true)
        setPinSavedSuccessfully(true)
        setPinSaveError(null)
      } else {
        setPinValidated(false)
        setPinSavedSuccessfully(false)
        // Translate error code to localized message
        const errorCodeMap = {
          'PIN_FORMAT_INVALID': t('branches.pinFormatInvalid'),
          'BRANCH_ID_REQUIRED': t('branches.branchIdRequired'),
          'SESSION_EXPIRED': t('branches.sessionExpired'),
          'BRANCH_NOT_FOUND': t('branches.branchNotFound'),
          'SERVER_ERROR': t('branches.serverError'),
          'NETWORK_ERROR': t('branches.networkError'),
          'PIN_SAVE_FAILED': t('branches.pinSaveFailed')
        }
        setPinSaveError(errorCodeMap[result.code] || result.message || t('branches.pinSaveFailed'))
      }
    }
  }

  // Handle PIN input change
  const handlePinChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').substring(0, 6)
    setManagerPin(value)
    setPinValidated(false)
    setPinSavedSuccessfully(false)
    setPinSaveError(null)
  }

  // Handle manager access toggle
  const handleToggleManagerAccess = async (enabled) => {
    if (!branch?.public_id) {
      setManagerPinEnabled(enabled)
      return
    }

    // Optimistically update UI immediately
    setManagerPinEnabled(enabled)
    setToggleSaving(true)

    try {
      const response = await secureApiRequest(`${endpoints.myBranches}/${branch.public_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getSecureAuthHeaders()
        },
        body: JSON.stringify({
          manager_pin_enabled: enabled
        })
      })

      const data = await response.json()

      if (data.success) {
        console.log('✅ Manager access updated:', data.data?.manager_pin_enabled)
        // Keep optimistic state, don't call onSuccess to avoid branch list reload during modal interaction
      } else {
        throw new Error(data.message || 'Failed to update manager access')
      }
    } catch (error) {
      console.error('Error updating manager access:', error)
      // Revert toggle on error
      setManagerPinEnabled(!enabled)
      setPinSaveError(error.message || 'Failed to update manager access setting')
    } finally {
      setToggleSaving(false)
    }
  }

  // Handle POS Access Toggle
  const handleTogglePosAccess = async (enabled) => {
    if (!branch?.public_id) {
      setPosAccessEnabled(enabled)
      return
    }

    if (!enabled) {
      setShowPosDisableConfirm(true)
      return
    }

    await executePosToggle(true)
  }

  const executePosToggle = async (enabled) => {
    setPosAccessEnabled(enabled)
    setToggleSaving(true)
    setShowPosDisableConfirm(false)

    try {
      const response = await secureApiRequest(`${endpoints.myBranches}/${branch.public_id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getSecureAuthHeaders()
        },
        body: JSON.stringify({
          pos_access_enabled: enabled
        })
      })

      const data = await response.json()

      if (!data.success) {
        throw new Error(data.message || 'Failed to update POS access')
      }
      // Success - optimistic update holds
    } catch (error) {
      console.error('Error updating POS access:', error)
      setPosAccessEnabled(!enabled) // Revert
      setPinSaveError(error.message || 'Failed to update POS access setting')
    } finally {
      setToggleSaving(false)
    }
  }

  // Handle copying the login link
  const handleCopyLoginLink = async () => {
    if (!branch?.public_id) return

    try {
      const loginUrl = `${import.meta.env.VITE_BASE_URL || 'https://app.madna.me'}/branch-manager-login?branch=${branch.public_id}`
      await navigator.clipboard.writeText(loginUrl)

      setLinkCopied(true)
      setCopyError(null)

      // Reset success state after 3 seconds
      setTimeout(() => setLinkCopied(false), 3000)
    } catch (err) {
      console.error('Failed to copy link:', err)
      setCopyError(t('branches.loginLinkCopyFailed'))
      setTimeout(() => setCopyError(null), 3000)
    }
  }

  // Backdrop click handler - only close if clicking directly on backdrop
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      handleClose()
    }
  }

  // Modal content click handler - prevent event bubbling
  const handleModalContentClick = (e) => {
    e.stopPropagation()
  }

  if (!isOpen) return null

  return createPortal(
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[9999] p-4"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white dark:bg-gray-800 w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col max-h-[90vh]"
        onClick={handleModalContentClick}
      >
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white flex items-center">
              🔐 {t('branches.posAccess')}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {branch?.name || 'Branch'} - {t('branches.posAccessDesc')}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 active:scale-95 transition-all min-w-[44px] min-h-[44px] flex items-center justify-center touch-target"
          >
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body - Scrollable */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="space-y-6">
            {/* POS Access Control Section */}
            <div className={`p-4 rounded-lg border-2 mb-4 transition-colors ${posAccessEnabled
              ? 'bg-green-50 dark:bg-green-900/10 border-green-200 dark:border-green-800'
              : 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
              }`}>
              <div className="flex items-center justify-between">
                <div>
                  <h3 className={`text-sm font-bold flex items-center gap-2 ${posAccessEnabled ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'
                    }`}>
                    {posAccessEnabled ? '✅ ' + t('branches.posAccessActive') : '🚫 ' + t('branches.posAccessDisabled')}
                  </h3>
                  <p className={`text-xs mt-1 ${posAccessEnabled ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                    }`}>
                    {t('branches.posAccessDesc')}
                  </p>
                </div>
                <div className="flex items-center">
                  <button
                    onClick={() => handleTogglePosAccess(!posAccessEnabled)}
                    disabled={toggleSaving}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 ${posAccessEnabled
                      ? 'bg-green-500 focus:ring-green-500'
                      : 'bg-gray-200 dark:bg-gray-600 focus:ring-gray-500'
                      }`}
                  >
                    <span
                      className={`${posAccessEnabled ? 'translate-x-6' : 'translate-x-1'
                        } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Manager Access Section */}
            <div className={`p-4 rounded-lg border-2 border-purple-200 dark:border-purple-800 transition-opacity ${!posAccessEnabled ? 'opacity-50 pointer-events-none grayscale' : 'bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20'
              }`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-purple-900 dark:text-purple-200 flex items-center">
                    🔐 {t('branches.enablePosAccess')}
                  </h3>
                  <p className="text-xs text-purple-700 dark:text-purple-300 mt-1">
                    {t('branches.posAccessDesc')}
                  </p>
                </div>
                <input
                  type="checkbox"
                  id="manager_pin_enabled"
                  checked={managerPinEnabled}
                  onChange={(e) => handleToggleManagerAccess(e.target.checked)}
                  disabled={toggleSaving}
                  className="h-6 w-6 min-h-[24px] min-w-[24px] text-purple-600 focus:ring-purple-500 border-purple-300 dark:border-purple-600 rounded bg-white dark:bg-gray-700 disabled:opacity-50"
                />
              </div>

              {managerPinEnabled && (
                <div className="space-y-4 mt-4 pt-4 border-t border-purple-200 dark:border-purple-700">
                  {/* PIN Input */}
                  <div>
                    {/* Hidden username field to prevent browser autofill on parent search bar */}
                    <input
                      type="text"
                      autoComplete="username"
                      value={branch?.name || "admin"}
                      readOnly
                      style={{ opacity: 0, position: 'absolute', width: 0, height: 0, pointerEvents: 'none', zIndex: -1 }}
                      aria-hidden="true"
                    />
                    <label className="block text-sm font-semibold text-purple-900 dark:text-purple-200 mb-2">
                      📱 {t('branches.posPin')}
                    </label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <input
                          type={showPin ? "text" : "password"}
                          value={managerPin}
                          onChange={handlePinChange}
                          maxLength={6}
                          pattern="[0-9]{4,6}"
                          className="w-full px-4 py-3 min-h-[44px] border border-purple-300 dark:border-purple-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-purple-400 dark:placeholder-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500 transition-all touch-target font-mono text-lg tracking-widest"
                          placeholder={t('branches.posPinPlaceholder')}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPin(!showPin)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300"
                        >
                          {showPin ? '👁️' : '👁️‍🗨️'}
                        </button>
                      </div>
                      <button
                        type="button"
                        onClick={handleSavePin}
                        disabled={!managerPin || !/^\d{4,6}$/.test(managerPin) || pinSaving}
                        className={`px-4 py-3 min-h-[44px] rounded-lg font-semibold transition-all shadow-md disabled:opacity-50 whitespace-nowrap ${pinSavedSuccessfully
                          ? 'bg-green-600 hover:bg-green-700 text-white'
                          : pinSaveError
                            ? 'bg-red-600 hover:bg-red-700 text-white'
                            : 'bg-purple-600 hover:bg-purple-700 text-white active:scale-95'
                          }`}
                      >
                        {pinSaving ? '⏳ ' + t('branches.savingPin') :
                          pinSavedSuccessfully ? '✓ ' + t('branches.pinSaved') :
                            pinSaveError ? '❌ ' + t('branches.retryPin') :
                              '💾 ' + t('branches.savePin')}
                      </button>
                    </div>
                    <p className="text-xs text-purple-700 dark:text-purple-300 mt-2">
                      {pinSavedSuccessfully
                        ? `✓ ${t('branches.pinSavedAndEncrypted')}`
                        : pinSaveError
                          ? `❌ ${pinSaveError}`
                          : managerPin && /^\d{4,6}$/.test(managerPin)
                            ? `✓ ${t('branches.enterPinAndClickSave')}`
                            : t('branches.pinValidation')}
                    </p>
                  </div>

                  {/* Branch Login QR Code */}
                  {branch?.public_id && (
                    <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-purple-200 dark:border-purple-700">
                      <h4 className="text-sm font-semibold text-purple-900 dark:text-purple-200 mb-2">
                        📱 {t('branches.posLoginQR')}
                      </h4>
                      <div className="flex items-center gap-4">
                        <div className="bg-white p-2 rounded-lg border border-gray-200">
                          {managerQrLoading ? (
                            <div className="w-[120px] h-[120px] flex items-center justify-center">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                            </div>
                          ) : managerQrData ? (
                            <img
                              src={managerQrData.qrCodeDataUrl}
                              alt={t('branches.posLoginQRAlt')}
                              className="w-[120px] h-[120px]"
                            />
                          ) : (
                            <div className="w-[120px] h-[120px] flex items-center justify-center text-gray-400">
                              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                              </svg>
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-purple-700 dark:text-purple-300 mb-2">
                            {t('branches.posLoginQRDesc')}
                          </p>
                          <div className="bg-purple-50 dark:bg-purple-900/30 p-2 rounded border border-purple-200 dark:border-purple-700">
                            <code className="text-xs text-purple-900 dark:text-purple-200 break-all">
                              {branch.public_id}
                            </code>
                          </div>
                        </div>
                      </div>

                      {/* Share Link Button */}
                      <div className="mt-4 pt-4 border-t border-purple-100 dark:border-purple-900/50">
                        <button
                          type="button"
                          onClick={handleCopyLoginLink}
                          disabled={!branch?.public_id || linkCopied}
                          aria-label={t('branches.sharePosLoginLink')}
                          className={`w-full px-4 py-3 min-h-[44px] rounded-lg font-semibold transition-all shadow-md flex items-center justify-center gap-2 ${linkCopied
                            ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800'
                            : 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800 hover:bg-blue-100 dark:hover:bg-blue-900/30'
                            } active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {linkCopied ? (
                            <>
                              <span>✓</span>
                              <span>{t('branches.loginLinkCopied')}</span>
                            </>
                          ) : (
                            <>
                              <span>🔗</span>
                              <span>{t('branches.copyLoginLink')}</span>
                            </>
                          )}
                        </button>
                        {copyError && (
                          <p className="text-xs text-red-500 mt-2 text-center">
                            {copyError}
                          </p>
                        )}
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2 text-center">
                          {t('branches.sharePosLoginLinkDesc')}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 p-4 sm:p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
          <button
            onClick={handleClose}
            className="w-full px-6 py-3 min-h-[44px] bg-gradient-to-r from-primary to-blue-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 active:scale-95 transition-all shadow-lg touch-target"
          >
            {t('common.close')}
          </button>
        </div>
      </div>

      {/* Confirmation Modal for Disabling POS Access */}
      {showPosDisableConfirm && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowPosDisableConfirm(false)}></div>
          <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-2xl p-6 max-w-sm w-full border border-red-200 dark:border-red-800 animation-scale-in">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
                <svg className="h-6 w-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                {t('branches.disablePosAccessTitle')}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                {t('branches.disablePosAccessMessage')}
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowPosDisableConfirm(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  {t('common.cancel') || 'Cancel'}
                </button>
                <button
                  onClick={() => executePosToggle(false)}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 shadow-lg shadow-red-500/30 transition-all"
                >
                  {t('branches.disable') || 'Disable'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body
  )
}

export default BranchManagerAccessModal
