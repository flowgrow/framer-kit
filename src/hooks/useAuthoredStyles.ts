import { useEffect, useId, useState } from "react"
// @ts-ignore Framer cannot resolve local code-file imports.
import { authoredVariableCSS, readAuthoredCSS } from "../carousel/authoredStyles.ts"

export function useAuthoredStyles(className: string) {
  const id = `kniff-authored-${useId()}`
  const [css, setCSS] = useState(() => {
    // Reuse the exact SSR snapshot: the client collector is empty, and Framer's
    // optimizer may have rewritten the source stylesheet since server rendering.
    const snapshot = typeof document !== "undefined" ? document.getElementById(id) : null
    return snapshot?.textContent ?? authoredVariableCSS(readAuthoredCSS(), className)
  })
  useEffect(() => {
    // Preview/editor styles are inserted before passive effects. Also refresh
    // when a variant changes the received class. No resize/mutation observer.
    const next = authoredVariableCSS(readAuthoredCSS(), className)
    if (next) setCSS(next)
  }, [className])
  return { id, css }
}
