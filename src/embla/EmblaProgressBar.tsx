import {
  addPropertyControls,
  ControlType,
  RenderTarget,
  type PropertyControls,
} from "framer"
import {
  Children,
  cloneElement,
  type CSSProperties,
  type ReactNode,
} from "react"

import {
  getCarouselPageCount,
  getSlotElement,
  useCarouselPagination,
} from "./accessoryUtils.js"
import { useEmblaStore } from "./store.js"

export interface EmblaProgressBarProps {
  carouselID?: string
  trackComponentSlot?: ReactNode
  fillComponentSlot?: ReactNode
  style?: CSSProperties
}

export const emblaProgressBarDefaults = {
  carouselID: "kniff-carousel-1",
} as const

function NativeProgress({
  hidden = false,
  value,
}: {
  hidden?: boolean
  value: number
}) {
  return (
    <progress
      aria-label="Carousel progress"
      max={1}
      style={
        hidden
          ? {
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              opacity: 0,
              pointerEvents: "none",
            }
          : { width: "100%", height: "100%" }
      }
      value={Math.round(value * 100) / 100}
    >
      {Math.round(value * 100)}%
    </progress>
  )
}

/** Displays selected-page progress using native or connected Framer layers. */
export function EmblaProgressBar(props: EmblaProgressBarProps) {
  const carouselID = props.carouselID ?? emblaProgressBarDefaults.carouselID
  const track = getSlotElement(props.trackComponentSlot)
  const fill = getSlotElement(props.fillComponentSlot)
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
  const value = pageCount > 0 ? Math.min((selectedIndex + 1) / pageCount, 1) : 0

  if (!track || !fill) {
    return (
      <div style={{ width: "100%", height: "100%", ...props.style }}>
        <NativeProgress value={value} />
      </div>
    )
  }

  return cloneElement(
    track,
    {
      ...track.props,
      style: {
        ...(track.props as { style?: CSSProperties }).style,
        ...props.style,
        position: "relative",
        width: "100%",
        height: "100%",
      },
    } as never,
    ...Children.toArray(
      (track.props as { children?: ReactNode }).children,
    ),
    <NativeProgress hidden key="progress" value={value} />,
    cloneElement(fill, {
      ...fill.props,
      key: "fill",
      style: {
        ...(fill.props as { style?: CSSProperties }).style,
        width: "100%",
        height: "100%",
        clipPath: `inset(0% ${100 * (1 - value)}% 0% 0%)`,
        transition: "clip-path .2s",
      },
    } as never),
  )
}

EmblaProgressBar.defaultProps = emblaProgressBarDefaults
EmblaProgressBar.displayName = "Embla Progress Bar"

export const emblaProgressBarPropertyControls = {
  carouselID: {
    title: "ID",
    type: ControlType.String,
    defaultValue: emblaProgressBarDefaults.carouselID,
    description: "Use the same ID as the Carousel instance to read",
  },
  trackComponentSlot: {
    title: "Track",
    type: ControlType.Slot,
    maxCount: 1,
  },
  fillComponentSlot: {
    title: "Fill",
    type: ControlType.Slot,
    maxCount: 1,
  },
} satisfies PropertyControls<EmblaProgressBarProps>

let propertyControlsRegistered = false

export function registerEmblaProgressBarPropertyControls(): void {
  if (propertyControlsRegistered) return
  addPropertyControls(EmblaProgressBar, emblaProgressBarPropertyControls)
  propertyControlsRegistered = true
}
