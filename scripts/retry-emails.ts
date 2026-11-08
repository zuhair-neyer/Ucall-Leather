import { loadEnvConfig } from "@next/env"
loadEnvConfig(process.cwd())
async function main() {
  const { retryPendingEmails } = await import("../lib/server/email")
  console.log(`Checked ${await retryPendingEmails()} queued order emails. Check Admin / emailOutbox for delivery status.`)
}
main().catch(() => { console.error("Email retry failed. Check server environment variables."); process.exitCode = 1 })
