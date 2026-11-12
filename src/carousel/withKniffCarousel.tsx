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
    useEffect(() => {
      if (!viewport || !register) return
      register(viewport)
      return () =>
        register((current: HTMLElement | null) => (current === viewport ? null : current))
    }, [viewport, register])
    useEffect(() => {
      if (!viewport) return
      const configure = (event: Event) => setLoop((event as CustomEvent<boolean>).detail)
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
    const children = Children.toArray((props as P & LayerProps).children)
    const cycles = loop && children.length > 0 ? [-3, -2, -1, 0, 1, 2, 3] : [0]
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
          }),
        )}
        {authoredStyle}
      </CarouselContext.Provider>
    )
  })
  const CanvasViewport = forwardRef<unknown, P>((props, ref) => {
    const layer = props as P & LayerProps
    const authored = useAuthoredStyles(layer.className ?? "")
    return (
      <>
        {React.createElement(Component, {
          ...props,
          ref,
          style: { ...layer.style, ...inlineAuthoredVariables(layer.style) },
        } as P)}
        <style
          id={authored.id}
          data-kniff-authored-css=""
          dangerouslySetInnerHTML={{ __html: authored.css }}
        />
      </>
    )
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
