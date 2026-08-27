import type { CSSProperties } from "react"
import type {
  EmblaCarouselType,
  EmblaOptionsType,
  EmblaPluginType,
} from "embla-carousel"

export interface EmblaStyles {
  /** Whether carousel content is clipped at the viewport. Defaults to hidden. */
  overflow?: "hidden" | "visible"
  /** CSS flex-basis for each rendered direct child. Defaults to `auto`. */
  slideSize?: string
  /** Browser touch gesture policy for the carousel container. */
  touchAction?: string
}

export interface EmblaConfig {
  options?: EmblaOptionsType
  plugins?: EmblaPluginType[]
  styles?: EmblaStyles
  /** Scrolls the carousel to a slide when that slide is clicked. */
  selectOnSlideClick?: boolean
}

export interface EmblaStore {
  configs: Map<string, EmblaConfig>
  emblaInstances: Map<string, EmblaCarouselType>
  thumbnailConnections: Map<string, string>
  addConfig: (id: string, config: EmblaConfig) => void
  removeConfig: (id: string, config?: EmblaConfig) => void
  getConfig: (id: string) => EmblaConfig | undefined
  addEmblaInstance: (id: string, instance: EmblaCarouselType) => void
  removeEmblaInstance: (id: string, instance?: EmblaCarouselType) => void
  getInstance: (id: string) => EmblaCarouselType | undefined
  addThumbnailConnection: (thumbnailId: string, mainId: string) => void
  removeThumbnailConnection: (thumbnailId: string, mainId?: string) => void
  getConnectedMainId: (thumbnailId: string) => string | undefined
}

export interface FramerCarouselProps {
  "aria-label"?: unknown
  "data-framer-name"?: unknown
  children?: React.ReactNode
  className?: string
  style?: CSSProperties
}
