import * as Framer from "framer"
import type { CSSProperties } from "react"

// Framer's private collector is populated during SSR only. Never measure layout.
export function readAuthoredCSS(): string {
  if (typeof document === "undefined") {
    const collector = (Framer as unknown as { cssCollector?: { getStyles(): Iterable<string> } })
      .cssCollector
    return collector ? [...collector.getStyles()].join("\n") : ""
  }
  return [
    ...document.querySelectorAll<HTMLStyleElement>(
      "style[data-framer-css-ssr],style[data-framer-css-ssr-minified],style[data-framer-css]",
    ),
  ]
    .map((style) => {
      try {
        return (
          style.textContent ||
          [...(style.sheet?.cssRules ?? [])].map((rule) => rule.cssText).join("\n")
        )
      } catch {
        return ""
      }
    })
    .join("\n")
}

// Split only outside strings, comments, brackets and functions. Framer emits flat
// selector rules inside conditional blocks; keep those conditions verbatim.
function split(input: string, separator: (character: string) => boolean): string[] {
  let depth = 0,
    quote = "",
    start = 0
  const parts: string[] = []
  for (let i = 0; i < input.length; i++) {
    const character = input[i]!
    if (character === "\\") {
      i++
      continue
    }
    if (quote) {
      if (character === quote) quote = ""
      continue
    }
    if (character === '"' || character === "'") {
      quote = character
      continue
    }
    if (character === "(" || character === "[") depth++
    if (character === ")" || character === "]") depth--
    if (!depth && separator(character)) {
      parts.push(input.slice(start, i).trim())
      start = i + 1
    }
  }
  parts.push(input.slice(start).trim())
  return parts.filter(Boolean)
}

const variable = (side: string) => `--kniff-authored-${side}`
function variables(property: string, raw: string): string {
  const important = /\s*!important\s*$/i.test(raw) ? " !important" : ""
  const value = raw.replace(/\s*!important\s*$/i, "").trim()
  const values = split(value, (character) => /\s/.test(character))
  const emit = (name: string, token: string) =>
    `${variable(name)}:${token === "0" ? "0px" : token}${important};`
  if (property === "padding" && values.length <= 4) {
    const [top = "0px", right = top, , left = right] = values
    return emit("padding-right", right) + emit("padding-left", left)
  }
  if (/^padding-(right|left)$/.test(property)) return emit(property, value)
  // Authored sizing is relative to the viewport's parent content box, not the
  // expanded scrollport. Settings establishes that parent's sizing container.
  if (property === "width" || property === "max-width") {
    const intrinsic =
      /^(none|auto|min-content|max-content|fit-content|stretch|inherit|initial|unset)$/.test(value)
    return emit(property, intrinsic ? "100cqw" : value.replace(/(-?[\d.]+)%/g, "$1cqw"))
  }
  return ""
}

// Framer's Fill sizing emits flex:1 0 0 and width:1px. The pixel is a
// flex-basis placeholder, not the authored content width.
function isFillWidth(width: unknown, flex: unknown, grow?: unknown): boolean {
  const token = String(width)
    .replace(/\s*!important\s*$/i, "")
    .trim()
  const flexToken = String(flex ?? "").trim()
  const growth = grow ?? (flexToken === "auto" ? 1 : parseFloat(flexToken))
  return (token === "1" || token === "1px") && Number(growth) > 0
}

export function inlineAuthoredVariables(style?: CSSProperties): CSSProperties {
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(style ?? {})) {
    if (value == null) continue
    const property = key.replace(/[A-Z]/g, (character) => `-${character.toLowerCase()}`)
    const raw =
      property === "width" && isFillWidth(value, style?.flex, style?.flexGrow)
        ? "100cqw"
        : typeof value === "number"
          ? `${value}px`
          : String(value)
    for (const declaration of variables(property, raw).split(";")) {
      const colon = declaration.indexOf(":")
      if (colon > 0) result[declaration.slice(0, colon)] = declaration.slice(colon + 1)
    }
  }
  return result as CSSProperties
}

const intrinsicKeyword =
  /^(none|auto|min-content|max-content|fit-content|stretch|inherit|initial|unset)$/

function viewportLayoutVariables(property: string, raw: string): string {
  const important = /\s*!important\s*$/i.test(raw) ? " !important" : ""
  const value = raw.replace(/\s*!important\s*$/i, "").trim()
  const values = split(value, (character) => /\s/.test(character))
  const emit = (name: string, token: string) =>
    `${name}:${token === "0" ? "0px" : token}${important};`
  if (property === "padding" && values.length <= 4) {
    const [top = "0px", , bottom = top] = values
    return emit("--kniff-pt", top) + emit("--kniff-pb", bottom)
  }
  if (property === "padding-top") return emit("--kniff-pt", value)
  if (property === "padding-bottom") return emit("--kniff-pb", value)
  if (property === "gap" && values.length <= 2) {
    const [row = "0px", column = row] = values
    return emit("--kniff-gap", column)
  }
  if (property === "column-gap") return emit("--kniff-gap", value)
  if (property === "height" && !intrinsicKeyword.test(value) && !/%$/.test(value)) {
    return emit("--kniff-vh", value)
  }
  return ""
}

