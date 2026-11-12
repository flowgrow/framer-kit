import { useLayoutEffect, type RefObject } from "react"

function slideBoxes(parent: Element): HTMLElement[] {
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
export function useReactLoop(
  styleRef: RefObject<HTMLStyleElement>,
  selector: string,
  align: "start" | "center" | "end",
  loop: boolean,
  registeredViewport: HTMLElement | null,
) {
  useLayoutEffect(() => {
    if (!loop || !selector) return

    let dispose: (() => void) | undefined
    let frame = 0
    let retry = 0
    let cancelled = false
    let clearStartup: (() => void) | undefined
    const install = () => {
      const scroller =
        registeredViewport ??
        (styleRef.current?.ownerDocument ?? document).querySelector<HTMLElement>(selector)
      if (!scroller) {
        return false
      }
      if (!scroller.hasAttribute("data-kniff-react-loop")) {
        return false
      }
      const originalCycle = scroller.querySelector<HTMLElement>(
        ":scope > [data-kniff-loop-original]",
      )
      if (!originalCycle) return false
      const slides = slideBoxes(originalCycle)
      const first = slides[0]
      if (!first || slides.length < 2) return false
      if (align !== "start" && !clearStartup && !scroller.querySelector(":scope > [data-kniff-loop-copy]")) {
        // Complete the handoff in the DOM commit that inserts the leading copies.
        const observer = new MutationObserver(() => {
          if (scroller.querySelector(":scope > [data-kniff-loop-copy]")) {
            cancelAnimationFrame(frame)
            attempt()
          }
        })
        observer.observe(scroller, { childList: true })
        clearStartup = () => observer.disconnect()
      }
      scroller.dispatchEvent(new CustomEvent("kniff-loop-render", { detail: true }))
      const copies = scroller.querySelectorAll<HTMLElement>(":scope > [data-kniff-loop-copy]")
      if (!copies.length || scroller.hasAttribute("data-kniff-loop")) return false
      clearStartup?.()
      clearStartup = undefined
      const previousSnap = scroller.style.scrollSnapType
      const previousBehavior = scroller.style.scrollBehavior
      const previousTransform = scroller.style.transform

      scroller.style.scrollSnapType = "none"
      scroller.style.scrollBehavior = "auto"
      scroller.setAttribute("data-kniff-loop", "")
      let restoreFrame = 0
      let jumping = false
      let pointerDown = false
      let touchDown = false
      let settleTimer = 0
      const needsScrollEndFallback = !Reflect.has(scroller, "onscrollend")
      const geometry = () => {
        const first = slideBoxes(originalCycle)[0]
        const nextWrapper = scroller.querySelector<HTMLElement>(
          ":scope > [data-kniff-loop-original] ~ [data-kniff-loop-copy]",
        )
        const nextCycle = nextWrapper ? slideBoxes(nextWrapper)[0] : null
        if (!first || !nextCycle) return null
        const box = scroller.getBoundingClientRect()
        const firstBox = first.getBoundingClientRect()
        const cycle = nextCycle.getBoundingClientRect().left - firstBox.left
        if (cycle <= 0 || scroller.clientWidth === 0) return null
        const css = getComputedStyle(scroller)
        const left = parseFloat(css.scrollPaddingLeft) || 0
        const right = parseFloat(css.scrollPaddingRight) || 0
        const factor = align === "end" ? 1 : align === "center" ? 0.5 : 0
        const origin = scroller.scrollLeft + firstBox.left - box.left - scroller.clientLeft
        const start =
          origin - left - (scroller.clientWidth - left - right - firstBox.width) * factor
        return { cycle, start }
      }
      const initial = geometry()
      if (!initial) {
        scroller.removeAttribute("data-kniff-loop")
        scroller.style.scrollSnapType = previousSnap
        scroller.style.scrollBehavior = previousBehavior
        return false
      }
      const jump = (position: number) => {
        jumping = true
        scroller.style.transform = "translateZ(0)"
        scroller.style.scrollSnapType = "none"
        scroller.style.scrollBehavior = "auto"
        const isSafari =
          navigator.vendor === "Apple Computer, Inc." && /Safari/.test(navigator.userAgent)
        if (isSafari) {
          // Commit overflow changes to reset Safari's stale scroll layer.
          const overflowX = scroller.style.getPropertyValue("overflow-x")
          const priority = scroller.style.getPropertyPriority("overflow-x")
          scroller.style.setProperty("overflow-x", "hidden", "important")
          void scroller.offsetWidth
          scroller.scrollLeft = position
          void scroller.offsetWidth
          scroller.style.setProperty("overflow-x", overflowX, priority)
          void scroller.offsetWidth
        } else {
          scroller.scrollLeft = position
        }

        cancelAnimationFrame(restoreFrame)
        restoreFrame = requestAnimationFrame(() => {
          scroller.style.scrollSnapType = previousSnap
          scroller.style.scrollBehavior = previousBehavior

          restoreFrame = requestAnimationFrame(() => {
            jumping = false
            scroller.setAttribute("data-kniff-loop-ready", "")
          })
        })
      }
      const normalize = () => {
        if (
          jumping ||
          pointerDown ||
          touchDown ||
          scroller.hasAttribute("data-kniff-auto-move") ||
          scroller.hasAttribute("data-kniff-lightbox-open")
        ) {
          return
        }
        const g = geometry()
        if (!g) {
          return
        }
        const offset = scroller.scrollLeft - g.start
        const cycles = Math.floor((offset + 0.5) / g.cycle)

        if (cycles !== 0) jump(scroller.scrollLeft - cycles * g.cycle)
      }
      // Older iOS Safari has no scrollend. Wait for momentum/snap scrolling
      // to stop, and never reset while a touch is still held.
      const scheduleSettle = () => {
        if (!needsScrollEndFallback) return
        window.clearTimeout(settleTimer)
        settleTimer = window.setTimeout(() => {
          if (!pointerDown && !touchDown) normalize()
        }, 180)
      }
      const touchStart = () => {
        touchDown = true
        window.clearTimeout(settleTimer)
      }
      const touchEnd = (event: TouchEvent) => {
        touchDown = event.touches.length > 0
        scheduleSettle()
      }
      const press = () => {
        pointerDown = true
      }
      const release = () => {
        pointerDown = false
        scheduleSettle()
      }
      scroller.addEventListener("scrollend", normalize)
      if (needsScrollEndFallback) {
        scroller.addEventListener("scroll", scheduleSettle, { passive: true })
        scroller.addEventListener("touchstart", touchStart, { passive: true })
        window.addEventListener("touchend", touchEnd, { passive: true })
        window.addEventListener("touchcancel", touchEnd, { passive: true })
      }
      scroller.addEventListener("pointerdown", press, { passive: true })
      window.addEventListener("pointerup", release)
      window.addEventListener("pointercancel", release)

      jump(initial.start)
      dispose = () => {
        scroller.style.transform = previousTransform
        cancelAnimationFrame(restoreFrame)
        window.clearTimeout(settleTimer)
        scroller.removeEventListener("scroll", scheduleSettle)
        scroller.removeEventListener("touchstart", touchStart)
        window.removeEventListener("touchend", touchEnd)
        window.removeEventListener("touchcancel", touchEnd)
        scroller.removeEventListener("scrollend", normalize)
        scroller.removeEventListener("pointerdown", press)
        window.removeEventListener("pointerup", release)
        window.removeEventListener("pointercancel", release)
        scroller.dispatchEvent(new CustomEvent("kniff-loop-render", { detail: false }))
        scroller.removeAttribute("data-kniff-loop-ready")
        scroller.removeAttribute("data-kniff-loop")
        scroller.style.scrollSnapType = previousSnap
        scroller.style.scrollBehavior = previousBehavior
      }

      return true
    }
    const attempt = () => {
      if (cancelled || dispose) return
      if (install()) return
      if (++retry < 120) frame = requestAnimationFrame(attempt)
    }
    if (align !== "start") attempt()
    else frame = requestAnimationFrame(attempt)
    return () => {
      cancelled = true
      cancelAnimationFrame(frame)
      clearStartup?.()
      dispose?.()
    }
  }, [selector, align, loop, registeredViewport, styleRef])
}
