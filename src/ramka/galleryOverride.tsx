import type { EmblaCarouselType } from "embla-carousel"
import { Lightbox } from "ramka"
import * as React from "react"
import {
  forwardRef,
  type ComponentType,
  type RefAttributes,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react"

import { pauseAutoplayForInteraction } from "../embla/accessoryUtils.js"
import { getClosestEmblaApi } from "../embla/domBridge.js"
import { useHydrated } from "../embla/useHydrated.js"
import { RamkaGalleryContext } from "./context.js"
import { defaultRamkaGalleryConfig } from "./defaults.js"
import { getEmblaSlideIndex } from "./embla.js"
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

export function createGalleryOverride<P extends object>(
  Component: ComponentType<P>,
): ComponentType<P> {
  const displayName = Component.displayName ?? Component.name ?? "Component"

  const Override = forwardRef<unknown, P>((props, forwardedRef) => {
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

  Override.displayName = `withRamkaGallery(${displayName})`

  return Override as unknown as ComponentType<P>
}
