import { useState, lazy, Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { DemoDataProvider, useDemoData } from '../contexts/DemoDataContext'
import OffersTab from '../components/OffersTab'
import BranchesTab from '../components/BranchesTab'
import ProductsTab from '../components/ProductsTab'
import POSAnalytics from '../components/POSAnalytics'
import DashBoardHeader from '../components/DashboardHeader'
import QuickActions from '../components/QuickActions'
import TodaysSnapshot from '../components/TodaysSnapshot'
import DemoBanner from '../components/DemoBanner'
import DemoRestrictedModal from '../components/DemoRestrictedModal'
import SEO from '../components/SEO'

// Simplified Sidebar for Demo
const DemoSidebar = ({ activeTab, onTabChange }) => {
    const { t } = useTranslation('dashboard')
    const { user } = useDemoData()

    const tabs = [
        { id: 'overview', label: t('tabs.overview'), icon: '📊' },
        { id: 'offers', label: t('tabs.myOffers'), icon: '🎯' },
        { id: 'branches', label: t('tabs.branches'), icon: '🏪' },
        { id: 'products', label: t('tabs.products'), icon: '🛍️' },
        { id: 'analytics', label: t('tabs.analytics'), icon: '📈' },
    ]

    return (
        <div className="hidden lg:flex flex-col w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 h-screen fixed left-0 top-0 z-50">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                <h1 className="text-2xl font-bold text-primary">Madna</h1>
                <p className="text-xs text-gray-500 mt-1 uppercase tracking-wider font-semibold">Demo Dashboard</p>
            </div>

            <nav className="flex-1 p-4 space-y-2">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => onTabChange(tab.id)}
                        className={`w-full flex items-center p-3 rounded-xl transition-all ${activeTab === tab.id
                            ? 'bg-primary/10 text-primary font-bold'
                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                            }`}
                    >
                        <span className="mr-3 text-xl">{tab.icon}</span>
                        {tab.label}
                    </button>
                ))}
            </nav>

            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center p-3 bg-gray-50 dark:bg-gray-900 rounded-xl">
                    <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center text-primary font-bold mr-3">
                        {user?.businessName?.[0] || 'B'}
                    </div>
                    <div className="overflow-hidden">
                        <p className="text-sm font-bold truncate dark:text-white">{user?.businessName || 'Business'}</p>
                        <p className="text-xs text-gray-500 truncate">{user?.userEmail || 'demo@madna.me'}</p>
                    </div>
                </div>
            </div>
        </div>
    )
}

const DemoDashboardContent = () => {
    const { t } = useTranslation('dashboard')
    const { user, analytics, offers, branches, products, recentActivity, todaysSnapshot, posAnalytics } = useDemoData()
    const [activeTab, setActiveTab] = useState('overview')
    const [restrictedFeature, setRestrictedFeature] = useState(null)

    const handleRestrictedAction = (feature) => {
        setRestrictedFeature(feature)
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
            <SEO title="Demo Dashboard | Madna" noindex={true} />
            <DemoBanner />

            <DemoSidebar activeTab={activeTab} onTabChange={setActiveTab} />

            <div className="ml-0 lg:ml-64">
                <DashBoardHeader user={user} />

                <main className="p-3 sm:p-6">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg transition-colors duration-300">
                        {/* Tab Navigation */}
                        <div className="hidden sm:block border-b border-gray-200 dark:border-gray-700">
                            <nav className="flex gap-8 px-6">
                                {[
                                    { id: 'overview', label: t('tabs.overview'), icon: '📊' },
                                    { id: 'offers', label: t('tabs.myOffers'), icon: '🎯' },
                                    { id: 'branches', label: t('tabs.branches'), icon: '🏪' },
                                    { id: 'products', label: t('tabs.products'), icon: '🛍️' },
                                    { id: 'analytics', label: t('tabs.analytics'), icon: '📈' }
                                ].map((tab) => (
                                    <button
                                        key={tab.id}
                                        onClick={() => setActiveTab(tab.id)}
                                        className={`py-4 px-1 border-b-2 font-medium text-sm transition-all flex items-center ${activeTab === tab.id
                                            ? 'border-primary text-primary'
                                            : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                                            }`}
                                    >
                                        <span className="mr-2">{tab.icon}</span>
                                        {tab.label}
                                    </button>
                                ))}
                            </nav>
                        </div>

                        <div className="p-3 sm:p-5">
                            {activeTab === 'overview' && (
                                <div className="space-y-6">
                                    <TodaysSnapshot demoData={todaysSnapshot} />
                                    <QuickActions
                                        onNewOffer={() => handleRestrictedAction(t('tabs.myOffers'))}
                                        onScanQR={() => handleRestrictedAction('QR Scanner')}
                                        onViewReports={() => setActiveTab('analytics')}
                                        onManageProducts={() => setActiveTab('products')}
                                        onManageBranches={() => setActiveTab('branches')}
                                    />
                                </div>
                            )}

                            {activeTab === 'offers' && (
                                <OffersTab demoData={offers} onAddOffer={() => handleRestrictedAction(t('tabs.myOffers'))} />
                            )}

                            {activeTab === 'branches' && (
                                <BranchesTab demoData={branches} onAddBranch={() => handleRestrictedAction(t('tabs.branches'))} />
                            )}

                            {activeTab === 'products' && (
                                <ProductsTab demoData={products} onAddProduct={() => handleRestrictedAction(t('tabs.products'))} />
                            )}

                            {activeTab === 'analytics' && (
                                <POSAnalytics demoData={posAnalytics} />
                            )}
                        </div>
                    </div>
                </main>
            </div>

            <DemoRestrictedModal
                isOpen={!!restrictedFeature}
                onClose={() => setRestrictedFeature(null)}
                featureName={restrictedFeature}
            />
        </div>
    )
}

export default function DemoDashboard() {
    return (
        <DemoDataProvider>
            <DemoDashboardContent />
        </DemoDataProvider>
    )
}
