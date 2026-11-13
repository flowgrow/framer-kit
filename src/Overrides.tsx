import * as React from "react"
import type { ComponentType } from "react"
import { RenderTarget } from "framer"
// @ts-ignore Framer's checker does not resolve local code-file imports.
import { carouselContextOverrides } from "./carousel/carouselContext.tsx"
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
