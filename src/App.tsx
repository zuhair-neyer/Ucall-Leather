import Navbar from './components/Navbar'
import Hero from './sections/Hero'
import FeaturedProducts from './sections/FeaturedProducts'
import BrandStory from './sections/BrandStory'
import PremiumPackaging from './sections/PremiumPackaging'
import WhyChooseUCall from './sections/WhyChooseUCall'
import Testimonials from './sections/Testimonials'
import FAQ from './sections/FAQ'
import Footer from './components/Footer'

function App() {
  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      <Navbar />
      <Hero />
      <FeaturedProducts />
      <BrandStory />
      <PremiumPackaging />
      <WhyChooseUCall />
      <Testimonials />
      <FAQ />
      <Footer />
    </div>
  )
}

export default App
