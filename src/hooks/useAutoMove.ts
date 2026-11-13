// @ts-ignore Framer cannot resolve local code-file imports.
import { installAutoMove } from "https://framer.com/m/autoMove-qikVR0.js"
// @ts-ignore Framer cannot resolve local code-file imports.
import { installAutoStep } from "../carousel/autoStep.tsx"
import { useEffect, type RefObject } from "react"

interface AutoMoveOptions {
  styleRef: RefObject<HTMLStyleElement>
  registeredViewport: HTMLElement | null
  viewportSelector: string
  loop: boolean
  align: "start" | "center" | "end"
  autoMove: "none" | "perSlide" | "scroll"
  autoMoveDelay: number
  autoMoveSpeed: number
  autoMoveDirection: "left" | "right"
  autoMoveStopOnInteraction: boolean
  autoMoveStopOnLastSlide: boolean
}

export function useAutoMove({
  styleRef,
  registeredViewport,
  viewportSelector,
  loop,
  align,
  autoMove,
  autoMoveDelay,
  autoMoveSpeed,
  autoMoveDirection,
  autoMoveStopOnInteraction,
  autoMoveStopOnLastSlide,
}: AutoMoveOptions) {
  useEffect(() => {
    if (autoMove === "none" || !viewportSelector) return
    let frame = 0,
      attempts = 0
    let cancelled = false
    let dispose: (() => void) | undefined
    const install = () => {
      if (cancelled) return
      const doc = styleRef.current?.ownerDocument ?? document
      const viewport =
        registeredViewport ??
        Array.from(doc.querySelectorAll<HTMLElement>(viewportSelector)).find(
          (el) => el.getClientRects().length && el.clientWidth,
        )
      if (!viewport || (loop && !viewport.hasAttribute("data-kniff-loop-ready"))) {
        if (++attempts < 120) frame = requestAnimationFrame(install)
        return
      }
      dispose =
        autoMove === "scroll"
          ? installAutoMove(viewport, {
              speed: autoMoveSpeed,
              direction: autoMoveDirection,
            })
          : installAutoStep(viewport, {
              delay: autoMoveDelay,
              direction: autoMoveDirection,
              stopOnInteraction: autoMoveStopOnInteraction,
              stopOnLastSlide: autoMoveStopOnLastSlide,
            })
    }
    frame = requestAnimationFrame(install)
    return () => {
      cancelled = true
      cancelAnimationFrame(frame)
      dispose?.()
    }
  }, [
    registeredViewport,
    autoMove,
    autoMoveDelay,
    autoMoveSpeed,
    autoMoveDirection,
    autoMoveStopOnInteraction,
    autoMoveStopOnLastSlide,
    viewportSelector,
    loop,
    align,
  ])
}
