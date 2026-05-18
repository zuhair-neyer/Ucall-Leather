import { useState } from 'react'
import { motion } from 'framer-motion'
import { products } from '../types/product'

interface ProductDetailProps {
  productId: number
}

export default function ProductDetail({ productId }: ProductDetailProps) {
  const product = products.find((p) => p.id === productId)
  const [quantity, setQuantity] = useState(1)

  if (!product) {
    return <div>Product not found</div>
  }

  return (
    <section className="min-h-screen pt-24 pb-24 px-4 sm:px-6 lg:px-8 bg-black">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Image */}
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              className="relative h-96 md:h-full overflow-hidden rounded-lg bg-luxury-dark"
            >
              <img
                src={product.image}
                alt={product.name}
                className="w-full h-full object-cover"
              />
            </motion.div>
          </motion.div>

          {/* Content */}
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <div className="mb-4">
              <p className="text-gold text-sm font-light tracking-widest">
                {product.category}
              </p>
            </div>

            <h1 className="text-4xl md:text-5xl font-serif font-light tracking-tight mb-6">
              {product.name}
            </h1>

            <p className="text-3xl text-gold font-light mb-8">
              ${product.price}
            </p>

            <p className="text-gray-300 font-light text-lg leading-relaxed mb-8">
              {product.description}
            </p>

            {/* Details */}
            <div className="mb-8 pb-8 border-b border-white/10">
              <h3 className="font-serif font-light text-lg tracking-wide mb-4">
                Features
              </h3>
              <ul className="space-y-3">
                {product.details.map((detail, i) => (
                  <motion.li
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1, duration: 0.6 }}
                    className="flex items-center gap-3 text-gray-300 font-light"
                  >
                    <div className="w-1.5 h-1.5 bg-gold rounded-full"></div>
                    {detail}
                  </motion.li>
                ))}
              </ul>
            </div>

            {/* Quantity and Add to Cart */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <span className="text-gray-300 font-light">Quantity:</span>
                <div className="flex items-center gap-2 border border-white/10 rounded">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-4 py-2 hover:bg-white/5 transition-colors"
                  >
                    −
                  </button>
                  <span className="px-4 py-2 font-light">{quantity}</span>
                  <button
                    onClick={() => setQuantity(quantity + 1)}
                    className="px-4 py-2 hover:bg-white/5 transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-full py-4 bg-gold text-black font-light tracking-wide text-lg hover:bg-yellow-500 transition-all duration-300"
              >
                Add to Cart
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="w-full py-4 border border-gold text-gold font-light tracking-wide hover:bg-gold/10 transition-all duration-300"
              >
                Wishlist
              </motion.button>
            </div>

            {/* Additional info */}
            <div className="mt-12 pt-8 border-t border-white/10">
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <p className="text-gold text-sm font-light tracking-widest mb-2">
                    SHIPPING
                  </p>
                  <p className="text-gray-400 font-light">
                    Free worldwide shipping
                  </p>
                </div>
                <div>
                  <p className="text-gold text-sm font-light tracking-widest mb-2">
                    GUARANTEE
                  </p>
                  <p className="text-gray-400 font-light">
                    Lifetime warranty
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
