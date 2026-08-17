import {
  addPropertyControls,
  ControlType,
  RenderTarget,
  type PropertyControls,
} from "framer"
import type { CSSProperties } from "react"

import {
  getCarouselPageCount,
  pauseAutoplayForInteraction,
  useCarouselPagination,
} from "./accessoryUtils.js"
import { useEmblaStore } from "./store.js"

export interface EmblaDotsOptions {
  dotSize: number
  dotsGap: number
  dotsPadding: number
  dotsFill: string
  dotsBackground: string
  dotsRadius: number
  dotsOpacity: number
  dotsActiveOpacity: number
  dotsBlur: number
}

export interface EmblaDotsProps {
  carouselID?: string
  progressOptions?: Partial<EmblaDotsOptions>
  style?: CSSProperties
}

export const emblaDotsDefaults = {
  carouselID: "kniff-carousel-1",
  progressOptions: {
    dotSize: 10,
    dotsGap: 10,
    dotsPadding: 10,
    dotsFill: "#fff",
    dotsBackground: "rgba(0,0,0,0.2)",
    dotsRadius: 50,
    dotsOpacity: 0.5,
    dotsActiveOpacity: 1,
    dotsBlur: 0,
  },
} as const

/** Renders one interactive dot per Embla snap/page. */
export function EmblaDots(props: EmblaDotsProps) {
  const carouselID = props.carouselID ?? emblaDotsDefaults.carouselID
  const options = {
    ...emblaDotsDefaults.progressOptions,
    ...props.progressOptions,
  }
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

  return (
    <div
      aria-label="Carousel pagination"
      style={{
        ...props.style,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: options.dotsGap,
        padding: options.dotsPadding,
        borderRadius: options.dotsRadius,
        background: options.dotsBackground,
        backdropFilter:
          options.dotsBlur > 0 ? `blur(${options.dotsBlur}px)` : undefined,
        WebkitBackdropFilter:
          options.dotsBlur > 0 ? `blur(${options.dotsBlur}px)` : undefined,
      }}
    >
      {Array.from({ length: pageCount }, (_, index) => (
        <button
          aria-current={index === selectedIndex ? "true" : undefined}
          aria-label={`Go to slide ${index + 1}`}
          key={index}
          onClick={() => {
            pauseAutoplayForInteraction(emblaApi)
            pagination.scrollTo(index)
          }}
          style={{
            appearance: "none",
            width: options.dotSize,
            height: options.dotSize,
            flex: "0 0 auto",
            padding: 0,
            border: "none",
            borderRadius: options.dotSize,
            background: options.dotsFill,
            cursor: "pointer",
            opacity:
              index === selectedIndex
                ? options.dotsActiveOpacity
                : options.dotsOpacity,
            transition: "opacity .5s",
          }}
          type="button"
        />
      ))}
    </div>
  )
}

EmblaDots.defaultProps = emblaDotsDefaults
EmblaDots.displayName = "Embla Dots"

export const emblaDotsPropertyControls = {
  carouselID: {
    title: "ID",
    type: ControlType.String,
    defaultValue: emblaDotsDefaults.carouselID,
    description: "Use the same ID as the Carousel instance to control",
  },
  progressOptions: {
    type: ControlType.Object,
    title: "Options",
    controls: {
      dotSize: {
        type: ControlType.Number,
        title: "Size",
        min: 1,
        max: 100,
        defaultValue: emblaDotsDefaults.progressOptions.dotSize,
        displayStepper: true,
      },
      dotsGap: {
        type: ControlType.Number,
        title: "Gap",
        min: 0,
        max: 100,
        defaultValue: emblaDotsDefaults.progressOptions.dotsGap,
        displayStepper: true,
      },
      dotsPadding: {
        type: ControlType.Number,
        title: "Padding",
        min: 0,
        max: 100,
        defaultValue: emblaDotsDefaults.progressOptions.dotsPadding,
        displayStepper: true,
      },
      dotsFill: {
        type: ControlType.Color,
        title: "Fill",
        defaultValue: emblaDotsDefaults.progressOptions.dotsFill,
      },
      dotsBackground: {
        type: ControlType.Color,
        title: "Backdrop",
        defaultValue: emblaDotsDefaults.progressOptions.dotsBackground,
      },
      dotsRadius: {
        type: ControlType.Number,
        title: "Radius",
        min: 0,
        max: 200,
        defaultValue: emblaDotsDefaults.progressOptions.dotsRadius,
      },
      dotsOpacity: {
        type: ControlType.Number,
        title: "Opacity",
        min: 0,
        max: 1,
        defaultValue: emblaDotsDefaults.progressOptions.dotsOpacity,
        step: 0.1,
        displayStepper: true,
      },
      dotsActiveOpacity: {
        type: ControlType.Number,
        title: "Current",
        min: 0,
        max: 1,
        defaultValue: emblaDotsDefaults.progressOptions.dotsActiveOpacity,
        step: 0.1,
        displayStepper: true,
      },
      dotsBlur: {
        type: ControlType.Number,
        title: "Blur",
        min: 0,
        max: 50,
        defaultValue: emblaDotsDefaults.progressOptions.dotsBlur,
        step: 1,
      },
    },
  },
} satisfies PropertyControls<EmblaDotsProps>

let propertyControlsRegistered = false

export function registerEmblaDotsPropertyControls(): void {
  if (propertyControlsRegistered) return
  addPropertyControls(EmblaDots, emblaDotsPropertyControls)
  propertyControlsRegistered = true
}
