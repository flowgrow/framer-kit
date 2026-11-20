// @ts-ignore Framer cannot resolve local code-file imports.
import { CarouselContext } from "./carouselContext.tsx"
// @ts-ignore Framer cannot resolve local code-file imports.
import { useSlideGroups } from "../hooks/useSlideGroups.ts"
// @ts-ignore Framer cannot resolve local code-file imports.
import { useReactLoop } from "../hooks/useReactLoop.ts"
// @ts-ignore Framer cannot resolve local code-file imports.
import { useAutoMove } from "../hooks/useAutoMove.ts"
// @ts-ignore Framer cannot resolve local code-file imports.
import type { KniffCarouselSettingsProps } from "./KniffCarouselSettings.tsx"
// @ts-ignore Framer cannot resolve local code-file imports.
import { cssTransform, previousSlideEffect, slideBoxes, snapPosition } from "./snapGeometry.ts"
import { useContext, useLayoutEffect, useRef } from "react"

function target(id: string) {
  const value = JSON.stringify(id.trim()).replace(/</g, "\\3c ")
  return `:is([aria-label=${value}], [data-framer-name=${value}]:not([aria-label]))`
}
export function CarouselPreviewSettings({
  containerID = "Percentage Sized Carousel",
  align = "center",
  fullBleed = true,
  slideBy = 1,
  slideByAuto = false,
  edgeSpace = true,
  loop = true,
  autoMove = "none",
  slideTransforms,
  customTransition = false,
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
    scope?.viewportSelector ?? (containerID.trim() ? target(containerID) : "")
  const boundary = scope?.boundarySelector ?? "body"
  const registeredViewport: HTMLElement | null =
    scope?.viewport ??
    (typeof document !== "undefined" && viewportSelector
      ? ((styleRef.current?.closest(boundary) ?? document).querySelector(
          viewportSelector,
        ) as HTMLElement | null)
      : null)
  const includeEdgeSpace = loop || edgeSpace
  useSlideGroups(
    styleRef,
    viewportSelector,
    registeredViewport,
    slideByAuto ? "auto" : slideBy,
    align,
    loop,
    edgeSpace,
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
  const previousEffect = previousSlideEffect(slideTransforms)
  const previous = cssTransform(previousEffect, perspective)
  const current = cssTransform(slideTransforms?.current, perspective)
  const next = cssTransform(slideTransforms?.next, perspective)
  const previousOpacity = previousEffect?.opacity ?? 1
  const currentOpacity = slideTransforms?.current?.opacity ?? 1
  const nextOpacity = slideTransforms?.next?.opacity ?? 1
  const hasTransform = Boolean(previous || current || next)
  const hasOpacity = previousOpacity !== 1 || currentOpacity !== 1 || nextOpacity !== 1
  const transformEnabled = slideTransforms?.enabled && (hasTransform || hasOpacity)
  useLayoutEffect(() => {
    if (!viewportSelector) return
    const scope = styleRef.current?.closest(boundary)
    const el: HTMLElement | null = registeredViewport ?? scope?.querySelector(viewportSelector)
    if (!el) return
    let slides: HTMLElement[] = []
    let points: number[] = []
    const candidates = new Set<Element>()
    let discoveryDirty = true
    const animations = new Map<HTMLElement, Animation>()
    const opacities = [previousOpacity, currentOpacity, nextOpacity]
    const keyframes = [previous, current, next].map((transform, index) => ({
      ...(hasTransform && { transform: transform || "none" }),
      ...(hasOpacity && { opacity: opacities[index] }),
    }))
    const release = (slide: HTMLElement) => {
      animations.get(slide)?.cancel()
      animations.delete(slide)
      delete slide.dataset.kniffSlidePosition
    }
    let frame = 0
    let dirty = true
    // WebKit snaps to transformed boxes, so effects would move their own snap targets
    // while scrolling. Snap to untransformed markers that mirror each slide's layout box.
    const markers = new Map<HTMLElement, HTMLSpanElement>()
    const syncMarkers = () => {
      if (!el.hasAttribute("data-kniff-snap-markers")) el.setAttribute("data-kniff-snap-markers", "")
      const live = new Set(slides)
      for (const [slide, marker] of markers)
        if (!live.has(slide)) {
          marker.remove()
          markers.delete(slide)
          delete slide.dataset.kniffSnapAlign
        }
      for (const slide of slides) {
        let marker = markers.get(slide)
        if (!marker) {
          marker = document.createElement("span")
          marker.setAttribute("data-kniff", "")
          marker.setAttribute("data-kniff-snap-marker", "")
          marker.setAttribute("aria-hidden", "true")
          el.append(marker)
          markers.set(slide, marker)
        }
        const snap = slide.style.getPropertyValue("scroll-snap-align") || align
        if (slide.dataset.kniffSnapAlign !== snap) slide.dataset.kniffSnapAlign = snap
        const values: [string, string][] = [
          ["left", `${slide.offsetLeft}px`],
          ["width", `${slide.offsetWidth}px`],
          ["scroll-snap-align", snap],
          ["scroll-margin-right", slide.style.getPropertyValue("scroll-margin-right")],
        ]
        for (const [property, value] of values)
          if (marker.style.getPropertyValue(property) !== value) marker.style.setProperty(property, value)
      }
    }
    const position = el.style.position
    const needsPosition = getComputedStyle(el).position === "static"
    if (needsPosition) el.style.position = "relative"
    const refresh = () => {
      frame = 0
      if (discoveryDirty) {
        candidates.clear()
        const updated: HTMLElement[] = slideBoxes(el, (s: HTMLElement) => candidates.add(s)).filter(
          (s: HTMLElement) => !s.hasAttribute("data-kniff"),
        )
        const changed = new Set(updated)
        slides
          .filter((s) => !changed.has(s))
          .forEach((s) => {
            resize.unobserve(s)
            release(s)
          })
        for (const s of updated) {
          if (transformEnabled && !animations.has(s)) {
            s.dataset.kniffSlidePosition = "current"
            const animation = s.animate(keyframes, { duration: 2, fill: "both" })
            animation.pause()
            animations.set(s, animation)
          }
          if (!slides.includes(s)) resize.observe(s)
        }
        slides = updated
        discoveryDirty = false
      }
      if (dirty) {
        if (transformEnabled) syncMarkers()
        points = slides.map((s) => snapPosition(el, s))
        dirty = false
      }
      const left = el.scrollLeft
      let right = points.findIndex((point) => point >= left)
      if (right < 0 || (left > 0 && left >= el.scrollWidth - el.clientWidth - 1))
        right = points.length - 1
      const lower = Math.max(0, right - 1)
      const span = points[right]! - points[lower]!
      const fraction = span > 0 ? Math.max(0, Math.min(1, (left - points[lower]!) / span)) : 1
      const position = lower + (right - lower) * fraction
      slides.forEach((s, i) => {
        // Sample previous/current/next at times 0/1/2 using the physical slide index, including loop copies.
        const time = Math.max(0, Math.min(2, 1 + i - position))
        const animation = animations.get(s)
        if (animation && animation.currentTime !== time) animation.currentTime = time
        const role =
          i < Math.round(position) ? "previous" : i === Math.round(position) ? "current" : "next"
        if (s.dataset.kniffSlidePosition !== role) s.dataset.kniffSlidePosition = role
      })
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(refresh)
    }
    const reposition = () => {
      cancelAnimationFrame(frame)
      discoveryDirty = true
      dirty = true
      refresh()
    }
    const invalidate = () => {
      dirty = true
      schedule()
    }
    const invalidateDiscovery = () => {
      discoveryDirty = true
      invalidate()
    }
    const resize = new ResizeObserver((entries) => {
      if (entries.some(({ target }) => target === el)) invalidateDiscovery()
      else invalidate()
    })
    const inlineLayout = (value: string | null) =>
      (value ?? "")
        .split(";")
        .map((declaration) => declaration.trim())
        .filter(
          (declaration) =>
            declaration &&
            !/^(?:opacity|filter|pointer-events|cursor|scroll-snap-type|scroll-behavior)\s*:/i.test(
              declaration,
            ),
        )
        .join(";")
    const inlineDisplay = (value: string | null) =>
      value?.match(/(?:^|;)\s*display\s*:[^;]*/gi)?.join(";") ?? ""
    const mutations = new MutationObserver((records) => {
      for (const { type, target, attributeName, oldValue } of records) {
        if (
          type === "childList" ||
          (attributeName !== "class" && attributeName !== "style" && attributeName !== "hidden")
        ) {
          invalidateDiscovery()
          return
        }
        if (target !== el && !candidates.has(target as Element)) continue
        const style = (target as Element).getAttribute("style")
        if (attributeName !== "style" || inlineDisplay(oldValue) !== inlineDisplay(style)) {
          invalidateDiscovery()
          return
        }
        if (inlineLayout(oldValue) !== inlineLayout(style)) invalidate()
      }
    })
    window.addEventListener("resize", invalidateDiscovery)
    mutations.observe(el, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeOldValue: true,
      attributeFilter: [
        "class",
        "style",
        "hidden",
        "data-kniff",
        "data-kniff-ignore-slide",
        "data-kniff-ramka-settings",
        "data-kniff-preview-settings",
        "data-kniff-carousel-settings",
      ],
    })
    resize.observe(el)
    el.addEventListener("kniff-loop-reposition", reposition)
    el.addEventListener("scroll", schedule, { passive: true })
    refresh()
    return () => {
      mutations.disconnect()
      resize.disconnect()
      window.removeEventListener("resize", invalidateDiscovery)
      el.removeEventListener("kniff-loop-reposition", reposition)
      el.removeEventListener("scroll", schedule)
      cancelAnimationFrame(frame)
      slides.forEach(release)
      for (const [slide, marker] of markers) {
        marker.remove()
        delete slide.dataset.kniffSnapAlign
      }
      el.removeAttribute("data-kniff-snap-markers")
      if (needsPosition) el.style.position = position
    }
  }, [
    registeredViewport,
    viewportSelector,
    boundary,
    transformEnabled,
    align,
    previous,
    current,
    next,
    previousOpacity,
    currentOpacity,
    nextOpacity,
    hasTransform,
    hasOpacity,
  ])
  if (!viewportSelector) return null
  const viewport = viewportSelector
  // Relative selectors stay inside the viewport's native CSS nesting block.
  const cycle = ":where([data-kniff-loop-original], [data-kniff-loop-copy])"
  const slides = `
  > :where(:not(.ssr-variant, [data-kniff-snap-marker], [data-kniff-loop-original], [data-kniff-loop-copy], [data-kniff-ssr-loop-copy])),
  > :where(.ssr-variant) > *,
  > ${cycle} > :where(:not(.ssr-variant)),
  > ${cycle} > :where(.ssr-variant) > *`
  const content =
    ":not(style, script, [data-kniff], [data-kniff-ramka-settings], :has([data-kniff-ramka-settings]), [data-kniff-ignore-slide], :has([data-kniff-ignore-slide]))"
  const edgeSlide = (which: "first" | "last") => {
    const attr = which === "first" ? "[data-kniff-first-slide]" : "[data-kniff-last-slide]"
    const item = `:nth-${which === "first" ? "" : "last-"}child(1 of ${content}:not([data-kniff-loop-original], [data-kniff-loop-copy], [data-kniff-ssr-loop-copy]))`
    return `
  > ${attr},
  > .ssr-variant > ${attr},
  > [data-kniff-loop-original] > ${attr},
  > [data-kniff-loop-original] > .ssr-variant > ${attr},
  > ${item}:not(.ssr-variant),
  > .ssr-variant${item} > ${content},
  > ${cycle} > ${item}:not(.ssr-variant),
  > ${cycle} > .ssr-variant${item} > ${content}`
  }
  const firstSlide = edgeSlide("first")
  const lastSlide = edgeSlide("last")
  const boundaryCSS = fullBleed
    ? `${boundary} {
  container-type: inline-size;
}
${boundary} ${viewport} {
  --kniff-bleed-page-span: 100vw;
}`
    : ""
  const ssrSlideWidth = "var(--kniff-slide-width, var(--kniff-first-slide-width, 0px))"
  const ssrLastSlideWidth = "var(--kniff-slide-width, var(--kniff-last-slide-width, 0px))"
  const ssrFirstMargin =
    align !== "start"
      ? `max(0px, calc((100% - ${ssrSlideWidth}) * ${align === "end" ? 1 : 0.5}))`
      : "0px"
  const ssrLeadX =
    align === "start"
      ? "var(--kniff-pad-left, 0px)"
      : `calc(var(--kniff-pad-left, 0px) + max(0px, calc((var(--kniff-lead-box) - var(--kniff-lead-first)) * ${align === "end" ? 1 : 0.5})))`
  const firstSlideMargin = includeEdgeSpace && !loop ? ssrFirstMargin : "0px"
  const lastSlideMargin =
    includeEdgeSpace && !loop && align !== "end"
      ? `max(0px, calc((100% - ${ssrLastSlideWidth}) * ${align === "start" ? 1 : 0.5}))`
      : "0px"
  const effectDecls = (transform: string, opacity: number) =>
    `${hasTransform ? `transform: ${transform || "none"} !important;` : ""}${hasOpacity ? ` opacity: ${opacity} !important;` : ""}`
  const ssrEffectsCSS = transformEnabled
    ? `
  ${slides} {
    &:not([data-kniff-slide-position], [data-kniff], [data-kniff-ignore-slide], :has([data-kniff-ignore-slide])) {
      ${effectDecls(next, nextOpacity)}
    }
  }
  ${firstSlide} {
    &:not([data-kniff-slide-position]) {
      z-index: 1 !important;
      ${effectDecls(current, currentOpacity)}
    }
  }
  > :is([data-kniff-ssr-loop-copy], [data-kniff-loop-copy]:has(~ [data-kniff-loop-original])) > :where(:not(.ssr-variant)),
  > :is([data-kniff-ssr-loop-copy], [data-kniff-loop-copy]:has(~ [data-kniff-loop-original])) > :where(.ssr-variant) > * {
    &:not([data-kniff-slide-position], [data-kniff], [data-kniff-ignore-slide], :has([data-kniff-ignore-slide])) {
      ${effectDecls(previous, previousOpacity)}
    }
  }`
    : ""
  const css = `
div[data-framer-name]:has(> style[data-kniff-preview-settings]) {
  display: none !important;
}
@property --kniff-bleed-page-span {
  syntax: "<length>";
  inherits: true;
  initial-value: 0px;
}
${boundaryCSS}
${viewport} {
  --kniff-slide-transition: ${customTransition ? JSON.stringify(slideTransition) : "initial"};
  --kniff-initial-align: ${align};
  --kniff-initial-position: ${align === "start" ? "0%" : align === "end" ? "100%" : "50%"};
  position: relative;
  display: flex !important;
  flex-wrap: nowrap !important;
  box-sizing: border-box;
  min-width: 0;
  ${
    fullBleed
      ? `flex: none !important;
  width: var(--kniff-bleed-page-span) !important;
  max-width: none !important;
  margin-inline: calc((100% - var(--kniff-bleed-page-span)) / 2) !important;
  --kniff-content-width: min(100cqw, var(--kniff-authored-width, 100cqw), var(--kniff-authored-max-width, 100cqw));
  --kniff-gutter: calc((var(--kniff-bleed-page-span) - var(--kniff-content-width)) / 2);
  --kniff-pad-left: calc(var(--kniff-authored-padding-left, 0px) + var(--kniff-gutter));
  --kniff-pad-right: calc(var(--kniff-authored-padding-right, 0px) + var(--kniff-gutter));
  padding-left: var(--kniff-pad-left) !important;
  padding-right: var(--kniff-pad-right) !important;`
      : `--kniff-gutter: 0px;
  --kniff-pad-left: var(--kniff-authored-padding-left, 0px);
  --kniff-pad-right: var(--kniff-authored-padding-right, 0px);`
  }
  overflow-x: auto !important;
  overflow-y: hidden !important;
  overscroll-behavior-x: none;
  overflow-anchor: none;
  justify-content: flex-start !important;
  scroll-snap-type: x mandatory;
  scroll-padding-left: var(--kniff-pad-left);
  scroll-padding-right: var(--kniff-pad-right);
  scrollbar-width: none !important;

  > [data-kniff-ssr-loop-copy] {
    display: none !important;
  }
  > [data-kniff-snap-marker] {
    position: absolute !important;
    top: 0;
    height: 1px;
    opacity: 0;
    pointer-events: none;
    scroll-snap-stop: always;
  }
  &[data-kniff-snap-markers] {
    ${slides} {
      scroll-snap-align: none !important;
    }
  }
  ${slides} {
    flex-shrink: 0 !important;
    &[data-kniff-slide-position="current"] { z-index: 1 !important; }
    scroll-snap-align: ${align};
    scroll-snap-stop: always;
    &[data-kniff-ignore-slide], &:has([data-kniff-ignore-slide]) { scroll-snap-align: none !important; }
  }
  ${firstSlide} {
    margin-inline-start: ${firstSlideMargin};
  }
  ${lastSlide} {
    margin-inline-end: ${lastSlideMargin};
  }
  ${ssrEffectsCSS}
  ${
    loop
      ? `
  /* Before hydration, align the first slide in-flow and position the leading loop copy absolutely. */
  &:not([data-kniff-loop]):not(:has(> [data-kniff-loop-copy])) {
    ${
      align !== "start"
        ? `${firstSlide} {
      margin-inline-start: ${ssrFirstMargin};
    }`
        : ""
    }
    > [data-kniff-ssr-loop-copy] {
      --kniff-lead-box: calc(100% - var(--kniff-pad-left, 0px) - var(--kniff-pad-right, 0px));
      --kniff-lead-first: calc(var(--kniff-lead-box) * var(--kniff-ssr-first-pct, 0) + var(--kniff-ssr-first-px, 0px));
      --kniff-lead-x: ${ssrLeadX};
      display: flex !important;
      position: absolute !important;
      top: var(--kniff-pt, 0px) !important;
      bottom: var(--kniff-pb, 0px) !important;
      right: calc(100% - var(--kniff-lead-x) + var(--kniff-gap, 0px)) !important;
      left: auto !important;
      width: var(--kniff-lead-box) !important;
      flex-direction: row !important;
      flex-wrap: nowrap !important;
      justify-content: flex-end !important;
      align-items: inherit !important;
      gap: inherit !important;
      column-gap: inherit !important;
      overflow: visible !important;
      pointer-events: none !important;
      user-select: none !important;
    }
    > [data-kniff-ssr-loop-copy] > :where(:not(.ssr-variant)),
    > [data-kniff-ssr-loop-copy] > :where(.ssr-variant) > * {
      flex-shrink: 0 !important;
      margin-inline: 0 !important;
      scroll-snap-align: none !important;
    }
  }`
      : ""
  }
  /* Retain the accepted Safari compositor workaround. */
  &[data-kniff-loop] {
    transform: translateZ(0);

    ${cycle} > *,
    ${cycle} > .ssr-variant > *,
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
