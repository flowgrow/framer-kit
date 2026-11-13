import { animate, type Transition } from "framer-motion"
// @ts-ignore Framer cannot resolve local code-file imports.
import { overflowSnapPoints } from "./snapGeometry.ts"

// Shared by both arrows so retargeting and direction changes count every click.
const overflowMoves = new WeakMap<HTMLElement, { destination: number; clear: () => void }>()
export function getPendingOverflowDestination(viewport: HTMLElement): number | undefined {
  return overflowMoves.get(viewport)?.destination
}
export function cancelOverflowMove(viewport: HTMLElement) {
  overflowMoves.get(viewport)?.clear()
}
export function moveOverflowViewport(viewport: HTMLElement, direction: number, automatic = false) {
  const points = overflowSnapPoints(viewport)
  const pending = overflowMoves.get(viewport)
  const current = pending?.destination ?? viewport.scrollLeft
  const destination =
    direction > 0
      ? points.find((point: number) => point > current + 2)
      : points.reverse().find((point: number) => point < current - 2)
  if (destination === undefined) return
  scrollToSnapPosition(viewport, destination, automatic, true)
}

export function scrollToSnapPosition(viewport: HTMLElement, destination: number, automatic = false, useTransition = true) {
  const pending = overflowMoves.get(viewport)
  if (!automatic) viewport.dispatchEvent(new Event("kniff-manual-navigation"))
  pending?.clear()
  const config = useTransition && getComputedStyle(viewport).getPropertyValue("--kniff-slide-transition").trim()
  const animated = Boolean(config) && !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  const snap = viewport.style.scrollSnapType
  let animation: { stop(): void } | undefined
  let timer = 0
  const clear = () => {
    animation?.stop()
    if (animated) viewport.style.scrollSnapType = snap
    window.clearTimeout(timer)
    viewport.removeEventListener("scroll", onScroll)
    viewport.removeEventListener("scrollend", clear)
    viewport.removeEventListener("pointerdown", clear)
    viewport.removeEventListener("touchstart", clear)
    viewport.removeEventListener("wheel", clear)
    viewport.removeEventListener("keydown", clear)
    if (overflowMoves.get(viewport)?.clear === clear) {
      overflowMoves.delete(viewport)
      viewport.dispatchEvent(new Event("kniff-scroll-navigation"))
    }
  }
  const onScroll = () => {
    window.clearTimeout(timer)
    timer = window.setTimeout(clear, 180)
  }
  overflowMoves.set(viewport, { destination, clear })
  viewport.dispatchEvent(new Event("kniff-scroll-navigation"))
  if (!animated) {
    viewport.addEventListener("scroll", onScroll, { passive: true })
    viewport.addEventListener("scrollend", clear)
  }
  viewport.addEventListener("pointerdown", clear, { passive: true })
  viewport.addEventListener("touchstart", clear, { passive: true })
  viewport.addEventListener("wheel", clear, { passive: true })
  viewport.addEventListener("keydown", clear)
  if (animated && config) {
    viewport.style.scrollSnapType = "none"
    const start = viewport.scrollLeft
    const points: number[] = [...new Set<number>(overflowSnapPoints(viewport))]
    const nearestIndex = (position: number) => points.reduce((nearest, point, index) =>
      Math.abs(point - position) < Math.abs(points[nearest]! - position) ? index : nearest, 0)
    const steps = Math.max(1, Math.abs(nearestIndex(destination) - nearestIndex(start)))
    const playback = animate(start, destination, {
      ...JSON.parse(config) as Transition,
      onUpdate: (left: number) => viewport.scrollTo({ left, behavior: "instant" }),
      onComplete: clear,
    })
    playback.speed = 1 / steps
    animation = playback
    return
  }
  timer = window.setTimeout(clear, 2000)
  viewport.scrollTo({
    left: destination,
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? ("instant" as ScrollBehavior)
      : "smooth",
  })
}
