// @ts-ignore Framer cannot resolve local code-file imports.
import { CanvasInstructions } from "../shared/CanvasInstructions.tsx"
// @ts-ignore Framer cannot resolve local code-file imports.
import { inlineAuthoredVariables } from "./authoredStyles.ts"
// @ts-ignore Framer cannot resolve local code-file imports.
import type { KniffCarouselSettingsProps } from "./KniffCarouselSettings.tsx"
import { useEffect, useId, useRef } from "react"
import { RenderTarget } from "framer"

function target(id: string) {
    const value = JSON.stringify(id.trim()).replace(/</g, "\\3c ")
    return `:is([aria-label=${value}], [data-framer-name=${value}]:not([aria-label]))`
}
export function CarouselCanvasSettings(props: KniffCarouselSettingsProps) {
    const canvasStyleRef = useRef<HTMLStyleElement>(null)
    useEffect(() => {
        if (RenderTarget.current() !== RenderTarget.canvas) return
        const style = canvasStyleRef.current
        if (!style) return
        const ancestors: HTMLElement[] = []
        for (let node = style.parentElement; node; node = node.parentElement) {
            ancestors.push(node)
        }
        const update = () => {
            style.disabled = ancestors.some((node) => {
                const computed = getComputedStyle(node)
                return (
                    computed.display === "none" ||
                    computed.visibility === "hidden"
                )
            })
        }
        const observer = new MutationObserver(update)
        ancestors.forEach((node) =>
            observer.observe(node, {
                attributes: true,
                attributeFilter: ["style", "class", "hidden"],
            })
        )
        update()
        return () => observer.disconnect()
    }, [])
    const canvasViewportName = props.containerID ?? "Percentage Sized Carousel"
    const canvasViewport = canvasViewportName.trim()
        ? `${props.boundaryID?.trim() ? `${target(props.boundaryID)} ` : ""}${target(canvasViewportName)}`
        : ""
    useEffect(() => {
        if (RenderTarget.current() !== RenderTarget.canvas || !canvasViewport)
            return

        const attached = new Map<HTMLElement, () => void>()
        let scanFrame = 0
        const attach = (element: HTMLElement) => {
            let known = new Set<string>()
            const update = () => {
                const authored = inlineAuthoredVariables({
                    width: element.style.width,
                    maxWidth: element.style.maxWidth,
                    padding: element.style.padding,
                    paddingLeft: element.style.paddingLeft,
                    paddingRight: element.style.paddingRight,
                }) as Record<string, string>
                for (const name of known) {
                    if (!(name in authored)) element.style.removeProperty(name)
                }
                known = new Set(Object.keys(authored))
                for (const [name, value] of Object.entries(authored)) {
                    if (element.style.getPropertyValue(name) !== value) {
                        element.style.setProperty(name, value)
                    }
                }
            }
            update()
            const styleObserver = new MutationObserver(update)
            styleObserver.observe(element, {
                attributes: true,
                attributeFilter: ["style"],
            })
            let childFrame = 0
            const childrenObserver = new MutationObserver(() => {
                cancelAnimationFrame(childFrame)
                childFrame = requestAnimationFrame(() => {
                    const firstSlide = element.firstElementChild
                    if (firstSlide instanceof HTMLElement) {
                        firstSlide.scrollIntoView({
                            behavior: "instant",
                            block: "nearest",
                            inline: props.align ?? "center",
                            container: "nearest",
                        } as ScrollIntoViewOptions)
                    }
                })
            })
            childrenObserver.observe(element, { childList: true })
            attached.set(element, () => {
                styleObserver.disconnect()
                childrenObserver.disconnect()
                cancelAnimationFrame(childFrame)
            })
        }
        const reconcile = () => {
            const current = new Set(
                document.querySelectorAll<HTMLElement>(canvasViewport)
            )
            for (const [element, detach] of attached) {
                if (!current.has(element)) {
                    detach()
                    attached.delete(element)
                }
            }
            for (const element of current) {
                if (!attached.has(element)) attach(element)
            }
        }
        const observer = new MutationObserver(() => {
            cancelAnimationFrame(scanFrame)
            scanFrame = requestAnimationFrame(reconcile)
        })
        observer.observe(document.body, { childList: true, subtree: true })
        reconcile()
        return () => {
            observer.disconnect()
            cancelAnimationFrame(scanFrame)
            attached.forEach((detach) => detach())
        }
    }, [canvasViewport, props.align])
    const id = useId()
    const viewport = canvasViewport
    const align = (props.align ?? "center") as "start" | "center" | "end"
    const firstMargins = { start: "0%", center: "50%", end: "100%" }
    const lastMargins = { start: "100%", center: "50%", end: "0%" }
    const firstSlideMargin =
        props.edgeSpace === false ? "0%" : firstMargins[align]
    const lastSlideMargin =
        props.edgeSpace === false ? "0%" : lastMargins[align]
    const canvasCSS =
        viewport &&
        `:has(> [data-layout-template-root="true"]) {
            container-type: inline-size;

&:has(#${CSS.escape(id)}) { 
${viewport} {
  display: flex !important;
  flex-wrap: nowrap !important;
  box-sizing: border-box;
  flex: none !important;
  width: 100cqw !important;
  max-width: none !important;
  min-width: 0;
  margin-inline: calc((100% - 100cqw) / 2) !important;
  --kniff-content-width: min(100cqw, var(--kniff-authored-width, 100cqw), var(--kniff-authored-max-width, 100cqw));
  --kniff-gutter: calc((100cqw - var(--kniff-content-width)) / 2);
  padding-left: calc(var(--kniff-authored-padding-left, 0px) + var(--kniff-gutter)) !important;
  padding-right: calc(var(--kniff-authored-padding-right, 0px) + var(--kniff-gutter)) !important;
  overflow-x: hidden !important;
  overflow-y: hidden !important;
  scroll-snap-type: x mandatory;
  scroll-padding-left: calc(var(--kniff-authored-padding-left, 0px) + var(--kniff-gutter));
  scroll-padding-right: calc(var(--kniff-authored-padding-right, 0px) + var(--kniff-gutter));
  scrollbar-width: none !important;
}
${viewport}::-webkit-scrollbar {
  display: none !important;
}
${viewport} > * {
  flex-shrink: 0 !important;
  scroll-snap-align: ${align};
  scroll-snap-stop: ${props.stopEach ? "always" : "normal"};
}
${viewport} > :first-child {
  margin-inline-start: ${firstSlideMargin};
}
${viewport} > :last-child {
  margin-inline-end: ${lastSlideMargin};
}}
}`
    return (
        <>
            {canvasCSS && (
                <style
                    ref={canvasStyleRef}
                    data-kniff=""
                    data-kniff-canvas-settings=""
                    dangerouslySetInnerHTML={{ __html: canvasCSS }}
                />
            )}
            {props.showInstructions !== false && (
                <CanvasInstructions
                    data-kniff=""
                    data-kniff-carousel-settings=""
                    title="Carousel Settings"
                    style={props.style}
                    id={id}
                >
                    Place these settings inside the carousel boundary. Apply
                    withKniffCarousel to the viewport and the Previous and Next
                    overrides to your buttons.
                </CanvasInstructions>
            )}
        </>
    )
}
