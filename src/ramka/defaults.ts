import type { RamkaGalleryConfig } from "./types.js"

export const ramkaSettingsDefaults = {
  showInstructions: true,
  loop: false,
  viewTransition: true,
  morphTo: "active",
  pullToClose: true,
  preload: 2,
  layout: "peek",
  zoom: true,
  showCounter: true,
  showThumbnails: true,
  syncKniffCarousel: true,
  backdropColor: "#ffffff",
} as const

export const defaultRamkaGalleryConfig: RamkaGalleryConfig = {
  loop: ramkaSettingsDefaults.loop,
  viewTransition: ramkaSettingsDefaults.viewTransition,
  morphTo: ramkaSettingsDefaults.morphTo,
  pullToClose: ramkaSettingsDefaults.pullToClose,
  preload: ramkaSettingsDefaults.preload,
  layout: ramkaSettingsDefaults.layout,
  zoom: ramkaSettingsDefaults.zoom,
  showCounter: ramkaSettingsDefaults.showCounter,
  showThumbnails: ramkaSettingsDefaults.showThumbnails,
  syncKniffCarousel: ramkaSettingsDefaults.syncKniffCarousel,
  backdropColor: ramkaSettingsDefaults.backdropColor,
}
