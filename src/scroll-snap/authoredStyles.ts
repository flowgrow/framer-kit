import * as Framer from "framer"
import { useEffect, useId, useState, type CSSProperties } from "react"

// Framer's private collector is populated during SSR only. Never measure layout.
export function readAuthoredCSS(): string {
  if (typeof document === "undefined") {
    const collector = (Framer as unknown as { cssCollector?: { getStyles(): Iterable<string> } }).cssCollector
    return collector ? [...collector.getStyles()].join("\n") : ""
  }
  return [...document.querySelectorAll<HTMLStyleElement>("style[data-framer-css-ssr],style[data-framer-css-ssr-minified],style[data-framer-css]")]
    .map(style => {
      try { return style.textContent || [...(style.sheet?.cssRules ?? [])].map(rule => rule.cssText).join("\n") }
      catch { return "" }
    }).join("\n")
}

// Split only outside strings, comments, brackets and functions. Framer emits flat
// selector rules inside conditional blocks; keep those conditions verbatim.
function split(input: string, separator: (character: string) => boolean): string[] {
  let depth = 0, quote = "", start = 0
  const parts: string[] = []
  for (let i = 0; i < input.length; i++) {
    const character = input[i]!
    if (character === "\\") { i++; continue }
    if (quote) { if (character === quote) quote = ""; continue }
    if (character === '"' || character === "'") { quote = character; continue }
    if (character === "(" || character === "[") depth++
    if (character === ")" || character === "]") depth--
    if (!depth && separator(character)) { parts.push(input.slice(start, i).trim()); start = i + 1 }
  }
  parts.push(input.slice(start).trim())
  return parts.filter(Boolean)
}

const variable = (side: string) => `--kniff-authored-${side}`
function variables(property: string, raw: string): string {
  const important = /\s*!important\s*$/i.test(raw) ? " !important" : ""
  const value = raw.replace(/\s*!important\s*$/i, "").trim()
  const values = split(value, character => /\s/.test(character))
  const emit = (name: string, token: string) => `${variable(name)}:${token}${important};`
  if (property === "padding" && values.length <= 4) {
    const [top = "0px", right = top, bottom = top, left = right] = values
    return emit("padding-top", top) + emit("padding-right", right) + emit("padding-bottom", bottom) + emit("padding-left", left)
  }
  if (/^padding-(top|right|bottom|left)$/.test(property)) return emit(property, value)
  if (property === "gap" && values.length <= 2) return emit("row-gap", values[0] ?? "0px") + emit("column-gap", values[1] ?? values[0] ?? "0px")
  if (property === "row-gap" || property === "column-gap") return emit(property, value)
  return ""
}

export function inlineAuthoredVariables(style?: CSSProperties): CSSProperties {
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(style ?? {})) {
    if (value == null) continue
    const property = key.replace(/[A-Z]/g, character => `-${character.toLowerCase()}`)
    for (const declaration of variables(property, typeof value === "number" ? `${value}px` : String(value)).split(";")) {
      const colon = declaration.indexOf(":")
      if (colon > 0) result[declaration.slice(0, colon)] = declaration.slice(colon + 1)
    }
  }
  return result as CSSProperties
}

/** Preserve every relevant selector's specificity, order and conditional blocks. */
export function authoredVariableCSS(source: string, className: string): string {
  const classes = new Set(className.split(/\s+/).filter(Boolean))
  if (!classes.size) return ""
  const text = source.replace(/\/\*[\s\S]*?\*\//g, "")
  function visit(input: string): string {
    let output = "", cursor = 0
    while (cursor < input.length) {
      const opening = input.indexOf("{", cursor)
      if (opening < 0) break
      const header = input.slice(cursor, opening).trim()
      let depth = 1, quote = "", end = opening + 1
      for (; end < input.length && depth; end++) {
        const character = input[end]!
        if (character === "\\") { end++; continue }
        if (quote) { if (character === quote) quote = ""; continue }
        if (character === '"' || character === "'") { quote = character; continue }
        if (character === "{") depth++
        if (character === "}") depth--
      }
      if (depth) break
      const body = input.slice(opening + 1, end - 1)
      cursor = end
      if (/^@(media|supports|container|layer)\b/.test(header)) {
        const nested = visit(body)
        if (nested) output += `${header}{${nested}}`
        continue
      }
      if (header.startsWith("@") || body.includes("{")) continue
      const selectors = split(header, character => character === ",").filter(selector => {
        const compound = split(selector, character => /\s|[>+~]/.test(character)).at(-1) ?? ""
        if (compound.includes("::")) return false
        // Match the styled element, not a class on one of its ancestors.
        const subject = compound.split(":")[0] ?? ""
        return [...subject.matchAll(/\.([\w-]+)/g)].some(match => classes.has(match[1]!))
      })
      if (!selectors.length) continue
      let declarations = ""
      for (const declaration of split(body, character => character === ";")) {
        const colon = declaration.indexOf(":")
        if (colon > 0) declarations += variables(declaration.slice(0, colon).trim().toLowerCase(), declaration.slice(colon + 1))
      }
      if (declarations) output += `${selectors.join(",")}{${declarations}}`
    }
    return output
  }
  return visit(text).replace(/</g, "\\3c ")
}

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
