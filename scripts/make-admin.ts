import { loadEnvConfig } from "@next/env"
import { ADMIN_EMAIL } from "../lib/admin-access"
loadEnvConfig(process.cwd())
async function main() {
  const email = (process.argv[2] || ADMIN_EMAIL).trim().toLowerCase()
  if (email !== ADMIN_EMAIL) throw new Error(`Only ${ADMIN_EMAIL} may be the store admin. Run: pnpm make-admin`)
  const { getAdminAuth, getAdminDb } = await import("../lib/firebase-admin")
  const user = await getAdminAuth().getUserByEmail(email)
  if (user.disabled) throw new Error("The owner account is disabled. Enable it in Firebase Authentication before continuing.")
  const ref = getAdminDb().collection("users").doc(user.uid)
  if (!(await ref.get()).exists) throw new Error("Sign in on the website once to create the profile, then retry")
  await ref.update({ role: "admin" })
  console.log(`Admin access enabled for ${ADMIN_EMAIL}. Other email addresses cannot access the admin panel, even with an old admin role. Reload the account in the browser.`)
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Admin setup failed"); process.exitCode = 1 })
