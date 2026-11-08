import test from "node:test"
import assert from "node:assert/strict"
import { imageSchema } from "../lib/validation"
import { imageUploadError, imgbbShareUrl } from "../lib/product-images"
import { extractImgbbImage, resolveProductImage } from "../lib/server/product-images"
import { POST as resolveRoute } from "../app/api/admin/images/resolve/route"

const direct = "https://i.ibb.co/abc123/leather-bag.jpg"
const page = (html: string, headers: Record<string, string> = {}) => new Response(html, { headers: { "content-type": "text/html; charset=UTF-8", ...headers } })

test("product images accept supported direct locations and reject share pages and unsafe URLs", () => {
  for (const url of [direct, "/category-bags.webp", "/placeholder.svg", "https://firebasestorage.googleapis.com/v0/b/store/o/products%2Fbag.jpg?alt=media&token=example"]) {
    assert.equal(imageSchema.safeParse(url).success, true, url)
  }
  for (const url of ["https://ibb.co/abc123", "https://i.ibb.co/abc123/page.html", "https://i.ibb.co.evil.test/photo.jpg", "https://i.ibb.co@evil.test/photo.jpg", "https://user:pass@i.ibb.co/photo.jpg", "https://i.ibb.co:444/photo.jpg", "http://i.ibb.co/photo.jpg", "//evil.test/photo.jpg", "/../secrets.png", "data:image/svg+xml,test", "https://firebasestorage.googleapis.com/evil.html"]) {
    assert.equal(imageSchema.safeParse(url).success, false, url)
  }
})

test("ImgBB share URLs normalize known hosts and discard tracking parameters", () => {
  assert.equal(imgbbShareUrl("https://www.ibb.co/Ab12CD/?track=1#image"), "https://ibb.co/Ab12CD")
  for (const url of ["http://ibb.co/Ab12CD", "https://ibb.co@localhost/Ab12CD", "https://ibb.co.evil.test/Ab12CD", "https://ibb.co:444/Ab12CD", "https://ibb.co/album/Ab12CD", "https://127.0.0.1/Ab12CD"]) assert.equal(imgbbShareUrl(url), null, url)
})

test("share-page parsing accepts either attribute order and only ImgBB image metadata", () => {
  assert.equal(extractImgbbImage(`<meta property="og:image" content="${direct}">`), direct)
  assert.equal(extractImgbbImage(`<meta content='${direct}?a=1&amp;b=2' property='og:image'/>`), `${direct}?a=1&b=2`)
  assert.equal(extractImgbbImage(`<meta name="twitter:image" content="${direct}">`), direct)
  assert.equal(extractImgbbImage('<meta property="og:image" content="https://127.0.0.1/private.png">'), null)
  assert.equal(extractImgbbImage(`<img src="${direct}">`), null)
})

test("resolver performs no fetch for direct images or unsupported URL targets", async () => {
  let calls = 0
  const fetcher: typeof fetch = async () => { calls++; return page("") }
  assert.equal(await resolveProductImage(direct, fetcher), direct)
  for (const url of ["http://localhost/secret", "https://example.com/test", "https://ibb.co.evil.test/Ab12CD"]) await assert.rejects(resolveProductImage(url, fetcher), /Paste an ImgBB/)
  assert.equal(calls, 0)
})

test("share resolver forbids redirects, bounds requests and validates metadata", async () => {
  const fetcher: typeof fetch = async (input, init) => {
    assert.equal(input, "https://ibb.co/Ab12CD")
    assert.equal(init?.redirect, "error")
    assert.equal(init?.cache, "no-store")
    assert.ok(init?.signal)
    return page(`<meta property="og:image" content="${direct}">`)
  }
  assert.equal(await resolveProductImage("https://ibb.co/Ab12CD?utm=1", fetcher), direct)
  for (const response of [new Response("", { status: 302, headers: { location: "http://localhost" } }), page("x", { "content-length": "300000" }), page("x".repeat(262145)), page('<meta property="og:image" content="https://evil.test/image.jpg">'), new Response("image", { headers: { "content-type": "image/jpeg" } })]) {
    await assert.rejects(resolveProductImage("https://ibb.co/Ab12CD", async () => response), /Direct links/)
  }
})

test("image resolution endpoint rejects unauthenticated requests", async () => {
  const response = await resolveRoute(new Request("http://localhost/api/admin/images/resolve", { method: "POST", body: JSON.stringify({ url: "https://ibb.co/Ab12CD" }) }))
  assert.equal(response.status, 401)
})

test("upload errors explain the ImgBB fallback for setup, permission and quota errors", () => {
  assert.match(imageUploadError({ code: "storage/unauthorized" }), /owner account/)
  assert.match(imageUploadError({ code: "storage/bucket-not-found" }), /not set up/)
  assert.match(imageUploadError({ code: "storage/quota-exceeded" }), /limit/)
  assert.match(imageUploadError({ code: "storage/canceled" }), /timed out/)
  assert.match(imageUploadError(new Error("unknown")), /ImgBB/)
})
