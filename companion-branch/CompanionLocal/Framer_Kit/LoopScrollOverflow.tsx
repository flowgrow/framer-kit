import { addPropertyControls } from "framer"
import {
  KniffCarouselSettings as KitComponent,
  kniffCarouselSettingsPropertyControls,
  // @ts-ignore Framer resolves this local code file at runtime.
} from "../Kit/carousel/KniffCarouselSettings.tsx"

interface Props {
  [key: string]: unknown
}

/**
 * @framerIntrinsicWidth 200
 * @framerIntrinsicHeight 80
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 */
export default function KniffCarouselSettings(props: Props) {
  return <KitComponent {...props} />
}

addPropertyControls(KniffCarouselSettings, kniffCarouselSettingsPropertyControls)

KniffCarouselSettings.displayName = "Companion Local Carousel Settings"

