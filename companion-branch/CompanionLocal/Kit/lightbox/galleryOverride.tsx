// Branch-local copy: dependencies resolved within CompanionLocal.
// @ts-ignore Remote ESM module has no Framer TypeScript declarations.
import * as Lightbox from "https://cdn.jsdelivr.net/gh/flowgrow/ramka@bbdb76a60889eaa839c0cf47607e33bf4d252a48/companion-dist/lightbox.mjs"
type NavigationSource = "trigger" | "keyboard" | "thumbnail" | "button" | "scroll" | "imperative"
// @ts-ignore Framer cannot resolve local code-file imports.
import { freezeSnapViewport, syncSnapToElement } from "./carouselSync.ts"
// @ts-ignore Framer cannot resolve local code-file imports.
import { RamkaPortal } from "./RamkaPortal.tsx"
// @ts-ignore Framer code-file import.
import { ramkaPresetCSS } from "./presetStyles.ts"
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

// @ts-ignore Framer cannot resolve local code-file imports.
import { RamkaGalleryContext } from "./context.ts"
// @ts-ignore Framer cannot resolve local code-file imports.
import { defaultRamkaGalleryConfig } from "./defaults.ts"
// @ts-ignore Framer cannot resolve local code-file imports.
import { extractRamkaMedia, isSameRamkaMedia, sortRamkaMedia } from "./media.ts"
// @ts-ignore Framer cannot resolve local code-file imports.
import type { RamkaGalleryConfig, RamkaGalleryContextValue, RamkaMediaItem } from "./types.ts"

// Keep one document stylesheet stable across gallery opens and loop scopes.
function morphCropRule(): CSSStyleRule | null {
  let style = document.querySelector<HTMLStyleElement>("style[data-kniff-morph-crop]")
  if (!style) {
    style = document.createElement("style")
    style.setAttribute("data-kniff-morph-crop", "")
    style.textContent = ':root[data-ramka-view-transition="opening"]::view-transition-new(lightbox-morph), :root[data-ramka-view-transition="closing"]::view-transition-old(lightbox-morph) { object-position: 50% 50% !important; }'
    document.head.append(style)
  }
  return (style.sheet?.cssRules[0] as CSSStyleRule) ?? null
}

function triggerCropPosition(target: HTMLElement | null): string {
  if (!target) return "50% 50%"
  const style = getComputedStyle(target)
  if (target instanceof HTMLImageElement || target instanceof HTMLVideoElement)
    return style.objectPosition
  return style.backgroundImage !== "none" ? style.backgroundPosition : "50% 50%"
}

function isOffCenterPosition(position: string): boolean {
  const normalized = position.trim().toLowerCase()
  return (
    normalized !== "50% 50%" &&
    normalized !== "center center" &&
    normalized !== "center" &&
    normalized !== "50%"
  )
}

