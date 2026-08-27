import type { EmblaCarouselType } from "embla-carousel"
import { RenderTarget } from "framer"
import { Lightbox } from "ramka"
import * as React from "react"
import {
  forwardRef,
  type ComponentType,
  type RefAttributes,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react"

import { pauseAutoplayForInteraction } from "../embla/accessoryUtils.js"
import { getClosestEmblaApi } from "../embla/domBridge.js"
import { RamkaGalleryContext } from "./context.js"
import { defaultRamkaGalleryConfig } from "./defaults.js"
import {
  getEmblaSlideIndex,
  resolveEmblaSlideIndex,
} from "./embla.js"
import {
  extractRamkaMedia,
  isSameRamkaMedia,
  sortRamkaMedia,
} from "./media.js"
import type {
  RamkaGalleryConfig,
  RamkaGalleryContextValue,
  RamkaMediaItem,
} from "./types.js"

interface FramerLayerProps {
  children?: React.ReactNode
}

function assignRef(
  ref: React.ForwardedRef<unknown>,
  value: unknown,
): void {
  if (typeof ref === "function") ref(value)
  else if (ref) ref.current = value
}

function renderComponent<P extends object>(
  Component: ComponentType<P>,
  props: P,
  ref: React.ForwardedRef<unknown>,
) {
  return React.createElement(Component, {
    ...props,
    ref,
  } as P & RefAttributes<unknown>)
}

function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => setHydrated(true), [])
  return hydrated
}

function upsertMedia(
  items: RamkaMediaItem[],
  next: RamkaMediaItem,
): RamkaMediaItem[] {
  const currentIndex = items.findIndex((item) => item.id === next.id)
  if (
    currentIndex >= 0 &&
    items[currentIndex] &&
    isSameRamkaMedia(items[currentIndex], next)
  ) {
    return items
  }

  const updated = items.filter((item) => item.id !== next.id)
  updated.push(next)
  return sortRamkaMedia(updated)
}

function getEmblaSnapForMedia(
  api: EmblaCarouselType,
  item: RamkaMediaItem,
): number | undefined {
  const slideIndex = getEmblaSlideIndex(api, item.element)
  if (slideIndex === undefined) return undefined

  const snapIndex = api
    .internalEngine()
    .slideRegistry.findIndex((slides) => slides.includes(slideIndex))
  return snapIndex >= 0 ? snapIndex : slideIndex
}

function syncEmblaToMedia(item: RamkaMediaItem): void {
  const api = getClosestEmblaApi(item.element)
  if (!api) return
  const snapIndex = getEmblaSnapForMedia(api, item)
  if (snapIndex === undefined || api.selectedScrollSnap() === snapIndex) {
    return
  }
  // The carousel is hidden behind the lightbox, so there is no useful visual
  // transition to preserve here. Jumping makes the active trigger's final
  // geometry available before Ramka captures its close-transition snapshot.
  api.scrollTo(snapIndex, true)
}

const RAMKA_PORTAL_CSS = `
[data-kniff-ramka-portal] [data-ramka-backdrop] {
  opacity: 0;
  transition: opacity 220ms ease;
}
[data-kniff-ramka-portal] [data-ramka-backdrop][data-open] {
  opacity: 1;
}
[data-kniff-ramka-portal] [data-ramka-backdrop][data-pulling] {
  opacity: calc(1 - var(--lightbox-pull-progress, 0) * 0.65);
  transition: none;
}
[data-kniff-ramka-portal] button:focus-visible {
  outline: 2px solid white;
  outline-offset: 3px;
}
`

const controlStyle: React.CSSProperties = {
  position: "absolute",
  zIndex: 3,
  display: "grid",
  placeItems: "center",
  width: 44,
  height: 44,
  margin: 0,
  padding: 0,
  border: "1px solid rgba(255,255,255,0.28)",
  borderRadius: 999,
  background: "rgba(0,0,0,0.34)",
  color: "white",
  font: "500 20px/1 Inter, sans-serif",
  cursor: "pointer",
  backdropFilter: "blur(12px)",
  WebkitBackdropFilter: "blur(12px)",
}

