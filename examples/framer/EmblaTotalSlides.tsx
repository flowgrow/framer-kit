import { addPropertyControls } from "framer"
import type { CSSProperties } from "react"
// @ts-expect-error Local HTTPS modules do not expose types to Framer.
import {
  EmblaTotalSlides as KitComponent,
  emblaSlideCounterPropertyControls,
} from "https://framer-kit-dev.kniff.at/embla.js"

interface Props {
  style?: CSSProperties
  [key: string]: unknown
}

/**
 * @framerIntrinsicWidth 48
 * @framerIntrinsicHeight 48
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 */
export default function EmblaTotalSlides(props: Props) {
  return <KitComponent {...props} />
}

addPropertyControls(EmblaTotalSlides, emblaSlideCounterPropertyControls)
