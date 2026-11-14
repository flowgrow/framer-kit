// @ts-ignore Framer cannot resolve local code-file imports.
import { CanvasInstructions } from "../shared/CanvasInstructions.tsx"
import {
    addPropertyControls,
    ControlType,
    RenderTarget,
    type PropertyControls,
} from "framer"
import { useContext, useEffect } from "react"

// @ts-ignore Framer cannot resolve local code-file imports.
import { RamkaGalleryContext } from "./context.ts"
// @ts-ignore Framer cannot resolve local code-file imports.
import { defaultRamkaGalleryConfig, ramkaSettingsDefaults } from "./defaults.ts"
// @ts-ignore Framer cannot resolve local code-file imports.
import type { RamkaGalleryConfig, RamkaSettingsProps } from "./types.ts"

/** Configures the nearest parent carrying the withKniffLightboxGallery override. */
export function RamkaSettings(props: RamkaSettingsProps) {
    if (RenderTarget.current() === RenderTarget.canvas) {
        if (props.showInstructions === false) {
            // Framer keeps the canvas wrapper. Mark it so the carousel skips it.
            return <span hidden data-kniff data-kniff-ramka-settings="" />
        }
        return (
            <CanvasInstructions
                data-kniff
                data-kniff-ramka-settings=""
                title="Kniff Lightbox Settings"
                style={props.style}
            >
                Place this inside the parent using the Kniff Lightbox Gallery
                override.
            </CanvasInstructions>
        )
    }
    return <RenderedSettings {...props} />
}

function RenderedSettings(props: RamkaSettingsProps) {
    const settings = {
        ...ramkaSettingsDefaults,
        ...props,
        loop: false,
        viewTransition: true,
        morphTo: "active" as const,
        pullToClose: true,
    }
    const gallery = useContext(RamkaGalleryContext) as any
    const setGalleryConfig = gallery?.setConfig
    const {
        loop,
        viewTransition,
        morphTo,
        pullToClose,
        preload,
        layout,
        zoom,
        showThumbnails,
        showCaptions,
        backdropColor,
    } = settings

    useEffect(() => {
        if (!setGalleryConfig) return
        const config: RamkaGalleryConfig = {
            loop,
            viewTransition,
            morphTo,
            pullToClose,
            preload,
            layout,
            zoom,
            showThumbnails,
            showCaptions,
            backdropColor,
        }
        setGalleryConfig(config)
        return () => setGalleryConfig(defaultRamkaGalleryConfig)
    }, [
        setGalleryConfig,
        loop,
        viewTransition,
        morphTo,
        pullToClose,
        preload,
        layout,
        zoom,
        showThumbnails,
        showCaptions,
        backdropColor,
    ])

    return (
        <>
            <style
                data-kniff
                data-kniff-ramka-wrapper-style=""
                dangerouslySetInnerHTML={{
                    __html: "div[data-framer-name]:has(> style[data-kniff-ramka-wrapper-style]) { display:none !important; }",
                }}
            />
            <span hidden data-kniff data-kniff-ramka-settings="" />
        </>
    )
}

RamkaSettings.displayName = "Kniff Lightbox Settings"
export const ramkaSettingsPropertyControls = {
    showInstructions: {
        type: ControlType.Boolean,
        title: "Instructions",
        defaultValue: true,
    },
    preload: {
        type: ControlType.Number,
        title: "Preload",
        defaultValue: ramkaSettingsDefaults.preload,
        min: 0,
        max: 4,
        step: 1,
        displayStepper: true,
    },
    layout: {
        type: ControlType.Enum,
        title: "Layout",
        options: ["peek", "theater"],
        optionTitles: ["Peek", "Theater"],
        defaultValue: ramkaSettingsDefaults.layout,
    },
    zoom: {
        type: ControlType.Boolean,
        title: "Zoom",
        defaultValue: ramkaSettingsDefaults.zoom,
    },
    showCaptions: {
        title: "Captions",
        type: ControlType.Boolean,
        defaultValue: ramkaSettingsDefaults.showCaptions,
    },
    showThumbnails: {
        type: ControlType.Boolean,
        title: "Thumbnail Nav",
        defaultValue: ramkaSettingsDefaults.showThumbnails,
    },
    backdropColor: {
        type: ControlType.Color,
        title: "Backdrop",
        defaultValue: ramkaSettingsDefaults.backdropColor,
    },
} satisfies PropertyControls<RamkaSettingsProps>

addPropertyControls(RamkaSettings, ramkaSettingsPropertyControls)
