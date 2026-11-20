import { describe, expect, it, vi } from "vitest"
vi.mock("framer", () => ({}))
import { authoredVariableCSS, inlineAuthoredVariables } from "../src/carousel/authoredStyles.ts"

describe("authored carousel styles", () => {
  it("reads Framer Fill width as the parent width rather than its 1px flex placeholder", () => {
    for (const source of [
      "flex:1 0 0;width:1px",
      "width:1px;flex:1 0 0",
      "flex-grow:1;width:1px",
    ]) {
      expect(authoredVariableCSS(`.viewport{${source}}`, "viewport")).toContain(
        "--kniff-authored-width:100cqw",
      )
    }
    expect(authoredVariableCSS(".viewport{flex:none;width:1px}", "viewport")).toContain(
      "--kniff-authored-width:1px",
    )
    expect(inlineAuthoredVariables({ flex: "1 0 0", width: 1 })).toEqual({
      "--kniff-authored-width": "100cqw",
    })
  })
  it("preserves breakpoints, variants, selector order and shorthand/longhand precedence", () => {
    const css = authoredVariableCSS(
      `
      .page .viewport { padding:40px 96px 40px 32px; gap:12px 24px; max-width:1000px }
      .viewport .child { padding:999px }
      .unrelated { padding:999px }
      @media (max-width:809.98px) { .page .viewport { padding-right:50px; gap:8px } }
      @supports (display:grid) { .page.variant .viewport { padding-left:calc(2px + 3vw) !important } }
    `,
      "viewport",
    )
    expect(css).toContain("--kniff-authored-padding-right:96px")
    expect(authoredVariableCSS(".viewport{padding:0}", "viewport")).toContain(
      "--kniff-authored-padding-left:0px",
    )
    expect(css).toContain("--kniff-authored-padding-left:32px")
    expect(css).not.toContain("--kniff-authored-row-gap")
    expect(css).not.toContain("--kniff-authored-column-gap")
    expect(css).toContain(
      "@media (max-width:809.98px){.page .viewport{--kniff-authored-padding-right:50px;",
    )
    expect(css).toContain("--kniff-authored-padding-left:calc(2px + 3vw) !important")
    expect(css).not.toContain("999")
    expect(css).toContain("--kniff-authored-max-width:1000px")
  })
  it("keeps intrinsic slide widths stable in WebKit without replacing fixed breakpoint widths", () => {
    const css = authoredVariableCSS(
      ".page .slide{width:min-content}@media(max-width:600px){.page .slide{width:240px}}",
      "viewport",
    )
    expect(css).toContain("{width:auto;}")
    expect(css).toContain("{width:240px;}")
    expect(css).toContain(":where(:is(.viewport) > *")
    expect(css).toContain("&:is(.page .slide)")
  })
  it("mirrors only consumed inline padding with React's unit conversion", () => {
    expect(inlineAuthoredVariables({ padding: "20px 30px", paddingLeft: 12, gap: 16 })).toEqual({
      "--kniff-authored-padding-right": "30px",
      "--kniff-authored-padding-left": "12px",
    })
  })
  it("resolves authored percentage max-width against the sizing frame", () => {
    expect(authoredVariableCSS(".viewport{max-width:calc(100% - 40px)}", "viewport")).toContain(
      "--kniff-authored-max-width:calc(100cqw - 40px)",
    )
    expect(inlineAuthoredVariables({ width: "70%", maxWidth: 1000 })).toEqual({
      "--kniff-authored-width": "70cqw",
      "--kniff-authored-max-width": "1000px",
    })
    expect(authoredVariableCSS(".viewport{max-width:none}", "viewport")).toContain(
      "--kniff-authored-max-width:100cqw",
    )
  })
})

describe("compact collector output", () => {
  it("omits the width workaround when no intrinsic width needs correction", () => {
    const css = authoredVariableCSS(
      ".viewport{padding:12px;width:100%}.other{width:240px}",
      "viewport",
    )
    expect(css).not.toContain(":where")
    expect(css).not.toContain(".other")
    expect(css).toContain("--kniff-authored-padding-left:12px")
  })
  it("emits one slide scope and preserves distinct selector specificity and conditional overrides", () => {
    const css = authoredVariableCSS(
      `
      .slide{width:min-content}
      #strong,.alternate{width:280px}
      @media(max-width:600px){.mobile{width:240px !important}}
      @supports(display:grid){.variant{width:300px}}
      .slide::before{width:min-content}
    `,
      "viewport",
    )
    expect(css.match(/:where\(/g)).toHaveLength(1)
    expect(css).toContain("&:is(#strong),&:is(.alternate){width:280px;}")
    expect(css).toContain("@media(max-width:600px){&:is(.mobile){width:240px !important;}}")
    expect(css).toContain("@supports(display:grid){&:is(.variant){width:300px;}}")
    expect(css).not.toContain("::before")
  })
  it("computes SSR slide width variables for aspect-ratio and explicit widths across breakpoints", () => {
    const css = authoredVariableCSS(
      `
      .page .vp{height:600px;padding:0;width:100%;max-width:1000px}
      .page .photo1{aspect-ratio:1.36986;width:auto;height:80%}
      .page .photo2{width:420px;height:100%}
      @media (max-width:809.98px){.page .vp{height:250px}.page .photo2{width:88%}}
    `,
      "vp",
      "photo1 photo2",
    )
    expect(css).toContain("--kniff-vh:600px;")
    expect(css).toContain("--kniff-pt:0px;--kniff-pb:0px;")
    expect(css).not.toMatch(/--kniff-authored-(row-gap|column-gap|padding-top|padding-bottom)/)
    expect(css).toContain("--kniff-ar:1.36986;")
    expect(css).toContain(
      "--kniff-sh:calc((var(--kniff-vh, 0px) - var(--kniff-pt, 0px) - var(--kniff-pb, 0px)) * 0.8);",
    )
    expect(css).toContain("--kniff-slide-width:calc(var(--kniff-sh, 0px) * var(--kniff-ar, 0));")
    expect(css).toContain("--kniff-slide-width:420px;")
    expect(css).toContain("@media (max-width:809.98px){.page .vp{--kniff-vh:250px;}.page .photo2{--kniff-slide-width:88%;}}")
  })
})
