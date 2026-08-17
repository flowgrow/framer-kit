import AutoHeight from "embla-carousel-auto-height"
import AutoScroll from "embla-carousel-auto-scroll"
import Autoplay from "embla-carousel-autoplay"
import Fade from "embla-carousel-fade"
import type {
  EmblaOptionsType,
  EmblaPluginType,
} from "embla-carousel"
import WheelGestures from "embla-carousel-wheel-gestures"
import {
  addPropertyControls,
  ControlType,
  RenderTarget,
  type PropertyControls,
} from "framer"
import { useEffect, useMemo, type CSSProperties } from "react"

import { useEmblaStore } from "./store.js"
import type { EmblaConfig } from "./types.js"

export type AutoMoveType = "none" | "scroll" | "perSlide"

export interface CarouselSettingsProps {
  showInstructions: boolean
  carouselID: string
  slideEffect: "slide" | "fade"
  slidesToScroll: number
  startIndex: number
  justify: "start" | "center" | "end"
  autoHeight: boolean
  draggable: boolean
  selectOnSlideClick: boolean
  containEdges: boolean
  loop: boolean
  autoMove: AutoMoveType
  autoMoveDelay: number
  autoMoveSpeed: number
  autoMoveStopOnInteraction: boolean
  autoMoveStopOnMouseEnter: boolean
  autoMoveStopOnFocusIn: boolean
  autoMoveStopOnLastSlide: boolean
  wheelGestures: boolean
  width?: string
  height?: string
  style?: CSSProperties
  id?: string
  layoutId?: string
}

export const carouselSettingsDefaults = {
  showInstructions: true,
  carouselID: "Carousel",
  slideEffect: "slide",
  slidesToScroll: 1,
  startIndex: 0,
  justify: "center",
  autoHeight: false,
  draggable: true,
  selectOnSlideClick: false,
  containEdges: true,
  loop: false,
  autoMove: "none",
  autoMoveDelay: 8,
  autoMoveSpeed: 0.4,
  autoMoveStopOnInteraction: false,
  autoMoveStopOnMouseEnter: false,
  autoMoveStopOnFocusIn: false,
  autoMoveStopOnLastSlide: false,
  wheelGestures: false,
} as const satisfies Omit<
  CarouselSettingsProps,
  "width" | "height" | "style" | "id" | "layoutId"
>

/** Creates the bundled Embla plugins represented by Carousel Settings. */
export function createCarouselPlugins(
  settings: CarouselSettingsProps,
): EmblaPluginType[] {
  const configuredPlugins: EmblaPluginType[] = []

  if (settings.wheelGestures) configuredPlugins.push(WheelGestures())

  if (settings.autoMove === "scroll") {
    configuredPlugins.push(
      AutoScroll({
        speed: settings.autoMoveSpeed,
        startDelay: 100,
        playOnInit: true,
        stopOnInteraction: settings.autoMoveStopOnInteraction,
        stopOnMouseEnter: settings.autoMoveStopOnMouseEnter,
        stopOnFocusIn: settings.autoMoveStopOnFocusIn,
      }),
    )
  }

  if (settings.autoMove === "perSlide") {
    configuredPlugins.push(
      Autoplay({
        playOnInit: true,
        delay: settings.autoMoveDelay * 1000,
        stopOnInteraction: settings.autoMoveStopOnInteraction,
        stopOnMouseEnter: settings.autoMoveStopOnMouseEnter,
        stopOnFocusIn: settings.autoMoveStopOnFocusIn,
        stopOnLastSnap: settings.autoMoveStopOnLastSlide,
      }),
    )
  }

  if (settings.autoHeight) configuredPlugins.push(AutoHeight())
  if (settings.slideEffect === "fade") configuredPlugins.push(Fade())

  return configuredPlugins
}

