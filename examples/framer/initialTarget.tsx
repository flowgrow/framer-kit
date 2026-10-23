import type { CSSProperties } from "react"
// @ts-ignore Framer resolves remote HTTPS modules without TypeScript declarations.
import { InitialTarget as KitComponent } from "https://framer-kit-dev.kniff.at/scroll-snap.js"

interface Props { style?: CSSProperties }

/**
 * @framerIntrinsicWidth 1
 * @framerIntrinsicHeight 1
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 */
export default function InitialTarget(props: Props) {
  return <KitComponent {...props} />
}
