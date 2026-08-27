import { addPropertyControls } from "framer"
import type { CSSProperties } from "react"
import {
  RamkaSettings as KitComponent,
  ramkaSettingsPropertyControls,
} from "https://esm.sh/@kniff/framer-kit@0.2.1?external=react,react-dom,framer,framer-motion&target=es2022"

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
export default function RamkaSettings(props: Props) {
  return <KitComponent {...props} />
}

addPropertyControls(RamkaSettings, ramkaSettingsPropertyControls)
