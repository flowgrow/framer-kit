import { addPropertyControls } from "framer"
import type { CSSProperties } from "react"
import {
  RamkaSettings as KitComponent,
  ramkaSettingsPropertyControls,
// @ts-ignore Framer resolves remote HTTPS modules without TypeScript declarations.
} from "https://framer-kit.kniff.at/0.5.2/index.js?external=react,react-dom,framer&target=es2022"

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
