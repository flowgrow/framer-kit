import { addPropertyControls, ControlType, RenderTarget } from "framer"
import { createPortal } from "react-dom"
import {
  Children,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react"
// @ts-ignore Framer resolves local code files at runtime.
import { lightboxContentGrid, lightboxContentSlots, lightboxContentStyle } from "./context.ts"
// @ts-ignore Framer resolves local code files at runtime.
import { ramkaSettingsDefaults } from "./defaults.ts"
// @ts-ignore Framer resolves local code files at runtime.
import { IconX } from "./presetIcons.tsx"
// @ts-ignore Framer resolves local code files at runtime.
import { ramkaPresetCSS } from "./presetStyles.ts"

interface Props {
  sizing?: "fill" | "fixed"
  contentWidth?: number
  contentHeight?: number
  horizontalAlignment?: "left" | "center" | "right"
  verticalAlignment?: "top" | "center" | "bottom"
  content?: ReactNode
  thumbnail?: ReactNode
  caption?: ReactNode
  canvasPreview?: boolean
  style?: CSSProperties
}

/**
 * @framerIntrinsicWidth 150
 * @framerIntrinsicHeight 28
 * @framerSupportedLayoutWidth any
 * @framerSupportedLayoutHeight any
 */
export default function LightboxContent({
  content,
  thumbnail,
  caption,
  canvasPreview,
  sizing,
  contentWidth,
  contentHeight,
  horizontalAlignment,
  verticalAlignment,
  style,
}: Props) {
  const marker = useRef<HTMLStyleElement>(null)
  const canvasAnchor = useRef<HTMLSpanElement>(null)
  const [breakpoint, setBreakpoint] = useState<HTMLElement | null>(null)
  const [thumbnailTarget, setThumbnailTarget] = useState<HTMLSpanElement | null>(null)
  const isCanvas = RenderTarget.current() === RenderTarget.canvas

  useLayoutEffect(() => {
    if (!isCanvas || !canvasPreview) return
    setBreakpoint(
      canvasAnchor.current?.closest<HTMLElement>(
        '[data-framer-breakpoint], :has(> [data-layout-template-root="true"])',
      ) ?? null,
    )
  }, [isCanvas, canvasPreview])

  useEffect(() => {
    const node = marker.current
    const trigger = node?.closest<HTMLElement>("[data-kniff-lightbox-trigger]")
    if (!trigger || (!content && !thumbnail && !caption)) return

    const slots = {
      content,
      thumbnail,
      setThumbnailTarget,
      caption,
      sizing,
      contentWidth,
      contentHeight,
      horizontalAlignment,
      verticalAlignment,
    }
    lightboxContentSlots.set(trigger, slots)
    trigger.dispatchEvent(new Event("kniff-lightbox-content-change"))
    return () => {
      if (lightboxContentSlots.get(trigger) !== slots) return
      lightboxContentSlots.delete(trigger)
      trigger.dispatchEvent(new Event("kniff-lightbox-content-change"))
    }
  }, [
    content,
    thumbnail,
    caption,
    sizing,
    contentWidth,
    contentHeight,
    horizontalAlignment,
    verticalAlignment,
  ])

  if (isCanvas) {
    const label = (
      <span
        ref={canvasAnchor}
        style={{
          ...style,
          position: "relative",
          zIndex: canvasPreview ? 11 : undefined,
          display: "inline-flex",
          boxSizing: "border-box",
          whiteSpace: "nowrap",
          width: "max-content",
          height: "auto",
          padding: "4px 8px",
          borderRadius: 4,
          background: "#222",
          color: "#fff",
          font: "12px system-ui",
        }}
      >
        Lightbox Content
      </span>
    )
    if (canvasPreview) {
      const thumbnailChildren = Children.toArray(thumbnail)
      const hasThumbnail = thumbnailChildren.length > 0
      const preview = (
        <div
          className="kniff-ramka-lb-portal"
          style={{
            ...style,
            position: breakpoint ? "absolute" : "relative",
            inset: breakpoint ? "0 0 auto" : undefined,
            width: "100%",
            maxWidth: "none",
            isolation: "isolate",
            minHeight: 180,
            zIndex: 10,
          }}
        >
          <style>{ramkaPresetCSS}</style>
          <div
            className="kniff-ramka-lb-backdrop"
            data-open=""
            style={{ position: "absolute", backgroundColor: ramkaSettingsDefaults.backdropColor }}
          />
          <div
            className="kniff-ramka-lb-content kniff-ramka-lb-content-solo"
            data-open=""
            style={{ position: "relative", height: "100%", minHeight: "inherit" }}
          >
            <div className="kniff-ramka-lb-top-right" aria-hidden="true">
              <span className="kniff-ramka-lb-control">
                <IconX />
              </span>
            </div>
            <div
              className="kniff-ramka-lb-slide"
              style={{
                flex: "1 0 auto",
                ...lightboxContentGrid,
                boxSizing: "border-box",
                ...(hasThumbnail ? { height: "auto", paddingBottom: "0.75rem" } : {}),
                ...(sizing === "fixed"
                  ? {
                      flex: "0 0 auto",
                      height: `calc(${contentHeight ?? 480}px + var(--lb-inset-top) + ${hasThumbnail ? "0.75rem" : "var(--lb-inset-bottom)"})`,
                    }
                  : {}),
              }}
            >
              <div
                data-kniff-lightbox-content-box=""
                style={lightboxContentStyle({
                  sizing,
                  contentWidth,
                  contentHeight,
                  horizontalAlignment,
                  verticalAlignment,
                })}
              >
                {content}
              </div>
            </div>
            {(caption || hasThumbnail) && (
              <div
                className={
                  hasThumbnail
                    ? "kniff-ramka-lb-bottom"
                    : "kniff-ramka-lb-bottom kniff-ramka-lb-bottom-solo"
                }
                style={hasThumbnail ? { position: "relative" } : undefined}
              >
                {caption && (
                  <div className="kniff-ramka-lb-caption-group">
                    <div className="kniff-ramka-lb-caption">{caption}</div>
                  </div>
                )}
                {hasThumbnail && (
                  <div className="kniff-ramka-lb-thumbnail-strip" style={{ position: "relative" }}>
                    <div data-ramka-thumbnail-strip-track="" style={{ marginInline: "auto" }}>
                      <div role="tab" aria-selected="true">
                        <span data-kniff-lightbox-thumbnail-content="">{thumbnailChildren}</span>
                      </div>
                    </div>
                    <span className="kniff-ramka-lb-thumbnail-strip-indicator" aria-hidden />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )
      return (
        <>
          {label}
          {breakpoint ? createPortal(preview, breakpoint) : preview}
        </>
      )
    }
    return label
  }
  return (
    <>
      <style ref={marker} data-kniff data-kniff-lightbox-content-settings="">
        {
          "[data-framer-name]:has(> style[data-kniff-lightbox-content-settings]) { display: none !important; }"
        }
      </style>
      {thumbnailTarget && createPortal(thumbnail, thumbnailTarget)}
    </>
  )
}

addPropertyControls(LightboxContent, {
  content: { type: ControlType.ComponentInstance, title: "Content" },
  thumbnail: { type: ControlType.ComponentInstance, title: "Thumbnail" },
  caption: { type: ControlType.ComponentInstance, title: "Caption" },
  sizing: {
    type: ControlType.Enum,
    title: "Sizing",
    options: ["fill", "fixed"],
    optionTitles: ["Fill", "Fixed"],
    defaultValue: "fill",
  },
  contentWidth: {
    type: ControlType.Number,
    title: "Width",
    defaultValue: 640,
    min: 1,
    unit: "px",
    hidden: ({ sizing }) => sizing !== "fixed",
  },
  contentHeight: {
    type: ControlType.Number,
    title: "Height",
    defaultValue: 480,
    min: 1,
    unit: "px",
    hidden: ({ sizing }) => sizing !== "fixed",
  },
  horizontalAlignment: {
    type: ControlType.Enum,
    title: "Horizontal",
    options: ["left", "center", "right"],
    optionTitles: ["Left", "Center", "Right"],
    defaultValue: "center",
  },
  verticalAlignment: {
    type: ControlType.Enum,
    title: "Vertical",
    options: ["top", "center", "bottom"],
    optionTitles: ["Top", "Center", "Bottom"],
    defaultValue: "center",
  },
  canvasPreview: { type: ControlType.Boolean, title: "Canvas Preview", defaultValue: false },
})
