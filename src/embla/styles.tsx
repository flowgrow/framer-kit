import type { CSSProperties } from "react"

import type { EmblaStyles } from "./types.js"

export const EMBLA_CLASS = "kniff-embla"
export const EMBLA_VIEWPORT_CLASS = "kniff-embla__viewport"
export const EMBLA_CONTAINER_CLASS = "kniff-embla__container"

export const EMBLA_STRUCTURAL_CSS = `
.kniff-embla__viewport {
  overflow: var(--kniff-embla-overflow, visible);
  position: relative;
}
.kniff-embla__container {
  position: relative;
  touch-action: var(--kniff-embla-touch-action, pan-y pinch-zoom);
}
.kniff-embla__container > * {
  flex: 0 0 var(--kniff-embla-slide-size, auto);
  min-width: 0;
}
.kniff-embla__viewport[data-kniff-embla-select-on-slide-click="true"] .kniff-embla__container > * {
  cursor: pointer;
}
.kniff-embla__container[data-kniff-embla-loop-gap-side="inline-end"] > :last-child {
  margin-inline-end: var(--kniff-embla-loop-gap, 0px);
}
.kniff-embla__container[data-kniff-embla-loop-gap-side="inline-start"] > :last-child {
  margin-inline-start: var(--kniff-embla-loop-gap, 0px);
}
.kniff-embla__container[data-kniff-embla-loop-gap-side="block-end"] > :last-child {
  margin-block-end: var(--kniff-embla-loop-gap, 0px);
}
.kniff-embla__container[data-kniff-embla-loop-gap-side="block-start"] > :last-child {
  margin-block-start: var(--kniff-embla-loop-gap, 0px);
}
`

export type EmblaLoopGapSide =
  | "inline-end"
  | "inline-start"
  | "block-end"
  | "block-start"

interface EmblaContainerLayout {
  columnGap: string
  flexDirection: string
  rowGap: string
}

/** Resolves Framer's computed flex gap and the logical loop-seam side. */
export function getEmblaLoopGap(
  layout: EmblaContainerLayout,
): { gap: string; side: EmblaLoopGapSide } {
  switch (layout.flexDirection) {
    case "row-reverse":
      return { gap: layout.columnGap, side: "inline-start" }
    case "column":
      return { gap: layout.rowGap, side: "block-end" }
    case "column-reverse":
      return { gap: layout.rowGap, side: "block-start" }
    case "row":
    default:
      return { gap: layout.columnGap, side: "inline-end" }
  }
}

/**
 * Mirrors Framer's native gap as a final-slide margin. The positioned viewport
 * gives the container and slides a shared offset coordinate system, preventing
 * page/section padding from being subtracted from Embla's loop distance.
 * Returns true when the measured spacing changed and Embla should re-initialize.
 */
export function syncEmblaLoopGap(
  viewport: HTMLElement,
  loop: boolean,
): boolean {
  const container = viewport.querySelector<HTMLElement>(
    `:scope > .${EMBLA_CONTAINER_CLASS}`,
  )
  if (!container) return false

  const previousGap = container.style.getPropertyValue(
    "--kniff-embla-loop-gap",
  )
  const previousSide = container.dataset.kniffEmblaLoopGapSide

  if (!loop) {
    container.style.removeProperty("--kniff-embla-loop-gap")
    delete container.dataset.kniffEmblaLoopGapSide
    return Boolean(previousGap || previousSide)
  }

  // The active data attribute zeroes the native gap. Temporarily disable our
  // normalization so responsive values from Framer's stylesheet can be read.
  if (previousSide) delete container.dataset.kniffEmblaLoopGapSide
  const layout = window.getComputedStyle(container)
  const { gap, side } = getEmblaLoopGap(layout)
  const normalizedGap = gap === "normal" || gap.length === 0 ? "0px" : gap

  container.dataset.kniffEmblaLoopGapSide = side

  if (previousGap === normalizedGap && previousSide === side) return false

  container.style.setProperty("--kniff-embla-loop-gap", normalizedGap)
  return true
}

/** Watches responsive Framer layout changes without polling every animation frame. */
export function observeEmblaLoopGap(
  viewport: HTMLElement,
  loop: boolean,
  onGapChange: () => void,
): () => void {
  let animationFrame = 0

  const measure = () => {
    animationFrame = 0
    if (syncEmblaLoopGap(viewport, loop)) onGapChange()
  }
  const scheduleMeasure = () => {
    if (animationFrame !== 0) return
    animationFrame = window.requestAnimationFrame(measure)
  }

  const resizeObserver =
    typeof ResizeObserver === "undefined"
      ? undefined
      : new ResizeObserver(scheduleMeasure)
  resizeObserver?.observe(viewport)

  const container = viewport.querySelector<HTMLElement>(
    `:scope > .${EMBLA_CONTAINER_CLASS}`,
  )
  if (container) resizeObserver?.observe(container)

  const mutationObserver =
    typeof MutationObserver === "undefined"
      ? undefined
      : new MutationObserver(scheduleMeasure)
  if (container) {
    mutationObserver?.observe(container, {
      attributes: true,
      attributeFilter: ["class"],
    })
  }

  window.addEventListener("resize", scheduleMeasure)
  window.addEventListener("orientationchange", scheduleMeasure)
  scheduleMeasure()

  return () => {
    if (animationFrame !== 0) window.cancelAnimationFrame(animationFrame)
    resizeObserver?.disconnect()
    mutationObserver?.disconnect()
    window.removeEventListener("resize", scheduleMeasure)
    window.removeEventListener("orientationchange", scheduleMeasure)
  }
}

type EmblaWrapperStyle = CSSProperties & {
  "--kniff-embla-overflow": "hidden" | "visible"
  "--kniff-embla-slide-size": string
  "--kniff-embla-touch-action": string
}

export function createEmblaWrapperStyle(
  styles?: EmblaStyles,
): EmblaWrapperStyle {
  return {
    display: "block",
    width: "100%",
    height: "100%",
    "--kniff-embla-overflow": styles?.overflow ?? "visible",
    "--kniff-embla-slide-size": styles?.slideSize ?? "auto",
    "--kniff-embla-touch-action":
      styles?.touchAction ?? "pan-y pinch-zoom",
  }
}
