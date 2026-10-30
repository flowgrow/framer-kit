import { addPropertyControls } from "framer"
import type { CSSProperties } from "react"
import {
  RamkaSettings as KitComponent,
  ramkaSettingsPropertyControls,
// @ts-ignore Framer resolves remote HTTPS modules without TypeScript declarations.
} from "https://framer-kit.kniff.at/builds/3c1b881ec7a2c897d33b20e0/index.js?external=react,react-dom,framer&target=es2022&v=editor-20261030"

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

RamkaSettings.displayName = "Kniff Lightbox Settings"
