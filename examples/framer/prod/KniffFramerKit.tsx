import type { ComponentType } from "react"
// @ts-ignore Framer resolves remote HTTPS modules.
import * as Kit from "https://framer-kit.kniff.at/0.5.2/index.js?external=react,react-dom,framer&target=es2022"

export function withKniffCarouselLoop(Component: ComponentType<any>): ComponentType<any> {
    return Kit.withKniffCarousel(Component)
}
export function withKniffLightboxGallery(Component: ComponentType<any>): ComponentType<any> {
    return Kit.withKniffLightboxGallery(Component)
}
export function withKniffLightboxTrigger(Component: ComponentType<any>): ComponentType<any> {
    return Kit.withKniffLightboxTrigger(Component)
}
export function withKniffLightboxCarouselLoop(Component: ComponentType<any>): ComponentType<any> {
    return Kit.withKniffLightboxGallery(Kit.withKniffCarousel(Component))
}
