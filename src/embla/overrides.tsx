import * as React from 'react';
import {
  forwardRef,
  type ComponentType,
  type RefAttributes,
  useCallback,
  useEffect,
  useState,
} from 'react';

import { useDragClickGuard } from './interaction.js';
import {
  createEmblaContainerStyle,
  createEmblaWrapperStyle,
  EMBLA_CLASS,
  EMBLA_CONTAINER_CLASS,
  EMBLA_STRUCTURAL_CSS,
  EMBLA_VIEWPORT_CLASS,
} from './styles.js';
import { useEmblaStore } from './store.js';
import type { FramerCarouselProps } from './types.js';
import { useHydrated } from './useHydrated.js';
import { useEmblaInstance } from './useEmblaInstance.js';

function cx(...classes: Array<string | undefined>): string {
  return classes.filter(Boolean).join(' ');
}

export function getCarouselId(props: FramerCarouselProps): string | undefined {
  const id = props['aria-label'] ?? props['data-framer-name'];
  return typeof id === 'string' && id.trim().length > 0 ? id.trim() : undefined;
}

function useMissingIdWarning(id: string | undefined, overrideName: string) {
  useEffect(() => {
    if (id) return;
    console.warn(
      `[framer-kit] ${overrideName} needs an aria-label or a custom Layers-panel name to connect to Carousel Settings. Rendering the original component unchanged.`
    );
  }, [id, overrideName]);
}

function renderComponent<P extends object>(
  Component: ComponentType<P>,
  props: P,
  ref: React.ForwardedRef<unknown>
) {
  return React.createElement(Component, {
    ...props,
    ref,
  } as P & RefAttributes<unknown>);
}

function createEmblaOverride<P extends object>(
  Component: ComponentType<P>,
  overrideName: 'withEmbla'
): ComponentType<P> {
  const displayName = Component.displayName ?? Component.name ?? 'Component';

  const Override = forwardRef<unknown, P>((props, ref) => {
    const isHydrated = useHydrated();
    const framerProps = props as P & FramerCarouselProps;
    const id = getCarouselId(framerProps);
    const { config, viewportRef } = useEmblaInstance(id);
    const dragClickGuard = useDragClickGuard();

    useMissingIdWarning(id, overrideName);

    if (!isHydrated || !id || !config) {
      return renderComponent(Component, props as unknown as P, ref);
    }

    const componentProps = {
      ...props,
      className: cx(framerProps.className, EMBLA_CONTAINER_CLASS),
      style: createEmblaContainerStyle(framerProps.style, config.options?.axis),
      ref,
    } as P & RefAttributes<unknown>;

    return (
      <div
        className={EMBLA_CLASS}
        data-kniff-embla={id}
        style={createEmblaWrapperStyle(config.styles)}
      >
        <style>{EMBLA_STRUCTURAL_CSS}</style>
        <div
          {...dragClickGuard}
          className={EMBLA_VIEWPORT_CLASS}
          data-kniff-embla-select-on-slide-click={
            config.selectOnSlideClick ? 'true' : undefined
          }
          ref={viewportRef}
        >
          <Component {...componentProps} />
        </div>
      </div>
    );
  });

  Override.displayName = `${overrideName}(${displayName})`;

  return Override as unknown as ComponentType<P>;
}

/** Turns a regular Framer stack into an Embla carousel. */
export function withEmbla<P extends object>(
  Component: ComponentType<P>
): ComponentType<P> {
  return createEmblaOverride(Component, 'withEmbla');
}

/** Hides carousel navigation when the registered carousel cannot scroll. */
export function withHideNavigationWhenNoScrollableSlides<P extends object>(
  Component: ComponentType<P>
): ComponentType<P> {
  const displayName = Component.displayName ?? Component.name ?? 'Component';

  const NavigationOverride = forwardRef<unknown, P>((props, ref) => {
    const carouselId = getCarouselId(props as P & FramerCarouselProps);
    const emblaApi = useEmblaStore(state =>
      carouselId ? state.emblaInstances.get(carouselId) : undefined
    );
    const [isVisible, setIsVisible] = useState(true);

    useMissingIdWarning(carouselId, 'withHideNavigationWhenNoScrollableSlides');

    const updateVisibility = useCallback(() => {
      setIsVisible(
        emblaApi ? emblaApi.canScrollPrev() || emblaApi.canScrollNext() : true
      );
    }, [emblaApi]);

    useEffect(() => {
      if (!emblaApi) {
        setIsVisible(true);
        return;
      }

      updateVisibility();
      emblaApi.on('select', updateVisibility);
      emblaApi.on('reInit', updateVisibility);
      emblaApi.on('slidesChanged', updateVisibility);

      return () => {
        emblaApi.off('select', updateVisibility);
        emblaApi.off('reInit', updateVisibility);
        emblaApi.off('slidesChanged', updateVisibility);
      };
    }, [emblaApi, updateVisibility]);

    if (!isVisible) return null;
    return renderComponent(Component, props as unknown as P, ref);
  });

  NavigationOverride.displayName = `withHideNavigationWhenNoScrollableSlides(${displayName})`;
  return NavigationOverride as unknown as ComponentType<P>;
}
