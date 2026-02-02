import { apiBaseUrl } from '../../config/api'
import LazyImage from '../LazyImage'
import { useResponsiveImage } from '../../hooks/useResponsiveImage'

const MenuGridItem = ({ product, getProductName, getProductDescription, formatPrice, isRTL, t }) => {
    const { imageUrl, thumbnailUrl, isMobile } = useResponsiveImage(product, apiBaseUrl)
    const description = getProductDescription ? getProductDescription(product) : (product.description_ar && isRTL ? product.description_ar : product.description);

    return (
        <div
            className="group bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 dark:border-gray-700 overflow-hidden flex flex-col"
        >
            {/* Product Image */}
            <div className="aspect-square relative overflow-hidden bg-gray-50 dark:bg-gray-900 border-b border-gray-50 dark:border-gray-800">
                <LazyImage
                    src={imageUrl}
                    thumbnail={thumbnailUrl}
                    alt={getProductName(product)}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    onError={() => console.warn('Image failed to load:', product.id)}
                />

                {/* New/Popular Badge */}
                <div className="absolute top-2 left-2 flex flex-col gap-1 z-20">
                    {product.is_new && (
                        <span className="bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-lg">
                            {t('new')}
                        </span>
                    )}
                </div>
            </div>

            {/* Product Info */}
            <div className="p-3 sm:p-5 flex flex-col flex-grow">
                <div className="flex-grow">
                    <h3 className="text-sm sm:text-lg font-bold text-gray-900 dark:text-white mb-1 line-clamp-2 leading-snug group-hover:text-primary transition-colors">
                        {getProductName(product)}
                    </h3>
                    {description && (
                        <p className="text-[10px] sm:text-sm text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed mb-2">
                            {description}
                        </p>
                    )}
                </div>

                {/* Price Tag */}
                <div className="mt-2 sm:mt-4 flex items-center justify-between border-t border-gray-50 dark:border-gray-700/50 pt-2 sm:pt-4">
                    <span className="text-sm sm:text-xl font-black text-primary">
                        {formatPrice(product.price)}
                        <span className="text-[10px] sm:text-xs ml-1 font-normal opacity-70 serif text-gray-500 italic">
                            {t('sar')}
                        </span>
                    </span>
                </div>
            </div>
        </div>
    )
}

function MenuGridView({
    products,
    getProductName,
    getProductDescription,
    formatPrice,
    isRTL,
    t
}) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
            {products.map((product) => (
                <MenuGridItem
                    key={product.id}
                    product={product}
                    getProductName={getProductName}
                    getProductDescription={getProductDescription}
                    formatPrice={formatPrice}
                    isRTL={isRTL}
                    t={t}
                />
            ))}
        </div>
    )
}

export default MenuGridView
