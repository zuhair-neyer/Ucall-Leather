import { expect, test, type Page } from "@playwright/test"

async function noHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, viewport: window.innerWidth }))
  expect(dimensions.scroll, "The page should fit the viewport without horizontal scrolling").toBeLessThanOrEqual(dimensions.viewport + 1)
}

test("public pages render with no runtime errors or horizontal overflow", async ({ page }, testInfo) => {
  test.setTimeout(120_000)
  const errors: string[] = []
  page.on("pageerror", error => errors.push(error.message))
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()) })
  const routes = ["/", "/products", "/cart", "/about", "/contact", "/privacy-policy", "/terms", "/refund-policy", "/shipping-policy", "/login", "/register", "/forgot-password", "/reset-password"]
  for (const route of routes) {
    const response = await page.goto(route)
    expect(response?.status(), route).toBe(200)
    await expect(page.getByRole("heading", { level: 1 }).first()).toBeVisible()
    await noHorizontalOverflow(page)
    if (["/", "/products", "/cart"].includes(route)) {
      await page.locator("footer").scrollIntoViewIfNeeded()
      await page.evaluate(async () => {
        // Request off-screen lazy images before a full-page screenshot.
        // decode() alone can wait forever for images that have not been requested.
        const images = Array.from(document.images)
        images.forEach(image => { image.loading = "eager" })
        await Promise.race([
          Promise.all(images.map(image => image.decode().catch(() => undefined))),
          new Promise(resolve => setTimeout(resolve, 10_000)),
        ])
      })
      await page.evaluate(() => window.scrollTo(0, 0))
      await page.screenshot({ path: testInfo.outputPath(`${route === "/" ? "home" : route.slice(1)}.png`), fullPage: true })
    }
  }
  expect(errors).toEqual([])
})

test("a catalog product opens, zooms and adds to the cart", async ({ page }) => {
  await page.goto("/products")
  const productLink = page.locator('main a[href^="/products/"]').first()
  await expect(productLink).toBeVisible()
  await productLink.click()
  await expect(page).toHaveURL(/\/products\/[^/?]+$/, { timeout: 30_000 })
  const imageButton = page.getByRole("button", { name: /^Enlarge image of / })
  await expect(imageButton).toBeVisible()
  await expect(imageButton.locator("img")).toHaveJSProperty("complete", true)
  await expect(imageButton.locator("img")).not.toHaveJSProperty("naturalWidth", 0)
  await imageButton.click()
  await expect(page.getByRole("dialog")).toBeVisible()
  await page.keyboard.press("Escape")
  const add = page.getByRole("button", { name: "Add to cart", exact: true })
  if (await add.count() === 0) return
  await add.click()
  await expect(page.getByRole("link", { name: "Open cart, 1 items" })).toBeVisible()
  await page.getByRole("link", { name: "Open cart, 1 items" }).click()
  await expect(page.getByRole("heading", { name: "Order summary" })).toBeVisible()
  await expect(page.getByRole("link", { name: "Sign in to checkout" })).toBeVisible()
  await noHorizontalOverflow(page)
})

test("navigation, theme toggle and cart are keyboard accessible", async ({ page }) => {
  await page.goto("/")
  const theme = page.getByRole("button", { name: "Toggle colour theme" })
  await expect(page.locator("html")).toHaveClass(/dark/)
  await theme.focus()
  await page.keyboard.press("Enter")
  await expect(page.locator("html")).not.toHaveClass(/dark/)
  await page.keyboard.press("Enter")
  await expect(page.locator("html")).toHaveClass(/dark/)
  if ((page.viewportSize()?.width || 1280) < 768) {
    await page.getByRole("button", { name: "Toggle menu" }).click()
    await expect(page.getByRole("navigation", { name: "Mobile navigation" })).toBeVisible()
    await page.getByRole("navigation", { name: "Mobile navigation" }).getByRole("link", { name: "Shop", exact: true }).click()
  } else {
    await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Shop", exact: true }).click()
  }
  await expect(page).toHaveURL(/\/products$/)
  await page.getByRole("link", { name: "Open cart, 0 items" }).click()
  await expect(page.getByRole("heading", { name: "Your cart is empty" })).toBeVisible()
})

test("catalog filters survive reload in the URL", async ({ page }) => {
  await page.goto("/products")
  await page.getByLabel("Search", { exact: true }).fill("wallet")
  await page.getByRole("button", { name: "Wallets", exact: true }).click()
  await page.getByLabel("Sort", { exact: true }).selectOption("price-asc")
  await expect(page).toHaveURL(/q=wallet/)
  await expect(page).toHaveURL(/category=Wallets/)
  await expect(page).toHaveURL(/sort=price-asc/)
  await page.reload()
  await expect(page.getByLabel("Search", { exact: true })).toHaveValue("wallet")
  await expect(page.getByRole("button", { name: "Wallets", exact: true })).toHaveAttribute("aria-pressed", "true")
  await expect(page.getByLabel("Sort", { exact: true })).toHaveValue("price-asc")
  await page.getByRole("button", { name: "Clear filters" }).click()
  await expect(page).toHaveURL(/\/products$/)
})

