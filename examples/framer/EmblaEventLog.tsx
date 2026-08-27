import { addPropertyControls } from "framer"
import type { CSSProperties } from "react"
import {
  EmblaEventLog as KitComponent,
  emblaEventLogPropertyControls,
} from "https://framer-kit-dev.kniff.at/embla.js"

interface Props {
  style?: CSSProperties
  [key: string]: unknown
}

/**
 * @framerIntrinsicWidth 360
 * @framerIntrinsicHeight 300
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 */
export default function EmblaEventLog(props: Props) {
  return <KitComponent {...props} />
}

addPropertyControls(EmblaEventLog, emblaEventLogPropertyControls)
