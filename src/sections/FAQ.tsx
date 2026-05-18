import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const faqs = [
  {
    question: 'How do you source your leather?',
    answer: 'We partner with ethically certified tanneries that practice sustainable and responsible leather production. Every material is thoroughly inspected for quality and environmental compliance.',
  },
  {
    question: 'What is your quality guarantee?',
    answer: 'All UCall products come with a lifetime quality guarantee. If your product fails due to craftsmanship or materials, we will repair or replace it at no cost.',
  },
  {
    question: 'How should I care for my leather product?',
    answer: 'We provide detailed care instructions with every purchase. Generally, keep your items in a cool, dry place, use a soft cloth to clean, and occasionally condition with premium leather balm.',
  },
  {
    question: 'Do you offer international shipping?',
    answer: 'Yes, we ship worldwide. International orders typically arrive within 10-14 business days. All orders include tracking and insurance.',
  },
  {
    question: 'Can I customize my product?',
    answer: 'We offer personalization options including monogramming and custom colors for selected items. Contact us for details on your specific product.',
  },
  {
    question: 'What is your return policy?',
    answer: 'We offer a 30-day satisfaction guarantee. If you&apos;re not completely satisfied, we provide free returns and full refunds, no questions asked.',
  },
]

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 bg-luxury-dark relative overflow-hidden">
      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-96 h-96 bg-gold/5 rounded-full blur-3xl opacity-30"></div>

      <div className="max-w-4xl mx-auto relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-serif font-light tracking-tight mb-4">
            Frequently Asked Questions
          </h2>
          <p className="text-gray-400 font-light tracking-wide">
            Everything you need to know about UCall
          </p>
        </motion.div>

        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.6 }}
              viewport={{ once: true }}
              className="glass-effect rounded-lg overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full px-6 py-4 flex justify-between items-center hover:bg-white/5 transition-colors duration-300"
              >
                <h3 className="text-lg font-serif font-light tracking-wide text-left">
                  {faq.question}
                </h3>
                <motion.span
                  animate={{ rotate: openIndex === i ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                  className="text-gold text-xl flex-shrink-0 ml-4"
                >
                  ▼
                </motion.span>
              </button>

              <AnimatePresence>
                {openIndex === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <p className="px-6 pb-4 text-gray-400 font-light leading-relaxed border-t border-white/5">
                      {faq.answer}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
