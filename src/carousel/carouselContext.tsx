import * as React from "react"
import { RenderTarget } from "framer"

interface CarouselScope {
  id: string
  viewportSelector: string
  viewport: HTMLElement | null
  register?: React.Dispatch<React.SetStateAction<HTMLElement | null>>
}

export const CarouselContext = React.createContext<CarouselScope | null>(null)

export const CarouselSettingsSnapshot = React.createContext<string | null>(null)
export const SetCarouselSettingsSnapshot = React.createContext<React.Dispatch<React.SetStateAction<string | null>> | null>(null)

function withKniffContextBoundary<P extends object>(
  Component: React.ComponentType<P>,
  _internal?: undefined,
): React.ComponentType<P> {
  const Override = React.forwardRef<unknown, P>((props, ref) => {
    const id = React.useId()
    const [viewport, register] = React.useState<HTMLElement | null>(null)
    const [settings, setSettings] = React.useState<string | null>(null)
    const scope = React.useMemo(
      () => ({
        viewportSelector: `[data-kniff-viewport="${id}"]`,
        viewport,
        register,
        id,
      }),
      [id, viewport],
    )
    if (RenderTarget.current() === RenderTarget.canvas)
      return React.createElement(Component, { ...props, ref } as P)
    return (
      <CarouselContext.Provider value={scope}>
        <SetCarouselSettingsSnapshot.Provider value={setSettings}>
          <CarouselSettingsSnapshot.Provider value={settings}>
            {React.createElement(Component, { ...props, ref, "data-kniff-boundary": id } as P)}
          </CarouselSettingsSnapshot.Provider>
        </SetCarouselSettingsSnapshot.Provider>
      </CarouselContext.Provider>
    )
  })
  return Override as unknown as React.ComponentType<P>
}

export const carouselContextOverrides = { withKniffContextBoundary }
