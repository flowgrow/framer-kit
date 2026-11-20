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
  useLayoutEffect,
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

function isSlideTargetElement(element: ReactElement<Record<string, unknown>>): boolean {
  const p = element.props
  return (
    typeof element.type === "string" ||
    typeof p.className === "string" ||
    "data-framer-name" in p
  )
}

function collectSlideClassNames(node: ReactNode, found: Set<string>, depth = 0): void {
  if (!isValidElement(node) || depth > 4) return
  const el = node as ReactElement<Record<string, unknown>>
  const p = el.props
  if (typeof p.className === "string") {
    for (const token of p.className.split(/\s+/)) {
      if (token) found.add(token)
    }
  }
  if (p.overrides && typeof p.overrides === "object") {
    for (const override of Object.values(p.overrides as Record<string, unknown>)) {
      if (override && typeof override === "object" && typeof (override as any).className === "string") {
        for (const token of (override as any).className.split(/\s+/)) {
          if (token) found.add(token)
        }
      }
    }
  }
  if (isSlideTargetElement(el)) return
  if (p.children !== undefined) {
    for (const child of Children.toArray(p.children as ReactNode)) {
      collectSlideClassNames(child, found, depth + 1)
    }
  }
}

function markEdgeElement(node: ReactNode, attrs: Record<string, string>, depth = 0): ReactNode {
  if (!isValidElement(node) || depth > 4) return node
  const el = node as ReactElement<Record<string, unknown>>
  if (isSlideTargetElement(el)) return cloneElement(el, attrs)
  const inner = el.props.children as ReactNode
  if (inner === undefined) return el
  if (isValidElement(inner)) {
    return cloneElement(el, undefined, markEdgeElement(inner, attrs, depth + 1))
  }
  return el
}

const useIsomorphicLayoutEffect = typeof document !== "undefined" ? useLayoutEffect : useEffect

/** Apply to the actual overflow viewport. React owns every repeated slide. */
function withKniffCarousel<P extends object>(Component: ComponentType<P>): ComponentType<P> {
  const Runtime = forwardRef<unknown, P>((props, forwardedRef) => {
    const layer = props as P & LayerProps
    const children = Children.toArray(layer.children)
    const firstClassSet = new Set<string>()
    const edgeClassSet = new Set<string>()
    if (children.length > 0) {
      collectSlideClassNames(children[0], firstClassSet)
      for (const token of firstClassSet) edgeClassSet.add(token)
      if (children.length > 1) collectSlideClassNames(children[children.length - 1], edgeClassSet)
    }
    const edgeClasses = [...edgeClassSet].join(" ")
    const firstClasses = [...firstClassSet].join(" ")
    const authored = useAuthoredStyles(layer.className ?? "", edgeClasses, firstClasses)
    const scope = React.useContext(CarouselContext) as any
    const localId = React.useId()
    const id = scope?.id ?? localId
    const register = scope?.register
    const [viewport, setViewport] = useState<HTMLElement | null>(null)
    const [loopState, setLoopState] = useState<"pending" | "on" | "off">("pending")
    const ref = useCallback(
      (node: unknown) => {
        setViewport(node instanceof HTMLElement ? node : null)
        if (typeof forwardedRef === "function") forwardedRef(node)
        else if (forwardedRef) forwardedRef.current = node
      },
      [forwardedRef],
    )
    const probe = useCallback((node: HTMLSpanElement | null) => {
      if (node?.parentElement) setViewport(node.parentElement)
    }, [])
    useIsomorphicLayoutEffect(() => {
      if (!viewport || !register) return
      register(viewport)
      return () =>
        register((current: HTMLElement | null) => (current === viewport ? null : current))
    }, [viewport, register])
    useIsomorphicLayoutEffect(() => {
      if (!viewport) return
      const configure = (event: Event) =>
        setLoopState((event as CustomEvent<boolean>).detail ? "on" : "off")
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
    const cycles =
      children.length === 0
        ? [0]
        : loopState === "on"
          ? [-3, -2, -1, 0, 1, 2, 3]
          : loopState === "pending" && children.length > 1
            ? [-1, 0]
            : [0]
    return (
      <CarouselContext.Provider
        value={{
          id,
          boundarySelector: scope?.boundarySelector ?? "body",
          viewportSelector: `[data-kniff-viewport="${id}"]`,
          viewport,
        }}
      >
        {React.createElement(
          Component,
          { ...styledProps, "data-kniff-react-loop": "" } as P,
          cycles.map((cycle) => {
            const slides = children.map((child, index) => {
              if (!isValidElement(child)) return child
              let next = cloneElement(child as ReactElement<Record<string, unknown>>, {
                key: `${cycle}:${child.key ?? index}`,
                ...(cycle ? { ref: null, id: undefined, tabIndex: -1 } : {}),
              })
              if (cycle === 0 && children.length > 1) {
                const edgeAttrs: Record<string, string> = {}
                if (index === 0) edgeAttrs["data-kniff-first-slide"] = ""
                if (index === children.length - 1) edgeAttrs["data-kniff-last-slide"] = ""
                if (edgeAttrs["data-kniff-first-slide"] !== undefined || edgeAttrs["data-kniff-last-slide"] !== undefined) {
                  next = markEdgeElement(next, edgeAttrs) as ReactElement<Record<string, unknown>>
                }
              }
              return next
            })
            return cycle === 0 ? (
              <span
                key={cycle}
                ref={probe}
                data-kniff-loop-original=""
                style={{ display: "contents" }}
              >
                {slides}
              </span>
            ) : loopState === "pending" ? (
              <RamkaLoopScope
                key={cycle}
                data-kniff-ssr-loop-copy=""
                aria-hidden="true"
                style={{ display: "none" }}
              >
                {slides}
              </RamkaLoopScope>
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
          }),
        )}
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
