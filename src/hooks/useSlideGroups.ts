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
    const markedSlides = new Set<HTMLElement>()
    const observed = new Set<HTMLElement>()
    const slideCandidates = new Set<Element>()
    let discoveredSlides: HTMLElement[] | undefined
    const write = (el: HTMLElement, property: string, value: string) => {
      if (el.style.getPropertyValue(property) !== value) el.style.setProperty(property, value)
    }
    const refresh = () => {
      frame = 0
      if (!discoveredSlides) {
        slideCandidates.clear()
        discoveredSlides = slideBoxes(viewport, (child) => slideCandidates.add(child))
      }
      const all = discoveredSlides.filter((el) => !el.hasAttribute("data-kniff"))
      const currentSlides = new Set(all)
      for (const slide of markedSlides) {
        if (currentSlides.has(slide)) continue
        slide.removeAttribute("data-kniff-carousel-slide")
        markedSlides.delete(slide)
      }
      for (const slide of currentSlides) {
        if (markedSlides.has(slide)) continue
        slide.setAttribute("data-kniff-carousel-slide", "")
        markedSlides.add(slide)
      }
      const originals = all.filter((el) => !el.closest("[data-kniff-loop-copy]"))
      if (!originals.length) return
      const css = getComputedStyle(viewport)
      const available =
        viewport.clientWidth -
        (parseFloat(css.scrollPaddingLeft) || 0) -
        (parseFloat(css.scrollPaddingRight) || 0)
      const gap = parseFloat(css.columnGap) || 0
      const single = by === 1
      const groups = single
        ? []
        : groupSlideRanges(
            originals.map((el) => slideRect(viewport, el).width),
            gap,
            available,
            by,
          )
      const starts = single ? null : new Map(groups.map((g, index) => [g.start, { ...g, index }]))
      const factor = align === "start" ? 0 : align === "end" ? 1 : 0.5
      for (const [index, slide] of (single ? [] : all).entries()) {
        if (!saved.has(slide)) saved.set(slide, slide.getAttribute("style") ?? "")
        const group = starts!.get(index % originals.length)
        const extra =
          group && group.end - group.start > 1
            ? Math.max(0, group.width - slideRect(viewport, slide).width)
            : 0
        write(slide, "scroll-snap-align", group ? align : "none")
        if (extra > 0) write(slide, "scroll-margin-right", `${extra}px`)
        else slide.style.removeProperty("scroll-margin-right")
        if (group) slide.setAttribute("data-kniff-group", String(group.index))
        else slide.removeAttribute("data-kniff-group")
      }
      if (!loop && edgeSpace) {
        // Existing edge-space CSS consumes the widths of the first/last GROUP.
        write(
          viewport,
          "--kniff-first-slide-width",
          `${single ? slideRect(viewport, originals[0]!).width : groups[0]!.width}px`,
        )
        write(
          viewport,
          "--kniff-last-slide-width",
          `${single ? slideRect(viewport, originals[originals.length - 1]!).width : groups[groups.length - 1]!.width}px`,
        )
      }
      if (!loop) {
        // A separate terminal snap area exposes an oversized tail or a CMS loader.
        // It is a stop, not a slide, and disappears once it duplicates a group stop.
        const lastGroup = groups[groups.length - 1]
        const last = originals[originals.length - 1]!
        const firstOfLast = single ? last : originals[lastGroup!.start]!
        const box = viewport.getBoundingClientRect()
        const left = parseFloat(css.scrollPaddingLeft) || 0
        const right = parseFloat(css.scrollPaddingRight) || 0
        const loader = viewport.querySelector<HTMLElement>("[data-kniff-ignore-slide]")
        const lastRight = Math.max(
          slideRect(viewport, last).left + slideRect(viewport, last).width,
          loader?.getBoundingClientRect().right ?? -Infinity,
        )
        const end = lastRight - box.left - viewport.clientLeft + viewport.scrollLeft
        const max = Math.max(0, viewport.scrollWidth - viewport.clientWidth)
        const anchor =
          slideRect(viewport, firstOfLast).left -
          box.left -
          viewport.clientLeft +
          viewport.scrollLeft -
          left -
          (available - (single ? slideRect(viewport, last).width : lastGroup!.width)) * factor
        const tail = Math.max(0, Math.min(max, end - viewport.clientWidth + right))
        if (!loop && tail > Math.max(0, Math.min(max, anchor)) + 1) {
          if (!endStop) {
            endStop = document.createElement("span")
            endStop.setAttribute("data-kniff", "")
            endStop.setAttribute("data-kniff-end-stop", "")
            endStop.setAttribute("aria-hidden", "true")
            endStop.style.cssText =
              "position:absolute;width:1px;height:1px;top:0;pointer-events:none;scroll-snap-align:end;"
            viewport.append(endStop)
          }
          write(endStop, "left", `${end - 1}px`)
          endStop.setAttribute(
            "data-kniff-group",
            String(single ? originals.length : groups.length),
          )
        } else {
          endStop?.remove()
          endStop = undefined
        }
      }
      viewport.setAttribute("data-kniff-slide-by", String(by))
      const measured = single
        ? loop
          ? []
          : [originals[0]!, originals[originals.length - 1]!]
        : originals
      for (const el of observed)
        if (!measured.includes(el)) {
          resize.unobserve(el)
          observed.delete(el)
        }
      for (const el of measured)
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
    const invalidateDiscovery = () => {
      discoveredSlides = undefined
      schedule()
    }
    const resize = new ResizeObserver((entries) => {
      if (entries.some(({ target }) => target === viewport)) invalidateDiscovery()
      else schedule()
    })
    const displayDeclaration = (style: string | null) =>
      style?.match(/(?:^|;)\s*display\s*:[^;]*/gi)?.join(";") ?? ""
    const geometryStyle = (style: string | null) =>
      (style ?? "")
        .split(";")
        .map((declaration) => declaration.trim())
        .filter(
          (declaration) =>
            declaration &&
            !/^(?:transform(?:-origin)?|translate|rotate|scale|opacity|filter|pointer-events|cursor|scroll-snap-type|scroll-behavior)\s*:/i.test(
              declaration,
            ),
        )
        .join(";")
    const mutations = new MutationObserver((records) => {
      const discoveryChanged = records.some(({ type, target, attributeName, oldValue }) => {
        if (
          type === "childList" ||
          (attributeName !== "class" && attributeName !== "style" && attributeName !== "hidden")
        )
          return true
        if (target !== viewport && !slideCandidates.has(target as Element)) return false
        if (attributeName !== "style") return true
        return (
          displayDeclaration(oldValue) !==
          displayDeclaration((target as Element).getAttribute("style"))
        )
      })
      if (discoveryChanged) invalidateDiscovery()
      else if (
        records.some(({ target, attributeName, oldValue }) => {
          const element = target as Element
          if (
            target !== viewport &&
            !slideCandidates.has(element) &&
            !element.closest("[data-kniff-ignore-slide]")
          )
            return false
          return (
            attributeName !== "style" ||
            geometryStyle(oldValue) !== geometryStyle(element.getAttribute("style"))
          )
        })
      )
        schedule()
    })
    window.addEventListener("resize", invalidateDiscovery)
    mutations.observe(viewport, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeOldValue: true,
      attributeFilter: [
        "class",
        "style",
        "hidden",
        "data-kniff-ignore-slide",
        "data-kniff-ramka-settings",
        "data-kniff-preview-settings",
        "data-kniff-carousel-settings",
      ],
    })
    resize.observe(viewport)
    refresh()
    return () => {
      cancelAnimationFrame(frame)
      resize.disconnect()
      mutations.disconnect()
      window.removeEventListener("resize", invalidateDiscovery)
      for (const slide of markedSlides) slide.removeAttribute("data-kniff-carousel-slide")
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
