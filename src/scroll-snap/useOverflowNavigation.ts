import { useEffect, useRef, useState, type RefObject } from "react"
import { overflowSnapPoints, slideBoxes } from "./snapGeometry.js"
import { cancelOverflowMove, getPendingOverflowDestination, moveOverflowViewport } from "./snapNavigation.js"

function selectorFor(id: string) {
  const value = JSON.stringify(id).replace(/</g, "\\3c ")
  return `:is([aria-label=${value}], [data-framer-name=${value}]:not([aria-label]))`
}

function nearestViewport(id: string, button: HTMLElement, doc: Document): HTMLElement | null {
  const buttonRect = button.getBoundingClientRect()
  const buttonX = buttonRect.left + buttonRect.width / 2
  const buttonY = buttonRect.top + buttonRect.height / 2
  const buttonAncestors = new Map<Element, number>()
  for (let ancestor: Element | null = button, steps = 0; ancestor; ancestor = ancestor.parentElement, steps++) {
    buttonAncestors.set(ancestor, steps)
  }
  let nearest: HTMLElement | null = null
  let nearestAncestorSteps = Infinity
  let distance = Infinity
  for (const target of doc.querySelectorAll<HTMLElement>(selectorFor(id))) {
    if (!target.getClientRects().length || !target.clientWidth) continue
    const viewport = target.hasAttribute("data-kniff-react-loop") ? target : target.firstElementChild
    if (!(viewport instanceof HTMLElement)) continue
    const rect = target.getBoundingClientRect()
    const dx = Math.max(rect.left - buttonX, 0, buttonX - rect.right)
    const dy = Math.max(rect.top - buttonY, 0, buttonY - rect.bottom)
    const candidateDistance = dx * dx + dy * dy
    let ancestorSteps = Infinity
    for (let ancestor: Element | null = target; ancestor; ancestor = ancestor.parentElement) {
      const steps = buttonAncestors.get(ancestor)
      if (steps !== undefined) { ancestorSteps = steps; break }
    }
    if (ancestorSteps < nearestAncestorSteps || (ancestorSteps === nearestAncestorSteps && candidateDistance < distance)) {
      nearest = viewport
      nearestAncestorSteps = ancestorSteps
      distance = candidateDistance
    }
  }
  return nearest
}

