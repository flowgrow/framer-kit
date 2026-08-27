import { addPropertyControls } from "framer"
import type { CSSProperties } from "react"
import {
  EmblaDots as KitComponent,
  emblaDotsPropertyControls,
} from "https://esm.sh/@kniff/framer-kit@0.2.1?external=react,react-dom,framer,framer-motion&target=es2022"

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
