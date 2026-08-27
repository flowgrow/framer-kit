import type { CSSProperties, ReactNode } from "react"

export type RamkaMorphTarget = "active" | "origin" | "closest"

export interface RamkaGalleryConfig {
  loop: boolean
  viewTransition: boolean
  morphTo: RamkaMorphTarget
  pullToClose: boolean
  preload: number
  zoom: boolean
  showNavigation: boolean
  showCounter: boolean
  syncEmbla: boolean
  stopEmblaAutoplay: boolean
  backdropColor: string
}

export interface RamkaSettingsProps extends RamkaGalleryConfig {
  showInstructions: boolean
  style?: CSSProperties
  id?: string
  layoutId?: string
}

export interface RamkaMediaItem {
  id: string
  index: number
  element: HTMLElement
  morphElement: HTMLElement
  imageElement: HTMLImageElement | null
  src: string
  srcSet?: string
  sizes?: string
  alt: string
  width?: number
  height?: number
  caption?: ReactNode
}

export interface RamkaGalleryContextValue {
  items: RamkaMediaItem[]
  claimTriggerIndex: (id: string) => number
  registerTrigger: (
    id: string,
    index: number,
    element: HTMLElement,
  ) => () => void
  refreshTrigger: (
    id: string,
    index: number,
    element: HTMLElement,
  ) => void
  setConfig: (config: RamkaGalleryConfig) => void
}
