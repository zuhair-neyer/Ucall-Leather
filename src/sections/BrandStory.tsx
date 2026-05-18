import { motion } from 'framer-motion'

export default function BrandStory() {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 bg-luxury-dark relative overflow-hidden">
      {/* Background element */}
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-96 h-96 bg-gold/5 rounded-full blur-3xl opacity-30"></div>

      <div className="max-w-7xl mx-auto relative">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-4xl md:text-5xl font-serif font-light tracking-tight mb-6">
              The Art of
              <br />
              <span className="text-gold">Craftsmanship</span>
            </h2>

            <p className="text-gray-300 font-light text-lg leading-relaxed mb-6">
              Every UCall product is meticulously handcrafted by our master artisans using only the finest premium leather. We believe in timeless design, exceptional quality, and sustainable practices.
            </p>

            <div className="space-y-4 mb-8">
              {['100% Handmade Excellence', 'Ethically Sourced Materials', 'Lifetime Quality Guarantee'].map(
                (item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1, duration: 0.6 }}
                    viewport={{ once: true }}
                    className="flex items-center gap-3"
                  >
                    <div className="w-2 h-2 bg-gold rounded-full"></div>
                    <span className="text-gray-300 font-light">{item}</span>
                  </motion.div>
                )
              )}
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-8 py-3 border border-gold text-gold font-light tracking-wide hover:bg-gold/10 transition-all"
            >
              Read Our Story
            </motion.button>
          </motion.div>

          {/* Image */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="relative h-96 overflow-hidden rounded-lg"
            >
              <img
                src="/luxury-bag.jpg"
                alt="Craftsmanship"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
