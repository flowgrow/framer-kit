// @ts-ignore Framer cannot resolve local code-file imports.
import { CanvasInstructions } from "../shared/CanvasInstructions.tsx"
// @ts-ignore Framer cannot resolve local code-file imports.
import { cssTransform, slideBoxes } from "./snapGeometry.ts"
// @ts-ignore Framer cannot resolve local code-file imports.
import type { KniffCarouselSettingsProps } from "./KniffCarouselSettings.tsx"
import { useId, useLayoutEffect, useRef } from "react"

function target(id: string) {
    const value = JSON.stringify(id.trim()).replace(/</g, "\\3c ")
    return `:is([aria-label=${value}], [data-framer-name=${value}]:not([aria-label]))`
}
function observeCanvasSlides(viewport: HTMLElement, start: number | undefined, anchor: string | undefined, previousFrame: Keyframe | undefined, current: Keyframe | undefined, next: Keyframe | undefined) {
    const transformed = new Map<HTMLElement, { value: Keyframe; animation: Animation }>()
    let currentSlide: HTMLElement | undefined
    let first: HTMLElement | undefined
    let last: HTMLElement | undefined
    let frame: number | undefined
    const restore: (() => void)[] = []

    function saveStyle(slide: HTMLElement, property: string) {
        const value = slide.style.getPropertyValue(property)
        const priority = slide.style.getPropertyPriority(property)
        restore.push(() => slide.style.setProperty(property, value, priority))
    }

    function refresh() {
        if (frame !== undefined) cancelAnimationFrame(frame)
        frame = undefined
        const slides: HTMLElement[] = slideBoxes(viewport)
        const eligible = slides.filter(slide =>
            slide.matches(":not([data-kniff])")
        ).sort((a, b) => Number(getComputedStyle(a).order) - Number(getComputedStyle(b).order))
        if (currentSlide !== eligible[0]) {
            currentSlide?.removeAttribute("data-kniff-canvas-current")
            currentSlide = eligible[0]
            currentSlide?.setAttribute("data-kniff-canvas-current", "")
        }
        const pendingRemoval = new Set(transformed.keys())
        eligible.forEach((slide, index) => {
            const value = index === 0 ? current : anchor && index === eligible.length - 1 ? previousFrame : next
            if (!value) return
            pendingRemoval.delete(slide)
            const previous = transformed.get(slide)
            if (previous?.value === value) return
            previous?.animation.cancel()
            const animation = slide.animate([value, value], { duration: 1, fill: "both" })
            transformed.set(slide, { value, animation })
        })
        for (const slide of pendingRemoval) {
            transformed.get(slide)!.animation.cancel()
            transformed.delete(slide)
        }
        if (start === undefined) return
        const nextFirst = eligible[0]
        const nextLast = eligible[eligible.length - 1]
        if (first !== nextFirst || last !== nextLast) {
            resize.disconnect()
            resize.observe(viewport)
            restore.splice(0).forEach(reset => reset())
            first = nextFirst
            last = nextLast
            if (first && last) {
                saveStyle(first, "margin-inline-start")
                saveStyle(last, "margin-inline-end")
                if (anchor && first !== last) {
                    saveStyle(first, "anchor-name")
                    saveStyle(last, "position-anchor")
                    saveStyle(last, "--kniff-loop-gap")
                    saveStyle(last, "--kniff-loop-width")
                    first.style.setProperty("anchor-name", anchor)
                    last.style.setProperty("position-anchor", anchor)
                    const wrapped = last
                    restore.push(() => wrapped.removeAttribute("data-kniff-canvas-wrap"))
                }
                resize.observe(first)
                if (last !== first) resize.observe(last)
            }
        }
        if (!first || !last) return
        if (anchor && first !== last) {
            // Measure in the authored flex layout before absolute positioning removes the last slide from it.
            last.removeAttribute("data-kniff-canvas-wrap")
            const width = getComputedStyle(last).width
            const gap = getComputedStyle(viewport).columnGap
            last.style.setProperty("--kniff-loop-width", width)
            last.style.setProperty("--kniff-loop-gap", gap === "normal" ? "0px" : gap)
            last.setAttribute("data-kniff-canvas-wrap", "")
        }
        const widths = [first.offsetWidth, last.offsetWidth]
        const edges = [[first, "margin-inline-start", start], [last, "margin-inline-end", 1 - start]] as const
        edges.forEach(([slide, property, factor], index) => {
            const value = `calc(${100 * factor}% - ${widths[index]! * factor}px)`
            if (slide.style.getPropertyValue(property) !== value)
                slide.style.setProperty(property, value)
        })
        mutations.takeRecords() // Ignore the margin writes from this refresh.
    }

    function schedule() {
        if (frame === undefined) frame = requestAnimationFrame(refresh)
    }
    const resize = new ResizeObserver(schedule)
    const mutations = new MutationObserver(refresh)
    refresh()
    mutations.observe(viewport, {
        subtree: true, childList: true, attributes: true,
        attributeFilter: ["class", "style", "data-kniff", "hidden"],
    })
    function stop() {
        mutations.disconnect()
        resize.disconnect()
        if (frame !== undefined) cancelAnimationFrame(frame)
        currentSlide?.removeAttribute("data-kniff-canvas-current")
        transformed.forEach(({ animation }) => animation.cancel())
        restore.forEach(reset => reset())
    }
    return { refresh, stop }
}

