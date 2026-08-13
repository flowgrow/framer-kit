import {
  createElement,
  forwardRef,
  type ComponentType,
  type RefAttributes,
} from "react"

export type DataAttributeValue = string | number | boolean

/**
 * Small reference implementation of an override factory. More specialized
 * factories can follow the same pattern without coupling them to canvas code.
 */
export function createDataAttributeOverride(
  attribute: `data-${string}`,
  value: DataAttributeValue,
) {
  return function withDataAttribute<P extends object>(
    Component: ComponentType<P>,
  ): ComponentType<P> {
    const DataAttributeOverride = forwardRef<unknown, P>((props, ref) =>
      createElement(Component, {
        ...props,
        [attribute]: value,
        ref,
      } as P & RefAttributes<unknown>),
    )

    DataAttributeOverride.displayName = `withDataAttribute(${Component.displayName ?? Component.name ?? "Component"})`

    // Framer detects overrides through ComponentType, while forwardRef uses the
    // equivalent but structurally different PropsWithoutRef<P> representation.
    return DataAttributeOverride as unknown as ComponentType<P>
  }
}
