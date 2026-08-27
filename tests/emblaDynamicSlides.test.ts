import type { EmblaCarouselType } from "embla-carousel"
import { describe, expect, it, vi } from "vitest"

import {
  createContinuousSlidesOptions,
  createContinuousSlidesWatch,
  NON_EMPTY_SLIDES_SELECTOR,
} from "../src/embla/dynamicSlides.js"

function createEmblaMock(initiallySettled: boolean) {
  let settled = initiallySettled
  let scrollOffset = 0
  let pointerDown = false
  const container = {
    children: [] as HTMLElement[],
    querySelectorAll: () => [] as HTMLElement[],
  }
  const listeners = new Map<string, Set<() => void>>()
  const emit = vi.fn((event: string) => {
    for (const listener of listeners.get(event) ?? []) listener()
    return api
  })
  const reInit = vi.fn(() => {
    emit("reInit")
  })
  const api = {
    emit,
    internalEngine: () => ({
      dragHandler: { pointerDown: () => pointerDown },
      offsetLocation: { get: () => scrollOffset },
      scrollBody: { settled: () => settled },
    }),
    containerNode: () => container as unknown as HTMLElement,
    off: vi.fn((event: string, listener: () => void) => {
      listeners.get(event)?.delete(listener)
      return api
    }),
    on: vi.fn((event: string, listener: () => void) => {
      const eventListeners = listeners.get(event) ?? new Set()
      eventListeners.add(listener)
      listeners.set(event, eventListeners)
      return api
    }),
    reInit,
    rootNode: () =>
      ({
        ownerDocument: {
          defaultView: null,
        },
      }) as unknown as HTMLElement,
  } as unknown as EmblaCarouselType

  return {
    api,
    emitEvent: (event: string) => emit(event),
    reInit,
    setScrollOffset: (value: number) => {
      scrollOffset = value
    },
    setPointerDown: (value: boolean) => {
      pointerDown = value
    },
    setSettled: (value: boolean) => {
      settled = value
    },
  }
}

describe("continuous dynamic slides", () => {
  it("keeps explicitly disabled slide observation unchanged", () => {
    const options = { watchSlides: false as const }
    expect(createContinuousSlidesOptions(options)).toBe(options)
  })

  it("filters empty CMS wrappers while preserving explicit slide selectors", () => {
    expect(createContinuousSlidesOptions()).toMatchObject({
      slides: NON_EMPTY_SLIDES_SELECTOR,
    })
    expect(
      createContinuousSlidesOptions({ slides: ".custom-slide" }),
    ).toMatchObject({ slides: ".custom-slide" })
    expect(
      createContinuousSlidesOptions({ slides: null }),
    ).toMatchObject({ slides: null })
  })

  it("reinitializes immediately when the carousel is already settled", () => {
    const { api, reInit } = createEmblaMock(true)
    const watchSlides = createContinuousSlidesWatch()

    expect(watchSlides(api, [])).toBe(false)
    expect(reInit).toHaveBeenCalledTimes(1)
    expect(api.emit).toHaveBeenCalledWith("slidesChanged")
  })

  it("refreshes on the first scroll event with a sub-pixel delta", () => {
    const { api, emitEvent, reInit, setScrollOffset } =
      createEmblaMock(false)
    const watchSlides = createContinuousSlidesWatch()

    watchSlides(api, [])
    setScrollOffset(100)
    emitEvent("scroll")
    expect(reInit).not.toHaveBeenCalled()

    setScrollOffset(100.5)
    emitEvent("scroll")

    expect(reInit).toHaveBeenCalledTimes(1)
    expect(api.emit).toHaveBeenCalledWith("slidesChanged")
  })

  it("does not refresh while the user is still dragging", () => {
    const {
      api,
      emitEvent,
      reInit,
      setScrollOffset,
      setPointerDown,
    } = createEmblaMock(false)
    const watchSlides = createContinuousSlidesWatch()

    setPointerDown(true)
    watchSlides(api, [])
    setScrollOffset(100)
    emitEvent("scroll")
    expect(reInit).not.toHaveBeenCalled()

    setPointerDown(false)
    setScrollOffset(100.5)
    emitEvent("scroll")
    expect(reInit).toHaveBeenCalledTimes(1)
  })

  it("coalesces mutations and waits for a sub-pixel scroll delta", () => {
    const { api, emitEvent, reInit, setScrollOffset } =
      createEmblaMock(false)
    const watchSlides = createContinuousSlidesWatch()

    watchSlides(api, [])
    watchSlides(api, [])
    expect(reInit).not.toHaveBeenCalled()

    setScrollOffset(50)
    emitEvent("scroll")
    expect(reInit).not.toHaveBeenCalled()

    setScrollOffset(50.25)
    emitEvent("scroll")

    expect(reInit).toHaveBeenCalledTimes(1)
    expect(api.emit).toHaveBeenCalledWith("slidesChanged")
  })

  it("recognizes an external reInit as the pending slide refresh", () => {
    const { api, emitEvent, reInit } = createEmblaMock(false)
    const watchSlides = createContinuousSlidesWatch()

    watchSlides(api, [])
    emitEvent("reInit")

    expect(reInit).not.toHaveBeenCalled()
    expect(api.emit).toHaveBeenCalledWith("slidesChanged")
  })
})
