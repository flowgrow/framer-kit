import React, { forwardRef } from "react"
import { createRoot } from "react-dom/client"
import { RenderTarget } from "./framer"
import {
  withKniffCarouselBoundary,
  withKniffCarousel,
  withKniffCarouselNext,
  withKniffCarouselPrevious,
  VisibleScrollOverflowSettings,
} from "../../src/scroll-snap/index"

const Frame = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>((props, ref) => (
  <div {...props} ref={ref} />
))
const Boundary = withKniffCarouselBoundary(Frame)
const Viewport = withKniffCarousel(Frame)
const Next = withKniffCarouselNext(Frame)
const Prev = withKniffCarouselPrevious(Frame)
function Carousel({ name, children }: React.PropsWithChildren<{ name: string }>) {
  return (
    <Boundary data-instance={name} style={{ width: 240 }}>
      <Viewport data-track={name} data-framer-name="Photos" style={{ width: 240, display: "flex" }}>
        {[0, 1, 2].map((n) => (
          <div key={n} style={{ width: 240, height: 40 }}>
            {n}
          </div>
        ))}
      </Viewport>
      <VisibleScrollOverflowSettings loop={false} align="start" />
      <Prev data-prev={name}>Back</Prev>
      <Next data-next={name}>Forward</Next>
      {children}
    </Boundary>
  )
}
export function mountContextCarousels(el: HTMLElement, canvas: boolean) {
  RenderTarget.current = () => (canvas ? RenderTarget.canvas : "preview")
  createRoot(el).render(
    <>
      <Carousel name="outer">
        <Carousel name="inner" />
      </Carousel>
      <Carousel name="sibling" />
    </>,
  )
}
