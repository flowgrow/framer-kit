import { useContext, type CSSProperties } from "react"
// @ts-ignore Framer cannot resolve local code-file imports.
import { CarouselSettingsSnapshot } from "./carousel/carouselContext.tsx"
// @ts-ignore Framer cannot resolve local code-file imports.
import { RamkaGalleryContext } from "./lightbox/context.ts"

/**
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight auto
 * @framerIntrinsicWidth 480
 */
export default function SettingsDebug({ style }: { style?: CSSProperties }) {
    const carousel = useContext(CarouselSettingsSnapshot)
    const gallery = useContext(RamkaGalleryContext)
    const settings = {
        ...(carousel && { carousel: JSON.parse(carousel) }),
        ...(gallery && { lightbox: gallery.config }),
    }
    return <pre data-kniff="" style={{ ...style, margin: 0, whiteSpace: "pre-wrap", overflowWrap: "anywhere", font: "13px/1.5 monospace" }}>
        {carousel || gallery ? JSON.stringify(settings, null, 2) : "Place Settings Debug inside a Kit context and open Preview."}
    </pre>
}
