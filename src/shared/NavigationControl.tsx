import { forwardRef, type CSSProperties, type ReactNode } from "react"

interface NavigationControlProps {
  hasSlot: boolean
  label: string
  disabled: boolean
  onActivate: () => void
  style: CSSProperties
  children: ReactNode
}

/** A connected slot owns focus; the wrapper only routes activation. */
export const NavigationControl = forwardRef<HTMLElement, NavigationControlProps>(
  function NavigationControl({ hasSlot, label, disabled, onActivate, style, children }, ref) {
    const activate = () => { if (!disabled) onActivate() }
    if (!hasSlot) {
      return <button ref={ref as React.Ref<HTMLButtonElement>} type="button" aria-label={label}
        disabled={disabled} onClick={activate} style={style}>{children}</button>
    }
    return <div ref={ref as React.Ref<HTMLDivElement>} role="button" aria-label={label}
      aria-disabled={disabled} style={style}
      onClickCapture={event => {
        if (disabled) { event.preventDefault(); event.stopPropagation() }
      }}
      onClick={activate}
      onKeyDownCapture={event => {
        if (event.key !== "Enter" && event.key !== " ") return
        event.preventDefault()
        event.stopPropagation()
        if (event.key === "Enter" && !event.repeat) activate()
      }}
      onKeyUpCapture={event => {
        if (event.key !== " ") return
        event.preventDefault()
        event.stopPropagation()
        activate()
      }}>{children}</div>
  },
)
