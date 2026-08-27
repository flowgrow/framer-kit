import type { ComponentType } from "react"

import { createGalleryOverride } from "./galleryOverride.js"
import { createTriggerOverride } from "./triggerOverride.js"

/** Makes a Framer parent the scope and runtime owner for one lightbox. */
export function withRamkaGallery<P extends object>(
  Component: ComponentType<P>,
): ComponentType<P> {
  return createGalleryOverride(Component)
}

/** Makes an existing descendant image/card a trigger in its nearest gallery. */
export function withRamkaTrigger<P extends object>(
  Component: ComponentType<P>,
): ComponentType<P> {
  return createTriggerOverride(Component)
}
