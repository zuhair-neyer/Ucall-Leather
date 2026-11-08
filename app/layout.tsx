import type { Metadata } from "next"
import { Manrope, Cormorant_Garamond } from "next/font/google"
import { Suspense } from "react"
import "./globals.css"
import "../styles/storefront.css"
import "../styles/catalog.css"
import "../styles/journey.css"
import "../styles/editorial.css"
import { AuthProvider } from "@/context/auth-context"
import { CartProvider } from "@/context/cart-context"
import { Navbar } from "@/components/site/navbar"
import { Footer } from "@/components/site/footer"
import { Toaster } from "@/components/ui/sonner"
import { ThemeProvider } from "@/components/theme-provider"
import { SITE_URL, STORE_NAME } from "@/lib/config"

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
})

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
})

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `${STORE_NAME} — Handcrafted Indian Leather Goods`, template: `%s | ${STORE_NAME}` },
  description:
    "Shop handcrafted leather bags, belts, wallets, jackets and keychains from UCALL Leather Co. in Kanpur, India.",
  openGraph: {
    type: "website", locale: "en_IN", siteName: STORE_NAME,
    title: STORE_NAME, description: "Handcrafted leather goods from Kanpur, India.",
    images: [{ url: "/hero-leather.webp", width: 1200, height: 1500, alt: "UCALL leather goods" }],
  },
  twitter: { card: "summary_large_image", title: STORE_NAME, images: ["/hero-leather.webp"] },
  icons: {
    icon: [
      { url: "/ucall-icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/ucall-icon-48.png", sizes: "48x48", type: "image/png" },
      { url: "/ucall-icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png?ucall=1", sizes: "180x180", type: "image/png" }],
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning className={`${manrope.variable} ${cormorant.variable} bg-background`}>
      <body className="font-sans antialiased min-h-screen flex flex-col">
        <a href="#main-content" className="sr-only z-50 rounded bg-primary p-3 text-primary-foreground focus:not-sr-only focus:fixed focus:left-4 focus:top-4">Skip to content</a>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
        <AuthProvider>
          <CartProvider>
            <Suspense fallback={null}>
              <Navbar />
            </Suspense>
            <main id="main-content" className="flex-1">{children}</main>
            <Footer />
            <Toaster richColors position="top-right" />
          </CartProvider>
        </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
