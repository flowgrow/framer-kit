import { addPropertyControls } from "framer"
import type { CSSProperties } from "react"
// @ts-expect-error Local HTTPS modules do not expose types to Framer.
import {
  EmblaProgressBar as KitComponent,
  emblaProgressBarPropertyControls,
} from "https://framer-kit-dev.kniff.at/embla.js"

interface Props {
  style?: CSSProperties
  [key: string]: unknown
}

/**
 * @framerIntrinsicWidth 240
 * @framerIntrinsicHeight 8
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight fixed
 */
export default function EmblaProgressBar(props: Props) {
  return <KitComponent {...props} />
}

addPropertyControls(EmblaProgressBar, emblaProgressBarPropertyControls)
