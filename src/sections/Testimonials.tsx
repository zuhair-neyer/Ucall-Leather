import { motion } from 'framer-motion'

const testimonials = [
  {
    name: 'James Mitchell',
    role: 'Design Curator',
    text: 'The quality is exceptional. Every detail speaks to true craftsmanship and attention to excellence.',
    rating: 5,
  },
  {
    name: 'Sarah Chen',
    role: 'Fashion Editor',
    text: 'UCall represents everything I believe in—timeless design, sustainability, and genuine luxury.',
    rating: 5,
  },
  {
    name: 'Marcus Richardson',
    role: 'Entrepreneur',
    text: 'A product that truly elevates my daily life. Worth every penny and then some.',
    rating: 5,
  },
]

export default function Testimonials() {
  return (
    <section className="py-24 px-4 sm:px-6 lg:px-8 bg-black relative overflow-hidden">
      <div className="absolute right-0 top-1/2 -translate-y-1/2 w-96 h-96 bg-gold/5 rounded-full blur-3xl opacity-20"></div>

      <div className="max-w-7xl mx-auto relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-serif font-light tracking-tight mb-4">
            What Clients Say
          </h2>
          <p className="text-gray-400 font-light tracking-wide">
            Hear from those who appreciate true luxury
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.2, duration: 0.8 }}
              viewport={{ once: true }}
              className="glass-effect p-8 rounded-lg flex flex-col"
            >
              {/* Stars */}
              <div className="flex gap-1 mb-4">
                {[...Array(testimonial.rating)].map((_, j) => (
                  <span key={j} className="text-gold text-lg">★</span>
                ))}
              </div>

              {/* Text */}
              <p className="text-gray-300 font-light text-lg leading-relaxed mb-6 flex-grow">
                "{testimonial.text}"
              </p>

              {/* Author */}
              <div className="border-t border-white/10 pt-4">
                <p className="font-serif font-light tracking-wide text-cream">
                  {testimonial.name}
                </p>
                <p className="text-gold text-sm font-light">
                  {testimonial.role}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
