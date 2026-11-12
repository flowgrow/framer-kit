import * as React from "react"

// Copy typography from each Framer rich-text run, leaving positioning and
// visibility with the source layer. Only text and line breaks enter the portal.
function copyText(element: HTMLElement, key = 0, root = false): React.ReactNode {
  if (element.tagName === "BR") return <br key={key} />
  const css = getComputedStyle(element)
  const style: React.CSSProperties = {
    color: css.color,
    fontFamily: css.fontFamily,
    fontSize: css.fontSize,
    fontStyle: css.fontStyle,
    fontWeight: css.fontWeight,
    lineHeight: css.lineHeight,
    letterSpacing: css.letterSpacing,
    textDecoration: css.textDecoration,
    textTransform: css.textTransform as React.CSSProperties["textTransform"],
    fontVariationSettings: css.fontVariationSettings,
    display: root || css.display === "block" ? "block" : "inline",
    whiteSpace: "pre-wrap",
  }
  return (
    <span key={key} style={style}>
      {Array.from(element.childNodes, (child, i) =>
        child.nodeType === Node.TEXT_NODE
          ? child.textContent
          : child instanceof HTMLElement
            ? copyText(child, i)
            : null,
      )}
    </span>
  )
}

function StyledCaptionImpl({ source }: { source: HTMLElement }) {
  const [text, setText] = React.useState<React.ReactNode>(null)
  React.useLayoutEffect(() => {
    const refresh = () => setText(copyText(source, 0, true))
    refresh()
    const observer = new MutationObserver(refresh)
    observer.observe(source, {
      subtree: true,
      characterData: true,
      childList: true,
      attributes: true,
      attributeFilter: ["class", "style"],
    })
    const win = source.ownerDocument.defaultView
    win?.addEventListener("resize", refresh)
    return () => {
      observer.disconnect()
      win?.removeEventListener("resize", refresh)
    }
  }, [source])
  return <>{text}</>
}

export const StyledCaption = StyledCaptionImpl
