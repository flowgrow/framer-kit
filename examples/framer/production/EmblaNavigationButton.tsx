import { addPropertyControls } from "framer"
import type { CSSProperties } from "react"
import {
  EmblaNavigationButton as KitComponent,
  emblaNavigationButtonPropertyControls,
} from "https://esm.sh/@kniff/framer-kit@0.2.1?external=react,react-dom,framer,framer-motion&target=es2022"

interface Props {
  style?: CSSProperties
  [key: string]: unknown
}

/**
 * @framerIntrinsicWidth 120
 * @framerIntrinsicHeight 48
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 */
export default function EmblaNavigationButton(props: Props) {
  return <KitComponent {...props} />
}

addPropertyControls(
  EmblaNavigationButton,
  emblaNavigationButtonPropertyControls,
)
