/** Accepted product image locations. Share pages must be resolved before saving. */
export function isProductImageUrl(value: string) {
  if (/^\/(?!\/)[a-zA-Z0-9/_ .-]+$/.test(value)) {
    return !value.split("/").includes("..") && /\.(avif|gif|jpe?g|png|svg|webp)$/i.test(value)
  }
  try {
    const url = new URL(value)
    if (url.protocol !== "https:" || url.username || url.password || url.port || url.hash) return false
    if (url.hostname === "i.ibb.co") return /\.(avif|gif|jpe?g|png|webp)$/i.test(url.pathname)
    return url.hostname === "firebasestorage.googleapis.com" && /^\/v0\/b\/[^/]+\/o\/[^/]+$/.test(url.pathname)
  } catch { return false }
}

export function imgbbShareUrl(value: string): string | null {
  try {
    const url = new URL(value)
    if (url.protocol !== "https:" || url.username || url.password || url.port) return null
    if (!["ibb.co", "www.ibb.co"].includes(url.hostname) || !/^\/[a-zA-Z0-9]{4,64}\/?$/.test(url.pathname)) return null
    // Discard tracking parameters and normalise to the one trusted share host.
    return `https://ibb.co${url.pathname.replace(/\/$/, "")}`
  } catch { return null }
}

export function imageUploadError(error: unknown) {
  const code = error && typeof error === "object" && "code" in error ? String(error.code) : ""
  if (code === "storage/unauthorized") return "Firebase denied this upload. Sign in with the owner account and deploy the Storage rules. You can also add an ImgBB link below."
  if (["storage/bucket-not-found", "storage/project-not-found", "storage/no-default-bucket"].includes(code)) return "Firebase Storage is not set up for this project. Add an ImgBB link below, or enable Storage in Firebase."
  if (["storage/retry-limit-exceeded", "storage/canceled"].includes(code)) return "The upload timed out. Check your connection or add an ImgBB link below."
  if (code === "storage/quota-exceeded") return "Firebase Storage has reached its limit. Add an ImgBB link below, or check your Firebase billing and quota."
  return "Image upload failed. Try again, or upload to ImgBB and paste the image link below."
}
