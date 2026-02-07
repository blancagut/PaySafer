/**
 * CRITICAL BRAND RULE — PAYSAFER LOGO
 *
 * Single source of truth: /public/paysafer-logo.svg
 *
 * - Do NOT generate, redesign, recreate, simulate, or approximate the logo.
 * - Do NOT invent logo variants (dark, light, placeholder, default, demo, etc.).
 * - Do NOT substitute the logo with any other visual element.
 * - No transformations, no recoloring, no creative interpretation.
 * - If the file cannot be rendered, display NOTHING (no placeholder, no text).
 *
 * Brand integrity overrides UI completeness. Failure mode is EMPTY.
 */

import Image from "next/image"
import Link from "next/link"

/** The ONLY valid logo path. Never change or duplicate. */
const LOGO_SRC = "/paysafer-logo.svg" as const

interface LogoProps {
  size?: "sm" | "md" | "lg" | "xl"
  linkTo?: string
  className?: string
}

const sizes = {
  sm: { width: 120, height: 30 },
  md: { width: 160, height: 40 },
  lg: { width: 200, height: 50 },
  xl: { width: 280, height: 70 },
}

export function Logo({ size = "md", linkTo, className = "" }: LogoProps) {
  const { width, height } = sizes[size]

  const logoElement = (
    <div className={`flex items-center ${className}`}>
      <Image
        src={LOGO_SRC}
        alt="PaySafer"
        width={width}
        height={height}
        priority
        className="object-contain"
        unoptimized
      />
    </div>
  )

  if (linkTo) {
    return (
      <Link href={linkTo} className="flex items-center">
        {logoElement}
      </Link>
    )
  }

  return logoElement
}
