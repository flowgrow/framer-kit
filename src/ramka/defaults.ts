import type { RamkaGalleryConfig } from "./types.js"

export const ramkaSettingsDefaults = {
  showInstructions: true,
  loop: true,
  viewTransition: true,
  morphTo: "active",
  pullToClose: true,
  preload: 1,
  zoom: true,
  showCounter: true,
  syncKniffCarousel: true,
  backdropColor: "#ffffff",
} as const

export const defaultRamkaGalleryConfig: RamkaGalleryConfig = {
  loop: ramkaSettingsDefaults.loop,
  viewTransition: ramkaSettingsDefaults.viewTransition,
  morphTo: ramkaSettingsDefaults.morphTo,
  pullToClose: ramkaSettingsDefaults.pullToClose,
  preload: ramkaSettingsDefaults.preload,
  zoom: ramkaSettingsDefaults.zoom,
  showCounter: ramkaSettingsDefaults.showCounter,
  syncKniffCarousel: ramkaSettingsDefaults.syncKniffCarousel,
  backdropColor: ramkaSettingsDefaults.backdropColor,
}
