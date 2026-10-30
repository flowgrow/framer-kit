import { getPendingOverflowDestination, moveOverflowViewport } from "./snapNavigation.js"
import { overflowSnapPoints, slideBoxes } from "./snapGeometry.js"
import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import { RenderTarget, addPropertyControls, ControlType, type PropertyControls } from "framer"

// Place this settings component anywhere on the page; ID targets a canvas stack.
// Keep slide widths, height, and gap in Framer. No carousel library or effects.
const css = `
[data-css-snap-shell] { container-type: inline-size; }
[data-css-snap] {
  --snap-content-width: min(var(--snap-max-width, 1040px), var(--snap-content-percent, 87.5%));
  --snap-gutter: calc((100% - var(--snap-content-width)) / 2);
  box-sizing: border-box;
  padding-inline: var(--snap-gutter) !important;
  scroll-padding-inline: var(--snap-gutter);
  display: flex !important;
  flex-direction: row !important;
  flex-wrap: nowrap !important;
  justify-content: flex-start !important;
  overflow-x: auto !important;
  overflow-y: hidden !important;
  scroll-snap-type: x mandatory;
  scroll-behavior: var(--snap-motion, smooth);
  overscroll-behavior-x: contain;
  scrollbar-width: none !important;
  min-width: 0;
}
[data-css-snap] > :not(style) {
  flex-shrink: 0 !important;
  scroll-snap-align: var(--snap-align, start);
  scroll-snap-stop: var(--snap-stop, normal);
  max-width: min(var(--snap-max-width, 1040px), var(--snap-card-limit, 87.5cqw));
}

[data-css-snap]::-webkit-scrollbar { display: none !important; }
[data-css-snap]:focus-visible { outline: 2px solid #456849; outline-offset: 4px; }
@media (prefers-reduced-motion: reduce) { [data-css-snap] { scroll-behavior: auto; } }
`


interface SnapAPI {
  subscribe: (callback: () => void) => () => void
  snapshot: () => number
  move: (direction: number) => void
}
const galleries = new Map<string, SnapAPI>()
const registryListeners = new Set<() => void>()
const subscribeRegistry = (callback: () => void) => {
  registryListeners.add(callback)
  return () => { registryListeners.delete(callback) }
}
const announce = () => registryListeners.forEach(callback => callback())
export function useCSSScrollSnap(id: string) {
  return useSyncExternalStore(subscribeRegistry, () => galleries.get(id), () => undefined)
}

