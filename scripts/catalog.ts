// Owner-editable starting catalog. All stock starts at zero to prevent selling
// unconfirmed inventory. Prices/descriptions of the first eight came from the ZIP.
// Replace photos/specifications/prices, then set actual stock before launch.
export const catalog = [
  { id: "heritage-messenger-bag", name: "Heritage Messenger Bag", price: 8499, category: "Bags", description: "Leather messenger bag with a roomy interior and classic hardware.", image: "/category-bags.webp", featured: true, stock: 0 },
  { id: "classic-brass-buckle-belt", name: "Classic Brass Buckle Belt", price: 1799, category: "Belts", description: "Classic dark brown leather belt with a brass buckle.", image: "/category-belts.webp", featured: true, stock: 0 },
  { id: "bifold-card-wallet", name: "Bifold Card Wallet", price: 1499, category: "Wallets", description: "Slim dark brown bifold leather wallet for daily essentials.", image: "/category-wallets.webp", featured: true, stock: 0 },
  { id: "rider-leather-jacket", name: "Rider Leather Jacket", price: 14999, category: "Jackets", description: "A classic leather rider jacket with an asymmetric zip.", image: "/category-jackets.webp", featured: true, stock: 0 },
  { id: "weekender-duffel", name: "Weekender Duffel", price: 11999, category: "Bags", description: "A spacious leather weekender duffel for travel.", image: "/category-bags.webp", featured: false, stock: 0 },
  { id: "formal-dress-belt", name: "Formal Dress Belt", price: 1999, category: "Belts", description: "A refined leather dress belt with a polished pin buckle.", image: "/category-belts.webp", featured: false, stock: 0 },
  { id: "long-zipper-wallet", name: "Long Zipper Wallet", price: 2499, category: "Wallets", description: "A long leather wallet with a secure zip closure.", image: "/category-wallets.webp", featured: false, stock: 0 },
  { id: "bomber-leather-jacket", name: "Bomber Leather Jacket", price: 12999, category: "Jackets", description: "A classic brown leather bomber jacket with ribbed cuffs and hem.", image: "/category-jackets.webp", featured: false, stock: 0 },
  // Confirm prices and replace placeholder images before enabling these real items.
  { enabled: false, id: "black-woven-floral-purse", name: "Black Woven Floral Leather Purse", price: 0, category: "Bags", description: "Black woven leather purse with a carved floral design.", image: "/placeholder.webp", featured: true, stock: 0 },
  { enabled: false, id: "monogram-buckle-gift-belt", name: "Monogram Buckle Gift Belt", price: 0, category: "Belts", description: "Leather belt in a gift box with a monogram buckle.", image: "/placeholder.webp", featured: true, stock: 0 },
]
