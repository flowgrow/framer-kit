import type { CSSProperties } from "react"

import type { EmblaStyles } from "./types.js"

export const EMBLA_CLASS = "kniff-embla"
export const EMBLA_VIEWPORT_CLASS = "kniff-embla__viewport"
export const EMBLA_CONTAINER_CLASS = "kniff-embla__container"

export const EMBLA_STRUCTURAL_CSS = `
.kniff-embla__viewport {
  overflow: var(--kniff-embla-overflow, hidden);
}
.kniff-embla__container {
  touch-action: var(--kniff-embla-touch-action, pan-y pinch-zoom);
}
.kniff-embla__container > * {
  flex: 0 0 var(--kniff-embla-slide-size, auto);
  min-width: 0;
}
`

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
    "--kniff-embla-overflow": styles?.overflow ?? "hidden",
    "--kniff-embla-slide-size": styles?.slideSize ?? "auto",
    "--kniff-embla-touch-action":
      styles?.touchAction ?? "pan-y pinch-zoom",
  }
}
