import { createElement, type ComponentType, type ReactNode } from "react"

import {
  withEmbla,
  withHideNavigationWhenNoScrollableSlides,
} from "../src/embla/index.js"

interface CarouselProps {
  children?: ReactNode
  title: string
}

function Carousel({ children, title }: CarouselProps) {
  return createElement("div", { title }, children)
}

// These assignments protect the consumer-facing HOC inference contract.
const EmblaCarousel: ComponentType<CarouselProps> = withEmbla(Carousel)
const ConditionalNavigation: ComponentType<CarouselProps> =
  withHideNavigationWhenNoScrollableSlides(Carousel)

void EmblaCarousel
void ConditionalNavigation
