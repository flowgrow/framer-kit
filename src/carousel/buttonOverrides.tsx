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

function withAutoMovePlayButton(Component: React.ComponentType<any>): React.ComponentType<any> {
  return React.forwardRef<HTMLElement, any>((props, forwardedRef) => {
    const viewport = (React.useContext(CarouselContext) as any)?.viewport as HTMLElement | undefined
    const [button, setButton] = React.useState<HTMLElement | null>(null)
    const [playing, setPlaying] = React.useState(false)
    const ref = React.useCallback((node: HTMLElement | null) => {
      setButton(node)
      if (typeof forwardedRef === "function") forwardedRef(node)
      else if (forwardedRef) forwardedRef.current = node
    }, [forwardedRef])
    React.useLayoutEffect(() => {
      if (!viewport || !button) return
      const update = () => {
        const state = viewport.dataset.kniffAutoMove
        setPlaying(state === "running" || state === "waiting")
      }
      update()
      const observer = new MutationObserver(update)
      observer.observe(viewport, { attributes: true, attributeFilter: ["data-kniff-auto-move"] })
      const toggle = () => viewport.dispatchEvent(new Event("kniff-toggle-playback"))
      const keyDown = (event: KeyboardEvent) => {
        if (button.matches("button,input,a[href]") || event.target !== button || event.defaultPrevented) return
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault()
          if (!event.repeat) button.click()
        }
      }
      button.addEventListener("click", toggle)
      button.addEventListener("keydown", keyDown)
      return () => {
        observer.disconnect()
        button.removeEventListener("click", toggle)
        button.removeEventListener("keydown", keyDown)
      }
    }, [button, viewport])
    if (RenderTarget.current() === RenderTarget.canvas) return <Component {...props} ref={forwardedRef} />
    return <Component {...props} ref={ref} variant={playing && viewport ? "Playing" : "Paused"}
      role={props.role ?? "button"} tabIndex={props.tabIndex ?? 0}
      aria-label={props["aria-label"] ?? "Auto Move"} aria-pressed={Boolean(viewport && playing)} />
  })
}

export const carouselButtonOverrides = { withKniffCarouselPrevious, withKniffCarouselNext, withAutoMovePlayButton }
