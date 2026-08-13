import useEmblaCarousel from "embla-carousel-react"
import { useEffect } from "react"

import { useEmblaStore } from "./store.js"

export function useEmblaInstance(id: string | undefined) {
  const setInstance = useEmblaStore((state) => state.addEmblaInstance)
  const removeInstance = useEmblaStore((state) => state.removeEmblaInstance)
  const config = useEmblaStore((state) =>
    id ? state.configs.get(id) : undefined,
  )
  const [viewportRef, emblaApi] = useEmblaCarousel(
    config?.options,
    config?.plugins,
  )

  useEffect(() => {
    if (!id || !emblaApi) return
    setInstance(id, emblaApi)
    return () => removeInstance(id, emblaApi)
  }, [id, emblaApi, setInstance, removeInstance])

  return { config, viewportRef }
}
