import { ShoppingBagIcon } from '@heroicons/react/24/outline'

function MenuListView({
    products,
    categories,
    uncategorizedProducts,
    getProductName,
    getCategoryName,
    formatPrice,
    isRTL,
    t,
    selectedCategory = 'all'
}) {
    const renderProductList = (productList) => (
        <div className="space-y-0">
            {productList.map((product, index) => (
                <div
                    key={product.id}
                    className={`group flex items-center justify-between py-5 border-b border-gray-100 dark:border-gray-800 hover:bg-primary/5 px-4 -mx-4 transition-all duration-200 cursor-default ${isRTL ? 'hover:pr-6' : 'hover:pl-6'}`}
                >
                    <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-1 group-hover:text-primary transition-colors" style={{ fontFamily: 'Georgia, serif' }}>
                            {getProductName(product)}
                        </h3>
                        {product.description && (
                            <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xl leading-relaxed">
                                {product.description}
                            </p>
                        )}
                    </div>

                    <div className="flex flex-col items-end gap-2 ml-4">
                        <span className="text-2xl font-black text-primary" style={{ fontFamily: 'Georgia, serif' }}>
                            {formatPrice(product.price)}
                            <span className="text-xs ml-1 font-normal opacity-70 serif italic">{t('menu.sar')}</span>
                        </span>

                        {/* Optional labels/badges as requested */}
                        <div className="flex gap-2">
                            {index === 0 && (
                                <span className="text-[10px] uppercase tracking-wider font-bold bg-amber-100 text-amber-700 px-2 py-0.5 rounded">
                                    {t('menu.popular') || 'Popular'}
                                </span>
                            )}
                            {product.is_new && (
                                <span className="text-[10px] uppercase tracking-wider font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded">
                                    {t('menu.new') || 'New'}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )

    const hasProducts = products.length > 0

    if (!hasProducts) {
        return (
            <div className="text-center py-16">
                <div className="w-20 h-20 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ShoppingBagIcon className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">{t('menu.noProducts')}</h3>
                <p className="text-gray-500">{t('menu.noProductsDesc')}</p>
            </div>
        )
    }

    // If a specific category is selected, just show those
    if (selectedCategory !== 'all') {
        return renderProductList(products)
    }

    // Otherwise show categorized sections
    return (
        <div className="space-y-12 pb-12">
            {categories.map(category => category.products?.length > 0 && (
                <section key={category.id}>
                    <div className="mb-6 border-b-[3px] border-primary pb-2">
                        <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight" style={{ fontFamily: 'Georgia, serif' }}>
                            {getCategoryName(category)}
                        </h2>
                    </div>
                    {renderProductList(category.products)}
                </section>
            ))}

            {uncategorizedProducts?.length > 0 && (
                <section>
                    <div className="mb-6 border-b-[3px] border-gray-300 dark:border-gray-700 pb-2">
                        <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight" style={{ fontFamily: 'Georgia, serif' }}>
                            {t('menu.others') || 'Others'}
                        </h2>
                    </div>
                    {renderProductList(uncategorizedProducts)}
                </section>
            )}
        </div>
    )
}

export default MenuListView
