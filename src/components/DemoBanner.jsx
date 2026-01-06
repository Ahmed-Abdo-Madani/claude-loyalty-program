import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

const DemoBanner = () => {
    const { t } = useTranslation('dashboard')

    return (
        <div className="bg-gradient-to-r from-primary to-blue-600 text-white p-3 text-center sticky top-0 z-[60] shadow-md">
            <div className="container-max flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-6">
                <span className="text-sm sm:text-base font-medium">
                    🚀 {t('demo.bannerText', 'You are exploring the Madna Demo. Ready to grow your business?')}
                </span>
                <Link
                    to="/business/register"
                    className="bg-white text-primary hover:bg-gray-100 px-5 py-1.5 rounded-full text-sm font-bold transition-all transform hover:scale-105 shadow-sm"
                >
                    {t('demo.startTrial', 'Start Free Trial')}
                </Link>
            </div>
        </div>
    )
}

export default DemoBanner
