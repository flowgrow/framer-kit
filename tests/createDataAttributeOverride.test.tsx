import {
  createElement,
  createRef,
  forwardRef,
  type ComponentType,
  type ReactElement,
  type Ref,
} from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"

import { createDataAttributeOverride } from "../src/overrides/index.js"

interface CardProps {
  title: string
}

function PlainCard({ title, ...props }: CardProps) {
  return createElement("div", props, title)
}

const withTrackingName = createDataAttributeOverride(
  "data-tracking-name",
  "hero-booking",
)

// This assignment protects the consumer-facing generic inference contract.
const TypedCard: ComponentType<CardProps> = withTrackingName(PlainCard)

describe("createDataAttributeOverride", () => {
  it("preserves the wrapped component props and adds the data attribute", () => {
    expect(
      renderToStaticMarkup(createElement(TypedCard, { title: "Book now" })),
    ).toBe(
      '<div data-tracking-name="hero-booking">Book now</div>',
    )
  })

  it("forwards its ref to the wrapped component", () => {
    const Card = forwardRef<HTMLDivElement, CardProps>(({ title }, ref) =>
      createElement("div", { ref }, title),
    )
    const WrappedCard = withTrackingName(Card)
    const ref = createRef<HTMLDivElement>()
    const wrapper = WrappedCard as unknown as {
      render: (props: CardProps, ref: Ref<HTMLDivElement>) => ReactElement
    }

    const rendered = wrapper.render({ title: "Book now" }, ref) as ReactElement & {
      ref: Ref<HTMLDivElement>
    }

    expect(rendered.ref).toBe(ref)
  })
})
