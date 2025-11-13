import { useTranslation } from 'react-i18next'

export default function POSCart({
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onCheckout,
  totals,
  loyaltyDiscount = 0
}) {
  const { t, i18n } = useTranslation('pos')

  return (
    <div className="h-full flex flex-col">
      {/* Cart Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {t('cart.title')}
          </h2>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {totals.itemCount} {totals.itemCount === 1 ? t('cart.item') : t('cart.items')}
          </span>
        </div>
        {cart.length > 0 && (
          <button 
            onClick={onClearCart} 
            className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 mt-2 transition-colors"
          >
            {t('cart.clearAll')}
          </button>
        )}
      </div>
      
      {/* Cart Items List - Scrollable */}
      <div className="flex-1 overflow-y-auto p-4">
        {cart.length === 0 ? (
          /* Empty Cart State */
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🛒</div>
            <p className="text-gray-500 dark:text-gray-400 font-semibold">
              {t('cart.empty')}
            </p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
              {t('cart.emptyDesc')}
            </p>
          </div>
        ) : (
          /* Cart Items */
          <div className="space-y-3">
            {cart.map(item => (
              <div 
                key={item.product.public_id} 
                className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3"
              >
                {/* Product Name */}
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {i18n.language === 'ar' && item.product.name_ar 
                        ? item.product.name_ar 
                        : item.product.name}
                    </h3>
                    {i18n.language === 'ar' && item.product.name && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {item.product.name}
                      </p>
                    )}
                    {i18n.language === 'en' && item.product.name_ar && (
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {item.product.name_ar}
                      </p>
                    )}
                  </div>
                  <button 
                    onClick={() => onRemoveItem(item.product.public_id)}
                    className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 ml-2 transition-colors text-xl leading-none"
                    aria-label={t('cart.remove')}
                  >
                    ✕
                  </button>
                </div>
                
                {/* Quantity Controls & Price */}
                <div className="flex justify-between items-center">
                  {/* Quantity Controls */}
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => onUpdateQuantity(item.product.public_id, item.quantity - 1)}
                      className="w-11 h-11 rounded-lg bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 flex items-center justify-center font-bold text-gray-700 dark:text-gray-200 transition-colors"
                      aria-label={t('cart.decrease')}
                    >
                      −
                    </button>
                    <span className="w-12 text-center font-semibold text-lg text-gray-900 dark:text-white">
                      {item.quantity}
                    </span>
                    <button 
                      onClick={() => onUpdateQuantity(item.product.public_id, item.quantity + 1)}
                      className="w-11 h-11 rounded-lg bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 flex items-center justify-center font-bold text-gray-700 dark:text-gray-200 transition-colors"
                      aria-label={t('cart.increase')}
                    >
                      +
                    </button>
                  </div>
                  
                  {/* Line Total */}
                  <div className="text-right">
                    <div className="font-bold text-lg text-gray-900 dark:text-white">
                      {item.total.toFixed(2)} {t('common.sar')}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {parseFloat(item.product.price).toFixed(2)} × {item.quantity}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Cart Footer - Totals & Checkout */}
      <div className="border-t border-gray-200 dark:border-gray-700 p-4 bg-white dark:bg-gray-800">
        {/* Totals Breakdown */}
        <div className="space-y-2 mb-4">
          <div className="flex justify-between text-gray-600 dark:text-gray-400">
            <span>{t('cart.subtotal')}</span>
            <span>{totals.subtotal.toFixed(2)} {t('common.sar')}</span>
          </div>
          <div className="flex justify-between text-gray-600 dark:text-gray-400">
            <span>{t('cart.tax')}</span>
            <span>{totals.tax.toFixed(2)} {t('common.sar')}</span>
          </div>
          
          {/* Show loyalty discount if applied */}
          {loyaltyDiscount > 0 && (
            <div className="flex justify-between text-green-600 dark:text-green-400 font-semibold">
              <span>{t('cart.loyaltyDiscount')}</span>
              <span>-{loyaltyDiscount.toFixed(2)} {t('common.sar')}</span>
            </div>
          )}
          
          <div className="flex justify-between text-xl font-bold text-gray-900 dark:text-white pt-2 border-t border-gray-200 dark:border-gray-700">
            <span>{t('cart.total')}</span>
            <span>{Math.max(0, totals.total - loyaltyDiscount).toFixed(2)} {t('common.sar')}</span>
          </div>
        </div>
        
        {/* Checkout Button */}
        <button 
          onClick={onCheckout}
          disabled={cart.length === 0}
          className="w-full h-14 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold text-lg rounded-lg transition-colors"
          aria-label={t('cart.checkout')}
        >
          {t('cart.checkout')} ({Math.max(0, totals.total - loyaltyDiscount).toFixed(2)} {t('common.sar')})
        </button>
      </div>
    </div>
  )
}
