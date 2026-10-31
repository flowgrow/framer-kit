// Responsive Framer variants use boxless wrappers; measure their rendered slide.
export function slideBoxes(parent: Element): HTMLElement[] {
  return Array.from(parent.children).flatMap(child => {
    if (!(child instanceof HTMLElement) || ["STYLE", "SCRIPT"].includes(child.tagName)) return []
    if (getComputedStyle(child).display === "contents") return slideBoxes(child)
    if (child.matches("[data-kniff-ramka-settings]") || child.querySelector("[data-kniff-ramka-settings]")) return []
    return child.getClientRects().length ? [child] : []
  })
}
export function overflowSnapPoints(viewport: HTMLElement) {
  return slideBoxes(viewport).map(slide => snapPosition(viewport, slide)).sort((a,b)=>a-b)
}
export function snapPosition(viewport: HTMLElement, slide: HTMLElement): number {
    const box = viewport.getBoundingClientRect()
    const css = getComputedStyle(viewport)
    const left = parseFloat(css.scrollPaddingLeft) || 0
    const right = parseFloat(css.scrollPaddingRight) || 0
    const max = Math.max(0, viewport.scrollWidth - viewport.clientWidth)
    const rect = slide.getBoundingClientRect()
    const align = getComputedStyle(slide).scrollSnapAlign
    const offset = align.includes("center") ? (viewport.clientWidth-left-right-rect.width)/2 : align.includes("end") ? viewport.clientWidth-left-right-rect.width : 0
    return Math.max(0, Math.min(max, rect.left-box.left-viewport.clientLeft+viewport.scrollLeft-left-offset))
}
