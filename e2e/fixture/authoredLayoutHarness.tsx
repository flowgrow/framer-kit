import React, { forwardRef } from "react"
import { createRoot } from "react-dom/client"
import { VisibleScrollOverflowSettings } from "../../src/scroll-snap/VisibleScrollOverflowSettings"
import { withKniffCarousel } from "../../src/scroll-snap/withKniffCarousel"

const Frame = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>((props, ref) =>
  <div {...props} ref={ref} />,
)
const Carousel = withKniffCarousel(Frame)

export function mountAuthoredLayout(mount: HTMLElement, align: "start" | "center" | "end", withWrapper = true) {
  const root = createRoot(mount)
  const viewport = <Carousel aria-label="Viewport" className="framer-authored-carousel" data-testid="viewport">
    <div className="slide">One</div>
    <div className="slide">Two</div>
    <div className="slide">Three</div>
    <div className="slide">Four</div>
  </Carousel>
  root.render(
    <div aria-label="Boundary" style={{ width: "100%" }}>
      {withWrapper ? <div style={{ width: "100%" }}>{viewport}</div> : viewport}
      <VisibleScrollOverflowSettings
        containerID="Viewport" boundaryID="Boundary" align={align}
        loop={false} edgeSpace={false} showInstructions={false}
      />
    </div>,
  )
  return root
}
