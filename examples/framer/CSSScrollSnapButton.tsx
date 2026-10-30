import { addPropertyControls } from "framer"
import {
  CSSScrollSnapButton as KitComponent,
  cssScrollSnapButtonPropertyControls,
// @ts-ignore Framer resolves remote HTTPS modules without TypeScript declarations.
} from "https://framer-kit-dev.kniff.at/scroll-snap.js"

/**
 * @framerIntrinsicWidth 44
 * @framerIntrinsicHeight 44
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 */
export default function CSSScrollSnapButton(props: Record<string, unknown>) {
  return <KitComponent {...props} />
}
addPropertyControls(CSSScrollSnapButton, cssScrollSnapButtonPropertyControls)
