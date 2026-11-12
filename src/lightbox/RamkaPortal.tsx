// @ts-ignore Framer cannot resolve local code-file imports.
import { StyledCaption } from "./StyledCaption.tsx"
// @ts-ignore Remote ESM module has no Framer TypeScript declarations.
import * as Lightbox from "https://esm.sh/@ramka/react@0.0.2/lightbox?external=react,react-dom&target=es2022"
// @ts-ignore Remote ESM module has no Framer TypeScript declarations.
import { useLightboxContext } from "https://esm.sh/@ramka/react@0.0.2?external=react,react-dom&target=es2022"
import * as React from "react"
// @ts-ignore Framer cannot resolve local code-file imports.
import { IconX, IconZoomIn, IconZoomOut } from "./presetIcons.tsx"
// @ts-ignore Framer cannot resolve local code-file imports.
import { ramkaPresetCSS } from "./presetStyles.ts"
// @ts-ignore Framer cannot resolve local code-file imports.
import type { RamkaGalleryConfig, RamkaMediaItem } from "./types.ts"

const classes = (...names: (string | false)[]) =>
  names
    .filter(Boolean)
    .map((name) => `kniff-ramka-${name}`)
    .join(" ")
const ratio = (item: RamkaMediaItem) => (item.width && item.height ? item.width / item.height : 1)

function backdropIsDark(color: string): boolean {
  const hex = color.match(/^#([\da-f]{3}|[\da-f]{6}|[\da-f]{8})$/i)?.[1]
  const channels = hex
    ? hex.length === 3
      ? hex.split("").map((c) => parseInt(c + c, 16))
      : [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16))
    : color
        .match(/^rgba?\(([^)]+)\)/)?.[1]
        ?.match(/[\d.]+/g)
        ?.slice(0, 3)
        .map(Number)
  return (
    !!channels &&
    channels.length === 3 &&
    channels[0]! * 0.2126 + channels[1]! * 0.7152 + channels[2]! * 0.0722 < 140
  )
}

function GallerySlide({
  index,
  item,
  snug,
  zoom,
}: {
  index: number
  item: RamkaMediaItem
  snug: boolean
  zoom: boolean
}) {
  const { activeIndex, navigate } = useLightboxContext()
  const caption = React.useMemo(
    () =>
      item.captionElement ? (
        <StyledCaption source={item.captionElement} />
      ) : (
        (item.caption ?? item.alt)
      ),
    [item.captionElement, item.caption, item.alt],
  )
  const media = (
    <Lightbox.Media
      className={classes("lb-media")}
      {...(item.width ? { width: item.width } : {})}
      {...(item.height ? { height: item.height } : {})}
    >
      <img
        src={item.src}
        srcSet={item.srcSet}
        sizes="100vw"
        width={item.width}
        height={item.height}
        alt={item.alt}
        draggable={false}
        loading="eager"
      />
    </Lightbox.Media>
  )
  return (
    <Lightbox.Slide
      className={classes("lb-slide", snug && "lb-slide-snug")}
      style={{ "--lb-snug-ratio": ratio(item) } as React.CSSProperties}
      onClick={(event: React.MouseEvent<HTMLElement>) => {
        if (
          Math.abs(index - activeIndex) !== 1 ||
          !(event.target as Element).closest("[data-ramka-media]")
        )
          return
        navigate(index, "button")
      }}
    >
      <Lightbox.Item index={index} caption={caption} aria-roledescription="slide">
        {zoom ? <Lightbox.Zoom maxZoom={6}>{media}</Lightbox.Zoom> : media}
      </Lightbox.Item>
    </Lightbox.Slide>
  )
}

/** Ramka's default preset, adapted to media registered by Framer overrides. */
function RamkaPortalImpl({
  items,
  config,
}: {
  items: RamkaMediaItem[]
  config: RamkaGalleryConfig
}) {
  const snug = config.layout === "peek"
  if (!items.length) return null
  const solo = items.length === 1
  return (
    <Lightbox.Portal
      data-kniff-ramka-portal=""
      className={`${classes("lb-portal")}${backdropIsDark(config.backdropColor) ? " dark" : ""}`}
      style={{ position: "fixed", inset: 0, zIndex: 2147483647 }}
    >
      <style>{ramkaPresetCSS}</style>
      <Lightbox.Backdrop
        className={classes("lb-backdrop")}
        style={{ backgroundColor: config.backdropColor }}
      />
      <Lightbox.Content
        aria-label="Image viewer"
        pullToClose={config.pullToClose}
        className={classes(
          "lb-content",
          snug && "lb-content-snug",
          (solo || !config.showThumbnails) && "lb-content-solo",
        )}
      >
        <Lightbox.Slides
          aria-label="Full-size images"
          aria-roledescription="carousel"
          preload={config.preload}
          className={classes("lb-slides", snug && "lb-slides-snug")}
          style={
            {
              "--lb-snug-ratio-start": ratio(items[0]!),
              "--lb-snug-ratio-end": ratio(items[items.length - 1]!),
            } as React.CSSProperties
          }
        >
          {items.map((item, index) => (
            <GallerySlide key={item.id} index={index} item={item} snug={snug} zoom={config.zoom} />
          ))}
        </Lightbox.Slides>
        <div className={classes("lb-top-right", "lb-chrome-gesture-hide")}>
          {config.zoom && (
            <div className={classes("lb-control-group", "lb-control-md")}>
              <Lightbox.ZoomOut aria-label="Zoom out" className={classes("lb-control")}>
                <IconZoomOut />
              </Lightbox.ZoomOut>
              <Lightbox.ZoomIn aria-label="Zoom in" className={classes("lb-control")}>
                <IconZoomIn />
              </Lightbox.ZoomIn>
            </div>
          )}
          <Lightbox.Close aria-label="Close" className={classes("lb-control")}>
            <IconX />
          </Lightbox.Close>
        </div>
        <div className={classes("lb-bottom", "lb-chrome-gesture-hide", solo && "lb-bottom-solo")}>
          {config.showCaptions && (
            <div className={classes("lb-caption-group")}>
              <Lightbox.Caption className={classes("lb-caption")} />
            </div>
          )}
          {!solo && config.showThumbnails && (
            <Lightbox.ThumbnailStrip
              className={classes("lb-thumbnail-strip", "lb-thumbnail-strip-desktop")}
            >
              <Lightbox.ThumbnailStripTrack aria-label="Photo thumbnails">
                {items.map((item, index) => (
                  <Lightbox.Thumbnail key={item.id} index={index}>
                    <img src={item.src} alt={item.alt} draggable={false} loading="lazy" />
                  </Lightbox.Thumbnail>
                ))}
              </Lightbox.ThumbnailStripTrack>
              <span className={classes("lb-thumbnail-strip-indicator")} aria-hidden />
            </Lightbox.ThumbnailStrip>
          )}
        </div>
      </Lightbox.Content>
    </Lightbox.Portal>
  )
}

export const RamkaPortal = RamkaPortalImpl
