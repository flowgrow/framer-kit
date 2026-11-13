import * as React from "react"
import type { ComponentType } from "react"
import { RenderTarget } from "framer"
// @ts-ignore Framer's checker does not resolve local code-file imports.
import { snapPosition, slideBoxes } from "./carousel/snapGeometry.ts"
// @ts-ignore Framer's checker does not resolve local code-file imports.
import { CarouselContext, carouselContextOverrides } from "./carousel/carouselContext.tsx"
// @ts-ignore
import { carouselViewportOverride } from "./carousel/withKniffCarousel.tsx"
// @ts-ignore
import { carouselButtonOverrides } from "./carousel/buttonOverrides.tsx"
// @ts-ignore
import { lightboxOverrides } from "./lightbox/overrides.tsx"

// Contexts for outer frames.
export function withKitContext(Component: ComponentType<any>): ComponentType<any> {
  return carouselContextOverrides.withKniffCarouselBoundary(
    lightboxOverrides.withKniffLightboxGallery(Component),
  )
}

export function withCarouselContext(Component: ComponentType<any>): ComponentType<any> {
  return carouselContextOverrides.withKniffCarouselBoundary(Component)
}

export function withLightboxContext(Component: ComponentType<any>): ComponentType<any> {
  return lightboxOverrides.withKniffLightboxGallery(Component)
}

// Viewport, triggers, and navigation.
export function withCarouselViewport(Component: ComponentType<any>): ComponentType<any> {
  return carouselViewportOverride.withKniffCarousel(Component)
}

export function withKitLightboxTrigger(Component: ComponentType<any>): ComponentType<any> {
  return lightboxOverrides.withKniffLightboxTrigger(Component)
}

export function withKitCarouselPrevious(Component: ComponentType<any>): ComponentType<any> {
  return carouselButtonOverrides.withKniffCarouselPrevious(Component)
}

export function withKitCarouselNext(Component: ComponentType<any>): ComponentType<any> {
  return carouselButtonOverrides.withKniffCarouselNext(Component)
}

// Used by /tmp/carousel-context-probe.
const ProbeContext = React.createContext<string | null>(null)
export function withProbeProvider(Component: ComponentType<any>): ComponentType<any> {
  return React.forwardRef<any, any>((props, ref) => (
    <ProbeContext.Provider value="kniff-context-ok">
      <Component {...props} ref={ref} />
    </ProbeContext.Provider>
  ))
}

export function withProbeReader(Component: ComponentType<any>): ComponentType<any> {
  return React.forwardRef<any, any>((props, ref) => {
    const found = React.useContext(ProbeContext) === "kniff-context-ok"
    const canvas = RenderTarget.current() === RenderTarget.canvas
    return (
      <Component
        {...props}
        ref={ref}
        data-kniff-context-result={found ? "found" : "missing"}
        data-kniff-render-target={canvas ? "canvas" : "preview"}
        style={{
          ...props.style,
          backgroundColor: found ? (canvas ? "#86efac" : "#93c5fd") : "#fca5a5",
          outline: found
            ? canvas
              ? "4px solid #15803d"
              : "4px solid #1d4ed8"
            : "4px solid #dc2626",
        }}
      />
    )
  })
}

export function withAutoMovePlayButton(Component: ComponentType<any>): ComponentType<any> {
  return carouselButtonOverrides.withAutoMovePlayButton(Component)
}

export function withAutoMoveProgress(Component: ComponentType<any>): ComponentType<any> {
  return carouselButtonOverrides.withAutoMoveProgress(Component)
}

const ActiveDotContext = React.createContext<boolean | null>(null)

function observeDots(viewport: HTMLElement, update: (count: number, active: number) => void) {
  let count = 0
  let points: number[] = []
  let frame = 0
  let dirty = true
  const observed = new Set<HTMLElement>()
  const measure = () => {
    const slides: HTMLElement[] = slideBoxes(viewport).filter((slide: HTMLElement) => !slide.hasAttribute("data-kniff"))
    const originals = slides.filter(slide => slide.closest("[data-kniff-loop-copy]")?.parentElement !== viewport)
    count = originals.length
    points = slides.map(slide => snapPosition(viewport, slide))
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
    const atEnd = position > 0 && position >= viewport.scrollWidth - viewport.clientWidth - 1
    let nearest = 0
    for (let i = 1; i < points.length; i++) {
      const distance = Math.abs(points[i] - position)
      const previous = Math.abs(points[nearest] - position)
      if (distance < previous || (distance === previous && atEnd)) nearest = i
    }
    update(count, count ? nearest % count : -1)
  }
  const schedule = () => { if (!frame) frame = requestAnimationFrame(refresh) }
  const invalidate = () => { dirty = true; schedule() }
  const resize = new ResizeObserver(invalidate)
  const mutations = new MutationObserver(invalidate)
  resize.observe(viewport)
  mutations.observe(viewport, { childList: true, subtree: true, attributes: true,
    attributeFilter: ["style", "class", "hidden", "data-kniff", "data-kniff-loop-copy"] })
  viewport.addEventListener("scroll", schedule, { passive: true })
  refresh()
  return () => {
    viewport.removeEventListener("scroll", schedule)
    cancelAnimationFrame(frame)
    resize.disconnect()
    mutations.disconnect()
  }
}

export function withDotsContainer(Component: ComponentType<any>): ComponentType<any> {
  return React.forwardRef<any, any>((props, ref) => {
    const scope = React.useContext(CarouselContext) as unknown as { viewport: HTMLElement | null } | null
    const viewport = scope?.viewport
    const [dots, setDots] = React.useState({ count: 0, active: -1 })
    React.useLayoutEffect(() => {
      if (!viewport) return
      return observeDots(viewport, (count, active) => {
        setDots(previous => previous.count === count && previous.active === active ? previous : { count, active })
      })
    }, [viewport])
    if (!scope || RenderTarget.current() === RenderTarget.canvas) return <Component {...props} ref={ref} />
    const template = React.Children.toArray(props.children).find(React.isValidElement)
    return <Component {...props} ref={ref}>
      {viewport && template && Array.from({ length: dots.count }, (_, index) =>
        <ActiveDotContext.Provider key={index} value={index === dots.active}>
          {React.cloneElement(template)}
        </ActiveDotContext.Provider>
      )}
    </Component>
  })
}

export function withActiveDot(Component: ComponentType<any>): ComponentType<any> {
  return React.forwardRef<any, any>((props, ref) => {
    const active = React.useContext(ActiveDotContext)
    if (active === null) return <Component {...props} ref={ref} />
    return <Component {...props} ref={ref} variant={active ? "Active" : "Default"} />
  })
}
