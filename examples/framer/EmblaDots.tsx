import { addPropertyControls } from "framer"
import type { CSSProperties } from "react"
// @ts-expect-error Local HTTPS modules do not expose types to Framer.
import {
  EmblaDots as KitComponent,
  emblaDotsPropertyControls,
} from "https://framer-kit-dev.kniff.at/embla.js"

interface Props {
  style?: CSSProperties
  [key: string]: unknown
}

/**
 * @framerIntrinsicWidth 180
 * @framerIntrinsicHeight 32
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight auto
 */
export default function EmblaDots(props: Props) {
  return <KitComponent {...props} />
}

addPropertyControls(EmblaDots, emblaDotsPropertyControls)
