import { motion } from 'framer-motion'

export default function Hero() {
  return (
    <section className="min-h-screen pt-20 flex items-center justify-center bg-gradient-to-b from-black via-luxury-dark to-black relative overflow-hidden">
      {/* Background glow effect */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 bg-gold/10 rounded-full blur-3xl opacity-20"></div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        {/* Left Content */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
        >
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="text-5xl md:text-6xl font-serif font-light tracking-tight mb-6 leading-tight"
          >
            <span className="text-cream">Crafted for</span>
            <br />
            <span className="text-gold">Modern Elegance</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="text-lg text-gray-300 font-light tracking-wide mb-8 max-w-md leading-relaxed"
          >
            Premium handcrafted leather products designed for those who appreciate timeless elegance and exceptional quality.
          </motion.p>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="flex gap-6"
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-3 bg-gold text-black font-light tracking-wide hover:bg-yellow-500 transition-all duration-300"
            >
              Explore Collection
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-3 border border-gold text-gold font-light tracking-wide hover:bg-gold/10 transition-all duration-300"
            >
              Learn More
            </motion.button>
          </motion.div>
        </motion.div>

        {/* Right Image */}
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
          className="flex justify-center"
        >
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="relative w-full h-96 overflow-hidden rounded-lg shadow-2xl"
          >
            <img
              src="/premium-belt.jpg"
              alt="Premium leather belt"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent"></div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
