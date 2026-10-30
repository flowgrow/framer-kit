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

/** Configures the nearest parent carrying the withKniffLightboxGallery override. */
export function RamkaSettings(props: RamkaSettingsProps) {
  const settings = { ...ramkaSettingsDefaults, ...props, loop: false, viewTransition: true, morphTo: "active" as const, pullToClose: true }
  const gallery = useContext(RamkaGalleryContext)
  const setGalleryConfig = gallery?.setConfig
  const {
    loop,
    viewTransition,
    morphTo,
    pullToClose,
    preload,
    zoom,
    showCounter,
    syncKniffCarousel,
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
      showCounter,
      syncKniffCarousel,
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
    showCounter,
    syncKniffCarousel,
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
      data-kniff-ramka-settings=""
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
        Place this inside the parent using the Kniff Lightbox Gallery override.
      </span>
    </div>
  )
}

RamkaSettings.displayName = "Kniff Lightbox Settings"
export const ramkaSettingsPropertyControls = {
  showInstructions: {
    type: ControlType.Boolean,
    title: "Instructions",
    defaultValue: ramkaSettingsDefaults.showInstructions,
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
  showCounter: {
    type: ControlType.Boolean,
    title: "Counter",
    defaultValue: ramkaSettingsDefaults.showCounter,
  },
  syncKniffCarousel: {
    type: ControlType.Boolean,
    title: "Sync Kniff Carousel",
    defaultValue: ramkaSettingsDefaults.syncKniffCarousel,
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
