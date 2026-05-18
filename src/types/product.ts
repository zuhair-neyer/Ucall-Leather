export interface Product {
  id: number
  name: string
  price: number
  image: string
  category: string
  description: string
  details: string[]
  inStock: boolean
}

export const products: Product[] = [
  {
    id: 1,
    name: 'Heritage Belt',
    price: 149,
    image: '/premium-belt.jpg',
    category: 'Belts',
    description: 'Handcrafted premium leather belt featuring a polished bronze buckle and vegetable-tanned leather.',
    details: [
      'Premium vegetable-tanned leather',
      'Polished bronze buckle',
      'Hand-stitched construction',
      'Available in multiple sizes',
      'Lifetime warranty',
    ],
    inStock: true,
  },
  {
    id: 2,
    name: 'Elegant Messenger Bag',
    price: 349,
    image: '/luxury-bag.jpg',
    category: 'Bags',
    description: 'A sophisticated messenger bag crafted from premium leather with luxurious details.',
    details: [
      'Full-grain leather construction',
      'Adjustable shoulder strap',
      'Interior compartments',
      'Handcrafted brass hardware',
      'Lifetime warranty',
    ],
    inStock: true,
  },
  {
    id: 3,
    name: 'Executive Wallet',
    price: 89,
    image: '/luxury-wallet.jpg',
    category: 'Wallets',
    description: 'Premium bifold wallet combining functionality with refined design.',
    details: [
      'Premium leather',
      'Multiple card slots',
      'RFID protection',
      'Slim design',
      'Lifetime warranty',
    ],
    inStock: true,
  },
]
