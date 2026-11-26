// @ts-ignore Framer cannot resolve local code-file imports.
import { CanvasInstructions } from "../shared/CanvasInstructions.tsx"
// @ts-ignore Framer cannot resolve local code-file imports.
import { cssTransform, previousSlideEffect, slideBoxes } from "./snapGeometry.ts"
// @ts-ignore Framer cannot resolve local code-file imports.
import type { KniffCarouselSettingsProps } from "./KniffCarouselSettings.tsx"
// @ts-ignore Framer cannot resolve local code-file imports.
import { groupSlideRanges, type SlideBy } from "../hooks/useSlideGroups.ts"
import { useLayoutEffect, useRef } from "react"

const WRAP_PROPS = [
  "--kniff-first-snap-offset",
  "--kniff-loop-gap",
  "--kniff-loop-width",
  "--kniff-loop-height",
] as const

export interface CanvasGroupPlan {
  groups: { start: number; end: number; width: number }[]
  currentEnd: number
  leadingMargin: string | null
  trailingMargin: string | null
  wrapped: { index: number; offset: number }[]
}

export function planCanvasGroups(
  widths: number[],
  gap: number,
  available: number,
  by: SlideBy,
  align: "start" | "center" | "end",
  loop: boolean,
  edgeSpace: boolean,
): CanvasGroupPlan | null {
  if (!widths.length) return null
  const groups = groupSlideRanges(widths, gap, available, by)
  const firstGroup = groups[0]!
  const lastGroup = groups[groups.length - 1]!
  const factor = align === "start" ? 0 : align === "end" ? 1 : 0.5
  const applyEdges = loop || edgeSpace

  const leadingMargin = !applyEdges
    ? null
    : factor === 0
      ? "0px"
      : `calc(${100 * factor}% - ${firstGroup.width * factor}px)`
  const trailingMargin =
    loop || !edgeSpace
      ? null
      : factor === 1
        ? "0px"
        : `max(0px, calc(${100 * (1 - factor)}% - ${lastGroup.width * (1 - factor)}px))`

  const wrappedIndices: number[] = []
  if (loop && groups.length > 1) {
    const lastCount = lastGroup.end - lastGroup.start
    const wrapCount =
      groups.length >= 3 || lastCount === 1 || align === "end"
        ? lastCount
        : Math.max(1, Math.floor(lastCount / 2))
    for (let i = lastGroup.end - wrapCount; i < lastGroup.end; i++) wrappedIndices.push(i)
  }

  const wrapped: { index: number; offset: number }[] = []
  let offset = gap
  for (let i = wrappedIndices.length - 1; i >= 0; i--) {
    const index = wrappedIndices[i]!
    wrapped.push({ index, offset })
    offset += widths[index]! + gap
  }
  wrapped.reverse()

  return {
    groups,
    currentEnd: firstGroup.end,
    leadingMargin,
    trailingMargin,
    wrapped,
  }
}

