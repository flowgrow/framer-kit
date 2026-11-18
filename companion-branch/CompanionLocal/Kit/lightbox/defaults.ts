// Branch-local copy: dependencies resolved within CompanionLocal.
// @ts-ignore Framer cannot resolve local code-file imports.
import type { RamkaGalleryConfig } from "./types.ts"

export const ramkaSettingsDefaults = {
  showInstructions: true,
  loop: false,
  viewTransition: false,
  morphTo: "active",
  pullToClose: true,
  preload: 2,
  layout: "peek",
  zoom: true,
  showCaptions: true,
  showThumbnails: true,
  backdropColor: "#ffffff",
} as const

export const defaultRamkaGalleryConfig: RamkaGalleryConfig = {
  showInstructions: ramkaSettingsDefaults.showInstructions,
  loop: ramkaSettingsDefaults.loop,
  viewTransition: ramkaSettingsDefaults.viewTransition,
  morphTo: ramkaSettingsDefaults.morphTo,
  pullToClose: ramkaSettingsDefaults.pullToClose,
  preload: ramkaSettingsDefaults.preload,
  layout: ramkaSettingsDefaults.layout,
  zoom: ramkaSettingsDefaults.zoom,
  showCaptions: ramkaSettingsDefaults.showCaptions,
  showThumbnails: ramkaSettingsDefaults.showThumbnails,
  backdropColor: ramkaSettingsDefaults.backdropColor,
}
