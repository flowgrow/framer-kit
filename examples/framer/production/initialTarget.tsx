import type { CSSProperties } from "react"
// @ts-ignore Framer resolves remote HTTPS modules without TypeScript declarations.
import { InitialTarget as KitComponent } from "https://esm.sh/@kniff/framer-kit@0.4.0/scroll-snap?external=react,react-dom,framer&target=es2022"

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
