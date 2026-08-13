import { useEffect, useState } from "react"

/**
 * Returns false during SSR and the first client render, then true after mount.
 * Useful for browser-only behavior without causing hydration mismatches.
 */
export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setHydrated(true)
  }, [])

  return hydrated
}

