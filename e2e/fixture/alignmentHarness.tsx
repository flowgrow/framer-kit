import React, { forwardRef } from "react"
import { createRoot } from "react-dom/client"
import { RenderTarget } from "./framer"
import { carouselViewportOverride } from "../../src/carousel/withKniffCarousel"
const { withKniffCarousel } = carouselViewportOverride
import { CarouselPreviewSettings as VisibleScrollOverflowSettings } from "../../src/carousel/CarouselPreviewSettings"
const Frame = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>((props, ref) => (
    <div {...props} ref={ref} />
  )),
  Viewport = withKniffCarousel(Frame)
export function mountAlignment(
  mount: HTMLElement,
  {
    align,
    edgeSpace,
    paddingWrapper = false,
    bodyBoundary = false,
  }: {
    align: "start" | "center" | "end"
    edgeSpace: boolean
    paddingWrapper?: boolean
    bodyBoundary?: boolean
  },
) {
  RenderTarget.current = () => "preview"
  const root = createRoot(mount)
  const viewport = (
    <Viewport
      aria-label="Alignment viewport"
      id="alignment-viewport"
      style={{
        position: "relative",
        boxSizing: "border-box",
        width: "100%",
        maxWidth: 600,
        height: 180,
        padding: "20px 64px 20px 0px",
        gap: 24,
      }}
    >
      {(paddingWrapper ? ["50%", 160, 120, 180, 90] : [180, 260, 120, 340, 210]).map((width, i) => (
        <div key={i} className="ssr-variant" style={{ display: "contents" }}>
          <div
            data-slide={i}
            data-framer-name={"Slide " + i}
            style={{ flex: "none", width, height: 100, background: "steelblue" }}
          >
            Slide {i + 1}
          </div>
        </div>
      ))}
      <div style={{ position: "absolute" }}>
        <span hidden data-kniff-ramka-settings="" />
      </div>
    </Viewport>
  )
  root.render(
    <div aria-label="Alignment boundary" style={{ width: bodyBoundary ? 600 : "100%" }}>
      {paddingWrapper ? (
        <>
          <style>{`.padding-wrapper{box-sizing:border-box;width:100%;padding-inline:0}@media(max-width:1199px){.padding-wrapper{padding-inline:48px}}@media(max-width:809px){.padding-wrapper{padding-inline:24px}}`}</style>
          <div className="padding-wrapper">{viewport}</div>
        </>
      ) : (
        viewport
      )}
      <VisibleScrollOverflowSettings
        containerID="Alignment viewport"
        fullBleed
        align={align}
        edgeSpace={edgeSpace}
        loop={false}
      />
    </div>,
  )
  return root
}

export function mountIntrinsicFill(mount: HTMLElement, extraCSS = "") {
  RenderTarget.current = () => "preview"
  const style = document.createElement("style")
  style.setAttribute("data-framer-css-ssr", "")
  style.textContent =
    ".intrinsic-track{position:relative;display:flex;flex:1 0 0;width:1px;height:400px;gap:24px;padding:0;box-sizing:border-box}.intrinsic-slide{display:flex;flex-direction:column;flex:none;width:min-content;height:100%;padding-bottom:30px;box-sizing:border-box}.intrinsic-image{flex:none;width:auto;height:100%;aspect-ratio:1.5;background:steelblue}"
  style.textContent += extraCSS
  document.head.append(style)
  const root = createRoot(mount)
  root.render(
    <div aria-label="Intrinsic boundary" style={{ width: "100%", display: "flex" }}>
      <Viewport aria-label="Intrinsic viewport" id="intrinsic-viewport" className="intrinsic-track">
        {[0, 1, 2].map((i) => (
          <div key={i} className="intrinsic-slide mobile-slide" data-slide={i}>
            <div className="intrinsic-image" />
            <span>Caption</span>
          </div>
        ))}
      </Viewport>
      <VisibleScrollOverflowSettings
        containerID="Intrinsic viewport"
        fullBleed
        align="start"
        loop
      />
    </div>,
  )
  return root
}
