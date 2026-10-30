import { addPropertyControls } from "framer"
import {
  VisibleScrollOverflowSettings as KitComponent,
  visibleScrollOverflowSettingsPropertyControls,
// @ts-ignore Framer resolves remote HTTPS modules without TypeScript declarations.
} from "https://framer-kit-dev.kniff.at/scroll-snap.js"

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

VisibleScrollOverflowSettings.displayName = "Kniff Carousel Settings"
