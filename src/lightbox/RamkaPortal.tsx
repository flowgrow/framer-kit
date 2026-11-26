// @ts-ignore Framer cannot resolve local code-file imports.
import { lightboxContentGrid, lightboxContentStyle } from "./context.ts"
// @ts-ignore Framer cannot resolve local code-file imports.
import { StyledCaption } from "./StyledCaption.tsx"
// @ts-ignore Remote ESM module has no Framer TypeScript declarations.
import * as Lightbox from "https://cdn.jsdelivr.net/gh/flowgrow/ramka@1fc1f3f47fec00aff45e721f7627a20b1efdfccd/companion-dist/lightbox.mjs"
// @ts-ignore Remote ESM module has no Framer TypeScript declarations.
const { useLightboxContext } = Lightbox
import * as React from "react"
// @ts-ignore Framer cannot resolve local code-file imports.
import { IconX, IconZoomIn, IconZoomOut } from "./presetIcons.tsx"
// @ts-ignore Framer cannot resolve local code-file imports.
import type { RamkaGalleryConfig, RamkaMediaItem } from "./types.ts"

const classes = (...names: (string | false)[]) =>
  names
    .filter(Boolean)
    .map((name) => `kniff-ramka-${name}`)
    .join(" ")
const ratio = (item: RamkaMediaItem) => (item.width && item.height ? item.width / item.height : 1)

const maxImageEdge = 2560

function framerImageUrl(src: string): URL | undefined {
  try {
    const url = new URL(src)
    if (url.hostname === "framerusercontent.com" && url.pathname.startsWith("/images/")) return url
  } catch {
    // Non-absolute image URLs are left as authored.
  }
}

function thumbnailSrc(item: RamkaMediaItem): string {
  const url = framerImageUrl(item.src)
  if (!url) return item.src
  const dpr = typeof window === "undefined" ? 1 : window.devicePixelRatio || 1
  if (item.width && item.height) {
    const longEdge = Math.ceil(
      (72 * dpr * Math.max(item.width, item.height)) / Math.min(item.width, item.height),
    )
    url.searchParams.set("scale-down-to", String(longEdge))
  } else {
    url.searchParams.delete("scale-down-to")
  }
  return url.href
}

function mainImageSources(item: RamkaMediaItem) {
  const url = framerImageUrl(item.src)
  if (!url) return { src: item.src, srcSet: item.srcSet }

  url.searchParams.set("scale-down-to", String(maxImageEdge))
  const src = url.href
  const cappedWidth = Math.max(
    1,
    Math.floor(Math.min(item.width || maxImageEdge, maxImageEdge * Math.min(1, ratio(item)))),
  )
  const smaller = (item.srcSet ?? "").split(",").flatMap((candidate) => {
    const match = candidate.trim().match(/^(\S+)\s+(\d+)w$/)
    if (!match || Number(match[2]) >= cappedWidth) return []
    const variant = framerImageUrl(match[1]!)
    const edge = Number(variant?.searchParams.get("scale-down-to"))
    return variant && edge > 0 && edge < maxImageEdge ? [candidate.trim()] : []
  })
  return { src, srcSet: [...smaller, `${src} ${cappedWidth}w`].join(", ") }
}

function mainImageSizes(item: RamkaMediaItem, snug: boolean, solo: boolean): string {
  if (!item.width || !item.height) return "100vw"
  const aspect = Number(ratio(item).toFixed(4))
  const inlineInset = snug ? "4rem" : "6rem"
  const verticalInset = solo ? "9rem" : "13.125rem"
  return `(min-width: 768px) min(calc(100vw - ${inlineInset}), calc((100vh - ${verticalInset}) * ${aspect})), min(100vw, calc((100vh - 8rem) * ${aspect}))`
}

