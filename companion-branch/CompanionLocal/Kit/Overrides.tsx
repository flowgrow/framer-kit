import * as React from "react"
import type { ComponentType } from "react"
import { RenderTarget } from "framer"
import { MotionConfig } from "framer-motion"
// @ts-ignore Framer's checker does not resolve local code-file imports.
import { scrollToSlide } from "./carousel/snapNavigation.ts"
// @ts-ignore Framer's checker does not resolve local code-file imports.
import { snapPosition, dotSlides, isOriginalSlide } from "./carousel/snapGeometry.ts"
// @ts-ignore Framer's checker does not resolve local code-file imports.
import { CarouselContext, carouselContextOverrides } from "./carousel/carouselContext.tsx"
// @ts-ignore
import { carouselViewportOverride } from "./carousel/withKniffCarousel.tsx"
// @ts-ignore
import { carouselButtonOverrides } from "./carousel/buttonOverrides.tsx"
// @ts-ignore
import { lightboxOverrides } from "./lightbox/overrides.tsx"

// Contexts for outer frames.
export function withKniffContext(Component: ComponentType<any>): ComponentType<any> {
  return carouselContextOverrides.withKniffContextBoundary(
    lightboxOverrides.withKniffLightboxGallery(Component),
  )
}

// Viewport, triggers, and navigation.
export function withKniffCarouselViewport(Component: ComponentType<any>): ComponentType<any> {
  return carouselViewportOverride.withKniffCarousel(Component)
}

export function withKniffLightboxTrigger(Component: ComponentType<any>): ComponentType<any> {
  return lightboxOverrides.withKniffLightboxTrigger(Component)
}

export function withKniffCarouselPreviousButton(Component: ComponentType<any>): ComponentType<any> {
  return carouselButtonOverrides.withKniffCarouselPreviousButton(Component)
}

export function withKniffCarouselNextButton(Component: ComponentType<any>): ComponentType<any> {
  return carouselButtonOverrides.withKniffCarouselNextButton(Component)
}

export function withKniffCarouselHideNavigation(Component: ComponentType<any>): ComponentType<any> {
  return carouselButtonOverrides.withKniffCarouselHideNavigation(Component)
}

export function withKniffCarouselPlayButton(Component: ComponentType<any>): ComponentType<any> {
  return carouselButtonOverrides.withKniffCarouselPlayButton(Component)
}

export function withKniffCarouselProgress(Component: ComponentType<any>): ComponentType<any> {
  return carouselButtonOverrides.withKniffCarouselProgress(Component)
}

const ActiveDotContext = React.createContext<{
  active: boolean
  weight: number
  index: number
  viewport: HTMLElement
  widths: number[]
  measure: (widths: number[]) => void
} | null>(null)

function observeDots(viewport: HTMLElement, update: (count: number, position: number) => void) {
  let count = 0
  let points: number[] = []
  let frame = 0
  let dirty = true
  const observed = new Set<HTMLElement>()
  const measure = () => {
    const slides = dotSlides(viewport)
    const originals = slides.filter((slide) => isOriginalSlide(viewport, slide))
    count = originals.length
    points = slides.map((slide) => snapPosition(viewport, slide))
    const current = new Set(slides)
    for (const slide of observed) {
      if (!current.has(slide)) {
        resize.unobserve(slide)
        observed.delete(slide)
      }
    }
    for (const slide of slides) {
      if (!observed.has(slide)) {
        resize.observe(slide)
        observed.add(slide)
      }
    }
  }
  const refresh = () => {
    frame = 0
    if (dirty) {
      measure()
      dirty = false
    }
    const position = viewport.scrollLeft
    let right = points.findIndex((point) => point >= position)
    if (
      right < 0 ||
      (position > 0 && position >= viewport.scrollWidth - viewport.clientWidth - 1)
    ) {
      right = points.length - 1
    }
    const left = Math.max(0, right - 1)
    const span = points[right]! - points[left]!
    const fraction = span > 0 ? Math.max(0, Math.min(1, (position - points[left]!) / span)) : 1
    update(count, count ? (left + (right - left) * fraction) % count : 0)
  }
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(refresh)
  }
  const invalidate = () => {
    dirty = true
    schedule()
  }
  const resize = new ResizeObserver(invalidate)
  const mutations = new MutationObserver(invalidate)
  resize.observe(viewport)
  mutations.observe(viewport, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["style", "class", "hidden", "data-kniff", "data-kniff-loop-copy"],
  })
  viewport.addEventListener("kniff-groups-changed", invalidate)
  viewport.addEventListener("scroll", schedule, { passive: true })
  refresh()
  return () => {
    viewport.removeEventListener("kniff-groups-changed", invalidate)
    viewport.removeEventListener("scroll", schedule)
    cancelAnimationFrame(frame)
    resize.disconnect()
    mutations.disconnect()
  }
}

