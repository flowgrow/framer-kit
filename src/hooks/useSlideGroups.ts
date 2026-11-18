import { useLayoutEffect, type RefObject } from "react"
// @ts-ignore Framer code-file import.
import { slideBoxes, slideRect } from "../carousel/snapGeometry.ts"

export type SlideBy = number | "auto"

/** Groups are fixed in content order, not relative to the current scroll position. */
export function groupSlideRanges(widths: number[], gap: number, available: number, by: SlideBy) {
  const groups: { start: number; end: number; width: number }[] = []
  const count = by === "auto" ? Infinity : Math.max(1, Math.floor(Number(by) || 1))
  for (let start = 0; start < widths.length;) {
    let end = start + 1
    let width = widths[start]!
    while (end < widths.length && end - start < count) {
      const next = width + gap + widths[end]!
      if (by === "auto" && next > available + 0.5) break
      width = next
      end++
    }
    groups.push({ start, end, width })
    start = end
  }
  return groups
}

export function useSlideGroups(
  marker: RefObject<HTMLStyleElement>,
  selector: string,
  registered: HTMLElement | null,
  by: SlideBy,
  align: "start" | "center" | "end",
  loop: boolean,
  edgeSpace: boolean,
) {
  useLayoutEffect(() => {
    if (!selector) return
    const viewport =
      registered ?? marker.current?.ownerDocument.querySelector<HTMLElement>(selector)
    if (!viewport) return
    let endStop: HTMLSpanElement | undefined
    const saved = new Map<HTMLElement, string>()
    let frame = 0
    const observed = new Set<HTMLElement>()
    const write = (el: HTMLElement, property: string, value: string) => {
      if (el.style.getPropertyValue(property) !== value) el.style.setProperty(property, value)
    }
    const refresh = () => {
      frame = 0
      const all = slideBoxes(viewport).filter(el => !el.hasAttribute("data-kniff"))
      const originals = all.filter((el) => !el.closest("[data-kniff-loop-copy]"))
      if (!originals.length) return
      const css = getComputedStyle(viewport)
      const available =
        viewport.clientWidth -
        (parseFloat(css.scrollPaddingLeft) || 0) -
        (parseFloat(css.scrollPaddingRight) || 0)
      const gap = parseFloat(css.columnGap) || 0
      const groups = groupSlideRanges(
        originals.map((el) => slideRect(viewport, el).width),
        gap,
        available,
        by,
      )
      const starts = new Map(groups.map((g, index) => [g.start, { ...g, index }]))
      const factor = align === "start" ? 0 : align === "end" ? 1 : 0.5
      for (const [index, slide] of all.entries()) {
        if (!saved.has(slide)) saved.set(slide, slide.getAttribute("style") ?? "")
        const group = starts.get(index % originals.length)
        const extra = group && group.end - group.start > 1 ? Math.max(0, group.width - slideRect(viewport, slide).width) : 0
        write(slide, "scroll-snap-align", group ? align : "none")
        if (extra > 0) write(slide, "scroll-margin-right", `${extra}px`)
        else slide.style.removeProperty("scroll-margin-right")
        if (group) slide.setAttribute("data-kniff-group", String(group.index))
        else slide.removeAttribute("data-kniff-group")
      }
      // Existing edge-space CSS consumes the widths of the first/last GROUP.
      write(viewport, "--kniff-first-slide-width", `${groups[0]!.width}px`)
      write(viewport, "--kniff-last-slide-width", `${groups[groups.length - 1]!.width}px`)
      // A separate terminal snap area exposes an oversized tail or a CMS loader.
      // It is a stop, not a slide, and disappears once it duplicates a group stop.
      const lastGroup = groups[groups.length - 1]!
      const last = originals[originals.length - 1]!
      const firstOfLast = originals[lastGroup.start]!
      const box = viewport.getBoundingClientRect()
      const left = parseFloat(css.scrollPaddingLeft) || 0
      const right = parseFloat(css.scrollPaddingRight) || 0
      const loader = viewport.querySelector<HTMLElement>("[data-kniff-ignore-slide]")
      const lastRight = Math.max(slideRect(viewport, last).left + slideRect(viewport, last).width, loader?.getBoundingClientRect().right ?? -Infinity)
      const end = lastRight - box.left - viewport.clientLeft + viewport.scrollLeft
      const max = Math.max(0, viewport.scrollWidth - viewport.clientWidth)
      const anchor = slideRect(viewport, firstOfLast).left - box.left - viewport.clientLeft + viewport.scrollLeft - left - (available - lastGroup.width) * factor
      const tail = Math.max(0, Math.min(max, end - viewport.clientWidth + right))
      if (!loop && tail > Math.max(0, Math.min(max, anchor)) + 1) {
        if (!endStop) {
          endStop = document.createElement("span")
          endStop.setAttribute("data-kniff", "")
          endStop.setAttribute("data-kniff-end-stop", "")
          endStop.setAttribute("aria-hidden", "true")
          endStop.style.cssText = "position:absolute;width:1px;height:1px;top:0;pointer-events:none;scroll-snap-align:end;"
          viewport.append(endStop)
        }
        write(endStop, "left", `${end - 1}px`)
        endStop.setAttribute("data-kniff-group", String(groups.length))
      } else {
        endStop?.remove()
        endStop = undefined
      }
      viewport.setAttribute("data-kniff-slide-by", String(by))
      for (const el of observed)
        if (!originals.includes(el)) {
          resize.unobserve(el)
          observed.delete(el)
        }
      for (const el of originals)
        if (!observed.has(el)) {
          resize.observe(el)
          observed.add(el)
        }
      mutations.takeRecords()
      viewport.dispatchEvent(new Event("kniff-groups-changed"))
    }
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(refresh)
    }
    const resize = new ResizeObserver(schedule)
    const mutations = new MutationObserver(schedule)
    mutations.observe(viewport, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["class", "style", "hidden"],
    })
    resize.observe(viewport)
    refresh()
    return () => {
      cancelAnimationFrame(frame)
      resize.disconnect()
      mutations.disconnect()
      for (const [slide, style] of saved) {
        const original = document.createElement("div")
        original.setAttribute("style", style)
        for (const property of ["scroll-snap-align", "scroll-margin-right"])
          slide.style.setProperty(
            property,
            original.style.getPropertyValue(property),
            original.style.getPropertyPriority(property),
          )
        slide.removeAttribute("data-kniff-group")
      }
      endStop?.remove()
      viewport.removeAttribute("data-kniff-slide-by")
      viewport.style.removeProperty("--kniff-first-slide-width")
      viewport.style.removeProperty("--kniff-last-slide-width")
    }
  }, [marker, selector, registered, by, align, loop, edgeSpace])
}
