import useEmblaCarousel from "embla-carousel-react"
import { useCallback, useEffect, useRef } from "react"

import { scrollToClickedSlide } from "./interaction.js"
import {
  observeEmblaLoopGap,
  syncEmblaLoopGap,
} from "./styles.js"
import { useEmblaStore } from "./store.js"

export function useEmblaInstance(id: string | undefined) {
  const setInstance = useEmblaStore((state) => state.addEmblaInstance)
  const removeInstance = useEmblaStore((state) => state.removeEmblaInstance)
  const config = useEmblaStore((state) =>
    id ? state.configs.get(id) : undefined,
  )
  const connectedMainId = useEmblaStore((state) =>
    id ? state.thumbnailConnections.get(id) : undefined,
  )
  const connectedMainApi = useEmblaStore((state) =>
    connectedMainId
      ? state.emblaInstances.get(connectedMainId)
      : undefined,
  )
  const [viewportRef, emblaApi] = useEmblaCarousel(
    config?.options,
    config?.plugins,
  )
  const viewportElementRef = useRef<HTMLElement | null>(null)
  const viewportAttachFrameRef = useRef(0)
  const loop = config?.options?.loop === true
  const selectOnSlideClick = config?.selectOnSlideClick === true

  const responsiveViewportRef = useCallback(
    (viewport: HTMLElement | null) => {
      if (
        viewportAttachFrameRef.current !== 0 &&
        typeof window !== "undefined"
      ) {
        window.cancelAnimationFrame(viewportAttachFrameRef.current)
        viewportAttachFrameRef.current = 0
      }

      viewportElementRef.current = viewport
      if (!viewport || typeof window === "undefined") {
        viewportRef(viewport)
        return
      }

      syncEmblaLoopGap(viewport, loop)

      // Framer resolves responsive stack geometry after the ref is attached.
      // Give it two layout frames before Embla performs its initial measures.
      viewportAttachFrameRef.current = window.requestAnimationFrame(() => {
        viewportAttachFrameRef.current = window.requestAnimationFrame(() => {
          viewportAttachFrameRef.current = 0
          if (viewportElementRef.current === viewport) viewportRef(viewport)
        })
      })
    },
    [loop, viewportRef],
  )

  useEffect(() => {
    if (!id || !emblaApi) return
    setInstance(id, emblaApi)
    return () => removeInstance(id, emblaApi)
  }, [id, emblaApi, setInstance, removeInstance])

  useEffect(() => {
    if (!emblaApi || typeof window === "undefined") return
    const viewport = viewportElementRef.current ?? emblaApi.rootNode()

    return observeEmblaLoopGap(viewport, loop, () => emblaApi.reInit())
  }, [emblaApi, loop])

  useEffect(() => {
    if (!emblaApi || !selectOnSlideClick) return
    const root = emblaApi.rootNode()

    const selectClickedSlide = (event: MouseEvent) => {
      scrollToClickedSlide(
        event,
        emblaApi,
        connectedMainApi ?? emblaApi,
      )
    }

    root.addEventListener("click", selectClickedSlide)
    return () => root.removeEventListener("click", selectClickedSlide)
  }, [connectedMainApi, emblaApi, selectOnSlideClick])

  return { config, viewportRef: responsiveViewportRef }
}
