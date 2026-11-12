import { RenderTarget } from "framer"
import { createElement, forwardRef, useCallback, useRef, type ComponentType } from "react"

// @ts-ignore Framer cannot resolve local code-file imports.
import { galleryOverrideFactory } from "./galleryOverride.tsx"
// @ts-ignore Framer cannot resolve local code-file imports.
import { lightboxTriggerOverrides } from "./triggerOverride.tsx"

/** Makes a Framer parent the scope and runtime owner for one lightbox. */
function withKniffLightboxGallery<P extends object>(Component: ComponentType<P>): ComponentType<P> {
  return galleryOverrideFactory.createGalleryOverride(Component)
}

/** Makes an existing descendant image/card a trigger in its nearest gallery. */
function withKniffLightboxTrigger<P extends object>(Component: ComponentType<P>): ComponentType<P> {
  return lightboxTriggerOverrides.createTriggerOverride(Component)
}

/** Marks the rendered text layer inside a lightbox trigger as its caption. */
function captionOverride<P extends object>(
  Component: ComponentType<P>,
  lightboxOnly: boolean,
): ComponentType<P> {
  const Override = forwardRef<unknown, P>((props, forwardedRef) => {
    const marked = useRef<HTMLElement | null>(null)
    const ref = useCallback(
      (node: unknown) => {
        marked.current?.removeAttribute("data-kniff-lightbox-caption")
        marked.current = node instanceof HTMLElement ? node : null
        marked.current?.setAttribute("data-kniff-lightbox-caption", "")
        if (typeof forwardedRef === "function") forwardedRef(node)
        else if (forwardedRef) forwardedRef.current = node
      },
      [forwardedRef],
    )
    const hidden = lightboxOnly && RenderTarget.current() !== RenderTarget.canvas
    return createElement(Component, {
      ...props,
      ref,
      "data-kniff-lightbox-caption": "",
      ...(hidden
        ? { style: { ...(props as { style?: React.CSSProperties }).style, display: "none" } }
        : {}),
    } as P)
  })
  return Override as unknown as ComponentType<P>
}

function withKniffLightboxCaption<P extends object>(Component: ComponentType<P>) {
  return captionOverride(Component, false)
}
function withKniffLightboxOnlyCaption<P extends object>(Component: ComponentType<P>) {
  return captionOverride(Component, true)
}

export const lightboxOverrides = {
  withKniffLightboxGallery,
  withKniffLightboxTrigger,
  withKniffLightboxCaption,
  withKniffLightboxOnlyCaption,
}
