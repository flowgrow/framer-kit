// @ts-ignore Framer cannot resolve local code-file imports.
import { atTerminalSlide, dotSlides, isOriginalSlide, snapPosition, overflowSnapPoints } from "./snapGeometry.ts"
// @ts-ignore Framer cannot resolve local code-file imports.
import { cancelOverflowMove, getPendingOverflowDestination, moveOverflowViewport, scrollToSlide, scrollToSnapPosition } from "./snapNavigation.ts"

export interface AutoStepOptions {
  delay: number
  direction: "left" | "right"
  stopOnInteraction?: boolean
  stopOnLastSlide: boolean
}

/** Advances one native snap point after each pause, without an animation plugin. */
export function installAutoStep(
  viewport: HTMLElement,
  { delay, direction, stopOnLastSlide, stopOnInteraction = false }: AutoStepOptions,
) {
  const doc = viewport.ownerDocument,
    win = doc.defaultView!
  const reduced = win.matchMedia("(prefers-reduced-motion: reduce)")
  let timer = 0,
    visible = false,
    stopped = false,
    manuallyPaused = false,
    disposed = false,
    holding = false
  const duration = Math.max(0.1, delay) * 1000
  let remaining = duration
  let deadline = 0
  let settling = false
  let settleTimer = 0
  const paused = () => viewport.hasAttribute("data-kniff-auto-move-paused")
  const eligible = () =>
    visible && !doc.hidden && !reduced.matches && !paused() && !stopped && !manuallyPaused && !holding
  const clear = () => {
    win.clearTimeout(timer)
    timer = 0
  }
  const slideAt = (position: number) => {
    const slides = dotSlides(viewport)
    const count = slides.filter(slide => isOriginalSlide(viewport, slide)).length
    let nearest = 0
    let distance = Infinity
    for (const [index, slide] of slides.entries()) {
      const delta = Math.abs(snapPosition(viewport, slide) - position)
      if (delta < distance || (delta === distance && position >= viewport.scrollWidth - viewport.clientWidth - 1)) {
        nearest = index
        distance = delta
      }
    }
    return count ? nearest % count : 0
  }
  let clockSlide = slideAt(viewport.scrollLeft)
  const schedule = () => {
    if (timer) remaining = Math.max(0, deadline - performance.now())
    clear()
    const moving = settling || getPendingOverflowDestination(viewport) !== undefined
    deadline = eligible() && !moving ? performance.now() + remaining : 0
    const currentSlide = slideAt(viewport.scrollLeft)
    // At a loop seam the outgoing slide belongs to the previous playback cycle.
    const wrapped = viewport.hasAttribute("data-kniff-loop") &&
      (direction === "left" ? currentSlide === 0 && clockSlide > 0 : clockSlide === 0 && currentSlide > 0)
    const outgoing = moving && wrapped ? clockSlide : null
    if (!moving) clockSlide = currentSlide
    viewport.dataset.kniffStepClock = JSON.stringify([duration, remaining, deadline, currentSlide, direction, outgoing, moving && currentSlide === clockSlide])
    viewport.dispatchEvent(new Event("kniff-step-clock"))
    if (!eligible()) {
      viewport.dataset.kniffAutoMove = stopped ? "stopped" : "held"
      return
    }
    if (moving) {
      viewport.dataset.kniffAutoMove = "running"
      return
    }
    viewport.dataset.kniffAutoMove = "waiting"
    timer = win.setTimeout(advance, remaining)
  }
  const advance = () => {
    timer = 0
    remaining = 0
    if (!eligible()) {
      schedule()
      return
    }
    const points: number[] = [
      ...new Set<number>(
        overflowSnapPoints(viewport).map((point: number) => Math.round(point * 100) / 100),
      ),
    ]
    const current = getPendingOverflowDestination(viewport) ?? viewport.scrollLeft
    const forward = direction === "left"
    const next = forward
      ? points.find((point) => point > current + 2)
      : points
          .slice()
          .reverse()
          .find((point) => point < current - 2)
    if (stopOnLastSlide && atTerminalSlide(viewport, forward, current)) {
      halt()
      return
    }
    if (next !== undefined) {
      remaining = duration
      viewport.dataset.kniffAutoMove = "running"
      moveOverflowViewport(viewport, forward ? 1 : -1, true)
      schedule()
      return
    }
    if (stopOnLastSlide || points.length < 2) {
      halt()
      return
    }
    remaining = duration
    scrollToSnapPosition(viewport, forward ? points[0]! : points[points.length - 1]!, true, true)
    schedule()
  }
  const halt = () => {
    stopped = true
    schedule()
  }
  const toggle = () => {
    if (stopped) {
      clear()
      remaining = duration
      stopped = false
      manuallyPaused = false
      scrollToSlide(viewport, 0, true)
    } else {
      manuallyPaused = viewport.dataset.kniffAutoMove !== "held"
    }
    schedule()
  }
  const manual = () => { if (stopOnInteraction) halt() }
  const settled = () => {
    win.clearTimeout(settleTimer)
    if (!settling) return
    settling = false
    schedule()
  }
  const scrolled = () => {
    if (holding) manual()
    if (getPendingOverflowDestination(viewport) !== undefined) {
      schedule()
      return
    }
    if (stopped && !settling) {
      if (slideAt(viewport.scrollLeft) !== clockSlide) remaining = duration
      schedule()
      return
    }
    if (!settling) {
      clear()
      remaining = duration
      settling = true
    }
    schedule()
    win.clearTimeout(settleTimer)
    settleTimer = win.setTimeout(settled, 160)
  }
  const interrupt = (event: Event) => {
    if (!stopped && event.type === "kniff-scroll-navigation" && getPendingOverflowDestination(viewport) !== undefined) {
      clear()
      remaining = duration
    }
    if (event instanceof WheelEvent && (Math.abs(event.deltaX) > Math.abs(event.deltaY) || event.shiftKey)) manual()
    if (event instanceof KeyboardEvent && ["ArrowLeft", "ArrowRight", "Home", "End", "PageUp", "PageDown", " "].includes(event.key)) manual()
    if (!disposed) schedule()
  }
  const press = () => {
    holding = true
    schedule()
  }
  const release = () => {
    if (!holding) return
    holding = false
    schedule()
  }
  const intersection = new IntersectionObserver(
    (entries) => {
      const entry = entries[entries.length - 1]
      visible = Boolean(
        entry?.isIntersecting &&
        entry.intersectionRect.width > 0 &&
        entry.intersectionRect.height > 0,
      )
      schedule()
    },
    { threshold: [0, 0.001] },
  )
  const mutation = new MutationObserver(schedule)
  mutation.observe(viewport, { attributes: true, attributeFilter: ["data-kniff-auto-move-paused"] })
  viewport.addEventListener("kniff-toggle-playback", toggle)
  viewport.addEventListener("kniff-manual-navigation", manual)
  viewport.addEventListener("scrollend", settled)
  viewport.addEventListener("scroll", scrolled)
  intersection.observe(viewport)
  for (const event of ["pointerdown", "touchstart"]) viewport.addEventListener(event, press)
  for (const event of ["pointerup", "pointercancel", "touchend", "touchcancel"])
    win.addEventListener(event, release)
  for (const event of ["wheel", "keydown", "kniff-scroll-navigation"])
    viewport.addEventListener(event, interrupt)
  doc.addEventListener("visibilitychange", schedule)
  reduced.addEventListener("change", schedule)
  return () => {
    disposed = true
    clear()
    intersection.disconnect()
    mutation.disconnect()
    viewport.removeEventListener("kniff-toggle-playback", toggle)
    viewport.removeEventListener("kniff-manual-navigation", manual)
    win.clearTimeout(settleTimer)
    viewport.removeEventListener("scrollend", settled)
    viewport.removeEventListener("scroll", scrolled)
    for (const event of ["pointerdown", "touchstart"]) viewport.removeEventListener(event, press)
    for (const event of ["pointerup", "pointercancel", "touchend", "touchcancel"])
      win.removeEventListener(event, release)
    for (const event of ["wheel", "keydown", "kniff-scroll-navigation"])
      viewport.removeEventListener(event, interrupt)
    doc.removeEventListener("visibilitychange", schedule)
    reduced.removeEventListener("change", schedule)
    cancelOverflowMove(viewport)
    delete viewport.dataset.kniffStepClock
    viewport.dispatchEvent(new Event("kniff-step-clock"))
    delete viewport.dataset.kniffAutoMove
  }
}
