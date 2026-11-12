// @ts-ignore Framer cannot resolve local code-file imports.
import { overflowSnapPoints } from "./snapGeometry.ts"
// @ts-ignore Framer cannot resolve local code-file imports.
import {
  cancelOverflowMove,
  getPendingOverflowDestination,
  moveOverflowViewport,
} from "./snapNavigation.ts"

export interface AutoStepOptions {
  delay: number
  direction: "left" | "right"
  stopOnLastSlide: boolean
}

/** Advances one native snap point after each pause, without an animation plugin. */
export function installAutoStep(
  viewport: HTMLElement,
  { delay, direction, stopOnLastSlide }: AutoStepOptions,
) {
  const doc = viewport.ownerDocument,
    win = doc.defaultView!
  const reduced = win.matchMedia("(prefers-reduced-motion: reduce)")
  let timer = 0,
    visible = false,
    stopped = false,
    disposed = false,
    holding = false
  const paused = () => viewport.hasAttribute("data-kniff-auto-move-paused")
  const eligible = () =>
    visible && !doc.hidden && !reduced.matches && !paused() && !stopped && !holding
  const clear = () => {
    win.clearTimeout(timer)
    timer = 0
  }
  const schedule = () => {
    clear()
    if (!eligible()) {
      viewport.dataset.kniffAutoMove = "held"
      return
    }
    viewport.dataset.kniffAutoMove = "waiting"
    timer = win.setTimeout(advance, Math.max(0.1, delay) * 1000)
  }
  const advance = () => {
    timer = 0
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
    if (next !== undefined) {
      viewport.dataset.kniffAutoMove = "running"
      moveOverflowViewport(viewport, forward ? 1 : -1)
      schedule()
      return
    }
    if (stopOnLastSlide || points.length < 2) {
      stopped = true
      viewport.dataset.kniffAutoMove = "held"
      return
    }
    cancelOverflowMove(viewport)
    viewport.scrollTo({
      left: forward ? points[0]! : points[points.length - 1]!,
      behavior: "smooth",
    })
    schedule()
  }
  const interrupt = () => {
    if (!disposed) schedule()
  }
  const press = () => {
    holding = true
    schedule()
  }
  const release = () => {
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
    for (const event of ["pointerdown", "touchstart"]) viewport.removeEventListener(event, press)
    for (const event of ["pointerup", "pointercancel", "touchend", "touchcancel"])
      win.removeEventListener(event, release)
    for (const event of ["wheel", "keydown", "kniff-scroll-navigation"])
      viewport.removeEventListener(event, interrupt)
    doc.removeEventListener("visibilitychange", schedule)
    reduced.removeEventListener("change", schedule)
    cancelOverflowMove(viewport)
    delete viewport.dataset.kniffAutoMove
  }
}
