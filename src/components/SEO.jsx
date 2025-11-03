import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'

const SEO = ({ 
  titleKey, 
  descriptionKey, 
  title, 
  description, 
  image = '/og-image-v2.png', 
  type = 'website',
  noindex = false 
}) => {
  const { t, i18n } = useTranslation('seo')
  const location = useLocation()

  // Get site URL from environment variable (for build-time templating) or fallback to window.location.origin
  const siteUrl = import.meta.env.VITE_PUBLIC_SITE_URL || window.location.origin
  
  // Build full URL
  const fullUrl = `${siteUrl}${location.pathname}`
  
  // Build full image URL
  const fullImageUrl = image.startsWith('http') 
    ? image 
    : `${siteUrl}${image}`

  // Determine locale
  const locale = i18n.language === 'ar' ? 'ar_SA' : 'en_US'
  const alternateLocale = i18n.language === 'ar' ? 'en_US' : 'ar_SA'

  // Get site name
  const siteName = t('siteName')

  // Determine title
  let pageTitle
  if (title) {
    pageTitle = title
  } else if (titleKey) {
    pageTitle = t(titleKey)
  } else {
    pageTitle = siteName
  }

  // Format title with site name (unless it's the home page)
  const isHomePage = location.pathname === '/' || location.pathname === ''
  const fullTitle = isHomePage ? pageTitle : `${pageTitle} - ${siteName}`

  // Determine description
  let pageDescription
  if (description) {
    pageDescription = description
  } else if (descriptionKey) {
    pageDescription = t(descriptionKey)
  } else {
    pageDescription = t('siteDescription')
  }

  return (
    <Helmet>
      {/* 
        Note: lang and dir attributes are managed by index.html localStorage script
        and i18n config to avoid duplicate control and attribute churn.
        This ensures a single source of truth for language/direction management.
      */}
      
      {/* Primary Meta Tags */}
      <title>{fullTitle}</title>
      <meta name="title" content={fullTitle} />
      <meta name="description" content={pageDescription} />
      
      {/* Canonical URL */}
      <link rel="canonical" href={fullUrl} />

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={pageDescription} />
      <meta property="og:image" content={fullImageUrl} />
      <meta property="og:site_name" content={siteName} />
      <meta property="og:locale" content={locale} />
      <meta property="og:locale:alternate" content={alternateLocale} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:url" content={fullUrl} />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={pageDescription} />
      <meta name="twitter:image" content={fullImageUrl} />

      {/* Robots */}
      {noindex && <meta name="robots" content="noindex, nofollow" />}
    </Helmet>
  )
}

export default SEO
