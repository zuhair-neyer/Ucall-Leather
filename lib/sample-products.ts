export interface SampleProduct {
  id: string
  name: string
  price: number
  category: "Bags" | "Belts" | "Wallets" | "Jackets"
  description: string
  image: string
  images?: string[]
  featured?: boolean
  stock?: number
}

// Fallback products used when Firestore is not configured or has no data yet.
export const sampleProducts: SampleProduct[] = [
  {
    id: "sample-1",
    name: "Heritage Messenger Bag",
    price: 8499,
    category: "Bags",
    description:
      "Hand-stitched full-grain leather messenger bag, crafted by artisans in Kanpur. Roomy interior with laptop sleeve and antique brass hardware.",
    image: "/category-bags.jpg",
    featured: true,
    stock: 12,
  },
  {
    id: "sample-2",
    name: "Classic Brass Buckle Belt",
    price: 1799,
    category: "Belts",
    description:
      "Timeless 38mm dark brown leather belt with solid brass buckle. Ages beautifully and lasts a lifetime.",
    image: "/category-belts.jpg",
    featured: true,
    stock: 30,
  },
  {
    id: "sample-3",
    name: "Bifold Card Wallet",
    price: 1499,
    category: "Wallets",
    description:
      "Slim bifold wallet in rich dark brown leather. 6 card slots, 2 cash compartments, RFID-safe lining.",
    image: "/category-wallets.jpg",
    featured: true,
    stock: 50,
  },
  {
    id: "sample-4",
    name: "Rider Leather Jacket",
    price: 14999,
    category: "Jackets",
    description:
      "A heirloom biker jacket made from buttery-soft buffalo leather. Asymmetric zip, quilted shoulders.",
    image: "/category-jackets.jpg",
    featured: true,
    stock: 6,
  },
  {
    id: "sample-5",
    name: "Weekender Duffel",
    price: 11999,
    category: "Bags",
    description:
      "A spacious weekender duffel for travel, crafted in vegetable-tanned leather with cotton-canvas lining.",
    image: "/category-bags.jpg",
    stock: 8,
  },
  {
    id: "sample-6",
    name: "Formal Dress Belt",
    price: 1999,
    category: "Belts",
    description:
      "A refined 30mm dress belt with a polished pin buckle. Perfect for boardrooms and weddings.",
    image: "/category-belts.jpg",
    stock: 25,
  },
  {
    id: "sample-7",
    name: "Long Zipper Wallet",
    price: 2499,
    category: "Wallets",
    description:
      "Travel-ready long wallet with zip closure, passport slot, and 12 card pockets.",
    image: "/category-wallets.jpg",
    stock: 20,
  },
  {
    id: "sample-8",
    name: "Bomber Leather Jacket",
    price: 12999,
    category: "Jackets",
    description:
      "Classic bomber silhouette in aged brown leather with ribbed cuffs and hem.",
    image: "/category-jackets.jpg",
    stock: 9,
  },
]
