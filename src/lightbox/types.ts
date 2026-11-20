import type { CSSProperties, ReactNode } from "react"

// @ts-ignore Framer cannot resolve local code-file imports.
import type { LightboxContentSlots } from "./context.ts"

export type RamkaMorphTarget = "active" | "origin" | "closest"

export interface RamkaGalleryConfig {
  showInstructions?: boolean
  loop: boolean
  viewTransition: boolean
  morphTo: RamkaMorphTarget
  pullToClose: boolean
  preload: number
  layout: "peek" | "theater"
  zoom: boolean
  showCaptions: boolean
  showThumbnails: boolean
  backdropColor: string
}

export interface RamkaSettingsProps extends Omit<
  RamkaGalleryConfig,
  "loop" | "viewTransition" | "morphTo" | "pullToClose" | "showCaptions"
> {
  showCaptions?: boolean
  showInstructions: boolean
  style?: CSSProperties
  id?: string
  layoutId?: string
}

export interface RamkaMediaItem {
  id: string
  index: number
  element: HTMLElement
  carouselViewport?: HTMLElement
  morphElement: HTMLElement
  imageElement: HTMLImageElement | null
  src: string
  srcSet?: string
  sizes?: string
  alt: string
  width?: number
  height?: number
  captionElement?: HTMLElement
  caption?: ReactNode
  slots?: LightboxContentSlots
}

export interface RamkaGalleryContextValue {
  config: RamkaGalleryConfig
  isLoopCopy: boolean
  prepareOpen: (index: number, viewport: HTMLElement | null) => void
  items: RamkaMediaItem[]
  claimTriggerIndex: (id: string) => number
  registerTrigger: (
    id: string,
    index: number,
    element: HTMLElement,
    viewport: HTMLElement | null,
  ) => () => void
  refreshTrigger: (
    id: string,
    index: number,
    element: HTMLElement,
    viewport: HTMLElement | null,
  ) => void
  setConfig: (config: RamkaGalleryConfig) => void
}
