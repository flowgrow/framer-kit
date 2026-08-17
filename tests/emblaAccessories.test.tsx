import { createElement, isValidElement, type ReactElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import type { EmblaCarouselType } from "embla-carousel"
import { beforeEach, describe, expect, it, vi } from "vitest"

const { addPropertyControls } = vi.hoisted(() => ({
  addPropertyControls: vi.fn(),
}))

vi.mock("framer", () => ({
  addPropertyControls,
  ControlType: {
    Boolean: "Boolean",
    Color: "Color",
    Enum: "Enum",
    Number: "Number",
    Object: "Object",
    Slot: "Slot",
    String: "String",
  },
  RenderTarget: {
    canvas: "canvas",
    current: () => "canvas",
  },
}))

import {
  EmblaCurrentIndex,
  EmblaDots,
  EmblaNavigationButton,
  EmblaProgressBar,
  EmblaTotalSlides,
  ThumbnailConnection,
  registerEmblaCurrentIndexPropertyControls,
  registerEmblaDotsPropertyControls,
  registerEmblaNavigationButtonPropertyControls,
  registerEmblaProgressBarPropertyControls,
  registerEmblaTotalSlidesPropertyControls,
  registerThumbnailConnectionPropertyControls,
} from "../src/embla/index.js"
import { cloneWithInnermostText } from "../src/embla/accessoryUtils.js"
import { scrollToClickedSlide } from "../src/embla/interaction.js"
import { useEmblaStore } from "../src/embla/store.js"
import {
  connectThumbnailCarousels,
  getSlideForThumbnailSnap,
  getThumbnailSnapForSlide,
} from "../src/embla/ThumbnailConnection.js"

describe("Embla accessory components", () => {
  beforeEach(() => {
    addPropertyControls.mockClear()
    useEmblaStore.setState({
      configs: new Map(),
      emblaInstances: new Map(),
      thumbnailConnections: new Map(),
    })
  })

  it("gives dots, counters, and progress a useful Canvas preview", () => {
    const dots = renderToStaticMarkup(createElement(EmblaDots))
    const current = renderToStaticMarkup(createElement(EmblaCurrentIndex))
    const total = renderToStaticMarkup(createElement(EmblaTotalSlides))
    const progress = renderToStaticMarkup(createElement(EmblaProgressBar))

    expect(dots.match(/<button/g)).toHaveLength(4)
    expect(current).toContain(">1</div>")
    expect(total).toContain(">4</div>")
    expect(progress).toContain('value="0.25"')
    expect(current).toContain("align-items:center")
    expect(dots).toContain("justify-content:center")
    expect(dots).toContain("flex:0 0 auto")
  })

  it("preserves a connected slot while replacing its innermost text", () => {
    const slot = createElement(
      "div",
      { className: "counter" },
      createElement("span", null, "Slide ", createElement("b", null, "0")),
    )

    expect(renderToStaticMarkup(cloneWithInnermostText(slot, 7))).toBe(
      '<div class="counter"><span>Slide <b>7</b></span></div>',
    )

    expect(
      renderToStaticMarkup(
        createElement(EmblaCurrentIndex, { componentSlot: slot }),
      ),
    ).toBe('<div class="counter"><span>Slide <b>1</b></span></div>')

    const singleChildSlot = createElement(
      "div",
      null,
      createElement("span", null, "Text"),
    )
    const clonedSingleChild = cloneWithInnermostText(
      singleChildSlot,
      "3",
    ) as ReactElement<{ children?: unknown }>
    expect(isValidElement(clonedSingleChild.props.children)).toBe(true)
    expect(renderToStaticMarkup(clonedSingleChild)).toBe(
      "<div><span>3</span></div>",
    )
  })

  it("routes thumbnail clicks to a connected main carousel", () => {
    const firstSlide = {} as HTMLElement
    const secondSlide = {} as HTMLElement
    const sourceScrollTo = vi.fn()
    const mainScrollTo = vi.fn()
    const sourceApi = {
      slideNodes: () => [firstSlide, secondSlide],
      scrollTo: sourceScrollTo,
    } as unknown as EmblaCarouselType
    const mainApi = {
      scrollTo: mainScrollTo,
    } as unknown as EmblaCarouselType
    const click = {
      defaultPrevented: false,
      composedPath: () => [{}, secondSlide],
    } as Pick<MouseEvent, "composedPath" | "defaultPrevented">

    scrollToClickedSlide(click, sourceApi, mainApi)

    expect(mainScrollTo).toHaveBeenCalledWith(1)
    expect(sourceScrollTo).not.toHaveBeenCalled()

    scrollToClickedSlide(click, sourceApi)
    expect(sourceScrollTo).toHaveBeenCalledWith(1)
  })

  it("maps contained thumbnail snap groups to their edge slides", () => {
    const thumbsApi = {
      internalEngine: () => ({
        slideRegistry: [[0, 1], [2], [3, 4]],
      }),
    } as unknown as EmblaCarouselType

    expect(getThumbnailSnapForSlide(thumbsApi, 1)).toBe(0)
    expect(getThumbnailSnapForSlide(thumbsApi, 4)).toBe(2)
    expect(getSlideForThumbnailSnap(thumbsApi, 0)).toBe(0)
    expect(getSlideForThumbnailSnap(thumbsApi, 1)).toBe(2)
    expect(getSlideForThumbnailSnap(thumbsApi, 2)).toBe(4)
  })

  it("forwards thumbnail interaction to the main autoplay plugin", () => {
    const mainListeners = new Map<string, () => void>()
    const thumbnailListeners = new Map<string, () => void>()
    const stop = vi.fn()
    const mainApi = {
      selectedScrollSnap: () => 0,
      scrollTo: vi.fn(),
      plugins: () => ({
        autoplay: {
          options: { stopOnInteraction: true },
          stop,
        },
      }),
      on: vi.fn((event: string, listener: () => void) => {
        mainListeners.set(event, listener)
      }),
      off: vi.fn((event: string) => {
        mainListeners.delete(event)
      }),
    } as unknown as EmblaCarouselType
    const thumbsApi = {
      selectedScrollSnap: () => 0,
      scrollTo: vi.fn(),
      internalEngine: () => ({ slideRegistry: [[0], [1]] }),
      on: vi.fn((event: string, listener: () => void) => {
        thumbnailListeners.set(event, listener)
      }),
      off: vi.fn((event: string) => {
        thumbnailListeners.delete(event)
      }),
    } as unknown as EmblaCarouselType

    const disconnect = connectThumbnailCarousels(mainApi, thumbsApi)
    thumbnailListeners.get("pointerDown")?.()

    expect(stop).toHaveBeenCalledOnce()

    disconnect()
    expect(thumbnailListeners.has("pointerDown")).toBe(false)
  })

  it("can keep thumbnail scrolling from selecting the main carousel", () => {
    const thumbnailListeners = new Map<string, () => void>()
    const mainApi = {
      selectedScrollSnap: () => 0,
      scrollTo: vi.fn(),
      plugins: () => ({}),
      on: vi.fn(),
      off: vi.fn(),
    } as unknown as EmblaCarouselType
    const thumbsApi = {
      selectedScrollSnap: () => 0,
      scrollTo: vi.fn(),
      internalEngine: () => ({ slideRegistry: [[0], [1]] }),
      on: vi.fn((event: string, listener: () => void) => {
        thumbnailListeners.set(event, listener)
      }),
      off: vi.fn((event: string) => {
        thumbnailListeners.delete(event)
      }),
    } as unknown as EmblaCarouselType

    const disconnect = connectThumbnailCarousels(mainApi, thumbsApi, {
      syncMainOnThumbnailScroll: false,
    })

    expect(thumbnailListeners.has("select")).toBe(false)
    expect(thumbnailListeners.has("pointerDown")).toBe(true)

    disconnect()
    expect(thumbnailListeners.has("pointerDown")).toBe(false)
  })

  it("renders navigation and controls connector Canvas instructions", () => {
    expect(
      renderToStaticMarkup(createElement(EmblaNavigationButton)),
    ).toContain("Next")
    expect(
      renderToStaticMarkup(createElement(ThumbnailConnection)),
    ).toContain("Thumbnail Connection")
    expect(
      renderToStaticMarkup(
        createElement(ThumbnailConnection, { showInstructions: false }),
      ),
    ).toContain("visibility:hidden")
    expect(
      renderToStaticMarkup(
        createElement(ThumbnailConnection, { showInstructions: false }),
      ),
    ).not.toContain("Thumbnail Connection")
  })

  it("registers each Framer component explicitly and idempotently", () => {
    const register = [
      registerEmblaNavigationButtonPropertyControls,
      registerEmblaCurrentIndexPropertyControls,
      registerEmblaTotalSlidesPropertyControls,
      registerEmblaDotsPropertyControls,
      registerEmblaProgressBarPropertyControls,
      registerThumbnailConnectionPropertyControls,
    ]

    register.forEach((callback) => {
      callback()
      callback()
    })

    expect(addPropertyControls).toHaveBeenCalledTimes(register.length)
    expect(addPropertyControls.mock.calls.map(([component]) => component)).toEqual([
      EmblaNavigationButton,
      EmblaCurrentIndex,
      EmblaTotalSlides,
      EmblaDots,
      EmblaProgressBar,
      ThumbnailConnection,
    ])
  })
})
