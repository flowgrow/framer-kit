// @ts-ignore Framer cannot resolve local code-file imports.
import { CarouselContext } from "./carouselContext.tsx"
// @ts-ignore Framer cannot resolve local code-file imports.
import { useEdgeSlideWidths } from "../hooks/useEdgeSlideWidths.ts"
// @ts-ignore Framer cannot resolve local code-file imports.
import { useReactLoop } from "../hooks/useReactLoop.ts"
// @ts-ignore Framer cannot resolve local code-file imports.
import { useAutoMove } from "../hooks/useAutoMove.ts"
// @ts-ignore Framer cannot resolve local code-file imports.
import type { KniffCarouselSettingsProps } from "./KniffCarouselSettings.tsx"
// @ts-ignore Framer cannot resolve local code-file imports.
import { cssTransform, slideBoxes, snapPosition } from "./snapGeometry.ts"
import { useContext, useLayoutEffect, useRef } from "react"

function target(id: string) {
    const value = JSON.stringify(id.trim()).replace(/</g, "\\3c ")
    return `:is([aria-label=${value}], [data-framer-name=${value}]:not([aria-label]))`
}
export function CarouselPreviewSettings({
    containerID = "Percentage Sized Carousel",
    boundaryID = "",
    align = "center",
    edgeSpace = true,
    loop = true,
    autoMove = "none",
    slideTransforms,
    slideTransition = { type: "tween", duration: 0.4, ease: "easeInOut" },
    autoMoveDelay = 8,
    autoMoveStartDelay = 0,
    autoMoveSpeed = 30,
    autoMoveDirection = "left",
    autoMoveStopOnInteraction = false,
    autoMoveStopOnLastSlide = false,
}: KniffCarouselSettingsProps) {
    const styleRef = useRef<HTMLStyleElement>(null)
    const scope = useContext(CarouselContext) as any
    const viewportSelector =
        scope?.viewportSelector ??
        (containerID.trim() ? target(containerID) : "")
    const boundary =
        scope?.boundarySelector ??
        (boundaryID.trim() ? target(boundaryID) : "body")
    const registeredViewport = scope?.viewport ?? null
    const includeEdgeSpace = loop || edgeSpace
    useEdgeSlideWidths(
        styleRef,
        viewportSelector,
        boundary,
        edgeSpace && !loop && Boolean(viewportSelector)
    )
    useReactLoop(styleRef, viewportSelector, align, loop, registeredViewport)
    useAutoMove({
        styleRef,
        registeredViewport,
        viewportSelector,
        loop,
        align,
        autoMove,
        autoMoveDelay,
        autoMoveStartDelay,
        autoMoveSpeed,
        autoMoveDirection,
        autoMoveStopOnInteraction,
        autoMoveStopOnLastSlide,
    })
    const perspective = slideTransforms?.perspective ?? 0
    const previous = cssTransform(slideTransforms?.previous, perspective)
    const current = cssTransform(slideTransforms?.current, perspective)
    const next = cssTransform(slideTransforms?.next, perspective)
    const transformEnabled = slideTransforms?.enabled && Boolean(previous || current || next)
    useLayoutEffect(() => {
        if (!transformEnabled || !viewportSelector) return
        const scope = styleRef.current?.closest(boundary)
        const el: HTMLElement | null = registeredViewport ?? scope?.querySelector(viewportSelector)
        if (!el) return
        let slides: HTMLElement[] = []
        let points: number[] = []
        const animations = new Map<HTMLElement, Animation>()
        const keyframes = [previous, current, next].map(transform => ({ transform: transform || "none" }))
        const release = (slide: HTMLElement) => {
            animations.get(slide)?.cancel()
            animations.delete(slide)
            delete slide.dataset.kniffSlidePosition
        }
        let frame = 0
        let dirty = true
        const position = el.style.position
        const needsPosition = getComputedStyle(el).position === "static"
        if (needsPosition) el.style.position = "relative"
        const refresh = () => {
            frame = 0
            if (dirty) {
                const updated: HTMLElement[] = slideBoxes(el).filter((s: HTMLElement) => !s.hasAttribute("data-kniff"))
                const changed = new Set(updated)
                slides.filter(s => !changed.has(s)).forEach(s => { resize.unobserve(s); release(s) })
                for (const s of updated) {
                    if (!animations.has(s)) {
                        s.dataset.kniffSlidePosition = "current"
                        const animation = s.animate(keyframes, { duration: 2, fill: "both" })
                        animation.pause()
                        animations.set(s, animation)
                    }
                    resize.observe(s)
                }
                slides = updated
                points = slides.map(s => snapPosition(el, s))
                dirty = false
            }
            const left = el.scrollLeft
            let right = points.findIndex(point => point >= left)
            if (right < 0 || (left > 0 && left >= el.scrollWidth - el.clientWidth - 1)) right = points.length - 1
            const lower = Math.max(0, right - 1)
            const span = points[right]! - points[lower]!
            const fraction = span > 0 ? Math.max(0, Math.min(1, (left - points[lower]!) / span)) : 1
            const position = lower + (right - lower) * fraction
            slides.forEach((s, i) => {
                // Sample previous/current/next at times 0/1/2 using the physical slide index, including loop copies.
                const time = Math.max(0, Math.min(2, 1 + i - position))
                const animation = animations.get(s)!
                if (animation.currentTime !== time) animation.currentTime = time
                const role = i < Math.round(position) ? "previous" : i === Math.round(position) ? "current" : "next"
                if (s.dataset.kniffSlidePosition !== role) s.dataset.kniffSlidePosition = role
            })
        }
        const schedule = () => { if (!frame) frame = requestAnimationFrame(refresh) }
        const invalidate = () => { dirty = true; schedule() }
        const resize = new ResizeObserver(invalidate)
        const mutations = new MutationObserver(invalidate)
        mutations.observe(el, { subtree: true, childList: true, attributes: true, attributeFilter: ["class", "style", "hidden", "data-kniff"] })
        resize.observe(el)
        el.addEventListener("scroll", schedule, { passive: true })
        refresh()
        return () => {
            mutations.disconnect()
            resize.disconnect()
            el.removeEventListener("scroll", schedule)
            cancelAnimationFrame(frame)
            slides.forEach(release)
            if (needsPosition) el.style.position = position
        }
    }, [registeredViewport, viewportSelector, boundary, transformEnabled, align, previous, current, next])
    if (!viewportSelector) return null
    const viewport = viewportSelector
    // Relative selectors stay inside the viewport's native CSS nesting block.
    const cycle = ":where([data-kniff-loop-original], [data-kniff-loop-copy])"
    const slides = `
  > :where(:not(.ssr-variant, [data-kniff-loop-original], [data-kniff-loop-copy])),
  > :where(.ssr-variant) > *,
  > ${cycle} > :where(:not(.ssr-variant)),
  > ${cycle} > :where(.ssr-variant) > *`
    const content =
        ":not(style, script, [data-kniff-ramka-settings], :has([data-kniff-ramka-settings]))"
    const edgeSlide = (which: "first" | "last") => {
        const item = `:nth-${which === "first" ? "" : "last-"}child(1 of ${content}:not([data-kniff-loop-original], [data-kniff-loop-copy]))`
        return `
  > ${item}:not(.ssr-variant),
  > .ssr-variant${item} > ${content},
  > ${cycle} > ${item}:not(.ssr-variant),
  > ${cycle} > .ssr-variant${item} > ${content}`
    }
    const firstSlide = edgeSlide("first")
    const lastSlide = edgeSlide("last")
    const boundaryCSS = `${boundary} ${viewport} {
  --kniff-bleed-page-span: 100cqw;
}`
    const firstSlideMargin =
        includeEdgeSpace && !loop && align !== "start"
            ? `calc((100% - var(--kniff-first-slide-width, 0px)) * ${align === "end" ? 1 : 0.5})`
            : "0px"
    const lastSlideMargin =
        includeEdgeSpace && !loop && align !== "end"
            ? `calc((100% - var(--kniff-last-slide-width, 0px)) * ${align === "start" ? 1 : 0.5})`
            : "0px"
    const css = `
div[data-framer-name]:has(> style[data-kniff-preview-settings]) {
  display: none !important;
}
@property --kniff-bleed-page-span {
  syntax: "<length>";
  inherits: true;
  initial-value: 0px;
}
${boundary} {
  container-type: inline-size;
}
${boundaryCSS}
${viewport} {
  --kniff-slide-transition: ${JSON.stringify(slideTransition)};
  --kniff-initial-align: ${align};
  --kniff-initial-position: ${align === "start" ? "0%" : align === "end" ? "100%" : "50%"};
  display: flex !important;
  flex-wrap: nowrap !important;
  box-sizing: border-box;
  flex: none !important;
  width: var(--kniff-bleed-page-span) !important;
  max-width: none !important;
  min-width: 0;
  margin-inline: calc((100% - var(--kniff-bleed-page-span)) / 2) !important;
  --kniff-content-width: min(100cqw, var(--kniff-authored-width, 100cqw), var(--kniff-authored-max-width, 100cqw));
  --kniff-gutter: calc((var(--kniff-bleed-page-span) - var(--kniff-content-width)) / 2);
  padding-left: calc(var(--kniff-authored-padding-left, 0px) + var(--kniff-gutter)) !important;
  padding-right: calc(var(--kniff-authored-padding-right, 0px) + var(--kniff-gutter)) !important;
  overflow-x: auto !important;
  overflow-y: hidden !important;
  overscroll-behavior-x: none;
  overflow-anchor: none;
  align-items: inherit !important;
  justify-content: flex-start !important;
  scroll-snap-type: x mandatory;
  scroll-padding-left: calc(var(--kniff-authored-padding-left, 0px) + var(--kniff-gutter));
  scroll-padding-right: calc(var(--kniff-authored-padding-right, 0px) + var(--kniff-gutter));
  scrollbar-width: none !important;

  ${slides} {
    flex-shrink: 0 !important;
    scroll-snap-align: ${align};
    scroll-snap-stop: always;
  }
  ${firstSlide} {
    margin-inline-start: ${firstSlideMargin};
  }
  ${lastSlide} {
    margin-inline-end: ${lastSlideMargin};
  }
  ${loop && align !== "start" ? `
  /* Before hydration, give the first slide the snapport's full width to align within. */
  &:not([data-kniff-loop]):not(:has(> [data-kniff-loop-copy])) {
    display: grid !important;
    grid-auto-flow: column;
    grid-auto-columns: 100%;
    justify-items: start;
    ${firstSlide} { justify-self: ${align}; }
  }` : ""}
  /* Retain the accepted Safari compositor workaround. */
  &[data-kniff-loop] {
    transform: translateZ(0);

    ${cycle} > *,
    :where(.ssr-variant) > * {
      margin-inline: 0 !important;
    }
  }
  &::-webkit-scrollbar {
    display: none !important;
  }
}
`
    return (
        <style
            ref={styleRef}
            data-kniff-preview-settings=""
            dangerouslySetInnerHTML={{ __html: css }}
        />
    )
}
