import {
  addPropertyControls,
  ControlType,
  RenderTarget,
  type PropertyControls,
} from "framer"
import type { EmblaCarouselType } from "embla-carousel"
import { useEffect, type CSSProperties } from "react"

import { pauseAutoplayForInteraction } from "./accessoryUtils.js"
import { useEmblaStore } from "./store.js"

export interface ThumbnailConnectionProps {
  showInstructions?: boolean
  carouselID?: string
  thumbnailID?: string
  syncMainOnThumbnailScroll?: boolean
  style?: CSSProperties
}

export interface ThumbnailCarouselConnectionOptions {
  syncMainOnThumbnailScroll?: boolean
}

export const thumbnailConnectionDefaults = {
  showInstructions: true,
  carouselID: "kniff-carousel-1",
  thumbnailID: "kniff-thumbnails-1",
  syncMainOnThumbnailScroll: true,
} as const

/** Finds the thumbnail snap that contains a main-carousel slide index. */
export function getThumbnailSnapForSlide(
  emblaThumbsApi: EmblaCarouselType,
  slideIndex: number,
): number {
  const registry = emblaThumbsApi.internalEngine().slideRegistry
  const snapIndex = registry.findIndex((slides) =>
    slides.includes(slideIndex),
  )
  return snapIndex >= 0 ? snapIndex : slideIndex
}

/**
 * Resolves a thumbnail snap back to a slide. Contained edge snaps can represent
 * several slides, so the first/last edge selects the corresponding edge slide.
 */
export function getSlideForThumbnailSnap(
  emblaThumbsApi: EmblaCarouselType,
  snapIndex: number,
): number {
  const registry = emblaThumbsApi.internalEngine().slideRegistry
  const slides = registry[snapIndex]
  if (!slides?.length) return snapIndex
  return snapIndex === registry.length - 1
    ? slides[slides.length - 1] ?? snapIndex
    : slides[0] ?? snapIndex
}

/**
 * Uses Embla's documented thumbnail flow: thumbnail clicks control the main
 * carousel directly, while main selection keeps the thumbnail viewport in view.
 */
export function connectThumbnailCarousels(
  emblaMainApi: EmblaCarouselType,
  emblaThumbsApi: EmblaCarouselType,
  options: ThumbnailCarouselConnectionOptions = {},
): () => void {
  const syncMainOnThumbnailScroll =
    options.syncMainOnThumbnailScroll ?? true

  const syncThumbsFromMain = () => {
    const mainIndex = emblaMainApi.selectedScrollSnap()
    const thumbnailSnap = getThumbnailSnapForSlide(
      emblaThumbsApi,
      mainIndex,
    )
    if (emblaThumbsApi.selectedScrollSnap() === thumbnailSnap) return
    emblaThumbsApi.scrollTo(thumbnailSnap)
  }

  const syncMainFromThumbs = () => {
    const mainIndex = getSlideForThumbnailSnap(
      emblaThumbsApi,
      emblaThumbsApi.selectedScrollSnap(),
    )
    if (emblaMainApi.selectedScrollSnap() === mainIndex) return
    emblaMainApi.scrollTo(mainIndex)
  }

  const handleThumbnailInteraction = () => {
    pauseAutoplayForInteraction(emblaMainApi)
  }

  syncThumbsFromMain()
  emblaMainApi.on("select", syncThumbsFromMain)
  emblaMainApi.on("reInit", syncThumbsFromMain)
  if (syncMainOnThumbnailScroll) {
    emblaThumbsApi.on("select", syncMainFromThumbs)
  }
  emblaThumbsApi.on("reInit", syncThumbsFromMain)
  emblaThumbsApi.on("pointerDown", handleThumbnailInteraction)

  return () => {
    emblaMainApi.off("select", syncThumbsFromMain)
    emblaMainApi.off("reInit", syncThumbsFromMain)
    if (syncMainOnThumbnailScroll) {
      emblaThumbsApi.off("select", syncMainFromThumbs)
    }
    emblaThumbsApi.off("reInit", syncThumbsFromMain)
    emblaThumbsApi.off("pointerDown", handleThumbnailInteraction)
  }
}

