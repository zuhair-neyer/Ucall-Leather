import { motion } from 'framer-motion'

export default function Footer() {
  return (
    <footer className="bg-black border-t border-white/5 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Newsletter */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="mb-12 pb-12 border-b border-white/5"
        >
          <h3 className="text-2xl font-serif font-light tracking-tight mb-4">
            Stay Updated
          </h3>
          <p className="text-gray-400 font-light mb-6">
            Subscribe to our newsletter for exclusive offers and new collections
          </p>
          <div className="flex gap-2 max-w-md">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 bg-luxury-dark border border-white/10 px-4 py-2 text-white font-light placeholder:text-gray-500 focus:outline-none focus:border-gold transition-colors"
            />
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-6 py-2 bg-gold text-black font-light tracking-wide hover:bg-yellow-500 transition-all"
            >
              Subscribe
            </motion.button>
          </div>
        </motion.div>

        {/* Footer content */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl font-serif font-light tracking-widest mb-4">
              <span className="text-gold">UCall</span>
            </h2>
            <p className="text-gray-400 font-light text-sm leading-relaxed">
              Premium handcrafted leather products for those who appreciate timeless elegance.
            </p>
          </motion.div>

          {/* Shop */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h4 className="font-serif font-light tracking-wide mb-4">Shop</h4>
            <ul className="space-y-2">
              {['Belts', 'Bags', 'Wallets', 'Jackets'].map((item) => (
                <li key={item}>
                  <a
                    href="#"
                    className="text-gray-400 font-light text-sm hover:text-gold transition-colors"
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Company */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h4 className="font-serif font-light tracking-wide mb-4">Company</h4>
            <ul className="space-y-2">
              {['About Us', 'Our Story', 'Contact', 'Blog'].map((item) => (
                <li key={item}>
                  <a
                    href="#"
                    className="text-gray-400 font-light text-sm hover:text-gold transition-colors"
                  >
                    {item}
                  </a>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Contact */}
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.8 }}
            viewport={{ once: true }}
          >
            <h4 className="font-serif font-light tracking-wide mb-4">Contact</h4>
            <ul className="space-y-2">
              <li>
                <a
                  href="mailto:hello@ucall.com"
                  className="text-gray-400 font-light text-sm hover:text-gold transition-colors"
                >
                  hello@ucall.com
                </a>
              </li>
              <li>
                <a
                  href="tel:+1234567890"
                  className="text-gray-400 font-light text-sm hover:text-gold transition-colors"
                >
                  +1 (234) 567-890
                </a>
              </li>
              <li className="pt-2">
                <div className="flex gap-4">
                  {['Instagram', 'Twitter', 'Facebook'].map((social) => (
                    <a
                      key={social}
                      href="#"
                      className="text-gray-400 font-light text-xs hover:text-gold transition-colors"
                    >
                      {social}
                    </a>
                  ))}
                </div>
              </li>
            </ul>
          </motion.div>
        </div>

        {/* Bottom */}
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="border-t border-white/5 pt-8 text-center text-gray-500 font-light text-sm"
        >
          <p>© 2024 UCall Leather. All rights reserved. | Privacy Policy | Terms of Service</p>
        </motion.div>
      </div>
    </footer>
  )
}
