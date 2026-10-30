import { addPropertyControls } from "framer"
import {
  VisibleScrollOverflowSettings as KitComponent,
  visibleScrollOverflowSettingsPropertyControls,
// @ts-ignore Framer resolves remote HTTPS modules without TypeScript declarations.
} from "https://framer-kit-prod.kniff.at/builds/3c1b881ec7a2c897d33b20e0/index.js?external=react,react-dom,framer&target=es2022"

interface Props { [key: string]: unknown }

/**
 * @framerIntrinsicWidth 1
 * @framerIntrinsicHeight 1
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 */
export default function VisibleScrollOverflowSettings(props: Props) {
  return <KitComponent {...props} />
}

addPropertyControls(VisibleScrollOverflowSettings, visibleScrollOverflowSettingsPropertyControls)
