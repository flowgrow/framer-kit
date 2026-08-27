import type { RamkaMediaItem } from "./types.js"

function positiveNumber(value: number): number | undefined {
  return Number.isFinite(value) && value > 0 ? value : undefined
}

function parseBackgroundImage(value: string): string | undefined {
  const match = value.match(/^url\(["']?(.*?)["']?\)$/)
  return match?.[1]
}

function findBackgroundMedia(
  root: HTMLElement,
): { element: HTMLElement; src: string } | undefined {
  if (typeof window === "undefined") return undefined
  const candidates = [root, ...root.querySelectorAll<HTMLElement>("*")]

  for (const element of candidates) {
    const src = parseBackgroundImage(
      window.getComputedStyle(element).backgroundImage,
    )
    if (src) return { element, src }
  }

  return undefined
}

/** Reads the media represented by an existing Framer image/card layer. */
export function extractRamkaMedia(
  id: string,
  index: number,
  element: HTMLElement,
): RamkaMediaItem | undefined {
  const image =
    element instanceof HTMLImageElement
      ? element
      : element.querySelector<HTMLImageElement>("img")

  if (image) {
    const src = image.currentSrc || image.src
    if (!src) return undefined
    const width = positiveNumber(image.naturalWidth || image.width)
    const height = positiveNumber(image.naturalHeight || image.height)

    return {
      id,
      index,
      element,
      morphElement: image,
      imageElement: image,
      src,
      ...(image.srcset ? { srcSet: image.srcset } : {}),
      ...(image.sizes ? { sizes: image.sizes } : {}),
      alt:
        image.alt || element.getAttribute("aria-label")?.trim() || "",
      ...(width !== undefined ? { width } : {}),
      ...(height !== undefined ? { height } : {}),
    }
  }

  const background = findBackgroundMedia(element)
  if (!background) return undefined
  const width = positiveNumber(background.element.offsetWidth)
  const height = positiveNumber(background.element.offsetHeight)

  return {
    id,
    index,
    element,
    morphElement: background.element,
    imageElement: null,
    src: background.src,
    alt: element.getAttribute("aria-label")?.trim() || "",
    ...(width !== undefined ? { width } : {}),
    ...(height !== undefined ? { height } : {}),
  }
}

function compareDocumentOrder(
  first: RamkaMediaItem,
  second: RamkaMediaItem,
): number {
  if (first.index !== second.index) return first.index - second.index
  if (first.element === second.element) return 0
  const position = first.element.compareDocumentPosition(second.element)
  if (position & 4) return -1
  if (position & 2) return 1
  return 0
}

export function sortRamkaMedia(
  items: readonly RamkaMediaItem[],
): RamkaMediaItem[] {
  return [...items].sort(compareDocumentOrder)
}

export function isSameRamkaMedia(
  first: RamkaMediaItem,
  second: RamkaMediaItem,
): boolean {
  return (
    first.element === second.element &&
    first.index === second.index &&
    first.morphElement === second.morphElement &&
    first.imageElement === second.imageElement &&
    first.src === second.src &&
    first.srcSet === second.srcSet &&
    first.sizes === second.sizes &&
    first.alt === second.alt &&
    first.width === second.width &&
    first.height === second.height
  )
}
