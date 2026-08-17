import type { EmblaCarouselType } from "embla-carousel"
import { beforeEach, describe, expect, it } from "vitest"

import { useEmblaStore } from "../src/embla/store.js"

beforeEach(() => {
  useEmblaStore.setState({
    configs: new Map(),
    emblaInstances: new Map(),
    thumbnailConnections: new Map(),
  })
})

describe("useEmblaStore", () => {
  it("registers and removes carousel configuration", () => {
    const config = { options: { loop: true } }

    useEmblaStore.getState().addConfig("Featured", config)

    expect(useEmblaStore.getState().getConfig("Featured")).toBe(config)

    useEmblaStore.getState().removeConfig("Featured")

    expect(useEmblaStore.getState().getConfig("Featured")).toBeUndefined()
  })

  it("does not let stale configuration cleanup remove a replacement", () => {
    const previous = { options: { loop: false } }
    const replacement = { options: { loop: true } }

    useEmblaStore.getState().addConfig("Featured", previous)
    useEmblaStore.getState().addConfig("Featured", replacement)
    useEmblaStore.getState().removeConfig("Featured", previous)

    expect(useEmblaStore.getState().getConfig("Featured")).toBe(replacement)
  })

  it("registers and removes Embla API instances", () => {
    const instance = {} as EmblaCarouselType

    useEmblaStore.getState().addEmblaInstance("Featured", instance)

    expect(useEmblaStore.getState().getInstance("Featured")).toBe(instance)

    useEmblaStore.getState().removeEmblaInstance("Featured")

    expect(useEmblaStore.getState().getInstance("Featured")).toBeUndefined()
  })

  it("does not let stale instance cleanup remove a replacement", () => {
    const previous = {} as EmblaCarouselType
    const replacement = {} as EmblaCarouselType

    useEmblaStore.getState().addEmblaInstance("Featured", previous)
    useEmblaStore.getState().addEmblaInstance("Featured", replacement)
    useEmblaStore.getState().removeEmblaInstance("Featured", previous)

    expect(useEmblaStore.getState().getInstance("Featured")).toBe(replacement)
  })

  it("registers thumbnail-to-main relationships with safe cleanup", () => {
    const store = useEmblaStore.getState()

    store.addThumbnailConnection("Thumbs", "Main")
    expect(useEmblaStore.getState().getConnectedMainId("Thumbs")).toBe(
      "Main",
    )

    store.addThumbnailConnection("Thumbs", "Replacement")
    store.removeThumbnailConnection("Thumbs", "Main")
    expect(useEmblaStore.getState().getConnectedMainId("Thumbs")).toBe(
      "Replacement",
    )

    store.removeThumbnailConnection("Thumbs", "Replacement")
    expect(
      useEmblaStore.getState().getConnectedMainId("Thumbs"),
    ).toBeUndefined()
  })
})
