import {
  addPropertyControls,
  ControlType,
  type PropertyControls,
} from "framer"
import {
  cloneElement,
  useCallback,
  useEffect,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react"

import {
  getSlotElement,
  pauseAutoplayForInteraction,
} from "./accessoryUtils.js"
import { useEmblaStore } from "./store.js"

export interface EmblaNavigationButtonProps {
  carouselID?: string
  action?: "Prev" | "Next"
  componentSlot?: ReactNode[]
  inactiveOpacity?: number
  style?: CSSProperties
}

export const emblaNavigationButtonDefaults = {
  carouselID: "kniff-carousel-1",
  action: "Next",
  inactiveOpacity: 0.5,
} as const

/** A Framer slot-backed previous or next button for a registered carousel. */
export function EmblaNavigationButton(props: EmblaNavigationButtonProps) {
  const settings = { ...emblaNavigationButtonDefaults, ...props }
  const { carouselID, action, componentSlot, inactiveOpacity, style } = settings
  const component = getSlotElement(componentSlot)
  const emblaApi = useEmblaStore((state) =>
    carouselID ? state.emblaInstances.get(carouselID) : undefined,
  )
  const [isDisabled, setIsDisabled] = useState(false)

  const updateDisabled = useCallback(() => {
    if (!emblaApi) {
      setIsDisabled(false)
      return
    }
    setIsDisabled(
      action === "Next"
        ? !emblaApi.canScrollNext()
        : !emblaApi.canScrollPrev(),
    )
  }, [emblaApi, action])

  useEffect(() => {
    updateDisabled()
    if (!emblaApi) return

    emblaApi.on("reInit", updateDisabled)
    emblaApi.on("select", updateDisabled)
    return () => {
      emblaApi.off("reInit", updateDisabled)
      emblaApi.off("select", updateDisabled)
    }
  }, [emblaApi, updateDisabled])

  const activate = () => {
    if (!emblaApi || isDisabled) return
    pauseAutoplayForInteraction(emblaApi)
    if (action === "Next") emblaApi.scrollNext()
    else emblaApi.scrollPrev()
  }

  return (
    <button
      aria-label={action === "Next" ? "Next slide" : "Previous slide"}
      disabled={isDisabled}
      onClick={activate}
      style={{
        ...style,
        appearance: "none",
        width: "100%",
        height: "100%",
        padding: component ? 0 : "8px 16px",
        border: component ? "none" : "1px solid RebeccaPurple",
        background: component ? "transparent" : "lavender",
        color: component ? undefined : "RebeccaPurple",
        cursor: isDisabled ? "not-allowed" : "pointer",
        opacity: isDisabled ? inactiveOpacity : undefined,
        userSelect: "none",
      }}
      type="button"
    >
      {component
        ? cloneElement(component, {
            ...component.props,
            tabIndex: -1,
            style: {
              ...(component.props as { style?: CSSProperties }).style,
              maxWidth: "100%",
              maxHeight: "100%",
            },
          } as never)
        : action}
    </button>
  )
}

EmblaNavigationButton.defaultProps = emblaNavigationButtonDefaults
EmblaNavigationButton.displayName = "Embla Navigation Button"

export const emblaNavigationButtonPropertyControls = {
  carouselID: {
    title: "ID",
    type: ControlType.String,
    defaultValue: emblaNavigationButtonDefaults.carouselID,
    description: "Use the same ID as the Carousel instance to control",
  },
  action: {
    type: ControlType.Enum,
    options: ["Prev", "Next"],
    defaultValue: emblaNavigationButtonDefaults.action,
  },
  componentSlot: {
    title: "Connect",
    type: ControlType.Slot,
    maxCount: 1,
  },
  inactiveOpacity: {
    type: ControlType.Number,
    defaultValue: emblaNavigationButtonDefaults.inactiveOpacity,
    min: 0,
    max: 1,
    step: 0.01,
  },
} satisfies PropertyControls<EmblaNavigationButtonProps>

let propertyControlsRegistered = false

export function registerEmblaNavigationButtonPropertyControls(): void {
  if (propertyControlsRegistered) return
  addPropertyControls(
    EmblaNavigationButton,
    emblaNavigationButtonPropertyControls,
  )
  propertyControlsRegistered = true
}
