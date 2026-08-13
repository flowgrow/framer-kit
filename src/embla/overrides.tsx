import { RenderTarget } from "framer"
import * as React from "react"
import {
  forwardRef,
  type ComponentType,
  type RefAttributes,
  useCallback,
  useEffect,
  useState,
} from "react"

import { useHydrated } from "../hooks/useHydrated.js"
import { useDragClickGuard } from "./interaction.js"
import {
  createEmblaWrapperStyle,
  EMBLA_CLASS,
  EMBLA_CONTAINER_CLASS,
  EMBLA_STRUCTURAL_CSS,
  EMBLA_VIEWPORT_CLASS,
} from "./styles.js"
import { useEmblaStore } from "./store.js"
import type { FramerCarouselProps } from "./types.js"
import { useEmblaInstance } from "./useEmblaInstance.js"

function cx(...classes: Array<string | undefined>): string {
  return classes.filter(Boolean).join(" ")
}

export function getCarouselId(
  props: FramerCarouselProps,
): string | undefined {
  const id = props["aria-label"] ?? props["data-framer-name"]
  return typeof id === "string" && id.trim().length > 0
    ? id.trim()
    : undefined
}

function useMissingIdWarning(id: string | undefined, overrideName: string) {
  useEffect(() => {
    if (id) return
    console.warn(
      `[framer-kit] ${overrideName} needs an aria-label or a custom Layers-panel name to connect to Carousel Settings. Rendering the original component unchanged.`,
    )
  }, [id, overrideName])
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

function createEmblaOverride<P extends object>(
  Component: ComponentType<P>,
  overrideName: "withEmbla" | "withCmsEmbla",
): ComponentType<P> {
  const displayName = Component.displayName ?? Component.name ?? "Component"

  const CanvasOverride = forwardRef<unknown, P>((props, ref) =>
    renderComponent(Component, props as unknown as P, ref),
  )

  const PreviewOverride = forwardRef<unknown, P>((props, ref) => {
    const isHydrated = useHydrated()
    const framerProps = props as P & FramerCarouselProps
    const id = getCarouselId(framerProps)
    const { config, viewportRef } = useEmblaInstance(id)
    const dragClickGuard = useDragClickGuard()

    useMissingIdWarning(id, overrideName)

    if (!isHydrated || !id || !config) {
      return renderComponent(Component, props as unknown as P, ref)
    }

    const componentProps = {
      ...props,
      className: cx(framerProps.className, EMBLA_CONTAINER_CLASS),
      ref,
    } as P & RefAttributes<unknown>

    return (
      <div
        className={EMBLA_CLASS}
        data-kniff-embla={id}
        style={createEmblaWrapperStyle(config.styles)}
      >
        <style>{EMBLA_STRUCTURAL_CSS}</style>
        <div
          {...dragClickGuard}
          className={EMBLA_VIEWPORT_CLASS}
          ref={viewportRef}
        >
          {React.createElement(Component, componentProps)}
        </div>
      </div>
    )
  })

  CanvasOverride.displayName = `${overrideName}Canvas(${displayName})`
  PreviewOverride.displayName = `${overrideName}Preview(${displayName})`

  const Override =
    RenderTarget.current() === RenderTarget.canvas
      ? CanvasOverride
      : PreviewOverride

  return Override as unknown as ComponentType<P>
}

/** Turns a regular Framer stack into an Embla carousel. */
export function withEmbla<P extends object>(
  Component: ComponentType<P>,
): ComponentType<P> {
  return createEmblaOverride(Component, "withEmbla")
}

/**
 * Turns a Framer CMS collection list into an Embla carousel.
 *
 * This remains a separate public adapter so CMS-specific compatibility can be
 * restored without changing consuming Framer files if its DOM shape changes.
 */
export function withCmsEmbla<P extends object>(
  Component: ComponentType<P>,
): ComponentType<P> {
  return createEmblaOverride(Component, "withCmsEmbla")
}

/** Hides carousel navigation when the registered carousel cannot scroll. */
export function withHideNavigationWhenNoScrollableSlides<P extends object>(
  Component: ComponentType<P>,
): ComponentType<P> {
  const displayName = Component.displayName ?? Component.name ?? "Component"

  const NavigationOverride = forwardRef<unknown, P>((props, ref) => {
    const carouselId = getCarouselId(props as P & FramerCarouselProps)
    const emblaApi = useEmblaStore((state) =>
      carouselId ? state.emblaInstances.get(carouselId) : undefined,
    )
    const [isVisible, setIsVisible] = useState(true)

    useMissingIdWarning(
      carouselId,
      "withHideNavigationWhenNoScrollableSlides",
    )

    const updateVisibility = useCallback(() => {
      setIsVisible(
        emblaApi ? emblaApi.canScrollPrev() || emblaApi.canScrollNext() : true,
      )
    }, [emblaApi])

    useEffect(() => {
      if (!emblaApi) {
        setIsVisible(true)
        return
      }

      updateVisibility()
      emblaApi.on("select", updateVisibility)
      emblaApi.on("reInit", updateVisibility)
      emblaApi.on("slidesChanged", updateVisibility)

      return () => {
        emblaApi.off("select", updateVisibility)
        emblaApi.off("reInit", updateVisibility)
        emblaApi.off("slidesChanged", updateVisibility)
      }
    }, [emblaApi, updateVisibility])

    if (!isVisible) return null
    return renderComponent(Component, props as unknown as P, ref)
  })

  NavigationOverride.displayName = `withHideNavigationWhenNoScrollableSlides(${displayName})`
  return NavigationOverride as unknown as ComponentType<P>
}
