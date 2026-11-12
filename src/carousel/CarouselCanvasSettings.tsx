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
            const undo: (() => void)[] = []
            let resize: ResizeObserver | undefined
            if (props.edgeSpace !== false) {
                const slides: HTMLElement[] = slideBoxes(viewport)
                const first = slides[0], last = slides[slides.length - 1]
                if (first && last) {
                    const start = align === "start" ? 0 : align === "end" ? 1 : 0.5
                    const edges = [
                        [first, "margin-inline-start", start],
                        [last, "margin-inline-end", 1 - start],
                    ] as const
                    const update = () => {
                        for (const [slide, property, factor] of edges) {
                            slide.style.setProperty(property, `calc((100% - ${slide.offsetWidth}px) * ${factor})`)
                        }
                    }
                    for (const [slide, property] of edges) {
                        const value = slide.style.getPropertyValue(property)
                        const priority = slide.style.getPropertyPriority(property)
                        undo.push(() => slide.style.setProperty(property, value, priority))
                    }
                    update()
                    resize = new ResizeObserver(update)
                    resize.observe(first)
                    if (last !== first) resize.observe(last)
                }
            }
            detach = () => {
                resize?.disconnect()
                undo.forEach(restore => restore())
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
            <style ref={marker} data-kniff-canvas-settings="" />
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
