import { addPropertyControls } from "framer"
import type { CSSProperties } from "react"
import {
  EmblaProgressBar as KitComponent,
  emblaProgressBarPropertyControls,
} from "https://esm.sh/@kniff/framer-kit@0.2.1?external=react,react-dom,framer,framer-motion&target=es2022"

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
