import MinimalHero from '../components/MinimalHero'
import DarkModeToggle from '../components/DarkModeToggle'
import Footer from '../components/Footer'
import SEO from '../components/SEO'

function LandingPage() {
  return (
    <>
      <SEO titleKey="pages.home.title" descriptionKey="pages.home.description" />
      
      {/* Dark Mode Toggle - positioned fixed in top-right */}
      <DarkModeToggle />

      {/* Main Minimal Landing Page */}
      <main>
        <MinimalHero />
      </main>

      {/* Keep Footer for copyright info */}
      <Footer />
    </>
  )
}

export default LandingPage