import {
  useCallback,
  useEffect,
  useState,
  type RefCallback,
} from "react"

export interface MeasuredSize {
  width: number
  height: number
}

export interface UseMeasuredSizeResult<T extends HTMLElement> {
  ref: RefCallback<T>
  width: number
  height: number
}

const ZERO_SIZE: MeasuredSize = { width: 0, height: 0 }

/**
 * Measures an element with ResizeObserver while keeping SSR deterministic.
 */
export function useMeasuredSize<
  T extends HTMLElement = HTMLDivElement,
>(): UseMeasuredSizeResult<T> {
  const [element, setElement] = useState<T | null>(null)
  const [size, setSize] = useState<MeasuredSize>(ZERO_SIZE)

  const ref = useCallback<RefCallback<T>>((node) => {
    setElement(node)
  }, [])

  useEffect(() => {
    if (!element) return

    const update = () => {
      const rect = element.getBoundingClientRect()
      const next = { width: rect.width, height: rect.height }

      setSize((previous) =>
        previous.width === next.width && previous.height === next.height
          ? previous
          : next,
      )
    }

    update()

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", update)
      return () => window.removeEventListener("resize", update)
    }

    const observer = new ResizeObserver(update)
    observer.observe(element)

    return () => observer.disconnect()
  }, [element])

  return { ref, ...size }
}

