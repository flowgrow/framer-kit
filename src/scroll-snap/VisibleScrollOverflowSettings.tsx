import { useEffect, useRef } from "react"
import { addPropertyControls, ControlType, RenderTarget, type PropertyControls } from "framer"
export interface VisibleScrollOverflowSettingsProps {
  containerID?: string
  boundaryID?: string
  align?: "start" | "center" | "end"
  showScrollbar?: boolean
  stopEach?: boolean
  loop?: boolean
  autoMove?: "off" | "per-slide" | "scroll"
  autoMoveInterval?: number
  autoMoveSpeed?: number
  autoMoveDirection?: "left" | "right"
  edgeSpace?: boolean
}
type AutoMoveInstaller = (viewport: HTMLElement, options: { speed: number; direction: "left" | "right"; mode: "per-slide" | "scroll"; interval: number }) => () => void

function target(id:string) {
  const value=JSON.stringify(id.trim()).replace(/</g,"\\3c ")
  return `:is([aria-label=${value}], [data-framer-name=${value}]:not([aria-label]))`
}
// Responsive Framer variants use boxless wrappers; measure their rendered slide.
function slideBoxes(parent: Element): HTMLElement[] {
  return Array.from(parent.children).flatMap(child => {
    if (!(child instanceof HTMLElement) || ["STYLE", "SCRIPT"].includes(child.tagName)) return []
    if (getComputedStyle(child).display === "contents") return slideBoxes(child)
    return child.getClientRects().length ? [child] : []
  })
}
/**
 * @framerIntrinsicWidth 1
 * @framerIntrinsicHeight 1
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 */
export function VisibleScrollOverflowSettings({containerID="Percentage Sized Carousel",boundaryID="CSS Full Width Overflow Experiment",align="center",showScrollbar=false,stopEach=false,edgeSpace=true,loop=true,autoMove="off",autoMoveInterval=3,autoMoveSpeed=30,autoMoveDirection="left"}:VisibleScrollOverflowSettingsProps) {
  const styleRef = useRef<HTMLStyleElement>(null)
  // Preserve saved values from the former boolean control.
  const autoMoveMode = typeof autoMove === "boolean" ? (autoMove ? "scroll" : "off") : autoMove
  const canvas = RenderTarget.current() === RenderTarget.canvas
  const useEdgeSpace = loop || edgeSpace

    useEffect(() => {
        if (
            !loop ||
            RenderTarget.current() === RenderTarget.canvas ||
            !containerID.trim()
        )
            return

        let dispose: (() => void) | undefined
        let frame = 0
        let retry = 0
        let cancelled = false
        const install = () => {
            const sizing = (styleRef.current?.ownerDocument ?? document).querySelector<HTMLElement>(
                target(containerID)
            )
            const scroller = sizing?.firstElementChild as HTMLElement | null
            if (!scroller) {

                return false
            }
            if (!scroller.hasAttribute("data-kniff-react-loop")) {

                return false
            }
            const originalCycle = scroller.querySelector<HTMLElement>(":scope > [data-kniff-loop-original]")
            if (!originalCycle || slideBoxes(originalCycle).length < 2) return false
            scroller.dispatchEvent(new CustomEvent("kniff-loop-render", { detail: true }))
            const copies = scroller.querySelectorAll<HTMLElement>(":scope > [data-kniff-loop-copy]")
            if (!copies.length || scroller.hasAttribute("data-kniff-loop")) return false
            const previousSnap = scroller.style.scrollSnapType
            const previousBehavior = scroller.style.scrollBehavior
            const previousTransform = scroller.style.transform

            scroller.style.scrollSnapType = "none"
            scroller.style.scrollBehavior = "auto"
            scroller.setAttribute("data-kniff-loop", "")
            const nextWrapper = originalCycle.nextElementSibling
            let restoreFrame = 0
            let jumping = false
            let pointerDown = false
            let touchDown = false
            let settleTimer = 0
            const needsScrollEndFallback = !Reflect.has(scroller, "onscrollend")
            const geometry = () => {
                const first = slideBoxes(originalCycle)[0]
                const nextCycle = nextWrapper ? slideBoxes(nextWrapper)[0] : null
                if (!first || !nextCycle) return null
                const box = scroller.getBoundingClientRect()
                const firstBox = first.getBoundingClientRect()
                const cycle =
                    nextCycle.getBoundingClientRect().left - firstBox.left
                if (cycle <= 0 || scroller.clientWidth === 0) return null
                const css = getComputedStyle(scroller)
                const left = parseFloat(css.scrollPaddingLeft) || 0
                const right = parseFloat(css.scrollPaddingRight) || 0
                const factor =
                    align === "end" ? 1 : align === "center" ? 0.5 : 0
                const origin =
                    scroller.scrollLeft +
                    firstBox.left -
                    box.left -
                    scroller.clientLeft
                const start =
                    origin -
                    left -
                    (scroller.clientWidth - left - right - firstBox.width) *
                        factor
                return { cycle, start }
            }
            const jump = (position: number, reason: string) => {

                jumping = true
                scroller.style.transform = "translateZ(0)"
                scroller.style.scrollSnapType = "none"
                scroller.style.scrollBehavior = "auto"
                const isSafari = navigator.vendor === "Apple Computer, Inc." && /Safari/.test(navigator.userAgent)
                if (isSafari) {
                    // Commit overflow changes to reset Safari's stale scroll layer.
                    const overflowX = scroller.style.getPropertyValue("overflow-x")
                    const priority = scroller.style.getPropertyPriority("overflow-x")
                    scroller.style.setProperty("overflow-x", "hidden", "important")
                    void scroller.offsetWidth
                    scroller.scrollLeft = position
                    void scroller.offsetWidth
                    scroller.style.setProperty("overflow-x", overflowX, priority)
                    void scroller.offsetWidth

                } else {
                    scroller.scrollLeft = position
                }

                cancelAnimationFrame(restoreFrame)
                restoreFrame = requestAnimationFrame(() => {
                    scroller.style.scrollSnapType = previousSnap
                    scroller.style.scrollBehavior = previousBehavior

                    restoreFrame = requestAnimationFrame(() => {
                        jumping = false
                        scroller.setAttribute("data-kniff-loop-ready", "")

                    })
                })
            }
            const normalize = (event: Event) => {

                if (jumping || pointerDown || touchDown || scroller.hasAttribute("data-kniff-auto-move") || scroller.hasAttribute("data-kniff-lightbox-open")) {

                    return
                }
                const g = geometry()
                if (!g) {

                    return
                }
                const offset = scroller.scrollLeft - g.start
                const cycles = Math.floor((offset + 0.5) / g.cycle)

                if (cycles !== 0) jump(scroller.scrollLeft - cycles * g.cycle, "normalize")

            }
            // Older iOS Safari has no scrollend. Wait for momentum/snap scrolling
            // to stop, and never reset while a touch is still held.
            const scheduleSettle = () => {
                if (!needsScrollEndFallback) return
                window.clearTimeout(settleTimer)
                settleTimer = window.setTimeout(() => {
                    if (!pointerDown && !touchDown) normalize(new Event("scrollidle"))
                }, 180)
            }
            const touchStart = () => { touchDown = true; window.clearTimeout(settleTimer) }
            const touchEnd = (event: TouchEvent) => { touchDown = event.touches.length > 0; scheduleSettle() }
            const press = () => {
                pointerDown = true

            }
            const release = (event: PointerEvent) => {
                pointerDown = false
                scheduleSettle()

            }
            scroller.addEventListener("scrollend", normalize)
            if (needsScrollEndFallback) {
                scroller.addEventListener("scroll", scheduleSettle, { passive: true })
                scroller.addEventListener("touchstart", touchStart, { passive: true })
                window.addEventListener("touchend", touchEnd, { passive: true })
                window.addEventListener("touchcancel", touchEnd, { passive: true })
            }
            scroller.addEventListener("pointerdown", press, { passive: true })
            window.addEventListener("pointerup", release)
            window.addEventListener("pointercancel", release)

            const g = geometry()

            if (g) jump(g.start, "initial-position")
            else {

                scroller.style.scrollSnapType = previousSnap
                scroller.style.scrollBehavior = previousBehavior
            }
            dispose = () => {

                scroller.style.transform = previousTransform
                cancelAnimationFrame(restoreFrame)
                window.clearTimeout(settleTimer)
                scroller.removeEventListener("scroll", scheduleSettle)
                scroller.removeEventListener("touchstart", touchStart)
                window.removeEventListener("touchend", touchEnd)
                window.removeEventListener("touchcancel", touchEnd)
                scroller.removeEventListener("scrollend", normalize)
                scroller.removeEventListener("pointerdown", press)
                window.removeEventListener("pointerup", release)
                window.removeEventListener("pointercancel", release)
                scroller.dispatchEvent(new CustomEvent("kniff-loop-render", { detail: false }))
                scroller.removeAttribute("data-kniff-loop-ready")
                scroller.removeAttribute("data-kniff-loop")
                scroller.style.scrollSnapType = previousSnap
                scroller.style.scrollBehavior = previousBehavior

            }

            return true
        }
        const attempt = () => {
            if (cancelled || dispose) return
            if (install()) return
            if (++retry < 120) frame = requestAnimationFrame(attempt)

        }
        frame = requestAnimationFrame(attempt)
        return () => {

            cancelled = true
            cancelAnimationFrame(frame)
            dispose?.()
        }
    }, [containerID, align, loop])
  useEffect(() => {
    if (canvas || autoMoveMode === "off" || !containerID.trim()) return
    let frame = 0, attempts = 0
    let cancelled = false
    let dispose: (() => void) | undefined
    const install = (installAutoMove: AutoMoveInstaller) => {
      if (cancelled) return
      const doc = styleRef.current?.ownerDocument ?? document
      const sizing = Array.from(doc.querySelectorAll<HTMLElement>(target(containerID))).find(el => el.getClientRects().length && el.clientWidth)
      const viewport = sizing?.firstElementChild as HTMLElement | null
      if (!viewport || (loop && !viewport.hasAttribute("data-kniff-loop-ready"))) {
        if (++attempts < 120) frame = requestAnimationFrame(() => install(installAutoMove))
        return
      }
      dispose = installAutoMove(viewport, { speed: autoMoveSpeed, direction: autoMoveDirection, mode: autoMoveMode, interval: autoMoveInterval * 1000 })
    }
    // @ts-ignore Framer resolves sibling code files at runtime; the repo build checks this path.
    const load: Promise<AutoMoveInstaller> = import("./autoMove.tsx").then(module => module.installAutoMove)
    void load.then(installAutoMove => {
      if (!cancelled) frame = requestAnimationFrame(() => install(installAutoMove))
    }).catch(() => {})
    return () => { cancelled = true; cancelAnimationFrame(frame); dispose?.() }
  }, [canvas, autoMoveMode, autoMoveInterval, autoMoveSpeed, autoMoveDirection, containerID, loop, align])
  // Canvas has no scroll position: place the first slide at its snap alignment.
  useEffect(() => {
    if (!canvas || !containerID.trim()) return
    let frame = 0
    let observer: ResizeObserver | undefined
    let attributes: MutationObserver | undefined
    let viewport: HTMLElement | undefined
    let attempts = 0
    const install = () => {
      const sizing = (styleRef.current?.ownerDocument ?? document).querySelector<HTMLElement>(target(containerID))
      viewport = sizing?.firstElementChild as HTMLElement | undefined
      const first = viewport ? slideBoxes(viewport)[0] : undefined
      if (!viewport || !first) {
        if (++attempts < 120) frame = requestAnimationFrame(install)
        return
      }
      const update = () => {
        if (!viewport) return
        const css = getComputedStyle(viewport)
        const gap = css.columnGap === "normal" ? "0px" : css.columnGap
        const values = {
          "--kniff-canvas-first-width": first.offsetWidth + "px",
          "--kniff-canvas-gap": gap,
        }
        for (const [name, value] of Object.entries(values)) {
          if (viewport.style.getPropertyValue(name) !== value) viewport.style.setProperty(name, value)
        }
      }
      update()
      observer = new ResizeObserver(update)
      observer.observe(first)
      observer.observe(viewport)
      if (sizing) observer.observe(sizing)
      attributes = new MutationObserver(update)
      attributes.observe(viewport, { attributes: true, attributeFilter: ["style", "class"] })
      if (sizing) attributes.observe(sizing, { attributes: true, attributeFilter: ["style", "class"] })
    }
    frame = requestAnimationFrame(install)
    return () => {
      cancelAnimationFrame(frame)
      observer?.disconnect()
      attributes?.disconnect()
      viewport?.style.removeProperty("--kniff-canvas-first-width")
      viewport?.style.removeProperty("--kniff-canvas-gap")
    }
  }, [containerID])
  if(!containerID.trim() || !boundaryID.trim()) return null
  const reference=target(containerID), boundary=target(boundaryID)
  const viewport=`${reference} > :first-child`
  // Relative selectors stay inside the viewport's native CSS nesting block.
  const cycle = ':where([data-kniff-loop-original], [data-kniff-loop-copy])'
  const slides = `
  > :where(:not(.ssr-variant, [data-kniff-loop-original], [data-kniff-loop-copy])),
  > :where(.ssr-variant) > *,
  > ${cycle} > :where(:not(.ssr-variant)),
  > ${cycle} > :where(.ssr-variant) > *`
  const firstSlide = `
  > :where(:first-child:not(.ssr-variant, [data-kniff-loop-original], [data-kniff-loop-copy])),
  > :where(.ssr-variant:first-child) > *,
  > ${cycle}:first-child > :first-child`
  const lastSlide = `
  > :where(:last-child:not(.ssr-variant, [data-kniff-loop-original], [data-kniff-loop-copy])),
  > :where(.ssr-variant:last-child) > *,
  > ${cycle}:last-child > :last-child`
  if (RenderTarget.current() === RenderTarget.canvas) {
    const canvasFirstSlide = `> :where([data-framer-name]):nth-child(1 of [data-framer-name])`
    const canvasLastSlide = `> :where([data-framer-name]):nth-last-child(1 of [data-framer-name])`
    const canvasCSS = `
${viewport} {
  --kniff-initial-align:${align};
  --kniff-initial-position:${align === "start" ? "0%" : align === "end" ? "100%" : "50%"};
  display:flex !important; flex-wrap:nowrap !important;
  gap:inherit !important; align-items:inherit !important; justify-content:flex-start !important;
  overflow:visible !important;
  scroll-snap-type:x mandatory;
  scrollbar-width:${showScrollbar ? "auto" : "none"} !important;

  ${slides} {
    flex-shrink:0 !important;
    scroll-snap-align:${align};
    scroll-snap-stop:${stopEach ? "always" : "normal"};
  }
  ${firstSlide} { margin-inline-start:${!useEdgeSpace || align === "start" ? "0px" : `calc((100% - var(--kniff-canvas-first-width, 0px)) * ${align === "end" ? 1 : 0.5})`}; }
  ${lastSlide} { margin-inline-end:0px; }
  ${loop ? `anchor-scope:--kniff-canvas-first, --kniff-canvas-content;

  &::before {
    content:"";
    flex:0 0 100%;
    align-self:stretch;
    margin-inline-end:calc(-100% - var(--kniff-canvas-gap, 24px));
    pointer-events:none;
    anchor-name:--kniff-canvas-content;
  }

  ${canvasFirstSlide} {
    anchor-name:--kniff-canvas-first;
  }

  ${canvasLastSlide} {
    position:absolute !important;
    position-anchor:--kniff-canvas-content;
    position-area:center;
    justify-self:unsafe start;
    align-self:unsafe start;
    top:anchor(--kniff-canvas-first top) !important;
    right:auto !important;
    translate:calc(-100% - var(--kniff-canvas-gap, 24px)) 0 !important;
    bottom:auto !important;
    left:anchor(--kniff-canvas-first left) !important;
    margin:0 !important;
    opacity:0.5 !important;
  }` : ""}
  &::-webkit-scrollbar { display:${showScrollbar ? "block" : "none"} !important; }
}
`
    return <style ref={styleRef} dangerouslySetInnerHTML={{ __html: canvasCSS }} />
  }
  const css=`
@property --kniff-bleed-page-span { syntax:"<length>"; inherits:true; initial-value:0px; }
${boundary} { container-type:inline-size; }
${reference} { --kniff-bleed-page-span:100cqw; container-type:inline-size; overflow:visible !important; }
${viewport} {
  --kniff-initial-align:${align};
  --kniff-initial-position:${align === "start" ? "0%" : align === "end" ? "100%" : "50%"};
  display:flex !important; flex-wrap:nowrap !important; box-sizing:border-box;
  flex:none !important; width:var(--kniff-bleed-page-span) !important; max-width:none !important;
  min-width:0;
  margin-inline:calc((100cqw - var(--kniff-bleed-page-span)) / 2) !important;
  --kniff-gutter:calc((var(--kniff-bleed-page-span) - 100cqw) / 2);
  padding-left:calc(var(--kniff-authored-padding-left, 0px) + var(--kniff-gutter)) !important;
  padding-right:calc(var(--kniff-authored-padding-right, 0px) + var(--kniff-gutter)) !important;
  overflow-x:auto !important; overflow-y:hidden !important;
  overscroll-behavior-x:none; overflow-anchor:none;
  gap:inherit !important; align-items:inherit !important; justify-content:flex-start !important;
  scroll-snap-type:x mandatory;
  scroll-padding-left:calc(var(--kniff-authored-padding-left, 0px) + var(--kniff-gutter));
  scroll-padding-right:calc(var(--kniff-authored-padding-right, 0px) + var(--kniff-gutter));
  scrollbar-width:${showScrollbar ? "auto" : "none"} !important;

  ${slides} {
    flex-shrink:0 !important;
    scroll-snap-align:${align};
    scroll-snap-stop:${stopEach ? "always" : "normal"};
  }
  ${firstSlide} { margin-inline-start:${useEdgeSpace ? (align === "end" ? "100%" : align === "center" ? "50%" : "0px") : "0px"}; }
  ${lastSlide} { margin-inline-end:${useEdgeSpace ? (align === "start" ? "100%" : align === "center" ? "50%" : "0px") : "0px"}; }
  /* Retain the accepted Safari compositor workaround. */
  &[data-kniff-loop] {
    transform:translateZ(0);

    ${cycle} > *,
    :where(.ssr-variant) > * {
      margin-inline:0 !important;
    }
  }
  &::-webkit-scrollbar { display:${showScrollbar ? "block" : "none"} !important; }
  &:focus-visible { outline:2px solid #456849; outline-offset:-2px; }
}
`
  return <style ref={styleRef} dangerouslySetInnerHTML={{__html:css}} />
}
export const visibleScrollOverflowSettingsPropertyControls = {
  showScrollbar:{title:"Scrollbar",type:ControlType.Boolean,defaultValue:false},
  autoMove:{title:"Auto Move",type:ControlType.Enum,options:["off","per-slide","scroll"],optionTitles:["Off","Per Slide","Scroll"],defaultValue:"off"},
  autoMoveInterval:{title:"Time per slide",type:ControlType.Number,defaultValue:3,min:0.5,max:60,unit:"s",hidden:props=>props.autoMove!=="per-slide"},
  autoMoveSpeed:{title:"Speed",type:ControlType.Number,defaultValue:30,min:1,max:500,unit:"px/s",hidden:props=>props.autoMove!=="scroll"},
  autoMoveDirection:{title:"Direction",type:ControlType.Enum,options:["left","right"],optionTitles:["Left","Right"],defaultValue:"left",displaySegmentedControl:true,hidden:props=>!props.autoMove || props.autoMove==="off"},
  loop:{title:"Loop",type:ControlType.Boolean,defaultValue:true,description:"Continuously loop through slides. Requires the Kniff Carousel override on the viewport."},
  containerID:{title:"Container",type:ControlType.String,defaultValue:"Percentage Sized Carousel",description:"Match aria-label or the custom layer name. This sizing container holds one viewport frame containing the slides. Apply withKniffCarousel to that viewport, including when Loop is off."},
  boundaryID:{title:"Boundary",type:ControlType.String,defaultValue:"CSS Full Width Overflow Experiment",description:"Name of the full-width ancestor. Keep the sizing container centered inside it."},
  align:{title:"Snap Align",type:ControlType.Enum,options:["start","center","end"],optionIcons:["align-left","align-center","align-right"],displaySegmentedControl:true,defaultValue:"center"} as PropertyControls<VisibleScrollOverflowSettingsProps>["align"] & { optionIcons: string[] },
  stopEach:{title:"Stop Each Slide",type:ControlType.Boolean,defaultValue:false},
  edgeSpace:{title:"Edge Space",type:ControlType.Boolean,defaultValue:true,hidden:props=>props.loop !== false,description:"This allows us to align first and last slide as well"},
} satisfies PropertyControls<VisibleScrollOverflowSettingsProps>

let propertyControlsRegistered = false

export function registerVisibleScrollOverflowSettingsPropertyControls(): void {
  if (propertyControlsRegistered) return
  addPropertyControls(VisibleScrollOverflowSettings, visibleScrollOverflowSettingsPropertyControls)
  propertyControlsRegistered = true
}

registerVisibleScrollOverflowSettingsPropertyControls()
export default VisibleScrollOverflowSettings
