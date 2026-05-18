import { motion } from 'framer-motion'

const reasons = [
  {
    title: 'Premium Materials',
    description: 'Sourced only the finest leather from ethical suppliers worldwide',
    icon: '✨',
  },
  {
    title: 'Lifetime Quality',
    description: 'Every product backed by our lifetime quality guarantee',
    icon: '🛡️',
  },
  {
    title: 'Handcrafted Design',
    description: 'Meticulously created by master artisans with decades of experience',
    icon: '🎨',
  },
  {
    title: 'Secure Shopping',
    description: 'SSL encrypted transactions and discreet, secure packaging',
    icon: '🔒',
  },
]

export default function WhyChooseUCall() {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 bg-luxury-dark relative">
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-96 h-96 bg-gold/5 rounded-full blur-3xl opacity-30"></div>

      <div className="max-w-7xl mx-auto relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-serif font-light tracking-tight mb-4">
            Why Choose <span className="text-gold">UCall</span>
          </h2>
          <p className="text-gray-400 font-light tracking-wide">
            Experience the difference of true luxury
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {reasons.map((reason, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.15, duration: 0.8 }}
              viewport={{ once: true }}
              whileHover={{ y: -5 }}
              className="glass-effect p-8 rounded-lg text-center"
            >
              <motion.div
                whileHover={{ scale: 1.2 }}
                className="text-4xl mb-4 inline-block"
              >
                {reason.icon}
              </motion.div>
              <h3 className="text-lg font-serif font-light tracking-wide mb-3">
                {reason.title}
              </h3>
              <p className="text-gray-400 font-light text-sm leading-relaxed">
                {reason.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