function slideWidthVariables(
  values: Record<string, string>,
  properties: [string, string][],
): string {
  let out = ""
  const stripImportant = (v: string) => v.replace(/\s*!important\s*$/i, "").trim()
  let hasExplicitWidth = false
  let hasAspectRatio = false
  for (const [property, raw] of properties) {
    const important = /\s*!important\s*$/i.test(raw) ? " !important" : ""
    const value = stripImportant(raw)
    if (property === "aspect-ratio") {
      const cleaned = value.replace(/\bauto\b/g, "").trim()
      if (cleaned && !intrinsicKeyword.test(cleaned)) {
        const expr = cleaned.includes("/") ? `(${cleaned})` : cleaned
        out += `--kniff-ar:${expr}${important};`
        hasAspectRatio = true
      }
    } else if (property === "height") {
      const pct = value.match(/^(-?[\d.]+)%$/)
      if (pct) {
        out += `--kniff-sh:calc((var(--kniff-vh, 0px) - var(--kniff-pt, 0px) - var(--kniff-pb, 0px)) * ${Number(pct[1]) / 100})${important};`
      } else if (!intrinsicKeyword.test(value)) {
        out += `--kniff-sh:${value === "0" ? "0px" : value}${important};`
      }
    } else if (property === "width") {
      if (isFillWidth(value, values.flex, values["flex-grow"])) {
        out += `--kniff-slide-width:100%${important};`
        hasExplicitWidth = true
      } else if (!intrinsicKeyword.test(value)) {
        out += `--kniff-slide-width:${value === "0" ? "0px" : value}${important};`
        hasExplicitWidth = true
      } else if (value === "auto" || value === "min-content") {
        out += `--kniff-slide-width:calc(var(--kniff-sh, 0px) * var(--kniff-ar, 0))${important};`
        hasExplicitWidth = true
      }
    }
  }
  if (hasAspectRatio && !hasExplicitWidth) {
    out += "--kniff-slide-width:calc(var(--kniff-sh, 0px) * var(--kniff-ar, 0));"
  }
  return out
}

function firstSlideViewportVariables(
  values: Record<string, string>,
  properties: [string, string][],
): string {
  let out = ""
  const stripImportant = (v: string) => v.replace(/\s*!important\s*$/i, "").trim()
  let hasExplicitWidth = false
  let hasAspectRatio = false
  for (const [property, raw] of properties) {
    const important = /\s*!important\s*$/i.test(raw) ? " !important" : ""
    const value = stripImportant(raw)
    if (property === "aspect-ratio") {
      const cleaned = value.replace(/\bauto\b/g, "").trim()
      if (cleaned && !intrinsicKeyword.test(cleaned)) {
        const expr = cleaned.includes("/") ? `(${cleaned})` : cleaned
        out += `--kniff-f-ar:${expr}${important};`
        hasAspectRatio = true
      }
    } else if (property === "height") {
      const pct = value.match(/^(-?[\d.]+)%$/)
      if (pct) {
        out += `--kniff-f-sh:calc((var(--kniff-vh, 0px) - var(--kniff-pt, 0px) - var(--kniff-pb, 0px)) * ${Number(pct[1]) / 100})${important};`
      } else if (!intrinsicKeyword.test(value)) {
        out += `--kniff-f-sh:${value === "0" ? "0px" : value}${important};`
      }
    } else if (property === "width") {
      const pct = value.match(/^(-?[\d.]+)%$/)
      if (isFillWidth(value, values.flex, values["flex-grow"])) {
        out += `--kniff-ssr-first-pct:1${important};--kniff-ssr-first-px:0px${important};`
        hasExplicitWidth = true
      } else if (pct) {
        out += `--kniff-ssr-first-pct:${Number(pct[1]) / 100}${important};--kniff-ssr-first-px:0px${important};`
        hasExplicitWidth = true
      } else if (!intrinsicKeyword.test(value)) {
        out += `--kniff-ssr-first-pct:0${important};--kniff-ssr-first-px:${value === "0" ? "0px" : value}${important};`
        hasExplicitWidth = true
      } else if (value === "auto" || value === "min-content") {
        out += `--kniff-ssr-first-pct:0${important};--kniff-ssr-first-px:calc(var(--kniff-f-sh, 0px) * var(--kniff-f-ar, 0))${important};`
        hasExplicitWidth = true
      }
    }
  }
  if (hasAspectRatio && !hasExplicitWidth) {
    out += "--kniff-ssr-first-pct:0;--kniff-ssr-first-px:calc(var(--kniff-f-sh, 0px) * var(--kniff-f-ar, 0));"
  }
  return out
}

