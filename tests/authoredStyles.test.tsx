import { describe, expect, it, vi } from "vitest"
vi.mock("framer", () => ({}))
import { authoredVariableCSS, inlineAuthoredVariables } from "../src/scroll-snap/authoredStyles.js"

describe("authored carousel styles", () => {
  it("preserves breakpoints, variants, selector order and shorthand/longhand precedence", () => {
    const css = authoredVariableCSS(`
      .page .viewport { padding:40px 96px 40px 32px; gap:12px 24px; max-width:1000px }
      .viewport .child { padding:999px }
      .unrelated { padding:999px }
      @media (max-width:809.98px) { .page .viewport { padding-right:50px; gap:8px } }
      @supports (display:grid) { .page.variant .viewport { padding-left:calc(2px + 3vw) !important } }
    `, "viewport")
    expect(css).toContain("--kniff-authored-padding-right:96px")
    expect(authoredVariableCSS(".viewport{padding:0}", "viewport")).toContain("--kniff-authored-padding-left:0px")
    expect(css).toContain("--kniff-authored-padding-left:32px")
    expect(css).toContain("--kniff-authored-row-gap:12px;--kniff-authored-column-gap:24px")
    expect(css).toContain("@media (max-width:809.98px){.page .viewport{--kniff-authored-padding-right:50px;")
    expect(css).toContain("--kniff-authored-padding-left:calc(2px + 3vw) !important")
    expect(css).not.toContain("999")
    expect(css).toContain("--kniff-authored-max-width:1000px")
  })
  it("mirrors inline padding and gap with React's unit conversion", () => {
    expect(inlineAuthoredVariables({ padding: "20px 30px", paddingLeft: 12, gap: 16 })).toEqual({
      "--kniff-authored-padding-top":"20px", "--kniff-authored-padding-right":"30px",
      "--kniff-authored-padding-bottom":"20px", "--kniff-authored-padding-left":"12px",
      "--kniff-authored-row-gap":"16px", "--kniff-authored-column-gap":"16px",
    })
  })
  it("resolves authored percentage max-width against the sizing frame", () => {
    expect(authoredVariableCSS(".viewport{max-width:calc(100% - 40px)}", "viewport")).toContain("--kniff-authored-max-width:calc(100cqw - 40px)")
    expect(inlineAuthoredVariables({width:"70%",maxWidth: 1000})).toEqual({"--kniff-authored-width":"70cqw","--kniff-authored-max-width":"1000px"})
    expect(authoredVariableCSS(".viewport{max-width:none}", "viewport")).toContain("--kniff-authored-max-width:100cqw")
  })

})
