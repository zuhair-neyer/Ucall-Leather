import { useState } from 'react'
import { motion } from 'framer-motion'
import { products } from '../types/product'

export default function ProductsPage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)

  const categories = ['Belts', 'Bags', 'Wallets', 'Jackets']

  const filteredProducts = selectedCategory
    ? products.filter((p) => p.category === selectedCategory)
    : products

  return (
    <section className="min-h-screen pt-24 pb-24 px-4 sm:px-6 lg:px-8 bg-black">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl md:text-6xl font-serif font-light tracking-tight mb-4">
            Our Collection
          </h1>
          <p className="text-gray-400 font-light tracking-wide">
            Discover our complete range of premium leather products
          </p>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="flex flex-wrap gap-4 mb-12 justify-center"
        >
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setSelectedCategory(null)}
            className={`px-6 py-2 font-light tracking-wide transition-all duration-300 ${
              selectedCategory === null
                ? 'bg-gold text-black'
                : 'border border-gold text-gold hover:bg-gold/10'
            }`}
          >
            All Products
          </motion.button>
          {categories.map((category) => (
            <motion.button
              key={category}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedCategory(category)}
              className={`px-6 py-2 font-light tracking-wide transition-all duration-300 ${
                selectedCategory === category
                  ? 'bg-gold text-black'
                  : 'border border-gold text-gold hover:bg-gold/10'
              }`}
            >
              {category}
            </motion.button>
          ))}
        </motion.div>

        {/* Products Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredProducts.map((product, i) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1, duration: 0.8 }}
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
                    View Details
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
                <p className="text-gold font-light text-lg">
                  ${product.price}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