/** Preserve every relevant selector's specificity, order and conditional blocks. */
export function authoredVariableCSS(
  source: string,
  className: string,
  slideClassName = "",
  firstSlideClassName = "",
): string {
  const classes = new Set(className.split(/\s+/).filter(Boolean))
  if (!classes.size) return ""
  const slideClasses = new Set(slideClassName.split(/\s+/).filter(Boolean))
  const firstSlideClasses = new Set(firstSlideClassName.split(/\s+/).filter(Boolean))
  const text = source.replace(/\/\*[\s\S]*?\*\//g, "")
  const root = `:is(${[...classes].map((name) => `.${name}`).join(",")})`
  const cycles = ":is([data-kniff-loop-original],[data-kniff-loop-copy],[data-kniff-ssr-loop-copy])"
  const slideSubjects = `${root} > *,${root} > .ssr-variant > *,${root} > ${cycles} > *,${root} > ${cycles} > .ssr-variant > *`
  let needsWidthFix = false
  const matchesClasses = (selector: string, target: Set<string>) => {
    const compound =
      split(selector, (character) => /\s|[>+~]/.test(character)).slice(-1)[0] ?? ""
    if (compound.includes("::")) return false
    // Match the styled element, not a class on one of its ancestors.
    const subject = compound.split(":")[0] ?? ""
    return [...subject.matchAll(/\.([\w-]+)/g)].some((match) => target.has(match[1]!))
  }
  function visit(input: string, widths: boolean): string {
    let output = "",
      cursor = 0
    while (cursor < input.length) {
      const opening = input.indexOf("{", cursor)
      if (opening < 0) break
      const header = input.slice(cursor, opening).trim()
      let depth = 1,
        quote = "",
        end = opening + 1
      for (; end < input.length && depth; end++) {
        const character = input[end]!
        if (character === "\\") {
          end++
          continue
        }
        if (quote) {
          if (character === quote) quote = ""
          continue
        }
        if (character === '"' || character === "'") {
          quote = character
          continue
        }
        if (character === "{") depth++
        if (character === "}") depth--
      }
      if (depth) break
      const body = input.slice(opening + 1, end - 1)
      cursor = end
      if (/^@(media|supports|container|layer)\b/.test(header)) {
        const nested = visit(body, widths)
        if (nested) output += `${header}{${nested}}`
        continue
      }
      if (header.startsWith("@") || body.includes("{")) continue
      const allSelectors = split(header, (character) => character === ",")
      const selectors = allSelectors.filter((selector) => matchesClasses(selector, classes))
      let declarations = ""
      const properties: [string, string][] = split(body, (character) => character === ";").flatMap(
        (declaration) => {
          const colon = declaration.indexOf(":")
          return colon > 0
            ? [
                [
                  declaration.slice(0, colon).trim().toLowerCase(),
                  declaration.slice(colon + 1).trim(),
                ] as [string, string],
              ]
            : []
        },
      )
      const values = Object.fromEntries(properties)
      // Keep the original cascade, including differently named breakpoint/variant
      // classes. Nest under one zero-specificity slide scope instead of repeating
      // that long scope for every selector. Each :is() contains ONE selector so
      // grouped selectors retain their individual specificity.
      if (widths) {
        if (values.width) {
          const width = values.width.replace(/^min-content(?=\s*!important|$)/, "auto")
          const scoped = allSelectors
            .filter((selector) => !selector.includes("::"))
            .map((selector) => `&:is(${selector})`)
          if (scoped.length) {
            needsWidthFix ||= width !== values.width
            output += `${scoped.join(",")}{width:${width};}`
          }
        }
        continue
      }
      if (selectors.length) {
        for (const [property, value] of properties) {
          declarations += variables(
            property,
            property === "width" && isFillWidth(value, values.flex, values["flex-grow"])
              ? "100cqw" + (/!important/i.test(value) ? " !important" : "")
              : value,
          )
          declarations += viewportLayoutVariables(property, value)
        }
        if (declarations) output += `${selectors.join(",")}{${declarations}}`
      }
      if (slideClasses.size) {
        const matchedSlides = allSelectors.filter((selector) =>
          matchesClasses(selector, slideClasses),
        )
        if (matchedSlides.length) {
          const slideDecls = slideWidthVariables(values, properties)
          if (slideDecls) output += `${matchedSlides.join(",")}{${slideDecls}}`
        }
      }
      if (firstSlideClasses.size) {
        const matchedFirst = allSelectors.some((selector) =>
          matchesClasses(selector, firstSlideClasses),
        )
        if (matchedFirst) {
          const firstDecls = firstSlideViewportVariables(values, properties)
          if (firstDecls) output += `${root}{${firstDecls}}`
        }
      }
    }
    return output
  }
  const widthCSS = visit(text, true)
  const authoredCSS = visit(text, false)
  return ((needsWidthFix ? `:where(${slideSubjects}){${widthCSS}}` : "") + authoredCSS).replace(
    /</g,
    "\\3c ",
  )
}
