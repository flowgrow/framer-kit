import { RenderTarget } from "framer"
import * as React from "react"
import { Children, cloneElement, forwardRef, isValidElement, useCallback, useEffect, useState, type ComponentType, type ReactElement, type ReactNode } from "react"
import { RamkaLoopScope } from "../ramka/galleryOverride.js"

import { inlineAuthoredVariables, useAuthoredStyles } from "./authoredStyles.js"

interface LayerProps { children?: ReactNode; className?: string; style?: React.CSSProperties }

/** Apply to the actual overflow viewport. React owns every repeated slide. */
export function withKniffCarousel<P extends object>(Component: ComponentType<P>): ComponentType<P> {
  const Override = forwardRef<unknown, P>((props, forwardedRef) => {
    const layer = props as P & LayerProps
    const authored = useAuthoredStyles(layer.className ?? "")
    const canvas = RenderTarget.current() === RenderTarget.canvas
    const [viewport, setViewport] = useState<HTMLElement | null>(null)
    const [loop, setLoop] = useState(false)
    const ref = useCallback((node: unknown) => {
      setViewport(node instanceof HTMLElement ? node : null)
      if (typeof forwardedRef === "function") forwardedRef(node)
      else if (forwardedRef) forwardedRef.current = node
    }, [forwardedRef])
    const probe = useCallback((node: HTMLSpanElement | null) => {
      if (node?.parentElement) setViewport(node.parentElement)
    }, [])
    useEffect(() => {
      if (!viewport || canvas) return
      const configure = (event: Event) => setLoop((event as CustomEvent<boolean>).detail)
      const marked = viewport.hasAttribute("data-kniff-react-loop")
      viewport.setAttribute("data-kniff-react-loop", "")
      viewport.addEventListener("kniff-loop-render", configure)
      return () => {
        viewport.removeEventListener("kniff-loop-render", configure)
        if (!marked) viewport.removeAttribute("data-kniff-react-loop")
      }
    }, [viewport, canvas])
    const styledProps = { ...props, ref, "data-kniff-carousel": "", style: { ...layer.style, ...inlineAuthoredVariables(layer.style) } } as P
    const style = <style id={authored.id} data-kniff-authored-css="" dangerouslySetInnerHTML={{ __html: authored.css }} />
    if (canvas) return <>{React.createElement(Component, styledProps)}{style}</>
    const children = Children.toArray((props as P & LayerProps).children)
    const cycles = loop && children.length > 0 ? [-3, -2, -1, 0, 1, 2, 3] : [0]
    return <>{React.createElement(Component, { ...styledProps, "data-kniff-react-loop": "" } as P, cycles.map(cycle => {
      const slides = children.map((child, index) => isValidElement(child)
        ? cloneElement(child as ReactElement<Record<string, unknown>>, { key: `${cycle}:${child.key ?? index}`, ...(cycle ? { ref: null, id: undefined, tabIndex: -1 } : {}) })
        : child)
      return cycle === 0
        ? <span key={cycle} ref={probe} data-kniff-loop-original="" style={{ display: "contents" }}>{slides}</span>
        : <RamkaLoopScope key={cycle} data-kniff-loop-copy="" aria-hidden="true" style={{ display: "contents" }}>{slides}</RamkaLoopScope>
    }))}{style}</>
  })
  Override.displayName = `withKniffCarousel(${Component.displayName ?? Component.name ?? "Component"})`
  return Override as unknown as ComponentType<P>
}
