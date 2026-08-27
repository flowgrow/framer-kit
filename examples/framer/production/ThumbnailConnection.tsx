import { addPropertyControls } from "framer"
import {
  ThumbnailConnection as KitComponent,
  thumbnailConnectionPropertyControls,
} from "https://esm.sh/@kniff/framer-kit@0.2.1?external=react,react-dom,framer,framer-motion&target=es2022"

interface Props {
  carouselID?: string
  thumbnailID?: string
}

/**
 * @framerIntrinsicWidth 180
 * @framerIntrinsicHeight 48
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 */
export default function ThumbnailConnection(props: Props) {
  return <KitComponent {...props} />
}

addPropertyControls(
  ThumbnailConnection,
  thumbnailConnectionPropertyControls,
)