/** Creates the core Embla options represented by Carousel Settings. */
export function createCarouselOptions(
  settings: CarouselSettingsProps,
): EmblaOptionsType {
  return {
    loop: settings.loop,
    skipSnaps: true,
    align: settings.justify,
    startIndex: settings.startIndex,
    watchDrag: settings.draggable,
    containScroll: settings.containEdges ? "trimSnaps" : false,
    slidesToScroll:
      settings.slidesToScroll < 0 ? "auto" : settings.slidesToScroll,
  }
}

/**
 * Registers a complete Embla configuration in the shared store. On the Framer
 * Canvas it can optionally render a compact setup reminder; Preview and the
 * published site render no DOM.
 */
export function CarouselSettings(props: CarouselSettingsProps) {
  const settings = { ...carouselSettingsDefaults, ...props }
  const {
    showInstructions,
    carouselID,
    slideEffect,
    slidesToScroll,
    startIndex,
    draggable,
    selectOnSlideClick,
    containEdges,
    autoMove,
    autoMoveDelay,
    autoMoveSpeed,
    autoMoveStopOnFocusIn,
    autoMoveStopOnInteraction,
    autoMoveStopOnLastSlide,
    autoMoveStopOnMouseEnter,
    justify,
    autoHeight,
    wheelGestures,
    loop,
    style,
  } = settings

  const addConfig = useEmblaStore((state) => state.addConfig)
  const removeConfig = useEmblaStore((state) => state.removeConfig)

  const plugins = useMemo(() => createCarouselPlugins(settings), [
    wheelGestures,
    autoMove,
    autoMoveSpeed,
    autoMoveDelay,
    autoMoveStopOnInteraction,
    autoMoveStopOnMouseEnter,
    autoMoveStopOnFocusIn,
    autoMoveStopOnLastSlide,
    autoHeight,
    slideEffect,
  ])

  const options = useMemo<EmblaOptionsType>(
    () => createCarouselOptions(settings),
    [
      loop,
      justify,
      startIndex,
      draggable,
      containEdges,
      slidesToScroll,
    ],
  )

  const config = useMemo<EmblaConfig>(
    () => ({
      options,
      plugins,
      selectOnSlideClick,
    }),
    [options, plugins, selectOnSlideClick],
  )

  useEffect(() => {
    if (!carouselID) return
    addConfig(carouselID, config)
    return () => removeConfig(carouselID, config)
  }, [carouselID, config, addConfig, removeConfig])

  if (RenderTarget.current() !== RenderTarget.canvas || !showInstructions) {
    return null
  }

  return (
    <div
      style={{
        ...style,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 6,
        width: "100%",
        height: "100%",
        minWidth: 160,
        minHeight: 80,
        padding: 14,
        border: "1px solid rgba(0, 0, 0, 0.12)",
        borderRadius: 10,
        background: "rgba(245, 245, 245, 0.96)",
        color: "#111",
        fontFamily: "Inter, sans-serif",
        fontSize: 12,
        lineHeight: 1.4,
      }}
    >
      <strong>Carousel Settings</strong>
      <span>
        Match “{carouselID || "Carousel"}” to the carousel layer name or
        accessibility label.
      </span>
    </div>
  )
}

CarouselSettings.defaultProps = carouselSettingsDefaults
CarouselSettings.displayName = "Carousel Settings"

