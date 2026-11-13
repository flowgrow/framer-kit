// Responsive Framer variants use boxless wrappers; measure their rendered slide.
export function slideBoxes(parent: Element): HTMLElement[] {
  return Array.from(parent.children).flatMap((child) => {
    if (!(child instanceof HTMLElement) || ["STYLE", "SCRIPT"].includes(child.tagName)) return []
    if (getComputedStyle(child).display === "contents") return slideBoxes(child)
    if (
      child.matches("[data-kniff-ramka-settings]") ||
      child.querySelector("[data-kniff-ramka-settings]")
    )
      return []
    return child.getClientRects().length ? [child] : []
  })
}
export function overflowSnapPoints(viewport: HTMLElement) {
  return slideBoxes(viewport)
    .map((slide) => snapPosition(viewport, slide))
    .sort((a, b) => a - b)
}
export function snapPosition(viewport: HTMLElement, slide: HTMLElement): number {
  const box = viewport.getBoundingClientRect()
  const css = getComputedStyle(viewport)
  const left = parseFloat(css.scrollPaddingLeft) || 0
  const right = parseFloat(css.scrollPaddingRight) || 0
  const max = Math.max(0, viewport.scrollWidth - viewport.clientWidth)
  const rect = slide.getBoundingClientRect()
  const align = getComputedStyle(slide).scrollSnapAlign
  const offset = align.includes("center")
    ? (viewport.clientWidth - left - right - rect.width) / 2
    : align.includes("end")
      ? viewport.clientWidth - left - right - rect.width
      : 0
  return Math.max(
    0,
    Math.min(max, rect.left - box.left - viewport.clientLeft + viewport.scrollLeft - left - offset),
  )
}

// Loop copies share the same logical terminal slide in each cycle.
export function atTerminalSlide(viewport: HTMLElement, forward: boolean, position: number) {
  const slides = slideBoxes(viewport)
  const originals = slides.filter(slide => !slide.closest("[data-kniff-loop-copy]"))
  const terminal = forward ? originals[originals.length - 1] : originals[0]
  if (!terminal) return false
  const point = snapPosition(viewport, terminal)
  const following = slides[slides.indexOf(originals[originals.length - 1]!) + 1]
  if (following && viewport.hasAttribute("data-kniff-loop")) {
    const cycle = following.getBoundingClientRect().left - originals[0]!.getBoundingClientRect().left
    if (cycle > 0) return Math.abs(position - point - Math.round((position - point) / cycle) * cycle) <= 2
  }
  return forward ? position >= point - 2 : position <= point + 2
}

export function restartAtFirstSlide(viewport: HTMLElement) {
  const first = slideBoxes(viewport).find(slide => !slide.closest("[data-kniff-loop-copy]"))
  if (first) viewport.scrollTo({ left: snapPosition(viewport, first), behavior: "instant" })
}
