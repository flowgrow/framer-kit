import { useMemo, type HTMLAttributes, type MouseEvent, type PointerEvent } from "react"

const DRAG_CANCEL_THRESHOLD_PX = 10

type InteractionEvent = PointerEvent<HTMLDivElement> | MouseEvent<HTMLDivElement>

interface InteractionState {
  startX: number
  startY: number
  pointerDownTarget: EventTarget | null
  activePointerId: number | null
  didCancelPointerGesture: boolean
  isDispatchingSyntheticPointerCancel: boolean
}

function getPointerId(event: InteractionEvent): number | null {
  return "pointerId" in event && typeof event.pointerId === "number"
    ? event.pointerId
    : null
}

function createDragClickGuard(): HTMLAttributes<HTMLDivElement> {
  const interaction: InteractionState = {
    startX: 0,
    startY: 0,
    pointerDownTarget: null,
    activePointerId: null,
    didCancelPointerGesture: false,
    isDispatchingSyntheticPointerCancel: false,
  }

  const reset = () => {
    interaction.startX = 0
    interaction.startY = 0
    interaction.pointerDownTarget = null
    interaction.activePointerId = null
    interaction.didCancelPointerGesture = false
  }

  const isPointerMismatch = (event: InteractionEvent) => {
    const pointerId = getPointerId(event)
    return (
      pointerId !== null &&
      interaction.activePointerId !== null &&
      pointerId !== interaction.activePointerId
    )
  }

  const isHorizontalDrag = (event: InteractionEvent) => {
    const deltaX = Math.abs(event.clientX - interaction.startX)
    const deltaY = Math.abs(event.clientY - interaction.startY)
    return deltaX > DRAG_CANCEL_THRESHOLD_PX && deltaX > deltaY
  }

  return {
    onPointerDownCapture(event) {
      interaction.startX = event.clientX
      interaction.startY = event.clientY
      interaction.pointerDownTarget = event.target ?? event.currentTarget
      interaction.activePointerId = getPointerId(event)
      interaction.didCancelPointerGesture = false
    },
    onPointerMoveCapture(event) {
      if (
        interaction.isDispatchingSyntheticPointerCancel ||
        interaction.didCancelPointerGesture ||
        isPointerMismatch(event) ||
        !isHorizontalDrag(event)
      ) {
        return
      }

      interaction.didCancelPointerGesture = true
      const dispatchTarget =
        interaction.pointerDownTarget ?? event.currentTarget ?? event.target

      if (
        typeof window === "undefined" ||
        typeof globalThis.PointerEvent === "undefined" ||
        !dispatchTarget
      ) {
        return
      }

      try {
        interaction.isDispatchingSyntheticPointerCancel = true
        dispatchTarget.dispatchEvent(
          new globalThis.PointerEvent("pointercancel", {
            bubbles: true,
            cancelable: true,
            pointerId: getPointerId(event) ?? 0,
            pointerType: event.pointerType || "mouse",
            clientX: event.clientX,
            clientY: event.clientY,
          }),
        )
      } catch {
        // Some embedded browsers do not allow constructing PointerEvent.
      } finally {
        interaction.isDispatchingSyntheticPointerCancel = false
      }
    },
    onPointerUpCapture(event) {
      if (!isPointerMismatch(event) && isHorizontalDrag(event)) {
        event.preventDefault()
        event.stopPropagation()
      }
      interaction.activePointerId = null
    },
    onPointerCancelCapture() {
      reset()
    },
    onClickCapture(event) {
      if (!isPointerMismatch(event) && isHorizontalDrag(event)) {
        event.preventDefault()
        event.stopPropagation()
      }
      reset()
    },
  }
}

/** Keeps Framer click/tap interactions from firing after a horizontal drag. */
export function useDragClickGuard(): HTMLAttributes<HTMLDivElement> {
  return useMemo(createDragClickGuard, [])
}
