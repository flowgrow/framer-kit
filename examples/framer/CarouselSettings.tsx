import { addPropertyControls } from "framer"
import type { CSSProperties } from "react"
// @ts-expect-error Local HTTPS modules do not expose types to Framer.
import {
  CarouselSettings as KitComponent,
  carouselSettingsPropertyControls,
} from "https://framer-kit-dev.kniff.at/embla.js"

interface Props {
  style?: CSSProperties
  [key: string]: unknown
}

/**
 * @framerIntrinsicWidth 200
 * @framerIntrinsicHeight 80
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 */
export default function CarouselSettings(props: Props) {
  return <KitComponent {...props} />
}

addPropertyControls(CarouselSettings, carouselSettingsPropertyControls)