export function CarouselCanvasSettings(props: KniffCarouselSettingsProps) {
    const marker = useRef<HTMLStyleElement>(null)
    const name = (props.containerID ?? "Percentage Sized Carousel").trim()
    const align = props.align ?? "center"

    const anchor = "--kniff-loop-" + useId().replace(/[^a-zA-Z0-9_-]/g, "")
    const loop = props.loop !== false
    const transforms = props.slideTransforms
    const previous = transforms?.enabled ? cssTransform(transforms.previous, transforms.perspective ?? 0) : ""
    const current = transforms?.enabled ? cssTransform(transforms.current, transforms.perspective ?? 0) : ""
    const next = transforms?.enabled ? cssTransform(transforms.next, transforms.perspective ?? 0) : ""

    const previousOpacity = transforms?.enabled ? transforms.previous?.opacity ?? 1 : 1
    const currentOpacity = transforms?.enabled ? transforms.current?.opacity ?? 1 : 1
    const nextOpacity = transforms?.enabled ? transforms.next?.opacity ?? 1 : 1
    useLayoutEffect(() => {
        const keyframe = (transform: string, opacity: number): Keyframe | undefined =>
            transform || opacity !== 1 ? { ...(transform && { transform }), ...(opacity !== 1 && { opacity }) } : undefined
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
            while (scope && !scope.querySelector(selector) &&
                   !scope.matches(':has(> [data-layout-template-root="true"])')) {
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
            const overflow = ["overflow-x", "overflow-y"].map(property => ({
                property,
                value: viewport.style.getPropertyValue(property),
                priority: viewport.style.getPropertyPriority(property),
            }))
            viewport.style.setProperty("overflow", "visible", "important")
            const start = align === "start" ? 0 : align === "end" ? 1 : 0.5
            edges = observeCanvasSlides(viewport, loop || props.edgeSpace !== false ? start : undefined,
                loop && CSS.supports("right: anchor(left)") ? anchor : undefined, previousFrame, currentFrame, nextFrame)
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
    }, [name, align, loop, anchor, previous, previousOpacity, props.edgeSpace, current, next, currentOpacity, nextOpacity])
    return (
        <>
            <style ref={marker} data-kniff="" data-kniff-canvas-settings="">{`[data-kniff-canvas-current] { z-index: 1 !important; }
[data-kniff-canvas-wrap] {
    position: absolute !important;
    inset: auto !important;
    right: anchor(left) !important;
    margin-right: var(--kniff-loop-gap) !important;
    width: var(--kniff-loop-width) !important;
}`}</style>
            {props.showInstructions !== false && (
                <CanvasInstructions
                    data-kniff=""
                    data-kniff-carousel-settings=""
                    title="Carousel Settings"
                    style={props.style}
                >
                    Place these settings inside the carousel boundary. Apply
                    withKniffCarousel to the viewport and the Previous and Next
                    overrides to your buttons.
                </CanvasInstructions>
            )}
        </>
    )
}
