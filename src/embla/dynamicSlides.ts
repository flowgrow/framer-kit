import type {
  EmblaCarouselType,
  EmblaOptionsType,
} from "embla-carousel"

type WatchSlidesOption = NonNullable<EmblaOptionsType["watchSlides"]>
type WatchSlidesCallback = Exclude<WatchSlidesOption, boolean>

const SCROLL_DELTA_THRESHOLD = 1
export const NON_EMPTY_SLIDES_SELECTOR = ':scope > *:not(:empty)'
const EMPTY_SLIDE_MARKER = 'data-kniff-embla-empty-slide'

interface PendingSlidesRefresh {
  pending: boolean
  lastScrollLocation: number | undefined
  handleScroll: () => void
  flush: () => void
  handleReInit: () => void
  destroy: () => void
}

const pendingRefreshes = new WeakMap<
  EmblaCarouselType,
  PendingSlidesRefresh
>()

function getPendingSlidesRefresh(
  emblaApi: EmblaCarouselType,
): PendingSlidesRefresh {
  const existing = pendingRefreshes.get(emblaApi)
  if (existing) return existing

  const refresh: PendingSlidesRefresh = {
    pending: false,
    lastScrollLocation: undefined,
    handleScroll: () => {
      if (!refresh.pending) return

      const engine = emblaApi.internalEngine()
      const scrollLocation = engine.offsetLocation.get()
      const previousScrollLocation = refresh.lastScrollLocation
      refresh.lastScrollLocation = scrollLocation

      if (previousScrollLocation === undefined) return
      if (engine.dragHandler.pointerDown()) return

      const scrollDelta = Math.abs(scrollLocation - previousScrollLocation)
      if (scrollDelta < SCROLL_DELTA_THRESHOLD) refresh.flush()
    },
    flush: () => {
      if (!refresh.pending) return
      refresh.pending = false
      refresh.lastScrollLocation = undefined
      emblaApi.reInit()
      hideEmptySlidesAfterReInit(emblaApi)
      emblaApi.emit("slidesChanged")
    },
    handleReInit: () => {
      if (!refresh.pending) return

      // A resize, breakpoint, or settings update already rebuilt the engine
      // with the new slide nodes. Only publish the event Embla's suppressed
      // slide observer would normally have emitted.
      refresh.pending = false
      refresh.lastScrollLocation = undefined
      hideEmptySlidesAfterReInit(emblaApi)
      emblaApi.emit("slidesChanged")
    },
    destroy: () => {
      emblaApi.off("scroll", refresh.handleScroll)
      emblaApi.off("reInit", refresh.handleReInit)
      emblaApi.off("destroy", refresh.destroy)
      pendingRefreshes.delete(emblaApi)
    },
  }

  emblaApi.on("scroll", refresh.handleScroll)
  emblaApi.on("reInit", refresh.handleReInit)
  emblaApi.on("destroy", refresh.destroy)
  pendingRefreshes.set(emblaApi, refresh)
  return refresh
}

function getConfiguredSlideNodes(emblaApi: EmblaCarouselType): HTMLElement[] {
  const container = emblaApi.containerNode()
  const configuredSlides = emblaApi.internalEngine().options.slides

  if (typeof configuredSlides === 'string') {
    return Array.from(
      container.querySelectorAll<HTMLElement>(configuredSlides),
    )
  }

  if (configuredSlides) return Array.from(configuredSlides)
  return Array.from(container.children) as HTMLElement[]
}

function hideEmptySlidesAfterReInit(emblaApi: EmblaCarouselType): void {
  const container = emblaApi.containerNode()
  for (const child of Array.from(container.children) as HTMLElement[]) {
    if (child.matches(':empty')) {
      child.setAttribute(EMPTY_SLIDE_MARKER, 'true')
    }
  }
}

function clearStaleEmptySlideMarkers(emblaApi: EmblaCarouselType): void {
  const container = emblaApi.containerNode()
  for (const child of Array.from(container.children) as HTMLElement[]) {
    if (!child.matches(':empty')) child.removeAttribute(EMPTY_SLIDE_MARKER)
  }
}

function haveSameNodes(
  previous: readonly HTMLElement[],
  current: readonly HTMLElement[],
): boolean {
  return (
    previous.length === current.length &&
    previous.every((node, index) => node === current[index])
  )
}

function requestContinuousSlidesRefresh(emblaApi: EmblaCarouselType): void {
  const refresh = getPendingSlidesRefresh(emblaApi)
  if (!refresh.pending) {
    refresh.lastScrollLocation = emblaApi
      .internalEngine()
      .offsetLocation.get()
  }
  refresh.pending = true

  if (emblaApi.internalEngine().scrollBody.settled()) refresh.flush()
}

/**
 * Watches nested CMS mutations as well as direct slide mutations. Framer can
 * leave an empty wrapper behind when its infinite-loading spinner disappears;
 * the nested mutation must still cause Embla to rebuild against the filtered
 * non-empty slide list.
 */
export function observeContinuousSlides(
  emblaApi: EmblaCarouselType,
): () => void {
  const container = emblaApi.containerNode()
  const configuredSlides = emblaApi.internalEngine().options.slides
  const ownerWindow = container.ownerDocument.defaultView
  const MutationObserverConstructor = ownerWindow?.MutationObserver

  if (
    typeof configuredSlides !== 'string' ||
    !MutationObserverConstructor
  ) {
    return () => undefined
  }

  let observedSlides = getConfiguredSlideNodes(emblaApi)
  const mutationObserver = new MutationObserverConstructor(() => {
    clearStaleEmptySlideMarkers(emblaApi)
    const currentSlides = getConfiguredSlideNodes(emblaApi)
    if (haveSameNodes(observedSlides, currentSlides)) return

    observedSlides = currentSlides
    requestContinuousSlidesRefresh(emblaApi)
  })

  mutationObserver.observe(container, { childList: true, subtree: true })
  hideEmptySlidesAfterReInit(emblaApi)
  return () => mutationObserver.disconnect()
}

/**
 * Keeps CMS/infinite-loading mutations from interrupting an active scroll.
 * Embla normally reinitializes synchronously from its MutationObserver, which
 * recreates the engine at the already-selected destination snap. Deferring
 * that reinitialization until the carousel is visually at rest lets the
 * original animation finish without waiting for Embla's sub-pixel tail.
 */
export function createContinuousSlidesWatch(
  originalWatchSlides?: WatchSlidesOption,
): WatchSlidesCallback {
  return (emblaApi, mutations) => {
    if (
      typeof originalWatchSlides === "function" &&
      !originalWatchSlides(emblaApi, mutations)
    ) {
      return false
    }

    requestContinuousSlidesRefresh(emblaApi)

    // Suppress Embla's immediate reInit. The refresh above either performed
    // it synchronously at rest or will perform it after the active motion.
    return false
  }
}

export function createContinuousSlidesOptions(
  options?: EmblaOptionsType,
): EmblaOptionsType | undefined {
  if (options?.watchSlides === false) return options

  return {
    ...options,
    slides:
      options?.slides === undefined
        ? NON_EMPTY_SLIDES_SELECTOR
        : options.slides,
    watchSlides: createContinuousSlidesWatch(options?.watchSlides),
  }
}
