// @ts-ignore Framer cannot resolve local code-file imports.
import { slideBoxes, snapPosition } from "../carousel/snapGeometry.ts"
// @ts-ignore Framer cannot resolve local code-file imports.
import { cancelOverflowMove } from "../carousel/snapNavigation.ts"

/** Stop both automatic motion and native/smooth scrolling before morph capture. */
export function freezeSnapViewport(viewport: HTMLElement): () => void {
  const snap = viewport.style.scrollSnapType
  const behavior = viewport.style.scrollBehavior
  const attributes = ["data-kniff-lightbox-open", "data-kniff-auto-move-paused"]
  const previous = attributes.map((name) => ({ name, value: viewport.getAttribute(name) }))
  previous.forEach(({ name }) => viewport.setAttribute(name, ""))
  cancelOverflowMove(viewport)
  const position = viewport.scrollLeft
  viewport.style.scrollSnapType = "none"
  viewport.style.scrollBehavior = "auto"
  viewport.scrollTo({ left: position, behavior: "instant" })
  return () => {
    viewport.style.scrollSnapType = snap
    viewport.style.scrollBehavior = behavior
    previous.forEach(({ name, value }) =>
      value === null ? viewport.removeAttribute(name) : viewport.setAttribute(name, value),
    )
  }
}

/** The same snap coordinate calculation used by the carousel arrows. */
export function syncSnapToElement(viewport: HTMLElement, element: HTMLElement): void {
  const slide = slideBoxes(viewport).find(
    (slide: HTMLElement) => slide === element || slide.contains(element),
  )
  if (!slide) return
  cancelOverflowMove(viewport)
  viewport.scrollTo({ left: snapPosition(viewport, slide), behavior: "instant" })
}