/** Synchronizes a main carousel and a second carousel used as thumbnails. */
export function ThumbnailConnection(props: ThumbnailConnectionProps) {
  const settings = { ...thumbnailConnectionDefaults, ...props }
  const emblaMainApi = useEmblaStore((state) =>
    state.emblaInstances.get(settings.carouselID),
  )
  const emblaThumbsApi = useEmblaStore((state) =>
    state.emblaInstances.get(settings.thumbnailID),
  )
  const addThumbnailConnection = useEmblaStore(
    (state) => state.addThumbnailConnection,
  )
  const removeThumbnailConnection = useEmblaStore(
    (state) => state.removeThumbnailConnection,
  )

  useEffect(() => {
    if (!settings.carouselID || !settings.thumbnailID) return
    addThumbnailConnection(settings.thumbnailID, settings.carouselID)
    return () =>
      removeThumbnailConnection(
        settings.thumbnailID,
        settings.carouselID,
      )
  }, [
    addThumbnailConnection,
    removeThumbnailConnection,
    settings.carouselID,
    settings.thumbnailID,
  ])

  useEffect(() => {
    if (!emblaMainApi || !emblaThumbsApi) return
    return connectThumbnailCarousels(emblaMainApi, emblaThumbsApi, {
      syncMainOnThumbnailScroll: settings.syncMainOnThumbnailScroll,
    })
  }, [
    emblaMainApi,
    emblaThumbsApi,
    settings.syncMainOnThumbnailScroll,
  ])

  if (RenderTarget.current() !== RenderTarget.canvas) {
    return null
  }

  if (!settings.showInstructions) {
    // Returning null makes Framer draw its own "rendered no output" Canvas
    // placeholder. An invisible element keeps this headless component hidden.
    return (
      <div
        aria-hidden="true"
        style={{
          width: "100%",
          height: "100%",
          visibility: "hidden",
          pointerEvents: "none",
        }}
      />
    )
  }

  return (
    <div
      style={{
        ...settings.style,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 6,
        width: "100%",
        height: "100%",
        minWidth: 160,
        minHeight: 80,
        padding: 14,
        border: "1px solid rgba(0, 0, 0, 0.12)",
        borderRadius: 10,
        background: "rgba(245, 245, 245, 0.96)",
        color: "#111",
        fontFamily: "Inter, sans-serif",
        fontSize: 12,
        lineHeight: 1.4,
      }}
    >
      <strong>Thumbnail Connection</strong>
      <span>
        {settings.thumbnailID} → {settings.carouselID}
      </span>
    </div>
  )
}

ThumbnailConnection.defaultProps = thumbnailConnectionDefaults
ThumbnailConnection.displayName = "Thumbnail Connection"

export const thumbnailConnectionPropertyControls = {
  showInstructions: {
    type: ControlType.Boolean,
    title: "Instructions",
    defaultValue: thumbnailConnectionDefaults.showInstructions,
  },
  carouselID: {
    title: "Main ID",
    type: ControlType.String,
    defaultValue: thumbnailConnectionDefaults.carouselID,
    description: "Use the ID of the main Carousel instance",
  },
  thumbnailID: {
    title: "Thumb ID",
    type: ControlType.String,
    defaultValue: thumbnailConnectionDefaults.thumbnailID,
    description: "Use the ID of the thumbnail Carousel instance",
  },
  syncMainOnThumbnailScroll: {
    title: "Scroll Updates Main",
    type: ControlType.Boolean,
    defaultValue: thumbnailConnectionDefaults.syncMainOnThumbnailScroll,
    description:
      "Select the matching main slide when the thumbnail carousel scrolls",
  },
} satisfies PropertyControls<ThumbnailConnectionProps>

let propertyControlsRegistered = false

export function registerThumbnailConnectionPropertyControls(): void {
  if (propertyControlsRegistered) return
  addPropertyControls(
    ThumbnailConnection,
    thumbnailConnectionPropertyControls,
  )
  propertyControlsRegistered = true
}