function RamkaPortal({
  items,
  config,
}: {
  items: RamkaMediaItem[]
  config: RamkaGalleryConfig
}) {
  if (items.length === 0) return null

  return (
    <Lightbox.Portal
      data-kniff-ramka-portal=""
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2147483647,
      }}
    >
      <style>{RAMKA_PORTAL_CSS}</style>
      <Lightbox.Backdrop
        style={{
          position: "absolute",
          inset: 0,
          background: config.backdropColor,
        }}
      />
      <Lightbox.Content
        aria-label="Image viewer"
        pullToClose={config.pullToClose}
        style={{
          position: "absolute",
          inset: 0,
          color: "white",
        }}
      >
        <Lightbox.Stage
          style={{ position: "absolute", inset: 0 }}
        >
          <Lightbox.Slides
            aria-label="Images"
            preload={config.preload}
            style={{ width: "100%", height: "100%" }}
          >
            {items.map((item, index) => (
              <Lightbox.Slide
                key={item.id}
                style={{
                  flex: "0 0 100%",
                  width: "100%",
                  height: "100%",
                  boxSizing: "border-box",
                  padding:
                    "max(24px, env(safe-area-inset-top)) clamp(24px, 6vw, 96px) max(24px, env(safe-area-inset-bottom))",
                }}
              >
                <Lightbox.Item
                  index={index}
                  caption={item.caption}
                  style={{ width: "100%", height: "100%" }}
                >
                  {config.zoom ? (
                    <Lightbox.Zoom>
                      <Lightbox.Media
                        {...(item.width ? { width: item.width } : {})}
                        {...(item.height ? { height: item.height } : {})}
                      >
                        <img
                          src={item.src}
                          {...(item.srcSet
                            ? { srcSet: item.srcSet }
                            : {})}
                          {...(item.sizes ? { sizes: item.sizes } : {})}
                          alt={item.alt}
                          draggable={false}
                          loading="eager"
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "contain",
                          }}
                        />
                      </Lightbox.Media>
                    </Lightbox.Zoom>
                  ) : (
                    <Lightbox.Media
                      {...(item.width ? { width: item.width } : {})}
                      {...(item.height ? { height: item.height } : {})}
                    >
                      <img
                        src={item.src}
                        {...(item.srcSet ? { srcSet: item.srcSet } : {})}
                        {...(item.sizes ? { sizes: item.sizes } : {})}
                        alt={item.alt}
                        draggable={false}
                        loading="eager"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "contain",
                        }}
                      />
                    </Lightbox.Media>
                  )}
                </Lightbox.Item>
              </Lightbox.Slide>
            ))}
          </Lightbox.Slides>

          <Lightbox.Close
            style={{ ...controlStyle, top: 20, right: 20 }}
          >
            ×
          </Lightbox.Close>

          {config.showNavigation && items.length > 1 ? (
            <>
              <Lightbox.Previous
                style={{
                  ...controlStyle,
                  top: "50%",
                  left: 20,
                  transform: "translateY(-50%)",
                }}
              >
                ‹
              </Lightbox.Previous>
              <Lightbox.Next
                style={{
                  ...controlStyle,
                  top: "50%",
                  right: 20,
                  transform: "translateY(-50%)",
                }}
              >
                ›
              </Lightbox.Next>
            </>
          ) : null}

          {config.showCounter ? (
            <Lightbox.Counter
              style={{
                position: "absolute",
                zIndex: 3,
                left: "50%",
                bottom: 20,
                transform: "translateX(-50%)",
                padding: "8px 12px",
                borderRadius: 999,
                background: "rgba(0,0,0,0.34)",
                color: "white",
                font: "500 13px/1 Inter, sans-serif",
                fontVariantNumeric: "tabular-nums",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
              }}
            />
          ) : null}
        </Lightbox.Stage>
      </Lightbox.Content>
    </Lightbox.Portal>
  )
}

