import * as React from "react"
import { RenderTarget } from "framer"
// @ts-ignore Framer cannot resolve local code-file imports.
import { inlineAuthoredVariables } from "./authoredStyles.ts"
// @ts-ignore Framer cannot resolve local code-file imports.
import { useAuthoredStyles } from "../hooks/useAuthoredStyles.ts"

type LayerProps = { className?: string; style?: React.CSSProperties }

function providerVariables(style?: React.CSSProperties): React.CSSProperties {
  const authored = inlineAuthoredVariables(style) as Record<string, string>
  const result: Record<string, string> = {}
  for (const side of ["left", "right"]) {
    const value = authored[`--kniff-authored-padding-${side}`]
    if (value) result[`--kniff-provider-padding-${side}`] = value
  }
  return result as React.CSSProperties
}

export function withCarouselPaddingProvider<P extends object>(
  Component: React.ComponentType<P>,
): React.ComponentType<P> {
  const Override = React.forwardRef<unknown, P>((props, ref) => {
    const layer = props as P & LayerProps
    const authored = useAuthoredStyles(layer.className ?? "")
    if (RenderTarget.current() === RenderTarget.canvas)
      return React.createElement(Component, { ...props, ref } as P)
    return (
      <>
        {React.createElement(Component, {
          ...props,
          ref,
          style: { ...layer.style, ...providerVariables(layer.style) },
        } as P)}
        <style
          id={authored.id}
          data-kniff-padding-provider-css=""
          dangerouslySetInnerHTML={{
            __html: authored.css.replaceAll(
              /--kniff-authored-padding-(left|right)/g,
              "--kniff-provider-padding-$1",
            ),
          }}
        />
      </>
    )
  })
  return Override as unknown as React.ComponentType<P>
}
