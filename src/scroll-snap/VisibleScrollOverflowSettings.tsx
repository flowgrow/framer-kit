import { useEdgeSlideWidths } from "./useEdgeSlideWidths.js"
import { useEffect, useId, useRef, type CSSProperties, type RefObject } from "react"
import { addPropertyControls, ControlType, RenderTarget, type PropertyControls } from "framer"
export interface VisibleScrollOverflowSettingsProps {
  showInstructions?: boolean
  style?: CSSProperties
  containerID?: string
  boundaryID?: string
  align?: "start" | "center" | "end"
  stopEach?: boolean
  loop?: boolean
  autoMove?: "none" | "perSlide" | "scroll"
  autoMoveDelay?: number
  autoMoveSpeed?: number
  autoMoveDirection?: "left" | "right"
  autoMoveStopOnLastSlide?: boolean
  edgeSpace?: boolean
}
type AutoMoveInstaller = (viewport: HTMLElement, options: { speed: number; direction: "left" | "right" }) => () => void
type AutoStepInstaller = (viewport: HTMLElement, options: { delay: number; direction: "left" | "right"; stopOnLastSlide: boolean }) => () => void

function target(id:string) {
  const value=JSON.stringify(id.trim()).replace(/</g,"\\3c ")
  return `:is([aria-label=${value}], [data-framer-name=${value}]:not([aria-label]))`
}
// Responsive Framer variants use boxless wrappers; measure their rendered slide.
function slideBoxes(parent: Element): HTMLElement[] {
  return Array.from(parent.children).flatMap(child => {
    if (!(child instanceof HTMLElement) || ["STYLE", "SCRIPT"].includes(child.tagName)) return []
    if (getComputedStyle(child).display === "contents") return slideBoxes(child)
    if (child.matches("[data-kniff-ramka-settings]") || child.querySelector("[data-kniff-ramka-settings]")) return []
    return child.getClientRects().length ? [child] : []
  })
}
function useReactLoop(styleRef: RefObject<HTMLStyleElement>, containerID: string, align: "start" | "center" | "end", loop: boolean, canvas: boolean) {
    useEffect(() => {
        if (
            !loop ||
            canvas ||
            !containerID.trim()
        )
            return

        let dispose: (() => void) | undefined
        let frame = 0
        let retry = 0
        let cancelled = false
        const install = () => {
            const scroller = (styleRef.current?.ownerDocument ?? document).querySelector<HTMLElement>(
                target(containerID)
            )
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
    }, [containerID, align, loop, canvas, styleRef])
}

/**
 * @framerIntrinsicWidth 200
 * @framerIntrinsicHeight 80
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 */
export function VisibleScrollOverflowSettings({showInstructions=true,style,containerID="Percentage Sized Carousel",boundaryID="CSS Full Width Overflow Experiment",align="center",stopEach=false,edgeSpace=true,loop=true,autoMove="none",autoMoveDelay=8,autoMoveSpeed=30,autoMoveDirection="left",autoMoveStopOnLastSlide=false}:VisibleScrollOverflowSettingsProps) {
  const styleRef = useRef<HTMLStyleElement>(null)
  const canvasSettingsId = useId()
  const canvas = RenderTarget.current() === RenderTarget.canvas
  const useEdgeSpace = loop || edgeSpace
  useEdgeSlideWidths(styleRef, target(containerID), target(boundaryID), !canvas && !loop && Boolean(containerID.trim() && boundaryID.trim()))
  useReactLoop(styleRef, containerID, align, loop, canvas)
  useEffect(() => {
    if (canvas || autoMove === "none" || !containerID.trim()) return
    let frame = 0, attempts = 0
    let cancelled = false
    let dispose: (() => void) | undefined
    const install = (installAutoMove: AutoMoveInstaller | AutoStepInstaller) => {
      if (cancelled) return
      const doc = styleRef.current?.ownerDocument ?? document
      const viewport = Array.from(doc.querySelectorAll<HTMLElement>(target(containerID))).find(el => el.getClientRects().length && el.clientWidth)
      if (!viewport || (loop && !viewport.hasAttribute("data-kniff-loop-ready"))) {
        if (++attempts < 120) frame = requestAnimationFrame(() => install(installAutoMove))
        return
      }
      dispose = autoMove === "scroll"
        ? (installAutoMove as AutoMoveInstaller)(viewport, { speed: autoMoveSpeed, direction: autoMoveDirection })
        : (installAutoMove as AutoStepInstaller)(viewport, { delay: autoMoveDelay, direction: autoMoveDirection, stopOnLastSlide: autoMoveStopOnLastSlide })
    }
    // @ts-ignore Framer resolves sibling code files at runtime; the repo build checks this path.
    const load: Promise<AutoMoveInstaller | AutoStepInstaller> = autoMove === "scroll"
      ? import("./autoMove.tsx").then(module => module.installAutoMove)
      : import("./autoStep.tsx").then(module => module.installAutoStep)
    void load.then(installAutoMove => {
      if (!cancelled) frame = requestAnimationFrame(() => install(installAutoMove))
    }).catch(() => {})
    return () => { cancelled = true; cancelAnimationFrame(frame); dispose?.() }
  }, [canvas, autoMove, autoMoveDelay, autoMoveSpeed, autoMoveDirection, autoMoveStopOnLastSlide, containerID, loop, align])
  // Canvas has no scroll position: place the first slide at its snap alignment.
  useEffect(() => {
    if (!canvas || !containerID.trim()) return
    let frame = 0
    let observer: ResizeObserver | undefined
    let mutations: MutationObserver | undefined
    const viewports = new Map<HTMLElement, HTMLElement>()
    const saved = new Map<HTMLElement, [string, string]>()
    let attempts = 0
    const firstSlide = (viewport: HTMLElement) => viewport.querySelector<HTMLElement>(":scope > [data-framer-name]:nth-child(1 of [data-framer-name])") ?? slideBoxes(viewport)[0]
    const refresh = () => {
      for (const viewport of viewports.keys()) {
        const first = firstSlide(viewport)
        const observed = viewports.get(viewport)
        if (first !== observed) {
          if (observed) observer?.unobserve(observed)
          if (first) observer?.observe(first)
          viewports.set(viewport, first!)
        }
        if (first) {
          viewport.style.setProperty("--kniff-canvas-first-width", first.getBoundingClientRect().width + "px")
          const gap = getComputedStyle(viewport).columnGap
          viewport.style.setProperty("--kniff-canvas-gap", gap === "normal" ? "0px" : gap)
        }
      }
    }
    const install = () => {
      const localViewport = styleRef.current?.closest<HTMLElement>(target(containerID))
      const matches = localViewport
        ? [localViewport]
        : Array.from((styleRef.current?.ownerDocument ?? document).querySelectorAll<HTMLElement>(target(containerID)))
      if (!matches.length || matches.some(viewport => !firstSlide(viewport))) {
        if (++attempts < 120) frame = requestAnimationFrame(install)
        return
      }
      observer = new ResizeObserver(refresh)
      for (const viewport of matches) {
        viewports.set(viewport, firstSlide(viewport)!)
        saved.set(viewport, [viewport.style.getPropertyValue("--kniff-canvas-first-width"), viewport.style.getPropertyValue("--kniff-canvas-gap")])
        observer.observe(firstSlide(viewport)!)
        observer.observe(viewport)
      }
      refresh()
      mutations = new MutationObserver(refresh)
      for (const viewport of matches) mutations.observe(viewport, { childList: true, subtree: true })
    }
    frame = requestAnimationFrame(install)
    return () => {
      cancelAnimationFrame(frame)
      observer?.disconnect()
      mutations?.disconnect()
      for (const viewport of viewports.keys()) {
        const [width, gap] = saved.get(viewport) ?? ["", ""]
        if (width) viewport.style.setProperty("--kniff-canvas-first-width", width)
        else viewport.style.removeProperty("--kniff-canvas-first-width")
        if (gap) viewport.style.setProperty("--kniff-canvas-gap", gap)
        else viewport.style.removeProperty("--kniff-canvas-gap")
      }
    }
  }, [containerID, canvas])
  if(!containerID.trim() || !boundaryID.trim()) return null
  const viewport=target(containerID), boundary=target(boundaryID)
  // Relative selectors stay inside the viewport's native CSS nesting block.
  const cycle = ':where([data-kniff-loop-original], [data-kniff-loop-copy])'
  const slides = `
  > :where(:not(.ssr-variant, [data-kniff-loop-original], [data-kniff-loop-copy])),
  > :where(.ssr-variant) > *,
  > ${cycle} > :where(:not(.ssr-variant)),
  > ${cycle} > :where(.ssr-variant) > *`
  const content = ':not(style, script, [data-kniff-ramka-settings], :has([data-kniff-ramka-settings]))'
  const edgeSlide = (which: "first" | "last") => {
    const item = `:nth-${which === "first" ? "" : "last-"}child(1 of ${content}:not([data-kniff-loop-original], [data-kniff-loop-copy]))`
    return `
  > ${item}:not(.ssr-variant),
  > .ssr-variant${item} > ${content},
  > ${cycle} > ${item}:not(.ssr-variant),
  > ${cycle} > .ssr-variant${item} > ${content}`
  }
  const firstSlide = edgeSlide("first")
  const lastSlide = edgeSlide("last")
  if (RenderTarget.current() === RenderTarget.canvas) {
    const canvasFirstSlide = `> :where([data-framer-name]):nth-child(1 of [data-framer-name])`
    const canvasLastSlide = `> :where([data-framer-name]):nth-last-child(1 of [data-framer-name])`
    const marker = `style[data-kniff-canvas-settings=${JSON.stringify(canvasSettingsId)}]`
    const canvasViewport = `:where(${boundary}:has(${marker})) ${viewport},
:where(:root:not(:has(${boundary} ${marker}))) ${viewport}`
    const canvasCSS = `
${canvasViewport} {
  --kniff-initial-align:${align};
  --kniff-initial-position:${align === "start" ? "0%" : align === "end" ? "100%" : "50%"};
  display:flex !important; flex-wrap:nowrap !important;
  align-items:inherit !important; justify-content:flex-start !important;
  overflow:visible !important;
  margin-inline:auto !important;
  scroll-snap-type:x mandatory;
  scrollbar-width:none !important;

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
  &::-webkit-scrollbar { display:none !important; }
}
`
    return <>
      <style ref={styleRef} data-kniff-canvas-settings={canvasSettingsId} dangerouslySetInnerHTML={{ __html: canvasCSS }} />
      {showInstructions && (
        <div
          data-kniff-carousel-settings=""
          style={{
            ...style,
            boxSizing: "border-box",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 6,
            width: "100%",
            height: "100%",
            minWidth: 180,
            minHeight: 80,
            padding: 14,
            border: "1px solid rgba(0, 0, 0, 0.12)",
            borderRadius: 10,
            background: "rgba(245, 245, 245, 0.96)",
            color: "#111",
            fontFamily: "Inter, sans-serif",
            fontSize: 12,
            lineHeight: 1.4,
          }}
        >
          <strong>Carousel Settings</strong>
          <span>
            Match “{containerID || "Percentage Sized Carousel"}” to the viewport
            layer name or accessibility label. Apply withKniffCarousel to that
            viewport for looping.
          </span>
        </div>
      )}
    </>
  }
  const css=`
div[data-framer-name]:has(> style[data-kniff-preview-settings]) { display:none !important; }
@property --kniff-bleed-page-span { syntax:"<length>"; inherits:true; initial-value:0px; }
${boundary} { container-type:inline-size; }
${boundary} :where(:has(> ${viewport})) {
  --kniff-bleed-page-span:100cqw;
  container-type:inline-size;
}
${boundary} > ${viewport} { --kniff-bleed-page-span:100cqw; }
${viewport} {
  --kniff-initial-align:${align};
  --kniff-initial-position:${align === "start" ? "0%" : align === "end" ? "100%" : "50%"};
  display:flex !important; flex-wrap:nowrap !important; box-sizing:border-box;
  flex:none !important; width:var(--kniff-bleed-page-span) !important; max-width:none !important;
  min-width:0;
  margin-inline:calc((100% - var(--kniff-bleed-page-span)) / 2) !important;
  --kniff-content-width:min(100cqw, var(--kniff-authored-width, 100cqw), var(--kniff-authored-max-width, 100cqw));
  --kniff-gutter:calc((var(--kniff-bleed-page-span) - var(--kniff-content-width)) / 2);
  padding-left:calc(var(--kniff-authored-padding-left, 0px) + var(--kniff-gutter)) !important;
  padding-right:calc(var(--kniff-authored-padding-right, 0px) + var(--kniff-gutter)) !important;
  overflow-x:auto !important; overflow-y:hidden !important;
  overscroll-behavior-x:none; overflow-anchor:none;
  align-items:inherit !important; justify-content:flex-start !important;
  scroll-snap-type:x mandatory;
  scroll-padding-left:calc(var(--kniff-authored-padding-left, 0px) + var(--kniff-gutter));
  scroll-padding-right:calc(var(--kniff-authored-padding-right, 0px) + var(--kniff-gutter));
  scrollbar-width:none !important;

  ${slides} {
    flex-shrink:0 !important;
    scroll-snap-align:${align};
    scroll-snap-stop:${stopEach ? "always" : "normal"};
  }
  ${firstSlide} { margin-inline-start:${useEdgeSpace && !loop && align !== "start" ? `calc((100% - var(--kniff-first-slide-width, 0px)) * ${align === "end" ? 1 : 0.5})` : "0px"}; }
  ${lastSlide} { margin-inline-end:${useEdgeSpace && !loop && align !== "end" ? `calc((100% - var(--kniff-last-slide-width, 0px)) * ${align === "start" ? 1 : 0.5})` : "0px"}; }
  /* Retain the accepted Safari compositor workaround. */
  &[data-kniff-loop] {
    transform:translateZ(0);

    ${cycle} > *,
    :where(.ssr-variant) > * {
      margin-inline:0 !important;
    }
  }
  &::-webkit-scrollbar { display:none !important; }
  &:focus-visible { outline:2px solid #456849; outline-offset:-2px; }
}
`
  return <style ref={styleRef} data-kniff-preview-settings="" dangerouslySetInnerHTML={{__html:css}} />
}
export const visibleScrollOverflowSettingsPropertyControls = {
  showInstructions:{title:"Instructions",type:ControlType.Boolean,defaultValue:true},
  autoMove:{title:"Auto Move",type:ControlType.Enum,options:["none","perSlide","scroll"],optionTitles:["Off","Per Slide","Scroll"],defaultValue:"none"},
  autoMoveDelay:{title:"Pause per Slide",type:ControlType.Number,defaultValue:8,min:0.1,max:100,unit:"s",displayStepper:true,step:0.1,hidden:props=>props.autoMove!=="perSlide"},
  autoMoveSpeed:{title:"Speed",type:ControlType.Number,defaultValue:30,min:1,max:500,unit:"px/s",hidden:props=>props.autoMove!=="scroll"},
  autoMoveDirection:{title:"Direction",type:ControlType.Enum,options:["left","right"],optionTitles:["Left","Right"],defaultValue:"left",displaySegmentedControl:true,hidden:props=>props.autoMove==="none"},
  autoMoveStopOnLastSlide:{title:"Stop on Last Slide",type:ControlType.Boolean,defaultValue:false,hidden:props=>props.autoMove!=="perSlide"},
  loop:{title:"Loop",type:ControlType.Boolean,defaultValue:true,description:"Apply withKniffCarousel to the overflow viewport. Loop copies are rendered through React in preview and on the published site."},
  containerID:{title:"Viewport",type:ControlType.String,defaultValue:"Percentage Sized Carousel",description:"Match the overflow viewport’s aria-label or layer name."},
  boundaryID:{title:"Boundary",type:ControlType.String,defaultValue:"CSS Full Width Overflow Experiment",description:"Name of the full-width ancestor containing the viewport."},
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
