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
  useRef,
  useState,
} from "react"

import { useHydrated } from "../embla/useHydrated.js"
import { RamkaGalleryContext } from "./context.js"
import { resolveEmblaSlideIndex } from "./embla.js"

interface FramerLayerProps {
  children?: React.ReactNode
}

interface FramerImageBackground {
  sizes?: string
  [key: string]: unknown
}

interface FramerImageProps {
  background?: unknown
}

/** Forces Framer's responsive image background to use its intrinsic size. */
function withIntrinsicBackgroundSize<P extends object>(props: P): P {
  const background = (props as P & FramerImageProps).background
  if (
    !background ||
    typeof background !== "object" ||
    Array.isArray(background)
  ) {
    return props
  }

  return {
    ...props,
    background: {
      ...(background as FramerImageBackground),
      sizes: "auto",
    },
  } as P
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

export function createTriggerOverride<P extends object>(
  Component: ComponentType<P>,
): ComponentType<P> {
  const displayName = Component.displayName ?? Component.name ?? "Component"

  const Override = forwardRef<unknown, P>((props, forwardedRef) => {
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
    // base component once without Ramka so an Embla descendant can resolve its
    // real slide index, then mount Lightbox.Trigger with that final index.
    // This avoids index swaps inside Ramka's trigger registry entirely.
    if (!triggerReady) {
      return React.createElement(
        "span",
        { ref: probeRef, style: { display: "contents" } },
        renderComponent(
          Component,
          withIntrinsicBackgroundSize(props as unknown as P),
          forwardedRef,
        ),
      )
    }

    const imageProps = withIntrinsicBackgroundSize(props as unknown as P)

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
          imageProps,
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

  Override.displayName = `withRamkaTrigger(${displayName})`

  return Override as unknown as ComponentType<P>
}
