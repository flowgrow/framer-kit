import { useEffect } from "react"
import { addPropertyControls, ControlType, RenderTarget, type PropertyControls } from "framer"
export interface VisibleScrollOverflowSettingsProps {
  containerID?: string
  boundaryID?: string
  align?: "start" | "center" | "end"
  strength?: "mandatory" | "proximity"
  stopEach?: boolean
  showScrollbar?: boolean
  loop?: boolean
  edgeSpace?: boolean
}
function target(id:string) {
  const value=JSON.stringify(id.trim()).replace(/</g,"\\3c ")
  return `:is([aria-label=${value}], [data-framer-name=${value}]:not([aria-label]))`
}
/**
 * @framerIntrinsicWidth 1
 * @framerIntrinsicHeight 1
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 */
export function VisibleScrollOverflowSettings({containerID="Percentage Sized Carousel",boundaryID="CSS Full Width Overflow Experiment",align="center",strength="mandatory",stopEach=false,showScrollbar=false,edgeSpace=true,loop=true}:VisibleScrollOverflowSettingsProps) {
    useEffect(() => {
        if (
            !loop ||
            RenderTarget.current() === RenderTarget.canvas ||
            !containerID.trim()
        )
            return
        const trace = (event: string, details: Record<string, unknown> = {}) => {
            console.log(`[ScrollLoop: ${containerID}] ${event}`, {
                time: Math.round(performance.now() * 100) / 100,
                ...details,
            })
        }
        trace("effect:start", { align, loop })
        let dispose: (() => void) | undefined
        let frame = 0
        let retry = 0
        let cancelled = false
        const install = () => {
            const sizing = document.querySelector<HTMLElement>(
                target(containerID)
            )
            const scroller = sizing?.firstElementChild as HTMLElement | null
            if (!scroller) {
                trace("install:waiting-for-viewport", { attempt: retry + 1 })
                return false
            }
            const originals = Array.from(scroller.children).filter(
                (el): el is HTMLElement => el instanceof HTMLElement
            )
            if (
                originals.length < 2 ||
                scroller.hasAttribute("data-kniff-loop")
            ) {
                trace("install:skipped", { originalCount: originals.length, alreadyLooping: scroller.hasAttribute("data-kniff-loop"), attempt: retry + 1 })
                return false
            }
            trace("install:ready", { originalCount: originals.length, scrollLeft: scroller.scrollLeft })
            const clones: HTMLElement[] = []
            const copy = (slide: HTMLElement) => {
                const clone = slide.cloneNode(true) as HTMLElement
                clone.setAttribute("data-kniff-loop-copy", "")
                clone.setAttribute("aria-hidden", "true")
                clone.setAttribute("inert", "")
                for (const el of [
                    clone,
                    ...Array.from(clone.querySelectorAll("[id]")),
                ])
                    el.removeAttribute("id")
                clone
                    .querySelectorAll(".kniff-initial-target-marker")
                    .forEach((el) => el.remove())
                clone.querySelectorAll("img").forEach((img) => {
                    img.loading = "eager"
                })
                clones.push(clone)
                trace("clone:created", { originalIndex: originals.indexOf(slide), cloneNumber: clones.length, name: slide.getAttribute("data-framer-name"), inert: true, ariaHidden: true, idsRemoved: true, markersRemoved: true, imagesEager: true })
                return clone
            }
            // Keep copies ready to paint before a fast fling reaches them.
            const before = document.createDocumentFragment()
            const after = document.createDocumentFragment()
            for (let i = 0; i < 3; i++) {
                originals.forEach((slide) => before.appendChild(copy(slide)))
                originals.forEach((slide) => after.appendChild(copy(slide)))
            }
            const previousSnap = scroller.style.scrollSnapType
            const previousBehavior = scroller.style.scrollBehavior
            const previousTransform = scroller.style.transform
            trace("install:disable-snap", { previousSnap, previousBehavior })
            scroller.style.scrollSnapType = "none"
            scroller.style.scrollBehavior = "auto"
            scroller.setAttribute("data-kniff-loop", "")
            const beforeCount = before.childElementCount
            const afterCount = after.childElementCount
            scroller.prepend(before)
            trace("children:prepend", { added: beforeCount, childCount: scroller.childElementCount, scrollLeft: scroller.scrollLeft })
            scroller.append(after)
            trace("children:append", { added: afterCount, childCount: scroller.childElementCount, scrollLeft: scroller.scrollLeft })
            const first = originals[0]
            const nextCycle = originals[originals.length - 1]
                ?.nextElementSibling as HTMLElement | null
            let restoreFrame = 0
            let jumping = false
            let pointerDown = false
            const geometry = () => {
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
                trace("jump:start", { reason, from: scroller.scrollLeft, requested: position, delta: position - scroller.scrollLeft, snap: scroller.style.scrollSnapType, behavior: scroller.style.scrollBehavior })
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
                    trace("jump:rebuild-scroll-layer", { scrollLeft: scroller.scrollLeft })
                } else {
                    scroller.scrollLeft = position
                }
                trace("scrollLeft:assigned", { requested: position, actual: scroller.scrollLeft })
                cancelAnimationFrame(restoreFrame)
                restoreFrame = requestAnimationFrame(() => {
                    scroller.style.scrollSnapType = previousSnap
                    scroller.style.scrollBehavior = previousBehavior
                    trace("jump:restore-snap", { snap: previousSnap, behavior: previousBehavior, scrollLeft: scroller.scrollLeft })
                    restoreFrame = requestAnimationFrame(() => {
                        jumping = false
                        trace("jump:complete", { scrollLeft: scroller.scrollLeft })
                    })
                })
            }
            const normalize = (event: Event) => {
                trace("normalize:start", { source: event.type, scrollLeft: scroller.scrollLeft, jumping, pointerDown })
                if (jumping || pointerDown) {
                    trace("normalize:skipped", { jumping, pointerDown })
                    return
                }
                const g = geometry()
                if (!g) {
                    trace("normalize:no-geometry")
                    return
                }
                const offset = scroller.scrollLeft - g.start
                const cycles = Math.floor((offset + 0.5) / g.cycle)
                trace("normalize:calculated", { ...g, offset, cycles, scrollLeft: scroller.scrollLeft })
                if (cycles !== 0) jump(scroller.scrollLeft - cycles * g.cycle, "normalize")
                else trace("normalize:no-jump")
            }
            const press = () => {
                pointerDown = true
                trace("pointer:down", { scrollLeft: scroller.scrollLeft })
            }
            const release = (event: PointerEvent) => {
                pointerDown = false
                trace(event.type, { scrollLeft: scroller.scrollLeft })
            }
            scroller.addEventListener("scrollend", normalize)
            scroller.addEventListener("pointerdown", press, { passive: true })
            window.addEventListener("pointerup", release)
            window.addEventListener("pointercancel", release)
            trace("listeners:attached", { normalizationEvent: "scrollend" })
            const g = geometry()
            trace("install:geometry", { geometry: g })
            if (g) jump(g.start, "initial-position")
            else {
                trace("install:no-geometry-restore-snap", { previousSnap, previousBehavior })
                scroller.style.scrollSnapType = previousSnap
                scroller.style.scrollBehavior = previousBehavior
            }
            dispose = () => {
                trace("cleanup:start", { childCount: scroller.childElementCount, cloneCount: clones.length, scrollLeft: scroller.scrollLeft })
                scroller.style.transform = previousTransform
                cancelAnimationFrame(restoreFrame)
                scroller.removeEventListener("scrollend", normalize)
                scroller.removeEventListener("pointerdown", press)
                window.removeEventListener("pointerup", release)
                window.removeEventListener("pointercancel", release)
                clones.forEach((clone, index) => {
                    clone.remove()
                    trace("children:remove-clone", { cloneNumber: index + 1, childCount: scroller.childElementCount })
                })
                scroller.removeAttribute("data-kniff-loop")
                scroller.style.scrollSnapType = previousSnap
                scroller.style.scrollBehavior = previousBehavior
                trace("cleanup:complete", { childCount: scroller.childElementCount, scrollLeft: scroller.scrollLeft, snap: previousSnap, behavior: previousBehavior })
            }
            trace("install:complete", { childCount: scroller.childElementCount, cloneCount: clones.length })
            return true
        }
        const attempt = () => {
            if (cancelled || dispose) return
            if (install()) return
            if (++retry < 120) frame = requestAnimationFrame(attempt)
            else trace("install:retry-limit", { attempts: retry })
        }
        frame = requestAnimationFrame(attempt)
        return () => {
            trace("effect:cleanup", { retry, installed: !!dispose })
            cancelled = true
            cancelAnimationFrame(frame)
            dispose?.()
        }
    }, [containerID, align, loop])
  if(!containerID.trim() || !boundaryID.trim()) return null
  const reference=target(containerID), boundary=target(boundaryID)
  const viewport=`${reference} > :first-child`
  if (RenderTarget.current() === RenderTarget.canvas) {
    const canvasCSS = `
${viewport} {
  --kniff-initial-align:${align};
  --kniff-initial-position:${align === "start" ? "0%" : align === "end" ? "100%" : "50%"};
  display:flex !important; flex-wrap:nowrap !important;
  gap:inherit !important; align-items:inherit !important; justify-content:flex-start !important;
  overflow:visible !important;
  scroll-snap-type:x ${strength};
  scrollbar-width:${showScrollbar ? "thin" : "none"} !important;
}
${viewport} > * { flex-shrink:0 !important; scroll-snap-align:${align}; scroll-snap-stop:${stopEach ? "always" : "normal"}; }
${viewport} > :first-child { margin-inline-start:${edgeSpace ? (align === "end" ? "100%" : align === "center" ? "50%" : "0px") : "0px"}; }
${viewport} > :last-child { margin-inline-end:${edgeSpace ? (align === "start" ? "100%" : align === "center" ? "50%" : "0px") : "0px"}; }
${viewport}::-webkit-scrollbar { display:${showScrollbar ? "block" : "none"} !important; }
`
    return <style dangerouslySetInnerHTML={{ __html: canvasCSS }} />
  }
  const css=`
@property --kniff-bleed-page-span { syntax:"<length>"; inherits:true; initial-value:0px; }
@keyframes kniff-bleed-gutters {
  from, to {
    padding-left:calc((var(--kniff-bleed-page-span) - 100cqw) / 2);
    padding-right:calc((var(--kniff-bleed-page-span) - 100cqw) / 2);
  }
}
${boundary} { container-type:inline-size; }
${reference} { --kniff-bleed-page-span:100cqw; container-type:inline-size; overflow:visible !important; }
${viewport} {
  --kniff-initial-align:${align};
  --kniff-initial-position:${align === "start" ? "0%" : align === "end" ? "100%" : "50%"};
  display:flex !important; flex-wrap:nowrap !important; box-sizing:border-box;
  flex:none !important; width:var(--kniff-bleed-page-span) !important; max-width:none !important;
  min-width:0;
  margin-inline:calc((100cqw - var(--kniff-bleed-page-span)) / 2) !important;
  /* Add bleed gutters to Framer's authored padding instead of replacing it.
     Both keyframes are identical and paused: there is no moving animation. */
  animation:kniff-bleed-gutters 1s linear both paused;
  animation-composition:add;
  overflow-x:auto !important; overflow-y:hidden !important;
  overscroll-behavior-x:none; overflow-anchor:none;
  gap:inherit !important; align-items:inherit !important; justify-content:flex-start !important;
  scroll-snap-type:x ${strength};
  scroll-padding-inline:calc((var(--kniff-bleed-page-span) - 100cqw) / 2);
  scrollbar-width:${showScrollbar ? "thin" : "none"} !important;
}
${viewport} > * { flex-shrink:0 !important; scroll-snap-align:${align}; scroll-snap-stop:${stopEach ? "always" : "normal"}; }
${viewport} > :first-child { margin-inline-start:${edgeSpace ? (align === "end" ? "100%" : align === "center" ? "50%" : "0px") : "0px"}; }
${viewport} > :last-child { margin-inline-end:${edgeSpace ? (align === "start" ? "100%" : align === "center" ? "50%" : "0px") : "0px"}; }
/* Retain the accepted Safari compositor workaround. */
${viewport}[data-kniff-loop] { transform:translateZ(0); }
${viewport}[data-kniff-loop] > * { margin-inline:0 !important; }
${viewport}::-webkit-scrollbar { display:${showScrollbar ? "block" : "none"} !important; }
${viewport}:focus-visible { outline:2px solid #456849; outline-offset:-2px; }
`
  return <style dangerouslySetInnerHTML={{__html:css}} />
}
export const visibleScrollOverflowSettingsPropertyControls = {
  loop:{title:"Loop",type:ControlType.Boolean,defaultValue:true,description:"Loop slides in preview and on the published site. Canvas keeps every slide visible for editing."},
  containerID:{title:"Container",type:ControlType.String,defaultValue:"Percentage Sized Carousel",description:"Match aria-label or the custom layer name. This sizing container holds one viewport frame containing the slides."},
  boundaryID:{title:"Boundary",type:ControlType.String,defaultValue:"CSS Full Width Overflow Experiment",description:"Name of the full-width ancestor. Keep the sizing container centered inside it."},
  align:{title:"Snap Align",type:ControlType.Enum,options:["start","center","end"],optionIcons:["align-left","align-center","align-right"],displaySegmentedControl:true,defaultValue:"center"} as PropertyControls<VisibleScrollOverflowSettingsProps>["align"] & { optionIcons: string[] },
  strength:{title:"Snapping",type:ControlType.Enum,options:["mandatory","proximity"],optionTitles:["Mandatory","Proximity"],displaySegmentedControl:true,defaultValue:"mandatory"},
  stopEach:{title:"Stop Each Slide",type:ControlType.Boolean,defaultValue:false},
  showScrollbar:{title:"Scrollbar",type:ControlType.Boolean,defaultValue:false},
  edgeSpace:{title:"Edge Space",type:ControlType.Boolean,defaultValue:true,description:"Give the first and last slides enough room to reach the selected alignment. Center: 50% on both ends; start: 100% at the end; end: 100% at the start."},
} satisfies PropertyControls<VisibleScrollOverflowSettingsProps>

let propertyControlsRegistered = false

export function registerVisibleScrollOverflowSettingsPropertyControls(): void {
  if (propertyControlsRegistered) return
  addPropertyControls(VisibleScrollOverflowSettings, visibleScrollOverflowSettingsPropertyControls)
  propertyControlsRegistered = true
}

