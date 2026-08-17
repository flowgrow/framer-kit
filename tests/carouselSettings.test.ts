import { beforeEach, describe, expect, it, vi } from "vitest"

const { addPropertyControls } = vi.hoisted(() => ({
  addPropertyControls: vi.fn(),
}))

vi.mock("framer", () => ({
  addPropertyControls,
  ControlType: {
    Boolean: "Boolean",
    Enum: "Enum",
    Number: "Number",
    String: "String",
  },
  RenderTarget: {
    canvas: "canvas",
    current: () => "preview",
  },
}))

import {
  CarouselSettings,
  type CarouselSettingsProps,
  carouselSettingsDefaults,
  carouselSettingsPropertyControls,
  createCarouselOptions,
  createCarouselPlugins,
  registerCarouselSettingsPropertyControls,
} from "../src/embla/CarouselSettings.js"

function createSettings(
  overrides: Partial<CarouselSettingsProps> = {},
): CarouselSettingsProps {
  return { ...carouselSettingsDefaults, ...overrides }
}

describe("Carousel Settings", () => {
  beforeEach(() => addPropertyControls.mockClear())

  it("maps its full control surface to Embla options", () => {
    expect(
      createCarouselOptions(
        createSettings({
          loop: true,
          justify: "end",
          startIndex: 2,
          draggable: false,
          containEdges: false,
          slidesToScroll: -1,
        }),
      ),
    ).toEqual({
      loop: true,
      skipSnaps: true,
      align: "end",
      startIndex: 2,
      watchDrag: false,
      containScroll: false,
      slidesToScroll: "auto",
    })
  })

  it("bundles continuous scrolling, wheel, height, and fade plugins", () => {
    const plugins = createCarouselPlugins(
      createSettings({
        autoMove: "scroll",
        autoMoveSpeed: 0.8,
        autoMoveStopOnInteraction: true,
        autoHeight: true,
        slideEffect: "fade",
        wheelGestures: true,
      }),
    )

    expect(plugins.map((plugin) => plugin.name)).toEqual([
      "wheelGestures",
      "autoScroll",
      "autoHeight",
      "fade",
    ])
    expect(plugins[1]?.options).toMatchObject({
      speed: 0.8,
      stopOnInteraction: true,
    })
  })

  it("maps per-slide timing and stop-on-last to current Autoplay options", () => {
    const [autoplay] = createCarouselPlugins(
      createSettings({
        autoMove: "perSlide",
        autoMoveDelay: 3.5,
        autoMoveStopOnLastSlide: true,
      }),
    )

    expect(autoplay?.name).toBe("autoplay")
    expect(autoplay?.options).toMatchObject({
      delay: 3500,
      stopOnLastSnap: true,
    })
  })

  it("registers Framer property controls explicitly and only once", () => {
    registerCarouselSettingsPropertyControls()
    registerCarouselSettingsPropertyControls()

    expect(addPropertyControls).toHaveBeenCalledTimes(1)
    expect(addPropertyControls).toHaveBeenCalledWith(
      CarouselSettings,
      expect.objectContaining({
        carouselID: expect.any(Object),
        slideEffect: expect.any(Object),
        selectOnSlideClick: expect.objectContaining({
          title: "Click to Select",
          defaultValue: false,
        }),
        containEdges: expect.objectContaining({
          title: "Contain Edges",
          defaultValue: true,
        }),
        autoMove: expect.any(Object),
        wheelGestures: expect.any(Object),
      }),
    )
    expect(carouselSettingsPropertyControls).not.toHaveProperty("overflow")
  })
})
