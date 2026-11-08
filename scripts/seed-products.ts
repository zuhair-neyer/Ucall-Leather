import { loadEnvConfig } from "@next/env"
import { Timestamp } from "firebase-admin/firestore"
import { catalog } from "./catalog"
import { productIdSchema, productSchema } from "../lib/validation"
loadEnvConfig(process.cwd())
async function main() {
  const { getAdminDb } = await import("../lib/firebase-admin")
  const db = getAdminDb()
  let created = 0
  for (const entry of catalog) {
    const { id, enabled, ...data } = entry
    if (enabled === false) { console.log(`Skipped unconfirmed product: ${id}`); continue }
    productIdSchema.parse(id)
    const product = productSchema.parse({ ...data, images: [data.image] })
    await db.runTransaction(async tx => {
      const ref = db.collection("products").doc(id)
      if ((await tx.get(ref)).exists) return
      const now = Timestamp.now()
      tx.create(ref, { ...product, createdAt: now, updatedAt: now })
      created++
    })
  }
  console.log(`Created ${created} products. Existing products were preserved. Confirm catalog and set stock in Admin before selling.`)
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Seed failed"); process.exitCode = 1 })