export interface CSSScrollSnapGalleryProps { carouselID?: string; align?: "start" | "center" | "end"; stopAlways?: boolean; smoothScroll?: boolean; contentWidth?: number; contentMaxWidth?: number }
function selectorFor(id: string) {
  const value = JSON.stringify(id).replace(/</g, "\\3c ")
  return `:is([aria-label=${value}], [data-framer-name=${value}]:not([aria-label]))`
}
/**
 * @framerIntrinsicWidth 1
 * @framerIntrinsicHeight 1
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 */
export function CSSScrollSnapGallery({carouselID="CSS Scroll Snap Gallery", align="start", stopAlways=false, smoothScroll=true,  contentWidth=87.5, contentMaxWidth=1040}: CSSScrollSnapGalleryProps) {
    const canvas = RenderTarget.current() === RenderTarget.canvas
    const id = carouselID.trim()
    const selector = selectorFor(id)
    useEffect(() => {
      if (canvas || !id) return
      const connect = (root: HTMLElement) => {
      const listeners = new Set<() => void>()
      let state = 0
      let pending: number | null = null
      let timer: ReturnType<typeof setTimeout>
      const offsets = () => {
        const bounds = root.getBoundingClientRect()
        const gutter = parseFloat(getComputedStyle(root).paddingLeft) || 0
        const max = Math.max(0, root.scrollWidth - root.clientWidth)
        const innerWidth = root.clientWidth - gutter - (parseFloat(getComputedStyle(root).paddingRight) || 0)
        const positions = Array.from(root.children)
          .filter(child => child instanceof HTMLElement && child.tagName !== "STYLE" && child.getClientRects().length)
          .map(child => {
            const rect = child.getBoundingClientRect()
            const offset = align === "center" ? (innerWidth - rect.width) / 2 : align === "end" ? innerWidth - rect.width : 0
            return Math.max(0, Math.min(max, rect.left - bounds.left - root.clientLeft + root.scrollLeft - gutter - offset))
          })
        return [...new Set([0, ...positions, max].map(value => Math.round(value)))].sort((a,b) => a-b)
      }
      const update = () => {
        const max = Math.max(0, root.scrollWidth - root.clientWidth)
        const next = (root.scrollLeft > 1 ? 1 : 0) | (root.scrollLeft < max - 1 ? 2 : 0)
        if (next === state) return
        state = next
        listeners.forEach(callback => callback())
      }
      const settle = () => { pending = null; update() }
      const onScroll = () => { update(); clearTimeout(timer); timer = setTimeout(settle, 180) }
      const api: SnapAPI = {
        subscribe(callback) { listeners.add(callback); return () => { listeners.delete(callback) } },
        snapshot: () => state,
        move(direction) {
          const positions = offsets()
          const current = pending ?? root.scrollLeft
          const target = direction > 0 ? positions.find(value => value > current + 1) : [...positions].reverse().find(value => value < current - 1)
          if (target === undefined) return
          pending = target
          root.scrollTo({left: target, behavior: !smoothScroll || window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth"})
          clearTimeout(timer)
          timer = setTimeout(settle, 250)
        },
      }
      update()
      galleries.set(id, api)
      announce()
      root.addEventListener("scroll", onScroll, {passive: true})
      root.addEventListener("scrollend", settle)
      const resize = new ResizeObserver(() => { pending = null; update() })
      const observe = () => { resize.disconnect(); resize.observe(root); Array.from(root.children).forEach(child => resize.observe(child)); update() }
      observe()
      const mutation = new MutationObserver(observe)
      mutation.observe(root, {childList: true})
      return () => {
        clearTimeout(timer)
        resize.disconnect()
        mutation.disconnect()
        root.removeEventListener("scroll", onScroll)
        root.removeEventListener("scrollend", settle)
        if (galleries.get(id) === api) { galleries.delete(id); announce() }
      }
      }
      let active: HTMLElement | undefined
      let disconnect: (() => void) | undefined
      let frame = 0
      const discover = () => {
        const root = Array.from(document.querySelectorAll<HTMLElement>(selector))
          .find(node => node.getClientRects().length > 0 && node.clientWidth > 0)
        if (root === active) return
        disconnect?.()
        active = root
        disconnect = root ? connect(root) : undefined
      }
      const schedule = () => {
        if (!frame) frame = requestAnimationFrame(() => { frame = 0; discover() })
      }
      discover()
      const discovery = new MutationObserver(schedule)
      discovery.observe(document.body, {childList:true, subtree:true, attributes:true, attributeFilter:["data-framer-name","aria-label"]})
      window.addEventListener("resize", schedule)
      return () => { cancelAnimationFrame(frame); discovery.disconnect(); window.removeEventListener("resize",schedule); disconnect?.() }
    }, [id, selector, canvas, align, smoothScroll, stopAlways, contentWidth, contentMaxWidth])
    const scoped = css.split("[data-css-snap-shell]").join(`:has(> ${selector})`).split("[data-css-snap]").join(selector)
    const settings = `${selector} { --snap-align:${align}; --snap-strength:mandatory; --snap-stop:${stopAlways ? "always" : "normal"}; --snap-motion:${smoothScroll ? "smooth" : "auto"}; --snap-content-percent:${contentWidth}%; --snap-max-width:${contentMaxWidth}px; --snap-card-limit:${contentWidth}cqw; }`
    return id ? <style dangerouslySetInnerHTML={{ __html: scoped + settings }} /> : null
}
addPropertyControls(CSSScrollSnapGallery, {
  align:{title:"Snap Align",type:ControlType.Enum,options:["start","center","end"],optionIcons:["align-left","align-center","align-right"],displaySegmentedControl:true,defaultValue:"start"} as any,
  stopAlways:{title:"Stop Each Slide",type:ControlType.Boolean,defaultValue:false,description:"Prevent swipe gestures from skipping snap points."},
  smoothScroll:{title:"Smooth Scroll",type:ControlType.Boolean,defaultValue:true,description:"Arrow navigation always respects reduced-motion preferences."},
  contentWidth:{title:"Content Width",type:ControlType.Number,defaultValue:87.5,min:10,max:100,step:0.5,unit:"%"},
  contentMaxWidth:{title:"Content Max",type:ControlType.Number,defaultValue:1040,min:200,max:2400,step:10,unit:"px"},
  carouselID:{title:"ID",type:ControlType.String,defaultValue:"CSS Scroll Snap Gallery",description:"Match the canvas stack’s aria-label, or its custom layer name (data-framer-name) when no aria-label is set."},
})

import { Children, cloneElement, isValidElement, type CSSProperties, type ReactNode, type ReactElement } from "react"


function useOverflowAvailability(carouselID: string, enabled: boolean, buttonRef: { current: HTMLButtonElement | null }) {
  const [available, setAvailable] = useState(0)
  useEffect(() => {
    if (!enabled || !carouselID.trim()) return
    let frame = 0
    let attempts = 0
    let dispose: (() => void) | undefined
    setAvailable(0)
    const install = () => {
      frame = 0
      const doc = buttonRef.current?.ownerDocument ?? document
      const value = JSON.stringify(carouselID.trim())
      const sizing = doc.querySelector<HTMLElement>(`:is([aria-label=${value}], [data-framer-name=${value}]:not([aria-label]))`)
      const viewport = sizing?.firstElementChild as HTMLElement | null
      if (!viewport) {
        if (++attempts < 120) frame = requestAnimationFrame(install)
        return
      }
      let geometryDirty = true
      let points: number[] = []
      let hasRange = false
      let looping = false
      const update = () => {
        if (geometryDirty) {
          hasRange = viewport.scrollWidth > viewport.clientWidth + 2
          looping = viewport.hasAttribute("data-kniff-loop") && hasRange
          // Looping arrows are always available. Finite snap positions only
          // change with layout; scrolling must not remeasure every slide.
          points = hasRange && !looping ? overflowSnapPoints(viewport) : []
          geometryDirty = false
        }
        if (looping || !hasRange) {
          setAvailable(looping ? 3 : 0)
          return
        }
        const current = getPendingOverflowDestination(viewport) ?? viewport.scrollLeft
        const prev = points.some(point => point < current - 2)
        const next = points.some(point => point > current + 2)
        setAvailable((prev ? 1 : 0) | (next ? 2 : 0))
      }
      const schedule = () => {
        if (!geometryDirty && (looping || !hasRange)) return
        if (!frame) frame = requestAnimationFrame(() => { frame = 0; update() })
      }
      const invalidate = () => { geometryDirty = true; schedule() }
      const resize = new ResizeObserver(invalidate)
      const watchSlides = () => {
        resize.disconnect()
        resize.observe(viewport)
        if (sizing) resize.observe(sizing)
        for (const slide of slideBoxes(viewport)) resize.observe(slide)
      }
      watchSlides()
      const mutation = new MutationObserver(records => {
        if (records.some(record => record.type === "childList")) watchSlides()
        invalidate()
      })
      mutation.observe(viewport, {childList:true, subtree:true, attributes:true, attributeFilter:["style","class","data-kniff-loop"]})
      if (sizing) mutation.observe(sizing, {attributes:true, attributeFilter:["style","class"]})
      const win = doc.defaultView ?? window
      win.addEventListener("resize", invalidate)
      for (const event of ["scroll","scrollend","kniff-scroll-navigation"]) viewport.addEventListener(event, schedule, {passive:true})
      update()
      dispose = () => {
        resize.disconnect()
        mutation.disconnect()
        win.removeEventListener("resize", invalidate)
        for (const event of ["scroll","scrollend","kniff-scroll-navigation"]) viewport.removeEventListener(event, schedule)
      }
    }
    frame = requestAnimationFrame(install)
    return () => { cancelAnimationFrame(frame); dispose?.() }
  }, [carouselID, enabled, buttonRef])
  return available
}

export interface CSSScrollSnapButtonProps { overflowViewport?: boolean; carouselID?: string; action?: "Prev" | "Next"; componentSlot?: ReactNode; inactiveOpacity?: number; style?: CSSProperties }
const emptySubscribe = () => () => {}
const emptySnapshot = () => 0
/**
 * @framerIntrinsicWidth 44
 * @framerIntrinsicHeight 44
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 */
export default function CSSScrollSnapButton({carouselID="CSS Scroll Snap Gallery",action="Next",componentSlot,inactiveOpacity=0.35,overflowViewport=false,style}: CSSScrollSnapButtonProps) {
  const api = useCSSScrollSnap(carouselID)
  const state = useSyncExternalStore(api?.subscribe ?? emptySubscribe, api?.snapshot ?? emptySnapshot, emptySnapshot)
  const canvas = RenderTarget.current() === RenderTarget.canvas
  const buttonRef = useRef<HTMLButtonElement>(null)
  const overflowAvailable = useOverflowAvailability(carouselID, overflowViewport && !canvas, buttonRef)
  const available = overflowViewport ? overflowAvailable : state
  const disabled = !canvas && !(available & (action === "Next" ? 2 : 1))
  const component = Children.toArray(componentSlot).find(isValidElement) as ReactElement<any> | undefined
  return <button ref={buttonRef} type="button" aria-label={action === "Next" ? "Next slide" : "Previous slide"} disabled={disabled}
    onClick={() => {
      if (disabled) return
      const direction = action === "Next" ? 1 : -1
      if (!overflowViewport) { api?.move(direction); return }
      const value = JSON.stringify(carouselID.trim())
      const sizing = document.querySelector<HTMLElement>(`:is([aria-label=${value}], [data-framer-name=${value}]:not([aria-label]))`)
      const viewport = sizing?.firstElementChild as HTMLElement | null
      if (!viewport) return
      moveOverflowViewport(viewport, direction)
    }}
    style={{...style, userSelect:"none", WebkitUserSelect:"none", position:"relative", width:"100%",height:"100%",appearance:"none",padding:0,border:component?"none":"1px solid #c5cbbf",borderRadius:component?0:999,background:component?"transparent":"white",color:"#203923",fontSize:22,cursor:disabled?"default":"pointer",opacity:disabled?inactiveOpacity:1,display:"flex",alignItems:"center",justifyContent:"center"}}>
    {component ? cloneElement(component,{tabIndex:-1, "aria-hidden":true,style:{...component.props.style, userSelect:"none",WebkitUserSelect:"none",maxWidth:"100%",maxHeight:"100%",pointerEvents:disabled?"none":"auto"}}) : action === "Next" ? "→" : "←"}
  </button>
}
export const cssScrollSnapButtonPropertyControls = {
  overflowViewport:{title:"Overflow Viewport",type:ControlType.Boolean,defaultValue:false,description:"Navigate the first child viewport of the named overflow container."},
  carouselID:{title:"ID",type:ControlType.String,defaultValue:"CSS Scroll Snap Gallery",description:"Match the carousel stack’s layer name."},
  action:{type:ControlType.Enum,options:["Prev","Next"],defaultValue:"Next"},
  componentSlot:{title:"Connect",type:ControlType.Slot,maxCount:1},
  inactiveOpacity:{type:ControlType.Number,defaultValue:0.35,min:0,max:1,step:0.01},
} satisfies PropertyControls<CSSScrollSnapButtonProps>
addPropertyControls(CSSScrollSnapButton, cssScrollSnapButtonPropertyControls)
