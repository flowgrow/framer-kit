import {
  addPropertyControls,
  ControlType,
  RenderTarget,
  type PropertyControls,
} from "framer"
import type { CSSProperties, ReactNode } from "react"

import {
  cloneWithInnermostText,
  getCarouselPageCount,
  getSlotElement,
  useCarouselPagination,
} from "./accessoryUtils.js"
import { useEmblaStore } from "./store.js"

export interface EmblaSlideCounterProps {
  carouselID?: string
  componentSlot?: ReactNode
  style?: CSSProperties
}

const counterDefaults = {
  carouselID: "kniff-carousel-1",
} as const

const fallbackStyle: CSSProperties = {
  appearance: "none",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: "100%",
  height: "100%",
  padding: "8px 16px",
  border: "1px solid RebeccaPurple",
  background: "lavender",
  color: "RebeccaPurple",
}

function useCounterState(carouselID: string) {
  const emblaApi = useEmblaStore((state) =>
    state.emblaInstances.get(carouselID),
  )
  const pagination = useCarouselPagination(emblaApi)
  const isCanvas = RenderTarget.current() === RenderTarget.canvas
  const selectedIndex = isCanvas ? 0 : pagination.selectedIndex
  const scrollSnaps = isCanvas ? [0, 1, 2, 3] : pagination.scrollSnaps
  const pageCount = isCanvas
    ? scrollSnaps.length
    : getCarouselPageCount(emblaApi, scrollSnaps)

  return { selectedIndex, pageCount }
}

function renderCounter(
  value: number,
  componentSlot: ReactNode | undefined,
  style: CSSProperties | undefined,
) {
  const component = getSlotElement(componentSlot)
  return component ? (
    cloneWithInnermostText(component, String(value))
  ) : (
    <div aria-live="polite" style={{ ...fallbackStyle, ...style }}>
      {value}
    </div>
  )
}

/** Displays the one-based selected snap index. */
export function EmblaCurrentIndex(props: EmblaSlideCounterProps) {
  const settings = { ...counterDefaults, ...props }
  const { selectedIndex } = useCounterState(settings.carouselID)
  return renderCounter(selectedIndex + 1, settings.componentSlot, settings.style)
}

/** Displays the carousel's page/snap count, matching the original component. */
export function EmblaTotalSlides(props: EmblaSlideCounterProps) {
  const settings = { ...counterDefaults, ...props }
  const { pageCount } = useCounterState(settings.carouselID)
  return renderCounter(pageCount, settings.componentSlot, settings.style)
}

EmblaCurrentIndex.defaultProps = counterDefaults
EmblaCurrentIndex.displayName = "Embla Current Index"
EmblaTotalSlides.defaultProps = counterDefaults
EmblaTotalSlides.displayName = "Embla Total Slides"

export const emblaSlideCounterPropertyControls = {
  carouselID: {
    title: "ID",
    type: ControlType.String,
    defaultValue: counterDefaults.carouselID,
    description: "Use the same ID as the Carousel instance to read",
  },
  componentSlot: {
    title: "Connect",
    type: ControlType.Slot,
    maxCount: 1,
  },
} satisfies PropertyControls<EmblaSlideCounterProps>

let currentIndexControlsRegistered = false
let totalSlidesControlsRegistered = false

export function registerEmblaCurrentIndexPropertyControls(): void {
  if (currentIndexControlsRegistered) return
  addPropertyControls(EmblaCurrentIndex, emblaSlideCounterPropertyControls)
  currentIndexControlsRegistered = true
}

export function registerEmblaTotalSlidesPropertyControls(): void {
  if (totalSlidesControlsRegistered) return
  addPropertyControls(EmblaTotalSlides, emblaSlideCounterPropertyControls)
  totalSlidesControlsRegistered = true
}
