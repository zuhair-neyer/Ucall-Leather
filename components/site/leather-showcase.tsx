"use client"

import Image from "next/image"
import Link from "next/link"
import { useRef, type PointerEvent } from "react"
import { ArrowUpRight } from "lucide-react"

/** The imagery stays static for touch/reduced-motion visitors; desktop movement is only decorative. */
export function LeatherShowcase() {
  const scene = useRef<HTMLDivElement>(null)
  function tilt(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType !== "mouse" || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    const bounds = event.currentTarget.getBoundingClientRect()
    const x = Math.max(-1, Math.min(1, (event.clientX - bounds.left) / bounds.width * 2 - 1))
    const y = Math.max(-1, Math.min(1, (event.clientY - bounds.top) / bounds.height * 2 - 1))
    scene.current?.style.setProperty("--scene-x", `${-y * 3}deg`)
    scene.current?.style.setProperty("--scene-y", `${x * 4}deg`)
  }
  function reset() {
    scene.current?.style.setProperty("--scene-x", "0deg")
    scene.current?.style.setProperty("--scene-y", "0deg")
  }

  return <div className="ucall-showcase" onPointerMove={tilt} onPointerLeave={reset}>
    <div className="ucall-showcase-orbit" aria-hidden="true" />
    <div className="ucall-showcase-depth" ref={scene}>
      <div className="ucall-showcase-backing" aria-hidden="true" />
      <div className="ucall-showcase-main"><Image src="/hero-leather.webp" alt="UCALL leather bag, belt and wallet, with rich grain and brass details" fill preload sizes="(max-width: 767px) 90vw, 48vw" className="object-cover" /><div className="ucall-showcase-image-label"><span>THE EVERYDAY COLLECTION</span><span>UC / 01</span></div></div>
      <div className="ucall-showcase-detail"><div><Image src="/category-belts.webp" alt="A closer look at a UCALL leather belt and brass buckle" fill sizes="(max-width: 767px) 33vw, 170px" className="object-cover" /></div><p>In the details<span aria-hidden="true">↗</span></p></div>
    </div>
    <div className="ucall-showcase-seal" aria-hidden="true"><span>UCALL</span><i>U</i><span>LEATHER CO.</span></div>
    <Link href="/products" className="ucall-showcase-link" aria-label="Explore the leather collection"><ArrowUpRight aria-hidden="true" /><span>Explore<br />the collection</span></Link>
    <p className="ucall-showcase-note"><span aria-hidden="true" />A natural kind of distinction.</p>
  </div>
}
