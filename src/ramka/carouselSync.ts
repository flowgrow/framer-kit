import { slideBoxes, snapPosition } from "../scroll-snap/snapGeometry.js"
import { cancelOverflowMove } from "../scroll-snap/snapNavigation.js"

export function findSnapViewport(element: HTMLElement): HTMLElement | null {
  const marked = element.closest<HTMLElement>('[data-kniff-react-loop], [data-kniff-auto-move], [data-css-snap]')
  if (marked) return marked
  for (let parent = element.parentElement; parent; parent = parent.parentElement) {
    if (/auto|scroll/.test(getComputedStyle(parent).overflowX) && parent.scrollWidth > parent.clientWidth) return parent
  }
  return null
}

/** Stop both automatic motion and native/smooth scrolling before morph capture. */
export function freezeSnapViewport(viewport: HTMLElement): () => void {
  const snap = viewport.style.scrollSnapType
  const behavior = viewport.style.scrollBehavior
  const attributes = ['data-kniff-lightbox-open', 'data-kniff-auto-move-paused']
  const previous = attributes.map(name => ({name, value:viewport.getAttribute(name)}))
  previous.forEach(({name}) => viewport.setAttribute(name, ''))
  cancelOverflowMove(viewport)
  const position = viewport.scrollLeft
  viewport.style.scrollSnapType = 'none'
  viewport.style.scrollBehavior = 'auto'
  viewport.scrollTo({left:position,behavior:'instant'})
  return () => {
    viewport.style.scrollSnapType = snap
    viewport.style.scrollBehavior = behavior
    previous.forEach(({name,value}) => value === null ? viewport.removeAttribute(name) : viewport.setAttribute(name,value))
  }
}

/** The same snap coordinate calculation used by the carousel arrows. */
export function syncSnapToElement(element: HTMLElement): void {
  const viewport = findSnapViewport(element)
  if (!viewport) return
  const slide = slideBoxes(viewport).find(slide => slide === element || slide.contains(element))
  if (!slide) return
  cancelOverflowMove(viewport)
  viewport.scrollTo({left:snapPosition(viewport,slide),behavior:'instant'})
}
