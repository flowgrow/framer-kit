/**
 * Check for browser APIs at call time so importing the package remains SSR-safe.
 */
export function canUseDOM(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof window.document !== "undefined" &&
    typeof window.document.createElement === "function"
  )
}

