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

export interface SlideTransform {
    opacity?: number
    scale?: number
    x?: number
    y?: number
    z?: number
    rotateX?: number
    rotateY?: number
    rotateZ?: number
}

const axis = (title: string, unit: string) => ({
    type: ControlType.Number as const, title, unit, defaultValue: 0, displayStepper: true,
})
const hideTransformSettings = (props: { enabled?: boolean; slideTransforms?: { enabled?: boolean } }) =>
    !(props.slideTransforms?.enabled ?? props.enabled)

const transformControls = {
    opacity: { type: ControlType.Number as const, title: "Opacity", min: 0, max: 1, defaultValue: 1, step: 0.01 },
    scale: { type: ControlType.Number as const, title: "Scale", min: 0, defaultValue: 1, step: 0.05, displayStepper: true },
    x: axis("Translate X", "px"), y: axis("Translate Y", "px"), z: axis("Translate Z", "px"),
    rotateX: axis("Rotate X", "°"), rotateY: axis("Rotate Y", "°"), rotateZ: axis("Rotate Z", "°"),
}

export interface KniffCarouselSettingsProps {
    showInstructions?: boolean
    style?: CSSProperties
    containerID?: string
    align?: "start" | "center" | "end"
    loop?: boolean
    autoMove?: "none" | "perSlide" | "scroll"
    slideTransforms?: { enabled?: boolean; preview?: boolean; perspective?: number; previous?: SlideTransform; current?: SlideTransform; next?: SlideTransform }
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
    containerID: {
        title: "Viewport",
        type: ControlType.String,
        defaultValue: "Percentage Sized Carousel",
    },
    loop: {
        title: "Loop",
        type: ControlType.Boolean,
        defaultValue: true,
    },
    autoMove: {
        title: "Auto Move",
        type: ControlType.Enum,
        options: ["none", "perSlide", "scroll"],
        optionTitles: ["Off", "Per Slide", "Scroll"],
        defaultValue: "none",
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
        title: "Pause on Interaction",
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
    slideTransforms: {
        type: ControlType.Object,
        title: "Effects",
        controls: {
            enabled: { type: ControlType.Boolean, title: "Enable Effects", defaultValue: false },
            preview: { type: ControlType.Boolean, title: "Canvas Preview", defaultValue: true, hidden: hideTransformSettings },
            previous: { type: ControlType.Object, title: "Previous Slides", controls: transformControls, hidden: hideTransformSettings },
            current: { type: ControlType.Object, title: "Current Slide", controls: transformControls, hidden: hideTransformSettings },
            next: { type: ControlType.Object, title: "Next Slides", controls: transformControls, hidden: hideTransformSettings },
            perspective: { ...axis("Perspective", "px"), min: 0, hidden: hideTransformSettings },
        },
    },
    slideTransition: {
        title: "Transition",
        type: ControlType.Transition,
        defaultValue: { type: "tween", duration: 0.4, ease: "easeInOut" },
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
    },
    showInstructions: {
        type: ControlType.Boolean,
        title: "Instructions",
        defaultValue: true,
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
