import { loadEnvConfig } from "@next/env"
import { cert } from "firebase-admin/app"
import { readFile, mkdir, writeFile } from "node:fs/promises"
import path from "node:path"

// Deploy the checked-in rules using the configured project service account.
// Keep a local backup of the active release before switching to a new ruleset.
loadEnvConfig(process.cwd())
async function main() {
  const project = process.env.FIREBASE_PROJECT_ID
  if (!project || project !== process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIRESTORE_EMULATOR_HOST) throw new Error("Configure matching real Firebase project IDs before deploying rules")
  const token = await cert({ projectId: project, clientEmail: process.env.FIREBASE_CLIENT_EMAIL, privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n") }).getAccessToken()
  async function request(url: string, method = "GET", body?: unknown) {
    const response = await fetch(url, { method, headers: { Authorization: `Bearer ${token.access_token}`, "Content-Type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(30_000) })
    const data = await response.json()
    if (!response.ok) throw new Error(`Firebase ${method} ${new URL(url).pathname} failed (${response.status}): ${data.error?.message || "Unknown error"}`)
    return data
  }
  const base = `https://firebaserules.googleapis.com/v1/projects/${project}`
  const backupDir = path.resolve(".firebase", "rule-backups", new Date().toISOString().replace(/[:.]/g, "-"))
  await mkdir(backupDir, { recursive: true })
  const { releases = [] } = await request(`${base}/releases?pageSize=100`)
  async function deploy(filename: string, releaseId: string) {
    const name = `projects/${project}/releases/${releaseId}`
    const active = releases.find((release: { name: string }) => release.name === name)
    if (active) {
      const oldRules = await request(`https://firebaserules.googleapis.com/v1/${active.rulesetName}`)
      await writeFile(path.join(backupDir, `${filename}.json`), JSON.stringify({ release: active, ruleset: oldRules }, null, 2))
    }
    const content = await readFile(filename, "utf8")
    // Ruleset creation validates source. This service account may publish rules
    // without having the separate cloud test permission; run test:emulators first.
    const ruleset = await request(`${base}/rulesets`, "POST", { source: { files: [{ name: filename, content }] } })
    const release = { name, rulesetName: ruleset.name }
    if (active) await request(`https://firebaserules.googleapis.com/v1/${name}`, "PATCH", { release })
    else await request(`${base}/releases`, "POST", release)
    const verified = await request(`https://firebaserules.googleapis.com/v1/${name}`)
    if (verified.rulesetName !== ruleset.name) throw new Error(`${filename} release could not be verified`)
    console.log(`${filename} deployed and verified for ${project}.`)
  }
  await deploy("firestore.rules", "cloud.firestore")
  const bucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
  if (bucket) {
    // A missing bucket cannot accept uploads, regardless of its security rules.
    try { await request(`https://storage.googleapis.com/storage/v1/b/${encodeURIComponent(bucket)}`) }
    catch (error) { console.log(`Storage was not changed: ${error instanceof Error ? error.message : "bucket unavailable"}. ImgBB links remain available.`); return }
    await deploy("storage.rules", `firebase.storage/${bucket}`)
  }
}
main().catch(error => { console.error(error instanceof Error ? error.message : "Rules deployment failed"); process.exitCode = 1 })
