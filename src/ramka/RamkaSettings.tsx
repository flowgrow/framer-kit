import {
  addPropertyControls,
  ControlType,
  RenderTarget,
  type PropertyControls,
} from "framer"
import { useContext, useEffect } from "react"

import { RamkaGalleryContext } from "./context.js"
import {
  defaultRamkaGalleryConfig,
  ramkaSettingsDefaults,
} from "./defaults.js"
import type {
  RamkaGalleryConfig,
  RamkaSettingsProps,
} from "./types.js"

/** Configures the nearest parent carrying the withRamkaGallery override. */
export function RamkaSettings(props: RamkaSettingsProps) {
  const settings = { ...ramkaSettingsDefaults, ...props }
  const gallery = useContext(RamkaGalleryContext)
  const setGalleryConfig = gallery?.setConfig
  const {
    loop,
    viewTransition,
    morphTo,
    pullToClose,
    preload,
    zoom,
    showNavigation,
    showCounter,
    syncEmbla,
    stopEmblaAutoplay,
    backdropColor,
  } = settings

  useEffect(() => {
    if (!setGalleryConfig) return
    const config: RamkaGalleryConfig = {
      loop,
      viewTransition,
      morphTo,
      pullToClose,
      preload,
      zoom,
      showNavigation,
      showCounter,
      syncEmbla,
      stopEmblaAutoplay,
      backdropColor,
    }
    setGalleryConfig(config)
    return () => setGalleryConfig(defaultRamkaGalleryConfig)
  }, [
    setGalleryConfig,
    loop,
    viewTransition,
    morphTo,
    pullToClose,
    preload,
    zoom,
    showNavigation,
    showCounter,
    syncEmbla,
    stopEmblaAutoplay,
    backdropColor,
  ])

  if (
    RenderTarget.current() !== RenderTarget.canvas ||
    !settings.showInstructions
  ) {
    return null
  }

  return (
    <div
      style={{
        ...settings.style,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 6,
        width: "100%",
        height: "100%",
        minWidth: 180,
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
      <strong>Ramka Settings</strong>
      <span>
        Place this inside the parent using the Ramka Gallery override.
      </span>
    </div>
  )
}

RamkaSettings.displayName = "Ramka Settings"

export const ramkaSettingsPropertyControls = {
  showInstructions: {
    type: ControlType.Boolean,
    title: "Instructions",
    defaultValue: ramkaSettingsDefaults.showInstructions,
  },
  loop: {
    type: ControlType.Boolean,
    title: "Loop",
    defaultValue: ramkaSettingsDefaults.loop,
  },
  viewTransition: {
    type: ControlType.Boolean,
    title: "Morph Transition",
    defaultValue: ramkaSettingsDefaults.viewTransition,
  },
  morphTo: {
    type: ControlType.Enum,
    title: "Close Morph",
    options: ["active", "origin", "closest"],
    optionTitles: ["Active", "Opening", "Closest"],
    defaultValue: ramkaSettingsDefaults.morphTo,
  },
  pullToClose: {
    type: ControlType.Boolean,
    title: "Pull to Close",
    defaultValue: ramkaSettingsDefaults.pullToClose,
  },
  preload: {
    type: ControlType.Number,
    title: "Preload",
    defaultValue: ramkaSettingsDefaults.preload,
    min: 0,
    max: 4,
    step: 1,
    displayStepper: true,
  },
  zoom: {
    type: ControlType.Boolean,
    title: "Zoom",
    defaultValue: ramkaSettingsDefaults.zoom,
  },
  showNavigation: {
    type: ControlType.Boolean,
    title: "Navigation",
    defaultValue: ramkaSettingsDefaults.showNavigation,
  },
  showCounter: {
    type: ControlType.Boolean,
    title: "Counter",
    defaultValue: ramkaSettingsDefaults.showCounter,
  },
  syncEmbla: {
    type: ControlType.Boolean,
    title: "Sync Embla",
    defaultValue: ramkaSettingsDefaults.syncEmbla,
  },
  stopEmblaAutoplay: {
    type: ControlType.Boolean,
    title: "Stop Auto Move",
    defaultValue: ramkaSettingsDefaults.stopEmblaAutoplay,
    hidden: (props) => props.syncEmbla === false,
  },
  backdropColor: {
    type: ControlType.Color,
    title: "Backdrop",
    defaultValue: ramkaSettingsDefaults.backdropColor,
  },
} satisfies PropertyControls<RamkaSettingsProps>

let propertyControlsRegistered = false

export function registerRamkaSettingsPropertyControls(): void {
  if (propertyControlsRegistered) return
  addPropertyControls(RamkaSettings, ramkaSettingsPropertyControls)
  propertyControlsRegistered = true
}
