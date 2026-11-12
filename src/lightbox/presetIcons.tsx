// Inline icons from Ramka’s default CSS preset.

function IconXImpl() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} aria-hidden>
      <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconZoomInImpl() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} aria-hidden>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3M11 8v6M8 11h6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function IconZoomOutImpl() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} aria-hidden>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3M8 11h6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export const IconX = IconXImpl
export const IconZoomIn = IconZoomInImpl
export const IconZoomOut = IconZoomOutImpl