function px(value: string): number | undefined {
  if (!value.endsWith("px")) return undefined
  const parsed = parseFloat(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function layoutWidth(el: HTMLElement): number {
  const css = getComputedStyle(el)
  const width = px(css.width)
  if (width === undefined) return el.offsetWidth
  if (css.boxSizing === "border-box") return width
  return (
    width +
    (parseFloat(css.paddingLeft) || 0) +
    (parseFloat(css.paddingRight) || 0) +
    (parseFloat(css.borderLeftWidth) || 0) +
    (parseFloat(css.borderRightWidth) || 0)
  )
}

function contentWidth(el: HTMLElement): number {
  const css = getComputedStyle(el)
  const width = px(css.width)
  const pad = (parseFloat(css.paddingLeft) || 0) + (parseFloat(css.paddingRight) || 0)
  if (width === undefined) return Math.max(0, el.clientWidth - pad)
  if (css.boxSizing !== "border-box") return Math.max(0, width)
  const border = (parseFloat(css.borderLeftWidth) || 0) + (parseFloat(css.borderRightWidth) || 0)
  return Math.max(0, width - pad - border)
}

function target(id: string) {
  const value = JSON.stringify(id.trim()).replace(/</g, "\\3c ")
  return `:is([aria-label=${value}], [data-framer-name=${value}]:not([aria-label]))`
}

function observeCanvasSlides(
  viewport: HTMLElement,
  by: SlideBy,
  align: "start" | "center" | "end",
  loop: boolean,
  edgeSpace: boolean,
  previousFrame: Keyframe | undefined,
  current: Keyframe | undefined,
  next: Keyframe | undefined,
) {
  const transformed = new Map<HTMLElement, { value: Keyframe; animation: Animation }>()
  const currentSlides = new Set<HTMLElement>()
  const wrappedSlides = new Set<HTMLElement>()
  const observed = new Set<HTMLElement>()
  const savedStyles = new Map<HTMLElement, Map<string, [string, string]>>()
  let firstSlide: HTMLElement | undefined
  let lastSlide: HTMLElement | undefined
  let frame: number | undefined

  function setStyle(el: HTMLElement, property: string, value: string) {
    let props = savedStyles.get(el)
    if (!props) {
      props = new Map()
      savedStyles.set(el, props)
    }
    if (!props.has(property)) {
      props.set(property, [
        el.style.getPropertyValue(property),
        el.style.getPropertyPriority(property),
      ])
    }
    if (el.style.getPropertyValue(property) !== value) el.style.setProperty(property, value)
  }

  function restoreStyle(el: HTMLElement, property: string) {
    const props = savedStyles.get(el)
    const original = props?.get(property)
    if (!props || !original) return
    el.style.setProperty(property, original[0], original[1])
    props.delete(property)
    if (!props.size) savedStyles.delete(el)
  }

  function restoreAllStyles() {
    for (const slide of wrappedSlides) slide.removeAttribute("data-kniff-canvas-wrap")
    wrappedSlides.clear()
    for (const [el, props] of savedStyles) {
      for (const [property, [value, priority]] of props) {
        el.style.setProperty(property, value, priority)
      }
    }
    savedStyles.clear()
    firstSlide = undefined
    lastSlide = undefined
  }

  function refresh() {
    if (frame !== undefined) cancelAnimationFrame(frame)
    frame = undefined
    // Measure all slides in their authored flex layout before absolute wrap removes trailing slides.
    for (const slide of wrappedSlides) slide.removeAttribute("data-kniff-canvas-wrap")

    const slides: HTMLElement[] = slideBoxes(viewport)
    const eligible = slides
      .filter(
        (slide) =>
          !slide.hasAttribute("data-kniff") && !slide.querySelector("[data-kniff-canvas-settings]"),
      )
      .sort((a, b) => Number(getComputedStyle(a).order) - Number(getComputedStyle(b).order))

    const css = getComputedStyle(viewport)
    const gap = parseFloat(css.columnGap) || 0
    const available = contentWidth(viewport)
    const widths = eligible.map((slide) => layoutWidth(slide))
    const plan = planCanvasGroups(widths, gap, available, by, align, loop, edgeSpace)

    const nextCurrent = new Set(plan ? eligible.slice(0, plan.currentEnd) : [])
    for (const slide of currentSlides) {
      if (nextCurrent.has(slide)) continue
      slide.removeAttribute("data-kniff-canvas-current")
      currentSlides.delete(slide)
    }
    for (const slide of nextCurrent) {
      if (currentSlides.has(slide)) continue
      slide.setAttribute("data-kniff-canvas-current", "")
      currentSlides.add(slide)
    }

    const wrappedIndices = new Set(plan ? plan.wrapped.map((item) => item.index) : [])
    const pendingRemoval = new Set(transformed.keys())
    if (plan) {
      eligible.forEach((slide, index) => {
        const value =
          index < plan.currentEnd ? current : wrappedIndices.has(index) ? previousFrame : next
        if (!value) return
        pendingRemoval.delete(slide)
        const previous = transformed.get(slide)
        if (previous?.value === value) return
        previous?.animation.cancel()
        const animation = slide.animate([value, value], { duration: 1, fill: "both" })
        transformed.set(slide, { value, animation })
      })
    }
    for (const slide of pendingRemoval) {
      transformed.get(slide)!.animation.cancel()
      transformed.delete(slide)
    }

    const nextObserved = new Set<HTMLElement>([viewport])
    if (eligible.length) {
      if (by === 1) {
        nextObserved.add(eligible[0]!)
        nextObserved.add(eligible[eligible.length - 1]!)
      } else {
        for (const slide of eligible) nextObserved.add(slide)
      }
    }
    for (const el of observed) {
      if (nextObserved.has(el)) continue
      resize.unobserve(el)
      observed.delete(el)
    }
    for (const el of nextObserved) {
      if (observed.has(el)) continue
      resize.observe(el)
      observed.add(el)
    }

    if (!plan) {
      restoreAllStyles()
      mutations.takeRecords()
      return
    }

    const first = eligible[0]!
    const last = eligible[eligible.length - 1]!

    if (firstSlide && (firstSlide !== first || plan.leadingMargin === null)) {
      restoreStyle(firstSlide, "margin-inline-start")
    }
    if (lastSlide && (lastSlide !== last || plan.trailingMargin === null)) {
      restoreStyle(lastSlide, "margin-inline-end")
    }
    firstSlide = plan.leadingMargin !== null ? first : undefined
    lastSlide = plan.trailingMargin !== null ? last : undefined

    const nextWrapped = new Set(plan.wrapped.map(({ index }) => eligible[index]!))
    for (const slide of wrappedSlides) {
      if (nextWrapped.has(slide)) continue
      for (const prop of WRAP_PROPS) restoreStyle(slide, prop)
      wrappedSlides.delete(slide)
    }

    const wrappedBoxes = plan.wrapped.map(({ index, offset }) => {
      const slide = eligible[index]!
      const { width, height } = getComputedStyle(slide)
      return { slide, width, height, offset }
    })
    for (const { slide, width, height, offset } of wrappedBoxes) {
      setStyle(slide, "--kniff-loop-width", width)
      setStyle(slide, "--kniff-loop-height", height)
      setStyle(slide, "--kniff-loop-gap", `${offset}px`)
      slide.setAttribute("data-kniff-canvas-wrap", "")
      wrappedSlides.add(slide)
    }

    if (plan.leadingMargin !== null) setStyle(first, "margin-inline-start", plan.leadingMargin)
    if (plan.trailingMargin !== null) setStyle(last, "margin-inline-end", plan.trailingMargin)

    if (plan.wrapped.length) {
      // offsetLeft includes the snap margin and viewport padding, independent of slide effects.
      const offset = `${first.offsetLeft}px`
      for (const { index } of plan.wrapped) {
        setStyle(eligible[index]!, "--kniff-first-snap-offset", offset)
      }
    }

    mutations.takeRecords() // Ignore the margin and wrap writes from this refresh.
  }

  function schedule() {
    if (frame === undefined) frame = requestAnimationFrame(refresh)
  }
  const resize = new ResizeObserver(schedule)
  const mutations = new MutationObserver(refresh)
  refresh()
  mutations.observe(viewport, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["class", "style", "data-kniff", "data-kniff-ignore-slide", "hidden"],
  })
  function stop() {
    mutations.disconnect()
    resize.disconnect()
    if (frame !== undefined) cancelAnimationFrame(frame)
    for (const slide of currentSlides) slide.removeAttribute("data-kniff-canvas-current")
    currentSlides.clear()
    transformed.forEach(({ animation }) => animation.cancel())
    transformed.clear()
    restoreAllStyles()
  }
  return { refresh, stop }
}

export function CarouselCanvasSettings(props: KniffCarouselSettingsProps) {
  const marker = useRef<HTMLStyleElement>(null)
  const name = (
    props.canvasPreview?.viewport ??
    props.containerID ??
    "Percentage Sized Carousel"
  ).trim()
  const align = props.align ?? "center"
  const scroll = Math.max(0, Math.min(1000, props.canvasPreview?.scroll ?? 0))

  const loop = props.loop !== false
  const edgeSpace = props.edgeSpace !== false
  const by: SlideBy =
    props.slideByAuto || props.slideBy === "auto"
      ? "auto"
      : Math.max(1, Math.floor(Number(props.slideBy) || 1))
  const transforms = props.slideTransforms?.preview === false ? undefined : props.slideTransforms
  const previousEffect = previousSlideEffect(transforms)
  const previous = transforms?.enabled
    ? cssTransform(previousEffect, transforms.perspective ?? 0)
    : ""
  const current = transforms?.enabled
    ? cssTransform(transforms.current, transforms.perspective ?? 0)
    : ""
  const next = transforms?.enabled
    ? cssTransform(transforms?.next, transforms.perspective ?? 0)
    : ""

  const previousOpacity = transforms?.enabled ? (previousEffect?.opacity ?? 1) : 1
  const currentOpacity = transforms?.enabled ? (transforms.current?.opacity ?? 1) : 1
  const nextOpacity = transforms?.enabled ? (transforms?.next?.opacity ?? 1) : 1
  useLayoutEffect(() => {
    const keyframe = (transform: string, opacity: number): Keyframe | undefined =>
      transform || opacity !== 1
        ? { ...(transform && { transform }), ...(opacity !== 1 && { opacity }) }
        : undefined
    const previousFrame = keyframe(previous, previousOpacity)
    const currentFrame = keyframe(current, currentOpacity)
    const nextFrame = keyframe(next, nextOpacity)
    const node = marker.current
    if (!node || !name) return
    const selector = target(name)
    let activeViewport: HTMLElement | undefined
    let edges: ReturnType<typeof observeCanvasSlides> | undefined
    let detach: (() => void) | undefined
    const attach = () => {
      // A canvas can contain several breakpoints with the same layer names.
      let scope = node.parentElement
      while (
        scope &&
        !scope.querySelector(selector) &&
        !scope.matches(':has(> [data-layout-template-root="true"])')
      ) {
        scope = scope.parentElement
      }
      const viewport = scope?.querySelector<HTMLElement>(selector)
      if (viewport && viewport === activeViewport) {
        edges?.refresh()
        return
      }
      detach?.()
      detach = undefined
      activeViewport = viewport ?? undefined
      if (!viewport) return
      const overflow = ["overflow-x", "overflow-y", "position", "transform"].map((property) => ({
        property,
        value: viewport.style.getPropertyValue(property),
        priority: viewport.style.getPropertyPriority(property),
      }))
      if (loop && getComputedStyle(viewport).position === "static")
        viewport.style.position = "relative"
      viewport.style.setProperty(
        "overflow",
        props.fullBleed !== false ? "visible" : "hidden",
        "important",
      )
      if (scroll) viewport.style.setProperty("transform", `translateX(-${scroll}%)`, "important")
      edges = observeCanvasSlides(
        viewport,
        by,
        align,
        loop,
        edgeSpace,
        previousFrame,
        currentFrame,
        nextFrame,
      )
      detach = () => {
        edges?.stop()
        edges = undefined
        for (const { property, value, priority } of overflow)
          viewport.style.setProperty(property, value, priority)
      }
    }
    attach()
    const changed = (event: Event) => {
      if (event.target instanceof Element && event.target.matches(selector)) attach()
    }
    node.ownerDocument.addEventListener("kniff-canvas-slides", changed)
    return () => {
      node.ownerDocument.removeEventListener("kniff-canvas-slides", changed)
      detach?.()
    }
  }, [
    name,
    align,
    scroll,
    loop,
    by,
    edgeSpace,
    props.fullBleed,
    previous,
    previousOpacity,
    current,
    next,
    currentOpacity,
    nextOpacity,
  ])
  return (
    <>
      <style
        ref={marker}
        data-kniff=""
        data-kniff-canvas-settings=""
      >{`[data-kniff-canvas-current] { z-index: 1 !important; }
[data-kniff-canvas-wrap] {
    position: absolute !important;
    inset: auto !important;
    right: 100% !important;
    margin-right: calc(var(--kniff-loop-gap) - var(--kniff-first-snap-offset)) !important;
    width: var(--kniff-loop-width) !important;
    height: var(--kniff-loop-height) !important;
}`}</style>
      {(props.canvasPreview?.instructions ?? props.showInstructions) !== false && (
        <CanvasInstructions
          data-kniff=""
          data-kniff-carousel-settings=""
          title="Carousel Settings"
          style={props.style}
        >
          Place these settings inside the carousel boundary. Apply withKniffCarousel to the viewport
          and the Previous and Next overrides to your buttons.
        </CanvasInstructions>
      )}
    </>
  )
}
