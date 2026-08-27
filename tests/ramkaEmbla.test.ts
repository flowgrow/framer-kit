import { describe, expect, it } from "vitest"

import {
  getEmblaSlideIndex,
  resolveEmblaSlideIndex,
} from "../src/ramka/embla.js"

describe("Ramka Embla indexing", () => {
  it("uses Embla's logical slide-node order", () => {
    const trigger = {} as HTMLElement
    const slides = [
      { contains: () => false },
      { contains: (element: HTMLElement) => element === trigger },
      { contains: () => false },
    ] as HTMLElement[]
    const api = { slideNodes: () => slides }

    expect(getEmblaSlideIndex(api as never, trigger)).toBe(1)
  })

  it("resolves the slide before the DOM bridge is attached", () => {
    const trigger = {
      parentElement: null,
      closest: () => viewport,
    } as unknown as HTMLElement
    const slides = [
      { contains: () => false },
      { contains: () => false },
      { contains: (element: HTMLElement) => element === trigger },
    ]
    const container = { children: slides }
    const viewport = { firstElementChild: container }

    expect(resolveEmblaSlideIndex(trigger)).toBe(2)
  })
})
