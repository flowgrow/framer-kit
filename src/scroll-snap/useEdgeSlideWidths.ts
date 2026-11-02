import { useEffect, type RefObject } from "react"
import { slideBoxes } from "./snapGeometry.js"

/** Resolve edge-slide sizes for the same spacing formula used on Canvas. */
export function useEdgeSlideWidths(styleRef: RefObject<HTMLStyleElement>, viewportSelector: string, boundarySelector: string, enabled: boolean) {
  useEffect(() => {
    if (!enabled) return
    const scope = styleRef.current?.closest(boundarySelector) ?? document.body
    const entries = new Map<HTMLElement, { first: HTMLElement; last: HTMLElement; update(): void; dispose(): void }>()
    const refresh = () => {
      const active = new Set<HTMLElement>()
      for (const viewport of scope.querySelectorAll<HTMLElement>(viewportSelector)) {
        const slides = slideBoxes(viewport)
        const first = slides[0], last = slides.at(-1)
        if (!first || !last) continue
        active.add(viewport)
        const previous = entries.get(viewport)
        if (previous?.first === first && previous.last === last) { previous.update(); continue }
        previous?.dispose()
        const names = ["--kniff-first-slide-width", "--kniff-last-slide-width"] as const
        const saved = names.map(name => viewport.style.getPropertyValue(name))
        const update = () => {
          for (const [index, slide] of [first, last].entries()) {
            const value = slide.offsetWidth + "px", name = names[index]!
            if (viewport.style.getPropertyValue(name) !== value) viewport.style.setProperty(name, value)
          }
        }
        const resize = new ResizeObserver(update)
        resize.observe(viewport); resize.observe(first); resize.observe(last)
        entries.set(viewport, { first, last, update, dispose() {
          resize.disconnect()
          names.forEach((name, index) => {
            if (saved[index]) viewport.style.setProperty(name, saved[index]!)
            else viewport.style.removeProperty(name)
          })
        } })
        update()
      }
      for (const [viewport, entry] of entries) {
        if (!active.has(viewport)) { entry.dispose(); entries.delete(viewport) }
      }
    }
    refresh()
    const mutations = new MutationObserver(refresh)
    mutations.observe(scope, { subtree: true, childList: true, attributes: true, attributeFilter: ["class", "style"] })
    return () => { mutations.disconnect(); for (const entry of entries.values()) entry.dispose() }
  }, [styleRef, viewportSelector, boundarySelector, enabled])
}
