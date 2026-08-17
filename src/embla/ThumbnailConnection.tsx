import {
  addPropertyControls,
  ControlType,
  type PropertyControls,
} from "framer"
import { useCallback, useEffect } from "react"

import { useEmblaStore } from "./store.js"

export interface ThumbnailConnectionProps {
  carouselID?: string
  thumbnailID?: string
}

export const thumbnailConnectionDefaults = {
  carouselID: "kniff-carousel-1",
  thumbnailID: "kniff-thumbnails-1",
} as const

/** Synchronizes a main carousel and a second carousel used as thumbnails. */
export function ThumbnailConnection(props: ThumbnailConnectionProps) {
  const settings = { ...thumbnailConnectionDefaults, ...props }
  const emblaMainApi = useEmblaStore((state) =>
    state.emblaInstances.get(settings.carouselID),
  )
  const emblaThumbsApi = useEmblaStore((state) =>
    state.emblaInstances.get(settings.thumbnailID),
  )

  const syncThumbsFromMain = useCallback(() => {
    if (!emblaMainApi || !emblaThumbsApi) return
    emblaThumbsApi.scrollTo(emblaMainApi.selectedScrollSnap())
  }, [emblaMainApi, emblaThumbsApi])

  const syncMainFromThumbs = useCallback(() => {
    if (!emblaMainApi || !emblaThumbsApi) return
    emblaMainApi.off("select", syncThumbsFromMain)
    emblaMainApi.scrollTo(emblaThumbsApi.selectedScrollSnap())
    emblaMainApi.on("select", syncThumbsFromMain)
  }, [emblaMainApi, emblaThumbsApi, syncThumbsFromMain])

  useEffect(() => {
    if (!emblaMainApi || !emblaThumbsApi) return

    syncThumbsFromMain()
    emblaMainApi.on("select", syncThumbsFromMain)
    emblaMainApi.on("reInit", syncThumbsFromMain)
    emblaThumbsApi.on("select", syncMainFromThumbs)
    emblaThumbsApi.on("reInit", syncMainFromThumbs)

    return () => {
      emblaMainApi.off("select", syncThumbsFromMain)
      emblaMainApi.off("reInit", syncThumbsFromMain)
      emblaThumbsApi.off("select", syncMainFromThumbs)
      emblaThumbsApi.off("reInit", syncMainFromThumbs)
    }
  }, [
    emblaMainApi,
    emblaThumbsApi,
    syncMainFromThumbs,
    syncThumbsFromMain,
  ])

  return null
}

ThumbnailConnection.defaultProps = thumbnailConnectionDefaults
ThumbnailConnection.displayName = "Thumbnail Connection"

export const thumbnailConnectionPropertyControls = {
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
