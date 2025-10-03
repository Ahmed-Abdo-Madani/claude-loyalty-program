import MinimalHero from '../components/MinimalHero'
import DarkModeToggle from '../components/DarkModeToggle'
import Footer from '../components/Footer'

function LandingPage() {
  return (
    <>
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