export function withKniffCarouselDotsContainer(Component: ComponentType<any>): ComponentType<any> {
  return React.forwardRef<any, any>((props, ref) => {
    const scope = React.useContext(CarouselContext) as unknown as {
      viewport: HTMLElement | null
    } | null
    const viewport = scope?.viewport
    const [dots, setDots] = React.useState({ count: 0, position: 0 })
    const [widths, measure] = React.useState<number[]>([])
    React.useLayoutEffect(() => {
      if (!viewport) return
      return observeDots(viewport, (count, position) => {
        setDots((previous) =>
          previous.count === count && previous.position === position
            ? previous
            : { count, position },
        )
      })
    }, [viewport])
    if (!scope || RenderTarget.current() === RenderTarget.canvas)
      return <Component {...props} ref={ref} />
    const template = React.Children.toArray(props.children).find(React.isValidElement)
    return (
      <Component {...props} ref={ref}>
        {viewport &&
          template &&
          Array.from({ length: dots.count }, (_, index) => (
            <ActiveDotContext.Provider
              key={index}
              value={{
                index,
                active: index === Math.round(dots.position) % dots.count,
                viewport,
                widths,
                measure,
                weight: Math.max(
                  0,
                  1 -
                    Math.min(
                      Math.abs(index - dots.position),
                      dots.count - Math.abs(index - dots.position),
                    ),
                ),
              }}
            >
              {React.cloneElement(template)}
            </ActiveDotContext.Provider>
          ))}
      </Component>
    )
  })
}

export function withKniffCarouselDot(Component: ComponentType<any>): ComponentType<any> {
  return React.forwardRef<any, any>((props, ref) => {
    const dot = React.useContext(ActiveDotContext)
    const layoutId = React.useId()
    const probes = React.useRef<HTMLSpanElement>(null)
    const measure = dot?.index === 0 ? dot.measure : undefined
    React.useLayoutEffect(() => {
      const pair = probes.current
      if (!pair || !measure) return
      const elements = Array.from(pair.children) as HTMLElement[]
      const read = () => measure(elements.map((el) => el.offsetWidth))
      const resize = new ResizeObserver(read)
      elements.forEach((el) => resize.observe(el))
      read()
      return () => resize.disconnect()
    }, [measure])
    if (!dot) return <Component {...props} ref={ref} />
    const click = (event: React.MouseEvent<HTMLElement>) => {
      props.onClick?.(event)
      if (!event.defaultPrevented) scrollToSlide(dot.viewport, dot.index)
    }
    const keyDown = (event: React.KeyboardEvent<HTMLElement>) => {
      props.onKeyDown?.(event)
      if (
        event.defaultPrevented ||
        event.target !== event.currentTarget ||
        event.currentTarget.matches("button,input,a[href]")
      )
        return
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault()
        if (!event.repeat) event.currentTarget.click()
      }
    }
    const [small, large] = dot.widths
    const width =
      small !== undefined && large !== undefined ? small + (large - small) * dot.weight : undefined
    return (
      <MotionConfig reducedMotion="always">
        {measure && (
          <span
            ref={probes}
            aria-hidden="true"
            style={{
              position: "absolute",
              visibility: "hidden",
              pointerEvents: "none",
              display: "flex",
              width: "max-content",
              overflow: "hidden",
              height: 0,
            }}
          >
            {["Default", "Active"].map((variant) => (
              <Component
                {...props}
                key={variant}
                id={undefined}
                ref={undefined}
                tabIndex={-1}
                layoutId={layoutId + variant}
                variant={variant}
              />
            ))}
          </span>
        )}
        <Component
          {...props}
          ref={ref}
          layoutId={layoutId}
          variant={dot.active ? "Active" : "Default"}
          data-kniff-dot-index={dot.index}
          style={{
            ...props.style,
            ...(width === undefined ? {} : { width }),
            "--kniff-dot-activeness": dot.weight,
          }}
          onClick={click}
          onKeyDown={keyDown}
          role={props.role ?? "button"}
          tabIndex={props.tabIndex ?? 0}
          aria-label={props["aria-label"] ?? `Go to slide ${dot.index + 1}`}
          aria-current={dot.active || undefined}
        />
      </MotionConfig>
    )
  })
}

/** Apply to CMS pagination indicators; keep them in layout but out of slide stops. */
export function withKniffCarouselIgnoreSlide(Component: ComponentType<any>): ComponentType<any> {
  return React.forwardRef<any, any>((props, ref) => (
    <Component {...props} ref={ref} data-kniff-ignore-slide="" />
  ))
}

// Identifies the branch-local implementation in published performance checks.
if (typeof window !== "undefined") {
  ;(window as any).__COMPANION_KIT_BUILD__ = "companion-local-2026-11-18-v1"
}

