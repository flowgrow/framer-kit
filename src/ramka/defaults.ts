import type { RamkaGalleryConfig } from "./types.js"

export const ramkaSettingsDefaults = {
  showInstructions: true,
  loop: true,
  viewTransition: true,
  morphTo: "active",
  pullToClose: true,
  preload: 1,
  zoom: true,
  showNavigation: true,
  showCounter: true,
  syncEmbla: true,
  stopEmblaAutoplay: true,
  backdropColor: "rgba(0, 0, 0, 0.92)",
} as const

export const defaultRamkaGalleryConfig: RamkaGalleryConfig = {
  loop: ramkaSettingsDefaults.loop,
  viewTransition: ramkaSettingsDefaults.viewTransition,
  morphTo: ramkaSettingsDefaults.morphTo,
  pullToClose: ramkaSettingsDefaults.pullToClose,
  preload: ramkaSettingsDefaults.preload,
  zoom: ramkaSettingsDefaults.zoom,
  showNavigation: ramkaSettingsDefaults.showNavigation,
  showCounter: ramkaSettingsDefaults.showCounter,
  syncEmbla: ramkaSettingsDefaults.syncEmbla,
  stopEmblaAutoplay: ramkaSettingsDefaults.stopEmblaAutoplay,
  backdropColor: ramkaSettingsDefaults.backdropColor,
}
