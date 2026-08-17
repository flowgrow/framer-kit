import type { EmblaCarouselType } from "embla-carousel"
import {
  Children,
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useState,
  type ReactElement,
  type ReactNode,
} from "react"

export interface CarouselPaginationState {
  selectedIndex: number
  scrollSnaps: number[]
  scrollTo: (index: number) => void
}

/** Keeps accessory components synchronized with one registered carousel. */
export function useCarouselPagination(
  emblaApi: EmblaCarouselType | undefined,
): CarouselPaginationState {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [scrollSnaps, setScrollSnaps] = useState<number[]>([])

  const scrollTo = useCallback(
    (index: number) => emblaApi?.scrollTo(index),
    [emblaApi],
  )

  useEffect(() => {
    if (!emblaApi) {
      setSelectedIndex(0)
      setScrollSnaps([])
      return
    }

    const update = (api: EmblaCarouselType) => {
      setSelectedIndex(api.selectedScrollSnap())
      setScrollSnaps(api.scrollSnapList())
    }

    update(emblaApi)
    emblaApi.on("reInit", update)
    emblaApi.on("select", update)

    return () => {
      emblaApi.off("reInit", update)
      emblaApi.off("select", update)
    }
  }, [emblaApi])

  return { selectedIndex, scrollSnaps, scrollTo }
}

export function getCarouselPageCount(
  emblaApi: EmblaCarouselType | undefined,
  scrollSnaps: number[],
): number {
  const value = emblaApi?.containerNode().dataset.pageCount
  const pageCount = Number.parseInt(value ?? "", 10)
  return Number.isFinite(pageCount) && pageCount >= 0
    ? pageCount
    : scrollSnaps.length
}

/** Matches the existing Framer slot behavior by replacing its deepest text. */
export function cloneWithInnermostText(
  node: ReactNode,
  newText: ReactNode,
): ReactNode {
  if (!isValidElement(node)) return node

  const element = node as ReactElement<{ children?: ReactNode }>
  const children = element.props.children
  if (children == null) return element

  if (typeof children === "string" || typeof children === "number") {
    return cloneElement(element, undefined, newText)
  }

  const childArray = Children.toArray(children)
  let targetIndex = -1
  for (let index = childArray.length - 1; index >= 0; index -= 1) {
    if (isValidElement(childArray[index])) {
      targetIndex = index
      break
    }
  }

  if (targetIndex < 0) return element

  return cloneElement(
    element,
    undefined,
    childArray.map((child, index) =>
      index === targetIndex
        ? cloneWithInnermostText(child, newText)
        : child,
    ),
  )
}

export function getSlotElement(slot: ReactNode[] | undefined) {
  const element = slot?.[0]
  return isValidElement(element) ? element : undefined
}

/** Applies the same reset-or-stop behavior as Embla's control examples. */
export function pauseAutoplayForInteraction(
  emblaApi: EmblaCarouselType | undefined,
): void {
  if (!emblaApi) return

  const plugins = emblaApi.plugins() as Record<
    string,
    {
      options?: { stopOnInteraction?: boolean }
      reset?: () => void
      stop?: () => void
    }
  >
  const autoMove = plugins.autoplay ?? plugins.autoScroll
  if (!autoMove) return

  if (autoMove.options?.stopOnInteraction === false) autoMove.reset?.()
  else autoMove.stop?.()
}
