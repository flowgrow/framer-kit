import { addPropertyControls } from "framer"
import type { CSSProperties } from "react"
import {
  RamkaSettings as KitComponent,
  ramkaSettingsPropertyControls,
} from "https://esm.sh/@kniff/framer-kit@0.3.0?external=react,react-dom,framer,framer-motion&target=es2022"

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
export default function KniffLightboxSettings(props: Props) {
  return <KitComponent {...props} />
}

addPropertyControls(KniffLightboxSettings, ramkaSettingsPropertyControls)

KniffLightboxSettings.displayName = "Kniff Lightbox Settings"
