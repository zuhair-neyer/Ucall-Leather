import { motion } from 'framer-motion'

const products = [
  {
    id: 1,
    name: 'Heritage Belt',
    price: '$149',
    image: '/premium-belt.jpg',
    category: 'Belts',
  },
  {
    id: 2,
    name: 'Elegant Messenger Bag',
    price: '$349',
    image: '/luxury-bag.jpg',
    category: 'Bags',
  },
  {
    id: 3,
    name: 'Executive Wallet',
    price: '$89',
    image: '/luxury-wallet.jpg',
    category: 'Wallets',
  },
]

export default function FeaturedProducts() {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 bg-black relative">
      {/* Section header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
        className="max-w-7xl mx-auto mb-16 text-center"
      >
        <h2 className="text-4xl md:text-5xl font-serif font-light tracking-tight mb-4">
          Featured Collection
        </h2>
        <p className="text-gray-400 font-light tracking-wide">
          Discover our most coveted pieces
        </p>
      </motion.div>

      {/* Products grid */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
        {products.map((product, i) => (
          <motion.div
            key={product.id}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.2, duration: 0.8 }}
            viewport={{ once: true }}
            whileHover={{ y: -10 }}
            className="group cursor-pointer"
          >
            {/* Product image */}
            <motion.div
              whileHover={{ scale: 1.08 }}
              className="relative h-80 overflow-hidden rounded-lg mb-6 bg-luxury-dark"
            >
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-full object-cover"
              />
              <motion.div
                initial={{ opacity: 0 }}
                whileHover={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                className="absolute inset-0 bg-black/40 flex items-center justify-center"
              >
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-6 py-2 bg-gold text-black font-light tracking-wide"
                >
                  Quick View
                </motion.button>
              </motion.div>
            </motion.div>

            {/* Product info */}
            <div className="text-center">
              <p className="text-gold text-sm font-light tracking-widest mb-2">
                {product.category}
              </p>
              <h3 className="text-lg font-serif font-light tracking-wide mb-2">
                {product.name}
              </h3>
              <p className="text-gold font-light text-lg">{product.price}</p>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