function createGalleryOverride<P extends object>(
  Component: ComponentType<P>,
): ComponentType<P> {
  const displayName = Component.displayName ?? Component.name ?? "Component"

  const CanvasOverride = forwardRef<unknown, P>((props, ref) =>
    renderComponent(Component, props as unknown as P, ref),
  )

  const PreviewOverride = forwardRef<unknown, P>((props, forwardedRef) => {
    const hydrated = useHydrated()
    const [rootElement, setRootElement] = useState<HTMLElement | null>(null)
    const [items, setItems] = useState<RamkaMediaItem[]>([])
    const triggerIndicesRef = useRef(new Map<string, number>())
    const nextTriggerIndexRef = useRef(0)
    const [config, setConfig] = useState<RamkaGalleryConfig>(
      defaultRamkaGalleryConfig,
    )

    const claimTriggerIndex = useCallback((id: string) => {
      const existingIndex = triggerIndicesRef.current.get(id)
      if (existingIndex !== undefined) return existingIndex

      const index = nextTriggerIndexRef.current
      nextTriggerIndexRef.current += 1
      triggerIndicesRef.current.set(id, index)
      return index
    }, [])

    const refreshTrigger = useCallback(
      (id: string, index: number, element: HTMLElement) => {
        const media = extractRamkaMedia(id, index, element)
        if (!media) return
        setItems((current) => upsertMedia(current, media))
      },
      [],
    )

    const registerTrigger = useCallback(
      (id: string, index: number, element: HTMLElement) => {
        refreshTrigger(id, index, element)
        return () =>
          setItems((current) =>
            current.filter((item) => item.id !== id),
          )
      },
      [refreshTrigger],
    )

    const context = useMemo<RamkaGalleryContextValue>(
      () => ({
        items,
        claimTriggerIndex,
        registerTrigger,
        refreshTrigger,
        setConfig,
      }),
      [items, claimTriggerIndex, registerTrigger, refreshTrigger],
    )

    const mergedRootRef = useCallback(
      (node: unknown) => {
        setRootElement(node instanceof HTMLElement ? node : null)
        assignRef(forwardedRef, node)
      },
      [forwardedRef],
    )

    const handleValueChange = useCallback(
      (index: number) => {
        if (!config.syncEmbla) return
        const item = items[index]
        if (item) syncEmblaToMedia(item)
      },
      [config.syncEmbla, items],
    )

    const handleOpenChange = useCallback(
      (open: boolean) => {
        if (!open || !config.stopEmblaAutoplay) return
        const activeItem =
          items.find((item) => rootElement?.contains(item.element)) ??
          items[0]
        if (!activeItem) return
        pauseAutoplayForInteraction(
          getClosestEmblaApi(activeItem.element),
        )
      },
      [config.stopEmblaAutoplay, items, rootElement],
    )

    if (!hydrated) {
      return renderComponent(
        Component,
        props as unknown as P,
        forwardedRef,
      )
    }

    return (
      <RamkaGalleryContext.Provider value={context}>
        <Lightbox.Root
          loop={config.loop}
          viewTransition={config.viewTransition}
          morphTo={config.morphTo}
          scrollTriggerIntoView={
            config.syncEmbla
              ? [
                  {
                    type: "onChange",
                    behavior: "instant",
                    inline: "center",
                  },
                  {
                    type: "onOpenComplete",
                    behavior: "instant",
                    inline: "center",
                  },
                ]
              : null
          }
          onValueChange={handleValueChange}
          onOpenChange={handleOpenChange}
        >
          {renderComponent(
            Component,
            props as unknown as P,
            mergedRootRef,
          )}
          <RamkaPortal items={items} config={config} />
        </Lightbox.Root>
      </RamkaGalleryContext.Provider>
    )
  })

  CanvasOverride.displayName = `withRamkaGalleryCanvas(${displayName})`
  PreviewOverride.displayName = `withRamkaGalleryPreview(${displayName})`

  return (RenderTarget.current() === RenderTarget.canvas
    ? CanvasOverride
    : PreviewOverride) as unknown as ComponentType<P>
}

