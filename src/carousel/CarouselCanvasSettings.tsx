// @ts-ignore Framer cannot resolve local code-file imports.
import { CanvasInstructions } from "../shared/CanvasInstructions.tsx"
// @ts-ignore Framer cannot resolve local code-file imports.
import { cssTransform, slideBoxes } from "./snapGeometry.ts"
// @ts-ignore Framer cannot resolve local code-file imports.
import type { KniffCarouselSettingsProps } from "./KniffCarouselSettings.tsx"
import { useLayoutEffect, useRef } from "react"

function target(id: string) {
    const value = JSON.stringify(id.trim()).replace(/</g, "\\3c ")
    return `:is([aria-label=${value}], [data-framer-name=${value}]:not([aria-label]))`
}
function observeCanvasSlides(viewport: HTMLElement, start: number | undefined, current: string, next: string) {
    const transformed = new Map<HTMLElement, { value: string; animation: Animation }>()
    let first: HTMLElement | undefined
    let last: HTMLElement | undefined
    let frame: number | undefined
    const restore: (() => void)[] = []

    function saveMargin(slide: HTMLElement, property: string) {
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
        const pendingRemoval = new Set(transformed.keys())
        eligible.forEach((slide, index) => {
            const value = index === 0 ? current : next
            if (!value) return
            pendingRemoval.delete(slide)
            const previous = transformed.get(slide)
            if (previous?.value === value) return
            previous?.animation.cancel()
            const animation = slide.animate([{ transform: value }, { transform: value }], { duration: 1, fill: "both" })
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
            restore.splice(0).forEach(reset => reset())
            first = nextFirst
            last = nextLast
            if (first && last) {
                saveMargin(first, "margin-inline-start")
                saveMargin(last, "margin-inline-end")
                resize.observe(first)
                if (last !== first) resize.observe(last)
            }
        }
        if (!first || !last) return
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
        transformed.forEach(({ animation }) => animation.cancel())
        restore.forEach(reset => reset())
    }
    return { refresh, stop }
}

export function CarouselCanvasSettings(props: KniffCarouselSettingsProps) {
    const marker = useRef<HTMLStyleElement>(null)
    const name = (props.containerID ?? "Percentage Sized Carousel").trim()
    const boundary = props.boundaryID?.trim()
    const align = props.align ?? "center"

    const transforms = props.slideTransforms
    const current = transforms?.enabled ? cssTransform(transforms.current, transforms.perspective ?? 0) : ""
    const next = transforms?.enabled ? cssTransform(transforms.next, transforms.perspective ?? 0) : ""

    useLayoutEffect(() => {
        const node = marker.current
        if (!node || !name) return
        const selector = target(name)
        let activeViewport: HTMLElement | undefined
        let edges: ReturnType<typeof observeCanvasSlides> | undefined
        let detach: (() => void) | undefined
        const attach = () => {
            // A canvas can contain several breakpoints with the same layer names.
            let scope = boundary ? node.closest(target(boundary)) : node.parentElement
            while (scope && !scope.querySelector(selector) && !boundary &&
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
            edges = props.edgeSpace !== false || current || next
                ? observeCanvasSlides(viewport, props.edgeSpace === false ? undefined : start, current, next)
                : undefined
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
    }, [name, boundary, align, props.edgeSpace, current, next])
    return (
        <>
            <style ref={marker} data-kniff="" data-kniff-canvas-settings="" />
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
