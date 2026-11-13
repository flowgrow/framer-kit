// @ts-ignore Framer cannot resolve local code-file imports.
import type { KniffCarouselSettingsProps, SlideTransform } from "./KniffCarouselSettings.tsx"

export function previousSlideEffect(effects: KniffCarouselSettingsProps["slideTransforms"]): SlideTransform | undefined {
    if (!effects?.previous?.copyNext) return effects?.previous
    const next = effects.next
    if (!effects.previous.invert || !next) return next
    return {
        scale: next.scale,
        opacity: next.opacity,
        x: -(next.x ?? 0), y: -(next.y ?? 0), z: -(next.z ?? 0),
        rotateX: -(next.rotateX ?? 0), rotateY: -(next.rotateY ?? 0), rotateZ: -(next.rotateZ ?? 0),
    }
}

export function cssTransform(value: SlideTransform = {}, perspective: number) {
    const transforms: string[] = []
    if (perspective > 0) transforms.push(`perspective(${perspective}px)`)
    if (value.x || value.y || value.z) transforms.push(`translate3d(${value.x ?? 0}px,${value.y ?? 0}px,${value.z ?? 0}px)`)
    if (value.rotateX) transforms.push(`rotateX(${value.rotateX}deg)`)
    if (value.rotateY) transforms.push(`rotateY(${value.rotateY}deg)`)
    if (value.rotateZ) transforms.push(`rotateZ(${value.rotateZ}deg)`)
    if (value.scale !== undefined && value.scale !== 1) transforms.push(`scale(${value.scale})`)
    return transforms.join(" ")
}

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
export function slideRect(viewport: HTMLElement, slide: HTMLElement) {
  if (slide.hasAttribute("data-kniff-slide-position") && slide.offsetParent === viewport) {
    return { left: viewport.getBoundingClientRect().left + viewport.clientLeft + slide.offsetLeft - viewport.scrollLeft, width: slide.offsetWidth }
  }
  return slide.getBoundingClientRect()
}

export function snapPosition(viewport: HTMLElement, slide: HTMLElement): number {
  const box = viewport.getBoundingClientRect()
  const css = getComputedStyle(viewport)
  const left = parseFloat(css.scrollPaddingLeft) || 0
  const right = parseFloat(css.scrollPaddingRight) || 0
  const max = Math.max(0, viewport.scrollWidth - viewport.clientWidth)
  const rect = slideRect(viewport, slide)
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
    const cycle = slideRect(viewport, following).left - slideRect(viewport, originals[0]!).left
    if (cycle > 0) return Math.abs(position - point - Math.round((position - point) / cycle) * cycle) <= 2
  }
  return forward ? position >= point - 2 : position <= point + 2
}

export function dotSlides(viewport: HTMLElement): HTMLElement[] {
  return slideBoxes(viewport).filter((slide: HTMLElement) => !slide.hasAttribute("data-kniff"))
}

export function isOriginalSlide(viewport: HTMLElement, slide: HTMLElement) {
  return slide.closest("[data-kniff-loop-copy]")?.parentElement !== viewport
}
