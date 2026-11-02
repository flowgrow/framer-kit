import { Lightbox, type NavigationSource } from "ramka"
import { findSnapViewport, freezeSnapViewport, syncSnapToElement } from "./carouselSync.js"
import { RamkaPortal } from "./RamkaPortal.js"
import * as React from "react"
import {
  forwardRef,
  type ComponentType,
  type RefAttributes,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"

import { useHydrated } from "../shared/useHydrated.js"
import { RamkaGalleryContext } from "./context.js"
import { defaultRamkaGalleryConfig } from "./defaults.js"
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

export function createGalleryOverride<P extends object>(
  Component: ComponentType<P>,
  inheritConfig = false,
): ComponentType<P> {
  const displayName = Component.displayName ?? Component.name ?? "Component"

  const Override = forwardRef<unknown, P>((props, forwardedRef) => {
    const parentGallery = useContext(RamkaGalleryContext)
    const hydrated = useHydrated()
    const [items, setItems] = useState<RamkaMediaItem[]>([])
    const triggerIndicesRef = useRef(new Map<string, number>())
    const nextTriggerIndexRef = useRef(0)
    const [ownConfig, setConfig] = useState<RamkaGalleryConfig>(
      defaultRamkaGalleryConfig,
    )

    const config = inheritConfig && parentGallery ? parentGallery.config : ownConfig

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

    const releaseRef = useRef<(() => void) | null>(null)
    const activeRef = useRef(false)
    const valueRef = useRef<number | null>(null)
    const release = useCallback(() => {
      releaseRef.current?.()
      releaseRef.current = null
      activeRef.current = false
      valueRef.current = null
    }, [])
    const prepareOpen = useCallback((index: number, element: HTMLElement) => {
      release()
      const viewport = findSnapViewport(element)
      if (viewport) releaseRef.current = freezeSnapViewport(viewport)
      activeRef.current = true
      valueRef.current = index
    }, [release])
    useEffect(() => release, [release])

    const handleValueChange = useCallback((index: number, metadata: { source: NavigationSource }) => {
      if (metadata.source === "trigger") {
        valueRef.current = index
        return
      }
      if (!activeRef.current || index === valueRef.current) return
      valueRef.current = index
      if (config.syncKniffCarousel) {
        const item = items.find(item => item.index === index)
        if (item) syncSnapToElement(item.element)
      }
    }, [config.syncKniffCarousel, items])

    const context = useMemo<RamkaGalleryContextValue>(
      () => ({ config, isLoopCopy: inheritConfig, prepareOpen, items, claimTriggerIndex, registerTrigger, refreshTrigger, setConfig }),
      [config, prepareOpen, items, claimTriggerIndex, registerTrigger, refreshTrigger],
    )
    const mergedRootRef = useCallback((node: unknown) => assignRef(forwardedRef, node), [forwardedRef])

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
          loop={false}
          viewTransition={true}
          morphTo="active"
          scrollTriggerIntoView={null}
          onValueChange={handleValueChange}
          onOpenChange={(nextOpen) => {
            if (!nextOpen) activeRef.current = false
          }}
          onOpenChangeComplete={(nextOpen) => {
            if (!nextOpen) release()
          }}
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

  Override.displayName = `withKniffLightboxGallery(${displayName})`

  return Override as unknown as ComponentType<P>
}

// Each React-rendered loop cycle owns its real triggers and morph targets.
// Its logical gallery contains one set of images, never all repeated cycles.
const LoopScopeFrame = forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>((props, ref) => <span {...props} ref={ref} />)
export const RamkaLoopScope = createGalleryOverride(LoopScopeFrame, true)