function createTriggerOverride<P extends object>(
  Component: ComponentType<P>,
): ComponentType<P> {
  const displayName = Component.displayName ?? Component.name ?? "Component"

  const CanvasOverride = forwardRef<unknown, P>((props, ref) =>
    renderComponent(Component, props as unknown as P, ref),
  )

  const PreviewOverride = forwardRef<unknown, P>((props, forwardedRef) => {
    const hydrated = useHydrated()
    const gallery = useContext(RamkaGalleryContext)
    const claimTriggerIndex = gallery?.claimTriggerIndex
    const registerTrigger = gallery?.registerTrigger
    const refreshTrigger = gallery?.refreshTrigger
    const triggerId = useId()
    const [element, setElement] = useState<HTMLElement | null>(null)
    const [emblaIndex, setEmblaIndex] = useState<number | undefined>()
    const resolvedEmblaIndexRef = useRef<number | undefined>()
    const [triggerReady, setTriggerReady] = useState(false)
    const triggerStateRef = useRef<{
      imageRef: (node: HTMLImageElement | null) => void
      morphRef: (node: HTMLElement | null) => void
    } | null>(null)
    const layerProps = props as P & FramerLayerProps

    // Claim a unique index synchronously on the first gallery render. Waiting
    // for the DOM registry made every Framer trigger briefly mount at index 0;
    // Ramka could then retain a stale morph target for that index.
    const claimedIndex = claimTriggerIndex?.(triggerId) ?? 0
    const index =
      emblaIndex ?? resolvedEmblaIndexRef.current ?? claimedIndex
    const item = gallery?.items.find((entry) => entry.id === triggerId)

    const syncEmblaIndex = useCallback((node: HTMLElement) => {
      const nextIndex = resolveEmblaSlideIndex(node)
      if (nextIndex === undefined) return
      resolvedEmblaIndexRef.current = nextIndex
      setEmblaIndex((current) =>
        current === nextIndex ? current : nextIndex,
      )
    }, [])

    const mergedRef = useCallback(
      (node: unknown) => {
        const nextElement = node instanceof HTMLElement ? node : null
        setElement(nextElement)
        if (nextElement) {
          syncEmblaIndex(nextElement)
          setTriggerReady(true)
        }
        assignRef(forwardedRef, node)
      },
      [forwardedRef, syncEmblaIndex],
    )

    const probeRef = useCallback(
      (node: HTMLSpanElement | null) => {
        if (!node) return
        syncEmblaIndex(node)
        setTriggerReady(true)
      },
      [syncEmblaIndex],
    )

    useLayoutEffect(() => {
      if (!element || typeof window === "undefined") return
      if (!element.closest(".kniff-embla__viewport")) return

      syncEmblaIndex(element)
      const frame = window.requestAnimationFrame(() =>
        syncEmblaIndex(element),
      )
      return () => window.cancelAnimationFrame(frame)
    }, [element, syncEmblaIndex])

    useLayoutEffect(() => {
      if (!registerTrigger || !element) return
      return registerTrigger(triggerId, index, element)
    }, [element, index, registerTrigger, triggerId])

    useEffect(() => {
      if (
        !refreshTrigger ||
        !element ||
        typeof MutationObserver === "undefined"
      ) {
        return
      }

      const refresh = () => refreshTrigger(triggerId, index, element)
      const observer = new MutationObserver(refresh)
      observer.observe(element, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: [
          "src",
          "srcset",
          "sizes",
          "alt",
          "style",
          "class",
        ],
      })
      element.addEventListener("load", refresh, true)

      return () => {
        observer.disconnect()
        element.removeEventListener("load", refresh, true)
      }
    }, [element, index, refreshTrigger, triggerId])

    useLayoutEffect(() => {
      const triggerState = triggerStateRef.current
      if (!triggerState) return
      triggerState.imageRef(item?.imageElement ?? null)
      triggerState.morphRef(item?.morphElement ?? element)

      return () => {
        triggerState.imageRef(null)
        triggerState.morphRef(null)
      }
    }, [element, item])

    if (!hydrated || !gallery) {
      return renderComponent(
        Component,
        props as unknown as P,
        forwardedRef,
      )
    }

    // Framer only exposes an override's DOM node after it mounts. Render the
    // canvas component once without Ramka so an Embla descendant can resolve
    // its real slide index, then mount Lightbox.Trigger with that final index.
    // This avoids index swaps inside Ramka's trigger registry entirely.
    if (!triggerReady) {
      return React.createElement(
        "span",
        { ref: probeRef, style: { display: "contents" } },
        renderComponent(
          Component,
          props as unknown as P,
          forwardedRef,
        ),
      )
    }

    return (
      <Lightbox.Trigger
        id={`kniff-ramka-trigger-${triggerId.replace(/:/g, "")}`}
        index={index}
        role="button"
        tabIndex={0}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return
          event.preventDefault()
          event.currentTarget.click()
        }}
        render={renderComponent(
          Component,
          props as unknown as P,
          mergedRef,
        )}
      >
        {(state) => {
          triggerStateRef.current = state
          return layerProps.children
        }}
      </Lightbox.Trigger>
    )
  })

  CanvasOverride.displayName = `withRamkaTriggerCanvas(${displayName})`
  PreviewOverride.displayName = `withRamkaTriggerPreview(${displayName})`

  return (RenderTarget.current() === RenderTarget.canvas
    ? CanvasOverride
    : PreviewOverride) as unknown as ComponentType<P>
}

/** Makes a Framer parent the scope and runtime owner for one lightbox. */
export function withRamkaGallery<P extends object>(
  Component: ComponentType<P>,
): ComponentType<P> {
  return createGalleryOverride(Component)
}

/** Makes an existing descendant image/card a trigger in its nearest gallery. */
export function withRamkaTrigger<P extends object>(
  Component: ComponentType<P>,
): ComponentType<P> {
  return createTriggerOverride(Component)
}