test("login and registration preserve safe next destinations", async ({ page }) => {
  await page.goto("/login?next=%2Fcart")
  await page.getByRole("link", { name: "Create an account", exact: true }).click()
  await expect(page).toHaveURL(/\/register\?next=%2Fcart$/)
  await expect(page.getByRole("heading", { name: "Create your account" })).toBeVisible()
  await page.getByRole("link", { name: "Sign in", exact: true }).last().click()
  await expect(page).toHaveURL(/\/login\?next=%2Fcart$/)
  await page.goto("/login?next=https%3A%2F%2Fexample.com")
  await expect(page.getByRole("link", { name: "Create an account", exact: true })).toHaveAttribute("href", "/register?next=%2Faccount")
  await page.getByRole("link", { name: "Forgot password?" }).click()
  await expect(page.getByRole("heading", { name: "Reset your password" })).toBeVisible()
  await page.getByLabel("Email", { exact: true }).fill("invalid")
  await page.getByRole("button", { name: "Send reset link" }).click()
  await expect(page.locator("#reset-error")).toHaveText("Enter a valid email address.")
})

test("saved cart updates the badge and lets visitors remove an unavailable item", async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("ucall.cart", JSON.stringify([{ id: "e2e-unavailable-product", name: "Test cart item", price: 100, image: "/placeholder.svg", category: "Wallets", quantity: 2 }])))
  await page.goto("/cart")
  await expect(page.getByRole("link", { name: "Open cart, 2 items" })).toBeVisible()
  await expect(page.getByRole("link", { name: "Sign in to checkout" })).toBeVisible()
  await page.getByRole("button", { name: "Remove Test cart item", exact: true }).click()
  await expect(page.getByRole("heading", { name: "Your cart is empty" })).toBeVisible()
  await expect(page.getByRole("link", { name: "Open cart, 0 items" })).toBeVisible()
  await noHorizontalOverflow(page)
})

test("private pages ask unauthenticated visitors to sign in", async ({ page }) => {
  await page.goto("/orders")
  await expect(page.getByText("Sign in to see your orders.")).toBeVisible()
  await page.goto("/orders/unavailable-order")
  await expect(page.getByText("Sign in with the account used to place this order.")).toBeVisible()
  await expect(page.getByRole("link", { name: "Sign in", exact: true }).last()).toHaveAttribute("href", "/login?next=%2Forders%2Funavailable-order")
})

test("missing pages and products give a useful 404", async ({ page }) => {
  for (const route of ["/qa-page-that-does-not-exist", "/products/qa-product-that-does-not-exist"]) {
    const response = await page.goto(route)
    // Next.js may have sent streaming headers before an async product lookup
    // calls notFound. It still renders the 404 page and emits robots:noindex.
    if (route.startsWith("/products/")) expect([200, 404]).toContain(response?.status())
    else expect(response?.status()).toBe(404)
    await expect(page.getByRole("heading", { name: "This page is not here" })).toBeVisible()
    await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute("content", /noindex/)
    await expect(page.locator("main").getByRole("link", { name: "Explore the collection" })).toBeVisible()
    await noHorizontalOverflow(page)
  }
})

test("contact form hydrates after navigation and reload, and validates before saving", async ({ page }) => {
  const errors: string[] = []
  page.on("pageerror", error => errors.push(error.message))
  page.on("console", message => { if (message.type() === "error") errors.push(message.text()) })
  await page.goto("/about")
  if ((page.viewportSize()?.width || 1280) < 768) {
    await page.getByRole("button", { name: "Toggle menu", exact: true }).click()
    await page.getByRole("navigation", { name: "Mobile navigation" }).getByRole("link", { name: "Contact", exact: true }).click()
  } else {
    await page.getByRole("navigation", { name: "Main navigation" }).getByRole("link", { name: "Contact", exact: true }).click()
  }
  await expect(page).toHaveURL(/\/contact$/)
  await page.getByLabel("Message", { exact: true }).fill("Checking contact form validation.")
  await page.getByRole("button", { name: "Send message", exact: true }).click()
  await expect(page.locator("#c-name-error")).toBeVisible()
  await page.reload()
  await expect(page.getByLabel("Message", { exact: true })).toBeEditable()
  await page.getByLabel("Message", { exact: true }).fill("Fresh-page hydration check.")
  await noHorizontalOverflow(page)
  expect(errors).toEqual([])
})
