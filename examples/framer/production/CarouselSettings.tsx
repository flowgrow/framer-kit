import { addPropertyControls } from "framer"
import type { CSSProperties } from "react"
import {
  CarouselSettings as KitComponent,
  carouselSettingsPropertyControls,
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
export default function CarouselSettings(props: Props) {
  return <KitComponent {...props} />
}

addPropertyControls(CarouselSettings, carouselSettingsPropertyControls)
