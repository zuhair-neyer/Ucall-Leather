import { doc, updateDoc } from "firebase/firestore"

export async function reduceProductStock(
  db: any,
  items: Array<{ id: string; quantity: number }>
) {
  try {
    for (const item of items) {
      const productRef = doc(db, "products", item.id)
      await updateDoc(productRef, {
        stock: db.FieldValue.increment(-item.quantity),
      })
    }
  } catch (err) {
    console.log("[v0] Error reducing stock:", err)
    throw err
  }
}
