// Branch-local copy: dependencies resolved within CompanionLocal.
import { addPropertyControls } from "framer"
import type { ComponentProps } from "react"
import {
  RamkaSettings as KitComponent,
  ramkaSettingsPropertyControls,
  // @ts-ignore Framer resolves this local code file at runtime.
} from "../Kit/lightbox/RamkaSettings.tsx"

type Props = ComponentProps<typeof KitComponent>

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

KniffLightboxSettings.displayName = "Companion Local Lightbox Settings"

