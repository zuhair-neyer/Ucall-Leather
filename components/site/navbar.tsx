"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useSyncExternalStore } from "react"
import { ShoppingBag, Menu, X, User, LogOut, ShieldCheck, Package, Settings, Moon, Sun, ArrowUpRight } from "lucide-react"
import { useTheme } from "next-themes"
import { toast } from "sonner"
import { useCart } from "@/context/cart-context"
import { useAuth } from "@/context/auth-context"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/products", label: "Shop" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
]
const subscribeHydration = () => () => {}
const clientHydrated = () => true
const serverHydrated = () => false

export function Navbar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const hydrated = useSyncExternalStore(subscribeHydration, clientHydrated, serverHydrated)
  const { totalItems: persistedItems } = useCart()
  const { user: authenticatedUser, profile, logout, isAdmin, loading: authLoading } = useAuth()
  // Match the streamed server snapshot before displaying restored browser state.
  const totalItems = hydrated ? persistedItems : 0
  const user = hydrated ? authenticatedUser : null
  const { resolvedTheme, setTheme } = useTheme()
  const active = (href: string) => pathname === href || (href !== "/" && pathname.startsWith(href + "/"))

  return <header className="ucall-nav" onKeyDown={event => { if (event.key === "Escape") setOpen(false) }}>
    <div className="ucall-nav-bar">
      <Link href="/" className="ucall-nav-brand" aria-label="UCALL Leather Co.">
        <span className="ucall-nav-brand-mark" aria-hidden="true">U</span>
        <span className="ucall-nav-wordmark"><strong>UCALL</strong><span>Leather Co.</span></span>
      </Link>
      <nav aria-label="Main navigation" className="ucall-nav-main">{navLinks.map(link => <Link key={link.href} href={link.href} aria-current={active(link.href) ? "page" : undefined}>{link.label}</Link>)}</nav>
      <div className="ucall-nav-actions">
        <Button variant="ghost" size="icon" className="ucall-nav-icon" aria-label="Toggle colour theme" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}><Sun className="hidden dark:block" aria-hidden="true" /><Moon className="dark:hidden" aria-hidden="true" /></Button>
        <Link href="/cart" className="ucall-nav-icon ucall-nav-cart" aria-label={"Open cart, " + totalItems + " items"}><ShoppingBag aria-hidden="true" />{totalItems > 0 && <span className="ucall-nav-cart-count">{totalItems}</span>}</Link>
        {user ? <DropdownMenu>
          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="ucall-nav-icon" aria-label="Account menu"><User aria-hidden="true" /></Button></DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel><div className="flex flex-col"><span className="font-medium">{profile?.name ?? "Account"}</span><span className="truncate text-xs text-muted-foreground">{profile?.email}</span></div></DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild><Link href="/account" className="flex items-center gap-2"><Settings className="size-4" aria-hidden="true" /> Account Settings</Link></DropdownMenuItem>
            {!authLoading && !isAdmin && <DropdownMenuItem asChild><Link href="/orders" className="flex items-center gap-2"><Package className="size-4" aria-hidden="true" /> My Orders</Link></DropdownMenuItem>}
            {isAdmin && <DropdownMenuItem asChild><Link href="/admin" className="flex items-center gap-2"><ShieldCheck className="size-4" aria-hidden="true" /> Admin Dashboard</Link></DropdownMenuItem>}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => { void logout().catch(() => toast.error("Could not sign out. Please try again.")) }}><LogOut className="mr-2 size-4" aria-hidden="true" /> Log out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu> : <Button asChild variant="outline" size="sm" className="ucall-nav-signin"><Link href="/login">Sign in</Link></Button>}
        <Button variant="ghost" size="icon" className="ucall-nav-icon md:hidden" onClick={() => setOpen(value => !value)} aria-label="Toggle menu" aria-expanded={open} aria-controls="mobile-navigation">{open ? <X aria-hidden="true" /> : <Menu aria-hidden="true" />}</Button>
      </div>
    </div>
    {open && <div className="ucall-nav-mobile"><nav id="mobile-navigation" aria-label="Mobile navigation">{navLinks.map(link => <Link key={link.href} href={link.href} aria-current={active(link.href) ? "page" : undefined} onClick={() => setOpen(false)}>{link.label}<ArrowUpRight aria-hidden="true" /></Link>)}{!user && <Link href="/login" onClick={() => setOpen(false)}>Sign in <ArrowUpRight aria-hidden="true" /></Link>}</nav></div>}
  </header>
}

