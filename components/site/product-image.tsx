"use client"

import Image, { type ImageProps } from "next/image"
import { ImageOff } from "lucide-react"
import { useState } from "react"
import { isProductImageUrl } from "@/lib/product-images"

type ProductImageProps = Omit<ImageProps, "src" | "onError"> & { src: string }

function ProductImageSource({ src, alt, unoptimized, ...props }: ProductImageProps) {
  const [state, setState] = useState<"optimized" | "direct" | "unavailable">("optimized")
  const canRetryDirect = src.startsWith("https://") && isProductImageUrl(src)

  if (state === "unavailable") return <span
    role="img"
    aria-label={alt ? `${alt} — photo unavailable` : "Product photo unavailable"}
    className="product-image-unavailable"
    style={props.fill ? { position: "absolute", inset: 0 } : { width: props.width === undefined ? undefined : Number(props.width), height: props.height === undefined ? undefined : Number(props.height) }}
  ><ImageOff aria-hidden="true" /><span>Photo unavailable</span></span>

  return <Image {...props} key={state} src={src} alt={alt} unoptimized={unoptimized || state === "direct"} onError={() => {
    // A failed optimizer request must not hide an otherwise reachable product photo.
    // Retry the same approved source once; never substitute a different product image.
    setState(state === "optimized" && !unoptimized && canRetryDirect ? "direct" : "unavailable")
  }} />
}

export function ProductImage(props: ProductImageProps) {
  // Gallery and live catalog changes start a new attempt without carrying a previous failure.
  return <ProductImageSource key={props.src} {...props} />
}
