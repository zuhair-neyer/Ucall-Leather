import { useState } from 'react'
import { motion } from 'framer-motion'

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false)

  const navItems = ['Home', 'Products', 'Story', 'Contact']

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6 }}
      className="fixed top-0 w-full bg-black/80 backdrop-blur-md z-50 border-b border-white/5"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="text-2xl font-serif font-light tracking-widest"
          >
            <span className="text-gold">UCall</span>
          </motion.div>

          {/* Desktop Menu */}
          <div className="hidden md:flex gap-12">
            {navItems.map((item, i) => (
              <motion.a
                key={i}
                href="#"
                whileHover={{ color: '#d4af37' }}
                className="text-sm font-light tracking-wide hover:text-gold transition-colors duration-300"
              >
                {item}
              </motion.a>
            ))}
          </div>

          {/* CTA Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="hidden md:block px-8 py-2 border border-gold text-gold text-sm font-light tracking-wide hover:bg-gold hover:text-black transition-all duration-300"
          >
            Shop Now
          </motion.button>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden text-white"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="md:hidden pb-4"
          >
            {navItems.map((item, i) => (
              <a
                key={i}
                href="#"
                className="block py-2 text-sm font-light tracking-wide hover:text-gold"
              >
                {item}
              </a>
            ))}
          </motion.div>
        )}
      </div>
    </motion.nav>
  )
}
