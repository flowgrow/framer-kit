// @ts-ignore Framer cannot resolve local code-file imports.
import { CanvasInstructions } from "../shared/CanvasInstructions.tsx"
// @ts-ignore Framer cannot resolve local code-file imports.
import { slideBoxes } from "./snapGeometry.ts"
// @ts-ignore Framer cannot resolve local code-file imports.
import type { KniffCarouselSettingsProps } from "./KniffCarouselSettings.tsx"
import { useLayoutEffect, useRef } from "react"

function target(id: string) {
    const value = JSON.stringify(id.trim()).replace(/</g, "\\3c ")
    return `:is([aria-label=${value}], [data-framer-name=${value}]:not([aria-label]))`
}
function observeCanvasEdges(viewport: HTMLElement, start: number) {
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
        frame = undefined
        const slides: HTMLElement[] = slideBoxes(viewport)
        const eligible = slides.filter(slide =>
            slide.matches(":not([data-kniff])")
        ).sort((a, b) => Number(getComputedStyle(a).order) - Number(getComputedStyle(b).order))
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
    const mutations = new MutationObserver(schedule)
    refresh()
    mutations.observe(viewport, {
        subtree: true, childList: true, attributes: true,
        attributeFilter: ["class", "style", "data-kniff", "hidden"],
    })
    return () => {
        mutations.disconnect()
        resize.disconnect()
        if (frame !== undefined) cancelAnimationFrame(frame)
        restore.forEach(reset => reset())
    }
}

export function CarouselCanvasSettings(props: KniffCarouselSettingsProps) {
    const marker = useRef<HTMLStyleElement>(null)
    const name = (props.containerID ?? "Percentage Sized Carousel").trim()
    const boundary = props.boundaryID?.trim()
    const align = props.align ?? "center"

    useLayoutEffect(() => {
        const node = marker.current
        if (!node || !name) return
        const selector = target(name)
        let detach: (() => void) | undefined
        const attach = () => {
            detach?.()
            detach = undefined
            // A canvas can contain several breakpoints with the same layer names.
            let scope = boundary ? node.closest(target(boundary)) : node.parentElement
            while (scope && !scope.querySelector(selector) && !boundary &&
                   !scope.matches(':has(> [data-layout-template-root="true"])')) {
                scope = scope.parentElement
            }
            const viewport = scope?.querySelector<HTMLElement>(selector)
            if (!viewport) return
            const overflow = ["overflow-x", "overflow-y"].map(property => ({
                property,
                value: viewport.style.getPropertyValue(property),
                priority: viewport.style.getPropertyPriority(property),
            }))
            viewport.style.setProperty("overflow", "visible", "important")
            const start = align === "start" ? 0 : align === "end" ? 1 : 0.5
            const stop = props.edgeSpace !== false ? observeCanvasEdges(viewport, start) : undefined
            detach = () => {
                stop?.()
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
    })
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
