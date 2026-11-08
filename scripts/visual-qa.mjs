import { chromium } from "@playwright/test"
import { mkdir, writeFile } from "node:fs/promises"
import path from "node:path"

const baseURL = process.env.E2E_BASE_URL || "http://localhost:3002"
const output = path.resolve("output/qa/midnight-luxe")
await mkdir(output, { recursive: true })
const browser = await chromium.launch({ channel: process.platform === "win32" ? "msedge" : undefined })
const findings = []
try {
  for (const width of [1280, 360]) {
    for (const theme of ["dark", "light"]) {
      const context = await browser.newContext({ viewport: { width, height: width === 360 ? 800 : 900 }, reducedMotion: "reduce" })
      await context.addInitScript(theme => localStorage.setItem("theme", theme), theme)
      const page = await context.newPage()
      await page.goto(`${baseURL}/products`)
      const product = await page.locator('main a[href^="/products/"]').first().getAttribute("href")
      const routes = [["home", "/"], ["products", "/products"], ["product", product], ["about", "/about"], ["contact", "/contact"], ["login", "/login"], ["cart", "/cart"], ["policy", "/privacy-policy"]]
      for (const [name, route] of routes) {
        if (!route) continue
        await page.goto(`${baseURL}${route}`)
        await page.locator("main h1").first().waitFor()
        await page.evaluate(async () => {
          Array.from(document.images).forEach(image => { image.loading = "eager" })
          await Promise.race([
            Promise.all([document.fonts.ready, ...Array.from(document.images).map(image => image.decode().catch(() => undefined))]),
            new Promise(resolve => setTimeout(resolve, 10000)),
          ])
        })
        const measurement = await page.evaluate(() => ({
          overflow: document.documentElement.scrollWidth > innerWidth + 1,
          theme: document.documentElement.className,
          brokenImages: Array.from(document.images).filter(image => image.complete && image.naturalWidth === 0).map(image => image.alt),
        }))
        findings.push({ name, width, theme, ...measurement })
        await page.screenshot({ path: path.join(output, `${name}-${width}-${theme}.png`) })
        if (name !== "home") await page.locator("main").screenshot({ path: path.join(output, `${name}-${width}-${theme}-content.png`) })
      }
      await context.close()
    }
  }
} finally { await browser.close() }
await writeFile(path.join(output, "findings.json"), JSON.stringify(findings, null, 2))
console.log(JSON.stringify({ captures: findings.length, problems: findings.filter(item => item.overflow || item.brokenImages.length), output }, null, 2))
