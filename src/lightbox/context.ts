import { createContext } from "react"

// @ts-ignore Framer cannot resolve local code-file imports.
import type { RamkaGalleryContextValue } from "./types.ts"

export const RamkaGalleryContext = createContext<RamkaGalleryContextValue | null>(null)
