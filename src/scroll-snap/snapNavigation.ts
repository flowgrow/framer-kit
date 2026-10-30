import { overflowSnapPoints } from "./snapGeometry.js"

// Shared by both arrows so retargeting and direction changes count every click.
const overflowMoves = new WeakMap<HTMLElement, { destination: number; clear: () => void }>()
export function getPendingOverflowDestination(viewport: HTMLElement): number | undefined {
  return overflowMoves.get(viewport)?.destination
}
export function cancelOverflowMove(viewport: HTMLElement) {
  overflowMoves.get(viewport)?.clear()
}
export function moveOverflowViewport(viewport: HTMLElement, direction: number) {
  const points = overflowSnapPoints(viewport)
  const pending = overflowMoves.get(viewport)
  const current = pending?.destination ?? viewport.scrollLeft
  const destination = direction > 0 ? points.find(point => point > current+2) : points.reverse().find(point => point < current-2)
  if (destination === undefined) return
  pending?.clear()
  let timer = 0
  const clear = () => {
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
  viewport.addEventListener("scroll", onScroll, {passive:true})
  viewport.addEventListener("scrollend", clear)
  viewport.addEventListener("pointerdown", clear, {passive:true})
  viewport.addEventListener("touchstart", clear, {passive:true})
  viewport.addEventListener("wheel", clear, {passive:true})
  viewport.addEventListener("keydown", clear)
  timer = window.setTimeout(clear, 2000)
  viewport.scrollTo({left:destination,behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" as ScrollBehavior : "smooth"})
}