export const carouselSettingsPropertyControls = {
  showInstructions: {
    type: ControlType.Boolean,
    title: "Instructions",
    defaultValue: carouselSettingsDefaults.showInstructions,
  },
  carouselID: {
    type: ControlType.String,
    title: "Carousel ID",
    defaultValue: carouselSettingsDefaults.carouselID,
  },
  slideEffect: {
    type: ControlType.Enum,
    title: "Effect",
    options: ["slide", "fade"],
    optionTitles: ["Slide", "Fade"],
    defaultValue: carouselSettingsDefaults.slideEffect,
  },
  slidesToScroll: {
    type: ControlType.Number,
    title: "Scroll By",
    defaultValue: carouselSettingsDefaults.slidesToScroll,
    displayStepper: true,
    min: 1,
  },
  startIndex: {
    type: ControlType.Number,
    title: "Start Index",
    defaultValue: carouselSettingsDefaults.startIndex,
    displayStepper: true,
    min: 0,
  },
  autoHeight: {
    type: ControlType.Boolean,
    title: "Auto Height",
    defaultValue: carouselSettingsDefaults.autoHeight,
  },
  draggable: {
    type: ControlType.Boolean,
    title: "Draggable",
    defaultValue: carouselSettingsDefaults.draggable,
  },
  selectOnSlideClick: {
    type: ControlType.Boolean,
    title: "Click to Select",
    defaultValue: carouselSettingsDefaults.selectOnSlideClick,
  },
  loop: {
    type: ControlType.Boolean,
    title: "Loop",
    defaultValue: carouselSettingsDefaults.loop,
  },
  justify: {
    type: ControlType.Enum,
    title: "Horizontal Align",
    options: ["start", "center", "end"],
    optionIcons: ["align-left", "align-center", "align-right"],
    displaySegmentedControl: true,
    defaultValue: carouselSettingsDefaults.justify,
  } as any,
  containEdges: {
    type: ControlType.Boolean,
    title: "Contain Edges",
    defaultValue: carouselSettingsDefaults.containEdges,
  },
  autoMove: {
    type: ControlType.Enum,
    title: "Auto Move",
    options: ["none", "scroll", "perSlide"],
    optionTitles: ["Off", "Scroll", "Swipe"],
    displaySegmentedControl: true,
    defaultValue: carouselSettingsDefaults.autoMove,
  },
  autoMoveDelay: {
    type: ControlType.Number,
    title: "Pause per Slide",
    defaultValue: carouselSettingsDefaults.autoMoveDelay,
    min: 0,
    max: 100,
    unit: "s",
    displayStepper: true,
    step: 0.1,
    hidden: (props) => props.autoMove !== "perSlide",
  },
  autoMoveSpeed: {
    type: ControlType.Number,
    title: "Speed",
    defaultValue: carouselSettingsDefaults.autoMoveSpeed,
    min: 0,
    max: 20,
    unit: "px",
    displayStepper: true,
    step: 0.1,
    description: "Pixels per frame",
    hidden: (props) => props.autoMove !== "scroll",
  },
  autoMoveStopOnInteraction: {
    type: ControlType.Boolean,
    title: "Stop on Interaction",
    defaultValue: carouselSettingsDefaults.autoMoveStopOnInteraction,
    hidden: (props) => props.autoMove === "none",
  },
  autoMoveStopOnMouseEnter: {
    type: ControlType.Boolean,
    title: "Stop on Mouse Enter",
    defaultValue: carouselSettingsDefaults.autoMoveStopOnMouseEnter,
    hidden: (props) => props.autoMove === "none",
  },
  autoMoveStopOnFocusIn: {
    type: ControlType.Boolean,
    title: "Stop on Focus In",
    defaultValue: carouselSettingsDefaults.autoMoveStopOnFocusIn,
    hidden: (props) => props.autoMove === "none",
  },
  autoMoveStopOnLastSlide: {
    type: ControlType.Boolean,
    title: "Stop on Last Slide",
    defaultValue: carouselSettingsDefaults.autoMoveStopOnLastSlide,
    hidden: (props) => props.autoMove !== "perSlide",
  },
  wheelGestures: {
    type: ControlType.Boolean,
    title: "Wheel Gestures",
    defaultValue: carouselSettingsDefaults.wheelGestures,
  },
} satisfies PropertyControls<CarouselSettingsProps>

let propertyControlsRegistered = false

/** Explicitly registers controls while keeping package imports side-effect free. */
export function registerCarouselSettingsPropertyControls(): void {
  if (propertyControlsRegistered) return
  addPropertyControls(CarouselSettings, carouselSettingsPropertyControls)
  propertyControlsRegistered = true
}
