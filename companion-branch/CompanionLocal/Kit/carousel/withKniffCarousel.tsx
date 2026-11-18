// Branch-local copy: dependencies resolved within CompanionLocal.
// @ts-ignore Framer cannot resolve local code-file imports.
import { CarouselContext } from "./carouselContext.tsx"
import { RenderTarget } from "framer"
import * as React from "react"
import {
  Children,
  cloneElement,
  forwardRef,
  isValidElement,
  useCallback,
  useEffect,
  useState,
  type ComponentType,
  type ReactElement,
  type ReactNode,
} from "react"
// @ts-ignore Framer cannot resolve local code-file imports.
import { RamkaLoopScope } from "../lightbox/galleryOverride.tsx"
// @ts-ignore Framer cannot resolve local code-file imports.
import { inlineAuthoredVariables } from "./authoredStyles.ts"
// @ts-ignore Framer cannot resolve local code-file imports.
import { useAuthoredStyles } from "../hooks/useAuthoredStyles.ts"

interface LayerProps {
  children?: ReactNode
  className?: string
  style?: React.CSSProperties
}

/** Apply to the actual overflow viewport. React owns every repeated slide. */
function withKniffCarousel<P extends object>(Component: ComponentType<P>): ComponentType<P> {
  const Runtime = forwardRef<unknown, P>((props, forwardedRef) => {
    const layer = props as P & LayerProps
    const authored = useAuthoredStyles(layer.className ?? "")
    const scope = React.useContext(CarouselContext) as any
    const localId = React.useId()
    const id = scope?.id ?? localId
    const register = scope?.register
    const [viewport, setViewport] = useState<HTMLElement | null>(null)
    const [loop, setLoop] = useState(false)
    const pendingViewport = React.useRef<HTMLElement | null>(null)
    const pendingObserver = React.useRef<MutationObserver | null>(null)
    const pendingFrame = React.useRef(0)
    const hydrateViewport = useCallback((node: HTMLElement | null) => {
      pendingObserver.current?.disconnect()
      cancelAnimationFrame(pendingFrame.current)
      pendingViewport.current = node
      if (!node) { React.startTransition(() => setViewport(null)); return }
      const commit = () => {
        const triggers = Array.from(node.querySelectorAll<HTMLElement>("[data-kniff-loop-original] [data-ramka-trigger]")).filter(element => element.getClientRects().length > 0)
        if (triggers.some(element => !element.hasAttribute("data-kniff-trigger-ready"))) return
        pendingObserver.current?.disconnect()
        pendingFrame.current = requestAnimationFrame(() => {
          if (pendingViewport.current === node) React.startTransition(() => setViewport(node))
        })
      }
      pendingObserver.current = new MutationObserver(commit)
      pendingObserver.current.observe(node, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-kniff-trigger-ready", "class"] })
      commit()
    }, [])
    useEffect(() => () => { pendingObserver.current?.disconnect(); cancelAnimationFrame(pendingFrame.current) }, [])
    const ref = useCallback(
      (node: unknown) => {
        hydrateViewport(node instanceof HTMLElement ? node : null)
        if (typeof forwardedRef === "function") forwardedRef(node)
        else if (forwardedRef) forwardedRef.current = node
      },
      [forwardedRef, hydrateViewport],
    )
    const probe = useCallback((node: HTMLSpanElement | null) => {
      if (node?.parentElement) hydrateViewport(node.parentElement)
    }, [hydrateViewport])
    useEffect(() => {
      if (!viewport || !register) return
      register(viewport)
      return () =>
        register((current: HTMLElement | null) => (current === viewport ? null : current))
    }, [viewport, register])
    useEffect(() => {
      if (!viewport) return
      const configure = (event: Event) => React.startTransition(() => setLoop((event as CustomEvent<boolean>).detail))
      const marked = viewport.hasAttribute("data-kniff-react-loop")
      viewport.setAttribute("data-kniff-react-loop", "")
      viewport.addEventListener("kniff-loop-render", configure)
      return () => {
        viewport.removeEventListener("kniff-loop-render", configure)
        if (!marked) viewport.removeAttribute("data-kniff-react-loop")
      }
    }, [viewport])
    const styledProps = {
      ...props,
      ref,
      "data-kniff-carousel": "",
      "data-kniff-viewport": id,
      style: { ...layer.style, ...inlineAuthoredVariables(layer.style) },
    } as P
    const authoredStyle = (
      <style
        id={authored.id}
        data-kniff-authored-css=""
        dangerouslySetInnerHTML={{ __html: authored.css }}
      />
    )
    const loopReady = loop
    const cycleElements = React.useMemo(() => {
      const children = Children.toArray((props as P & LayerProps).children)
      return [-3, -2, -1, 0, 1, 2, 3].map((cycle) => {
            const slides = children.map((child, index) =>
              isValidElement(child)
                ? cloneElement(child as ReactElement<Record<string, unknown>>, {
                    key: `${cycle}:${child.key ?? index}`,
                    ...(cycle ? { ref: null, id: undefined, tabIndex: -1 } : {}),
                  })
                : child,
            )
            return cycle === 0 ? (
              <span
                key={cycle}
                ref={probe}
                data-kniff-loop-original=""
                style={{ display: "contents" }}
              >
                {slides}
              </span>
            ) : (
              <RamkaLoopScope
                key={cycle}
                data-kniff-loop-copy=""
                aria-hidden="true"
                style={{ display: "contents" }}
              >
                {slides}
              </RamkaLoopScope>
            )
          })
    }, [(props as P & LayerProps).children])
    const contextValue = React.useMemo(() => ({ id, boundarySelector: scope?.boundarySelector ?? "body", viewportSelector: `[data-kniff-viewport="${id}"]`, viewport }), [id, scope?.boundarySelector, viewport])
    const renderedLayer = React.useMemo(() => React.createElement(Component, { ...styledProps, "data-kniff-react-loop": "" } as P, cycleElements.map((element, index) => loopReady || index === 3 ? element : <span key={element.key} data-kniff-loop-placeholder="" aria-hidden="true" style={{ display: "contents" }} />)), [props, ref, id, loopReady, cycleElements])
    return (
      <CarouselContext.Provider value={contextValue}>
        {renderedLayer}
        {authoredStyle}
      </CarouselContext.Provider>
    )
  })
  const CanvasViewport = forwardRef<unknown, P>((props, ref) => {
    const element = React.useRef<HTMLElement | null>(null)
    const mergedRef = useCallback((node: unknown) => {
      element.current = node instanceof HTMLElement ? node : null
      if (typeof ref === "function") ref(node)
      else if (ref) ref.current = node
    }, [ref])
    React.useLayoutEffect(() => {
      element.current?.dispatchEvent(new Event("kniff-canvas-slides", { bubbles: true }))
    })
    return React.createElement(Component, { ...props, ref: mergedRef } as P)
  })
  const Override = forwardRef<unknown, P>((props, ref) =>
    RenderTarget.current() === RenderTarget.canvas
      ? React.createElement(CanvasViewport, { ...(props as any), ref })
      : React.createElement(Runtime, { ...(props as any), ref }),
  )
  Override.displayName = `withKniffCarousel(${Component.displayName ?? Component.name ?? "Component"})`
  return Override as unknown as ComponentType<P>
}

export const carouselViewportOverride = { withKniffCarousel }