function connectOverflowNavigation(id: string, button: HTMLElement, viewportRef: { current: HTMLElement | null }, setAvailable: (value: number) => void): { refresh: () => void; dispose: () => void } {
    const doc = button.ownerDocument
    const win = doc.defaultView ?? window
    const targetId = id
    let frame = 0
    let disposeActive: (() => void) | undefined
    let candidates: HTMLElement[] = []

    const observeCandidateSizes = new ResizeObserver(() => scheduleSelection())
    const refreshCandidates = () => {
      const next = Array.from(doc.querySelectorAll<HTMLElement>(selectorFor(targetId)))
      if (next.length === candidates.length && next.every((node, index) => node === candidates[index])) return
      observeCandidateSizes.disconnect()
      candidates = next
      for (const candidate of candidates) observeCandidateSizes.observe(candidate)
    }

    const bind = (viewport: HTMLElement | null) => {
      const old = viewportRef.current
      if (old === viewport) return
      disposeActive?.()
      disposeActive = undefined
      if (old) {
        cancelOverflowMove(old)
        old.scrollTo({ left: old.scrollLeft, behavior: "instant" })
      }
      viewportRef.current = viewport
      setAvailable(0)
      if (!viewport) return

      const activeSizing = viewport.parentElement
      let geometryDirty = true
      let points: number[] = []
      let hasRange = false
      let looping = false
      let updateFrame = 0
      const update = () => {
        if (geometryDirty) {
          hasRange = viewport.scrollWidth > viewport.clientWidth + 2
          looping = viewport.hasAttribute("data-kniff-loop") && hasRange
          // Snap positions change with layout, never on the steady scroll path.
          points = hasRange && !looping ? overflowSnapPoints(viewport) : []
          geometryDirty = false
        }
        if (looping || !hasRange) {
          setAvailable(looping ? 3 : 0)
          return
        }
        const current = getPendingOverflowDestination(viewport) ?? viewport.scrollLeft
        const prev = points.some(point => point < current - 2)
        const next = points.some(point => point > current + 2)
        setAvailable((prev ? 1 : 0) | (next ? 2 : 0))
      }
      const scheduleUpdate = () => {
        if (!geometryDirty && (looping || !hasRange)) return
        if (!updateFrame) updateFrame = win.requestAnimationFrame(() => { updateFrame = 0; update() })
      }
      const invalidate = () => { geometryDirty = true; scheduleUpdate() }
      const resize = new ResizeObserver(invalidate)
      const watchSlides = () => {
        resize.disconnect()
        resize.observe(viewport)
        if (activeSizing) resize.observe(activeSizing)
        for (const slide of slideBoxes(viewport)) resize.observe(slide)
      }
      watchSlides()
      const mutation = new MutationObserver(records => {
        if (records.some(record => record.type === "childList")) watchSlides()
        invalidate()
      })
      mutation.observe(viewport, { childList: true, subtree: true, attributes: true, attributeFilter: ["style", "class", "data-kniff-loop"] })
      if (activeSizing) mutation.observe(activeSizing, { attributes: true, attributeFilter: ["style", "class"] })
      for (const event of ["scroll", "scrollend", "kniff-scroll-navigation"]) viewport.addEventListener(event, scheduleUpdate, { passive: true })
      update()
      disposeActive = () => {
        win.cancelAnimationFrame(updateFrame)
        resize.disconnect()
        mutation.disconnect()
        for (const event of ["scroll", "scrollend", "kniff-scroll-navigation"]) viewport.removeEventListener(event, scheduleUpdate)
      }
    }

    const refreshSelection = () => {
      frame = 0
      refreshCandidates()
      bind(nearestViewport(targetId, button, doc))
    }
    const scheduleSelection = () => {
      if (!frame) frame = win.requestAnimationFrame(refreshSelection)
    }
    const selectionMutation = new MutationObserver(records => {
      if (records.some(record => record.type === "childList" ||
        (record.target instanceof Element && candidates.some(candidate => record.target === candidate || record.target.contains(candidate))))) {
        scheduleSelection()
      }
    })
    selectionMutation.observe(doc.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["style", "class", "hidden", "aria-label", "data-framer-name"] })
    win.addEventListener("resize", scheduleSelection)
    refreshSelection()
    return { refresh: refreshSelection, dispose: () => {
      win.cancelAnimationFrame(frame)
      win.removeEventListener("resize", scheduleSelection)
      selectionMutation.disconnect()
      observeCandidateSizes.disconnect()
      disposeActive?.()
      const old = viewportRef.current
      if (old) cancelOverflowMove(old)
      viewportRef.current = null
    } }
}

/** Owns viewport selection, availability, and movement for one Framer control. */
export function useOverflowNavigation(id: string, enabled: boolean, buttonRef: RefObject<HTMLElement>) {
  const [available, setAvailable] = useState(0)
  const viewportRef = useRef<HTMLElement | null>(null)
  const refreshRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    const button = buttonRef.current
    if (!enabled || !id.trim() || !button) {
      viewportRef.current = null
      return
    }

    const connection = connectOverflowNavigation(id.trim(), button, viewportRef, setAvailable)
    refreshRef.current = connection.refresh
    return () => {
      refreshRef.current = null
      connection.dispose()
    }
  }, [buttonRef, enabled, id])

  const move = (direction: number) => {
    refreshRef.current?.()
    const viewport = viewportRef.current
    if (viewport) moveOverflowViewport(viewport, direction)
  }
  return { available, move }
}
