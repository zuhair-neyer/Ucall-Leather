// Redirects must stay inside this website, including after URL decoding.
export function safeAuthRedirect(value: string | null): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || /[\\\u0000-\u001f]/.test(value)) return "/account"
  try {
    const decoded = decodeURIComponent(value)
    if (decoded.startsWith("//") || /[\\\u0000-\u001f]/.test(decoded)) return "/account"
    const parsed = new URL(value, "https://ucall.invalid")
    return parsed.origin === "https://ucall.invalid" ? `${parsed.pathname}${parsed.search}${parsed.hash}` : "/account"
  } catch { return "/account" }
}
