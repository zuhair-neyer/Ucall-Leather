import { motion } from 'framer-motion'

export default function PremiumPackaging() {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 bg-black relative overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-serif font-light tracking-tight mb-4">
            Premium Packaging Experience
          </h2>
          <p className="text-gray-400 font-light tracking-wide">
            Every unboxing is a moment of luxury
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          {/* Image */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="relative h-96 overflow-hidden rounded-lg"
            >
              <img
                src="/luxury-box.jpg"
                alt="Premium packaging"
                className="w-full h-full object-cover"
              />
            </motion.div>
          </motion.div>

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h3 className="text-3xl font-serif font-light tracking-tight mb-6">
              Unboxing <span className="text-gold">Perfection</span>
            </h3>

            <p className="text-gray-300 font-light text-lg leading-relaxed mb-8">
              Our signature black luxury boxes are carefully designed and crafted to enhance the unboxing experience. Each detail, from the premium tissue wrapping to the gold embossed branding, reflects our commitment to excellence.
            </p>

            <div className="space-y-4">
              {[
                'Eco-friendly black luxury packaging',
                'Premium tissue and protective materials',
                'Gold embossed branding',
                'Reusable storage solution',
              ].map((feature, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1, duration: 0.6 }}
                  viewport={{ once: true }}
                  className="flex items-center gap-3 text-gray-300 font-light"
                >
                  <div className="w-1.5 h-1.5 bg-gold rounded-full"></div>
                  {feature}
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
