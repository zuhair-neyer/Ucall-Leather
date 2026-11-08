import "server-only"
import { imgbbShareUrl, isProductImageUrl } from "../product-images"
import { HttpError } from "./http"

const MAX_SHARE_PAGE_BYTES = 256 * 1024

function decodeAttribute(value: string) {
  return value.replace(/&amp;/gi, "&").replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/&#(\d+);/g, (_, number: string) => {
    const point = Number(number)
    return point > 0 && point <= 0x10ffff ? String.fromCodePoint(point) : ""
  })
}

export function extractImgbbImage(html: string): string | null {
  for (const tag of html.match(/<meta\b[^>]{0,8192}>/gi) ?? []) {
    const attrs: Record<string, string> = {}
    for (const match of tag.matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/g)) attrs[match[1].toLowerCase()] = decodeAttribute(match[3])
    if (!["og:image", "twitter:image", "twitter:image:src"].includes(attrs.property ?? attrs.name)) continue
    const image = attrs.content?.trim()
    if (image && isProductImageUrl(image) && new URL(image).hostname === "i.ibb.co") return image
  }
  return null
}

export async function resolveProductImage(value: string, fetcher: typeof fetch = fetch): Promise<string> {
  const input = value.trim()
  if (isProductImageUrl(input)) return input
  const share = imgbbShareUrl(input)
  if (!share) throw new HttpError(400, "Paste an ImgBB share link (https://ibb.co/…), a direct image link (https://i.ibb.co/…), or a Firebase image URL.")
  try {
    // Only this fixed host can be fetched; redirects are deliberately never followed.
    const response = await fetcher(share, { redirect: "error", cache: "no-store", signal: AbortSignal.timeout(10_000), headers: { Accept: "text/html" } })
    if (!response.ok || !response.headers.get("content-type")?.includes("text/html")) throw new Error("Share page unavailable")
    const length = Number(response.headers.get("content-length") || 0)
    if (length > MAX_SHARE_PAGE_BYTES) throw new Error("Share page too large")
    const reader = response.body?.getReader()
    if (!reader) throw new Error("Share page empty")
    const chunks: Uint8Array[] = []
    let size = 0
    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        size += value.byteLength
        if (size > MAX_SHARE_PAGE_BYTES) throw new Error("Share page too large")
        chunks.push(value)
      }
    } finally { await reader.cancel().catch(() => undefined) }
    const image = extractImgbbImage(Buffer.concat(chunks).toString("utf8"))
    if (!image) throw new Error("No valid product image found")
    return image
  } catch {
    throw new HttpError(422, "We could not read that ImgBB page. In ImgBB, choose Embed codes → Direct links, then paste the https://i.ibb.co/ image link here.")
  }
}
