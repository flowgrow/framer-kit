import { describe, expect, it, vi } from "vitest"

import {
  attachEmblaApiToElement,
  getClosestEmblaApi,
} from "../src/embla/domBridge.js"

describe("Embla DOM bridge", () => {
  it("shares an API with separately bundled integrations", () => {
    const viewport = { parentElement: null } as unknown as HTMLElement
    const slide = {
      parentElement: viewport,
    } as unknown as HTMLElement
    const api = { scrollTo: vi.fn() } as never

    const detach = attachEmblaApiToElement(viewport, api)
    expect(getClosestEmblaApi(slide)).toBe(api)

    detach()
    expect(getClosestEmblaApi(slide)).toBeUndefined()
  })
})