function assignRef(ref: React.ForwardedRef<unknown>, value: unknown): void {
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

function upsertMedia(items: RamkaMediaItem[], next: RamkaMediaItem): RamkaMediaItem[] {
  const currentIndex = items.findIndex((item) => item.id === next.id)
  if (currentIndex >= 0) next = { ...next, index: items[currentIndex].index }
  if (currentIndex >= 0 && items[currentIndex] && isSameRamkaMedia(items[currentIndex], next)) {
    return items
  }

  const updated = items.filter((item) => item.id !== next.id)
  updated.push(next)
  return sortRamkaMedia(updated)
}

function ensurePresetStyle() {
  if (typeof document === "undefined" || document.querySelector("style[data-kniff-ramka-preset]")) return
  const style = document.createElement("style")
  style.setAttribute("data-kniff-ramka-preset", "")
  style.textContent = ramkaPresetCSS
  document.head.appendChild(style)
}

function createGalleryOverride<P extends object>(
  Component: ComponentType<P>,
  inheritConfig = false,
): ComponentType<P> {
  const displayName = Component.displayName ?? Component.name ?? "Component"

  const Override = forwardRef<unknown, P>((props, forwardedRef) => {
    const parentGallery = useContext(RamkaGalleryContext) as any
    const [items, updateItems] = useState<RamkaMediaItem[]>([])
    const setItems = useCallback((next: React.SetStateAction<RamkaMediaItem[]>) => React.startTransition(() => updateItems(next)), [])
    const triggerIndicesRef = useRef(new Map<string, number>())
    const nextTriggerIndexRef = useRef(0)
    const [ownConfig, updateConfig] = useState<RamkaGalleryConfig>(defaultRamkaGalleryConfig)
    const setConfig = useCallback((next: React.SetStateAction<RamkaGalleryConfig>) => React.startTransition(() => updateConfig(next)), [])

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
      (id: string, index: number, element: HTMLElement, viewport: HTMLElement | null) => {
        const media = extractRamkaMedia(id, index, element)
        if (!media) return
        if (viewport?.contains(element)) media.carouselViewport = viewport
        setItems((current) => upsertMedia(current, media))
      },
      [],
    )

    const registerTrigger = useCallback(
      (id: string, index: number, element: HTMLElement, viewport: HTMLElement | null) => {
        refreshTrigger(id, index, element, viewport)
        return () => setItems((current) => sortRamkaMedia(current.filter((item) => item.id !== id)))
      },
      [refreshTrigger],
    )

    useEffect(() => { morphCropRule(); ensurePresetStyle(); if (config.viewTransition) Lightbox.initializeMorphStyles() }, [config.viewTransition])
    const originalComposited = useRef<boolean | undefined | null>(null)
    const applyMorphCrop = useCallback(
      (index: number) => {
        if (!config.viewTransition) return
        const item = items.find((entry) => entry.index === index)
        const position = triggerCropPosition(item?.morphElement ?? null)
        const rule = morphCropRule()
        if (rule && rule.style.objectPosition !== position)
          rule.style.setProperty("object-position", position, "important")
        if (isOffCenterPosition(position)) {
          const global = window as typeof window & { __RAMKA_VT_COMPOSITED__?: boolean }
          if (originalComposited.current === null)
            originalComposited.current = global.__RAMKA_VT_COMPOSITED__
          global.__RAMKA_VT_COMPOSITED__ = false
        }
      },
      [items, config.viewTransition],
    )
    const restoreMorphCrop = useCallback(() => {
      if (originalComposited.current !== null) {
        const global = window as typeof window & { __RAMKA_VT_COMPOSITED__?: boolean }
        if (originalComposited.current === undefined) delete global.__RAMKA_VT_COMPOSITED__
        else global.__RAMKA_VT_COMPOSITED__ = originalComposited.current
        originalComposited.current = null
      }
    }, [])
    const releaseRef = useRef<(() => void) | null>(null)
    const activeRef = useRef(false)
    const valueRef = useRef<number | null>(null)
    const release = useCallback(() => {
      releaseRef.current?.()
      releaseRef.current = null
      activeRef.current = false
      valueRef.current = null
      restoreMorphCrop()
    }, [restoreMorphCrop])
    const prepareOpen = useCallback(
      (index: number, viewport: HTMLElement | null) => {
        ensurePresetStyle()
        release()
        if (viewport) releaseRef.current = freezeSnapViewport(viewport)
        activeRef.current = true
        valueRef.current = index
        applyMorphCrop(index)
      },
      [release, applyMorphCrop],
    )
    useEffect(() => release, [release])

    const handleValueChange = useCallback(
      (index: number, metadata: { source: NavigationSource }) => {
        if (metadata.source === "trigger") {
          applyMorphCrop(index)
          valueRef.current = index
          return
        }
        if (!activeRef.current || index === valueRef.current) return
        valueRef.current = index
        applyMorphCrop(index)
        const item = items.find((item) => item.index === index)
        if (config.viewTransition && item?.carouselViewport)
          syncSnapToElement(item.carouselViewport, item.element)
      },
      [items, applyMorphCrop, config.viewTransition],
    )

    const context = useMemo<RamkaGalleryContextValue>(
      () => ({
        config,
        isLoopCopy: inheritConfig,
        prepareOpen,
        items,
        claimTriggerIndex,
        registerTrigger,
        refreshTrigger,
        setConfig,
      }),
      [config, prepareOpen, items, claimTriggerIndex, registerTrigger, refreshTrigger],
    )
    const mergedRootRef = useCallback(
      (node: unknown) => assignRef(forwardedRef, node),
      [forwardedRef],
    )

    const renderedLayer = useMemo(() => renderComponent(Component, props as unknown as P, mergedRootRef), [props, mergedRootRef])

    return (
      <RamkaGalleryContext.Provider value={context}>
        <Lightbox.Root
          loop={config.loop}
          viewTransition={config.viewTransition}
          morphTo={config.morphTo}
          scrollTriggerIntoView={null}
          onValueChange={handleValueChange}
          onOpenChange={(nextOpen: boolean) => {
            if (!nextOpen) {
              // The hidden page need not scroll/repaint on every lightbox navigation.
              const item = items.find((item) => item.index === valueRef.current)
              if (!config.viewTransition && item?.carouselViewport)
                syncSnapToElement(item.carouselViewport, item.element)
              activeRef.current = false
            }
          }}
          onOpenChangeComplete={(nextOpen: boolean) => {
            if (!nextOpen) release()
          }}
        >
          {renderedLayer}
          <RamkaPortal items={items} config={config} />
        </Lightbox.Root>
      </RamkaGalleryContext.Provider>
    )
  })

  Override.displayName = `withRamkaGallery(${displayName})`

  return Override as unknown as ComponentType<P>
}

// Each React-rendered loop cycle owns its real triggers and morph targets.
// Its logical gallery contains one set of images, never all repeated cycles.
const LoopScopeFrame = forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
  (props, ref) => <span {...props} ref={ref} />,
)
export const RamkaLoopScope = createGalleryOverride(LoopScopeFrame, true)

export const galleryOverrideFactory = { createGalleryOverride }
