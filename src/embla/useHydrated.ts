import { useEffect, useState } from "react"

/** Waits until mount before enabling browser-only carousel behavior. */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setHydrated(true)
  }, [])

  return hydrated
}
