import { useState } from 'react'
import { motion } from 'framer-motion'

export default function ContactPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: '',
  })
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
    setFormData({ name: '', email: '', subject: '', message: '' })
    setTimeout(() => setSubmitted(false), 3000)
  }

  return (
    <section className="min-h-screen pt-24 pb-24 px-4 sm:px-6 lg:px-8 bg-black">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="text-center mb-12"
        >
          <h1 className="text-5xl md:text-6xl font-serif font-light tracking-tight mb-4">
            Get in Touch
          </h1>
          <p className="text-gray-400 font-light tracking-wide">
            Have questions? We&apos;d love to hear from you.
          </p>
        </motion.div>

        {/* Contact Form */}
        <motion.form
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          onSubmit={handleSubmit}
          className="space-y-6"
        >
          <div>
            <label className="block text-sm font-light tracking-wide mb-2">
              Name
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              className="w-full bg-luxury-dark border border-white/10 px-4 py-3 text-white font-light placeholder:text-gray-500 focus:outline-none focus:border-gold transition-colors rounded"
              placeholder="Your name"
            />
          </div>

          <div>
            <label className="block text-sm font-light tracking-wide mb-2">
              Email
            </label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              className="w-full bg-luxury-dark border border-white/10 px-4 py-3 text-white font-light placeholder:text-gray-500 focus:outline-none focus:border-gold transition-colors rounded"
              placeholder="your@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-light tracking-wide mb-2">
              Subject
            </label>
            <input
              type="text"
              required
              value={formData.subject}
              onChange={(e) =>
                setFormData({ ...formData, subject: e.target.value })
              }
              className="w-full bg-luxury-dark border border-white/10 px-4 py-3 text-white font-light placeholder:text-gray-500 focus:outline-none focus:border-gold transition-colors rounded"
              placeholder="Subject"
            />
          </div>

          <div>
            <label className="block text-sm font-light tracking-wide mb-2">
              Message
            </label>
            <textarea
              required
              rows={6}
              value={formData.message}
              onChange={(e) =>
                setFormData({ ...formData, message: e.target.value })
              }
              className="w-full bg-luxury-dark border border-white/10 px-4 py-3 text-white font-light placeholder:text-gray-500 focus:outline-none focus:border-gold transition-colors rounded resize-none"
              placeholder="Your message"
            ></textarea>
          </div>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            type="submit"
            className="w-full py-4 bg-gold text-black font-light tracking-wide text-lg hover:bg-yellow-500 transition-all duration-300 rounded"
          >
            Send Message
          </motion.button>
        </motion.form>

        {/* Success message */}
        {submitted && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mt-6 p-4 bg-green-500/20 border border-green-500/50 rounded text-green-300 font-light text-center"
          >
            Thank you for your message. We&apos;ll be in touch soon.
          </motion.div>
        )}

        {/* Contact Info */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.8 }}
          className="mt-16 pt-16 border-t border-white/10"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
            <div>
              <p className="text-gold text-sm font-light tracking-widest mb-2">
                EMAIL
              </p>
              <a
                href="mailto:hello@ucall.com"
                className="text-gray-300 font-light hover:text-gold transition-colors"
              >
                hello@ucall.com
              </a>
            </div>
            <div>
              <p className="text-gold text-sm font-light tracking-widest mb-2">
                PHONE
              </p>
              <a
                href="tel:+1234567890"
                className="text-gray-300 font-light hover:text-gold transition-colors"
              >
                +1 (234) 567-890
              </a>
            </div>
            <div>
              <p className="text-gold text-sm font-light tracking-widest mb-2">
                HOURS
              </p>
              <p className="text-gray-300 font-light">
                Mon - Fri: 9am - 6pm EST
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
