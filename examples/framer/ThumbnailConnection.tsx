import { addPropertyControls } from "framer"
// @ts-expect-error Local HTTPS modules do not expose types to Framer.
import {
  ThumbnailConnection as KitComponent,
  thumbnailConnectionPropertyControls,
} from "https://framer-kit-dev.kniff.at/embla.js"

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
