// @ts-ignore Framer cannot resolve local code-file imports.
import { RamkaGalleryContext } from "../lightbox/context.ts"
// @ts-ignore Framer cannot resolve local code-file imports.
import { CarouselCanvasSettings } from "./CarouselCanvasSettings.tsx"
// @ts-ignore Framer cannot resolve local code-file imports.
import { CarouselPreviewSettings } from "./CarouselPreviewSettings.tsx"
import { useContext, type CSSProperties } from "react"
import {
    addPropertyControls,
    ControlType,
    RenderTarget,
    type PropertyControls,
} from "framer"

import type { Transition } from "framer-motion"

export interface KniffCarouselSettingsProps {
    showInstructions?: boolean
    style?: CSSProperties
    containerID?: string
    boundaryID?: string
    align?: "start" | "center" | "end"
    loop?: boolean
    autoMove?: "none" | "perSlide" | "scroll"
    slideTransition?: Transition
    autoMoveDelay?: number
    autoMoveStartDelay?: number
    autoMoveSpeed?: number
    autoMoveDirection?: "left" | "right"
    autoMoveStopOnInteraction?: boolean
    autoMoveStopOnLastSlide?: boolean
    edgeSpace?: boolean
}

/**
 * @framerIntrinsicWidth 200
 * @framerIntrinsicHeight 80
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 */
export function KniffCarouselSettings(props: KniffCarouselSettingsProps) {
    const gallery = useContext(RamkaGalleryContext) as any
    if (RenderTarget.current() === RenderTarget.canvas)
        return <CarouselCanvasSettings {...props} />
    if (gallery?.isLoopCopy) return null
    return <CarouselPreviewSettings {...props} />
}

export const kniffCarouselSettingsPropertyControls = {
    showInstructions: {
        type: ControlType.Boolean,
        title: "Instructions",
        defaultValue: true,
    },
    autoMove: {
        title: "Auto Move",
        type: ControlType.Enum,
        options: ["none", "perSlide", "scroll"],
        optionTitles: ["Off", "Per Slide", "Scroll"],
        defaultValue: "none",
    },
    slideTransition: {
        title: "Slide Transition",
        type: ControlType.Transition,
        defaultValue: { type: "tween", duration: 0.4, ease: "easeInOut" },
    },
    autoMoveDelay: {
        title: "Pause per Slide",
        type: ControlType.Number,
        defaultValue: 8,
        min: 0.1,
        max: 100,
        unit: "s",
        displayStepper: true,
        step: 0.1,
        hidden: (props) => props.autoMove !== "perSlide",
    },
    autoMoveStartDelay: {
        title: "Start Delay",
        type: ControlType.Number,
        defaultValue: 0,
        min: 0,
        step: 0.1,
        unit: "s",
        hidden: (props) => props.autoMove !== "scroll",
    },
    autoMoveSpeed: {
        title: "Speed",
        type: ControlType.Number,
        defaultValue: 30,
        min: 1,
        max: 500,
        unit: "px/s",
        hidden: (props) => props.autoMove !== "scroll",
    },
    autoMoveDirection: {
        title: "Direction",
        type: ControlType.Enum,
        options: ["left", "right"],
        optionTitles: ["Left", "Right"],
        defaultValue: "left",
        displaySegmentedControl: true,
        hidden: (props) => props.autoMove === "none",
    },
    autoMoveStopOnInteraction: {
        title: "Stop on Interaction",
        type: ControlType.Boolean,
        defaultValue: false,
        hidden: (props) => !props.autoMove || props.autoMove === "none",
    },
    autoMoveStopOnLastSlide: {
        title: "Stop on Last Slide",
        type: ControlType.Boolean,
        defaultValue: false,
        hidden: (props) => !props.autoMove || props.autoMove === "none",
    },
    loop: {
        title: "Loop",
        type: ControlType.Boolean,
        defaultValue: true,
        description:
            "Apply withKniffCarousel to the overflow viewport. Loop copies are rendered through React in preview and on the published site.",
    },
    containerID: {
        title: "Viewport",
        type: ControlType.String,
        defaultValue: "Percentage Sized Carousel",
        description: "Match the overflow viewport’s aria-label or layer name.",
    },
    boundaryID: {
        title: "Boundary",
        type: ControlType.String,
        defaultValue: "",
        description:
            "Optional full-width ancestor name. Leave blank to use the page body.",
    },
    align: {
        title: "Snap Align",
        type: ControlType.Enum,
        options: ["start", "center", "end"],
        optionIcons: ["align-left", "align-center", "align-right"],
        displaySegmentedControl: true,
        defaultValue: "center",
    } as PropertyControls<KniffCarouselSettingsProps>["align"] & {
        optionIcons: string[]
    },
    edgeSpace: {
        title: "Edge Space",
        type: ControlType.Boolean,
        defaultValue: true,
        hidden: (props) => props.loop !== false,
        description: "This allows us to align first and last slide as well",
    },
} satisfies PropertyControls<KniffCarouselSettingsProps>

let propertyControlsRegistered = false

export function registerKniffCarouselSettingsPropertyControls(): void {
    if (propertyControlsRegistered) return
    addPropertyControls(
        KniffCarouselSettings,
        kniffCarouselSettingsPropertyControls
    )
    propertyControlsRegistered = true
}

registerKniffCarouselSettingsPropertyControls()

KniffCarouselSettings.displayName = "Kniff Carousel Settings"
