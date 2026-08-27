import { createContext } from "react"

import type { RamkaGalleryContextValue } from "./types.js"

export const RamkaGalleryContext =
  createContext<RamkaGalleryContextValue | null>(null)
