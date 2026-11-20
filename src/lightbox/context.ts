import { createContext, type CSSProperties, type ReactNode } from "react"

// @ts-ignore Framer cannot resolve local code-file imports.
import type { RamkaGalleryContextValue } from "./types.ts"

export const RamkaGalleryContext = createContext<RamkaGalleryContextValue | null>(null)

export interface LightboxContentLayout {
  sizing?: "fill" | "fixed" | undefined
  contentWidth?: number | undefined
  contentHeight?: number | undefined
  horizontalAlignment?: "left" | "center" | "right" | undefined
  verticalAlignment?: "top" | "center" | "bottom" | undefined
}

export function lightboxContentStyle({
  sizing = "fill",
  contentWidth = 640,
  contentHeight = 480,
  horizontalAlignment = "center",
  verticalAlignment = "center",
}: LightboxContentLayout): CSSProperties {
  return {
    width: sizing === "fixed" ? contentWidth : "100%",
    height: sizing === "fixed" ? contentHeight : "100%",
    maxWidth: "100%",
    maxHeight: "100%",
    minWidth: 0,
    minHeight: 0,
    boxSizing: "border-box",
    justifySelf: horizontalAlignment,
    alignSelf: { top: "start", center: "center", bottom: "end" }[verticalAlignment],
    overflow: "auto",
    overscrollBehavior: "contain",
    touchAction: "pan-y",
  }
}

export const lightboxContentGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0, 1fr)",
  gridTemplateRows: "minmax(0, 1fr)",
}

export interface LightboxContentSlots extends LightboxContentLayout {
  content?: ReactNode
  thumbnail?: ReactNode
  setThumbnailTarget?: (target: HTMLSpanElement | null) => void
  caption?: ReactNode
}

export const lightboxContentSlots = new WeakMap<HTMLElement, LightboxContentSlots>()
