import * as React from "react"
import { RenderTarget } from "framer"
// @ts-ignore Framer cannot resolve local code-file imports.
import { CarouselContext } from "./carouselContext.tsx"
// @ts-ignore Framer cannot resolve local code-file imports.
import { moveOverflowViewport } from "./snapNavigation.ts"
// @ts-ignore Framer cannot resolve local code-file imports.
import { observeNavigation } from "../hooks/useOverflowNavigation.ts"

function navigationOverride<P extends object>(
  Component: React.ComponentType<P>,
  direction: -1 | 1,
): React.ComponentType<P> {
  const Override = React.forwardRef<unknown, P>((props, forwardedRef) => {
    const viewport = (React.useContext(CarouselContext) as any)?.viewport
    const [button, setButton] = React.useState<HTMLElement | null>(null)
    const [available, setAvailable] = React.useState(0)
    const ref = React.useCallback(
      (node: unknown) => {
        setButton(node instanceof HTMLElement ? node : null)
        if (typeof forwardedRef === "function") forwardedRef(node)
        else if (forwardedRef) forwardedRef.current = node
      },
      [forwardedRef],
    )
    const disabled = !viewport || !(available & (direction === 1 ? 2 : 1))
    React.useEffect(() => {
      setAvailable(0)
      if (viewport) return observeNavigation(viewport, setAvailable)
    }, [viewport])
    React.useEffect(() => {
      if (!button || !viewport || disabled) return
      // Design component instances forward their ref even when they don't pass
      // arbitrary event props to their root. Keep the layer's own handlers.
      const activate = (event: MouseEvent) => {
        if (!event.defaultPrevented) moveOverflowViewport(viewport, direction)
      }
      const keyDown = (event: KeyboardEvent) => {
        if (
          event.defaultPrevented ||
          event.target !== button ||
          button.matches("button,input,a[href]")
        )
          return
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          if (!event.repeat) button.click()
        }
      }
      button.addEventListener("click", activate)
      button.addEventListener("keydown", keyDown)
      return () => {
        button.removeEventListener("click", activate)
        button.removeEventListener("keydown", keyDown)
      }
    }, [button, viewport, disabled])
    if (RenderTarget.current() === RenderTarget.canvas)
      return React.createElement(Component, { ...props, ref: forwardedRef } as P)
    const original = props as React.HTMLAttributes<HTMLElement>
    return React.createElement(Component, {
      ...props,
      ref,
      role: original.role ?? "button",
      tabIndex: original.tabIndex ?? 0,
      "aria-label": original["aria-label"] ?? (direction === 1 ? "Next slide" : "Previous slide"),
      "aria-disabled": disabled,
    } as P)
  })
  return Override as unknown as React.ComponentType<P>
}
function withKniffCarouselPrevious<P extends object>(
  Component: React.ComponentType<P>,
  _internal?: undefined,
): React.ComponentType<P> {
  return navigationOverride(Component, -1)
}
function withKniffCarouselNext<P extends object>(
  Component: React.ComponentType<P>,
  _internal?: undefined,
): React.ComponentType<P> {
  return navigationOverride(Component, 1)
}

export const carouselButtonOverrides = { withKniffCarouselPrevious, withKniffCarouselNext }