function SlideImage({
  active,
  ...props
}: React.ImgHTMLAttributes<HTMLImageElement> & { active: boolean }) {
  const ref = React.useRef<HTMLImageElement>(null)

  React.useEffect(() => {
    const img = ref.current
    if (!img || typeof img.decode !== "function") return
    let cancelled = false
    let timer = 0
    const decode = () => {
      if (cancelled || !img.complete || img.naturalWidth === 0) return
      img.decode().catch(() => {})
    }
    const schedule = () => {
      if (cancelled) return
      if (active) {
        decode()
      } else {
        // Let the active slide paint and decode first; decode preloaded
        // neighbors off-thread before they scroll into Safari's tile buffer.
        timer = window.setTimeout(decode, 32)
      }
    }
    if (img.complete && img.naturalWidth > 0) schedule()
    else img.addEventListener("load", schedule, { once: true })
    return () => {
      cancelled = true
      window.clearTimeout(timer)
      img.removeEventListener("load", schedule)
    }
  }, [active, props.src, props.srcSet, props.sizes])

  return <img ref={ref} {...props} />
}

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
  solo,
  zoom,
}: {
  index: number
  item: RamkaMediaItem
  snug: boolean
  solo: boolean
  zoom: boolean
}) {
  const { activeIndex, navigate } = useLightboxContext()
  const caption = React.useMemo(
    () =>
      item.slots?.caption ??
      (item.captionElement ? (
        <StyledCaption source={item.captionElement} />
      ) : (
        (item.caption ?? item.alt)
      )),
    [item.captionElement, item.caption, item.alt, item.slots],
  )
  const sources = React.useMemo(
    () => mainImageSources(item),
    [item],
  )
  const sizes = React.useMemo(
    () => mainImageSizes(item, snug, solo),
    [item, snug, solo],
  )
  const media = (
    <Lightbox.Media
      className={classes("lb-media")}
      {...(item.width ? { width: item.width } : {})}
      {...(item.height ? { height: item.height } : {})}
    >
      <SlideImage
        active={index === activeIndex}
        {...sources}
        sizes={sizes}
        width={item.width}
        height={item.height}
        alt={item.alt}
        draggable={false}
        loading="eager"
        decoding="async"
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
      <Lightbox.Item
        index={index}
        caption={caption}
        aria-roledescription="slide"
        style={item.slots?.content ? lightboxContentGrid : undefined}
      >
        {item.slots?.content ? (
          index === activeIndex && (
            <div
              data-kniff-lightbox-custom=""
              data-kniff-lightbox-content-box=""
              style={lightboxContentStyle(item.slots)}
              onKeyDown={(event) => {
                if (event.key.startsWith("Arrow")) event.stopPropagation()
              }}
            >
              {item.slots.content}
            </div>
          )
        ) : zoom ? (
          <Lightbox.Zoom maxZoom={6}>{media}</Lightbox.Zoom>
        ) : (
          media
        )}
      </Lightbox.Item>
    </Lightbox.Slide>
  )
}

/** Ramka's default preset, adapted to media registered by Framer overrides. */
function RamkaPortalImpl({
  items,
  config,
  onPullStart,
}: {
  items: RamkaMediaItem[]
  config: RamkaGalleryConfig
  onPullStart?: () => void
}) {
  const { activeIndex } = useLightboxContext()
  const [contentEl, setContentEl] = React.useState<HTMLElement | null>(null)
  const onPullStartRef = React.useRef(onPullStart)
  onPullStartRef.current = onPullStart
  React.useEffect(() => {
    if (!contentEl || typeof MutationObserver === "undefined") return
    let pulling = contentEl.hasAttribute("data-pulling")
    if (pulling) onPullStartRef.current?.()
    const observer = new MutationObserver(() => {
      const next = contentEl.hasAttribute("data-pulling")
      if (next && !pulling) onPullStartRef.current?.()
      pulling = next
    })
    observer.observe(contentEl, { attributes: true, attributeFilter: ["data-pulling"] })
    return () => observer.disconnect()
  }, [contentEl])
  const custom = Boolean(items[activeIndex]?.slots?.content)
  const snug = config.layout === "peek"
  if (!items.length) return null
  const solo = items.length === 1
  const soloLayout = solo || !config.showThumbnails
  return (
    <Lightbox.Portal
      data-kniff-ramka-portal=""
      className={`${classes("lb-portal")}${backdropIsDark(config.backdropColor) ? " dark" : ""}`}
      style={
        {
          position: "fixed",
          inset: 0,
          zIndex: 2147483647,
          "--lightbox-vt-duration": config.viewTransition ? "360ms" : "160ms",
        } as React.CSSProperties
      }
    >
      <Lightbox.Backdrop
        className={classes("lb-backdrop")}
        style={{ backgroundColor: config.backdropColor }}
      />
      <Lightbox.Content
        ref={setContentEl}
        aria-label="Lightbox"
        pullToClose={config.pullToClose && !custom}
        className={classes(
          "lb-content",
          snug && "lb-content-snug",
          soloLayout && "lb-content-solo",
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
            <GallerySlide
              key={item.id}
              index={index}
              item={item}
              snug={snug}
              solo={soloLayout}
              zoom={config.zoom}
            />
          ))}
        </Lightbox.Slides>
        <div className={classes("lb-top-right", "lb-chrome-gesture-hide")}>
          {config.zoom && !custom && (
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
              <Lightbox.ThumbnailStripTrack aria-label="Lightbox thumbnails">
                {items.map((item, index) => {
                  const thumbnail = React.Children.toArray(item.slots?.thumbnail)
                  return (
                    <Lightbox.Thumbnail key={item.id} index={index}>
                      {thumbnail.length > 0 ? (
                        <span
                          data-kniff-lightbox-thumbnail-content=""
                          ref={item.slots?.setThumbnailTarget}
                        >
                          {!item.slots?.setThumbnailTarget && thumbnail}
                        </span>
                      ) : item.src ? (
                        <img
                          src={thumbnailSrc(item)}
                          srcSet={framerImageUrl(item.src) ? undefined : item.srcSet}
                          sizes={`${72 * Math.max(1, ratio(item))}px`}
                          alt={item.alt}
                          draggable={false}
                          loading="lazy"
                          decoding="async"
                        />
                      ) : (
                        <span>{item.alt || `Item ${index + 1}`}</span>
                      )}
                    </Lightbox.Thumbnail>
                  )
                })}
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
