import type { ComponentType } from "react"
// @ts-ignore Framer resolves remote HTTPS modules.
import * as Kit from "https://framer-kit.kniff.at/builds/3c1b881ec7a2c897d33b20e0/index.js?external=react,react-dom,framer&target=es2022&v=editor-20261030"

export function withKniffCarouselLoop(Component: ComponentType<any>): ComponentType<any> {
    return Kit.withKniffCarouselLoop(Component)
}
export function withKniffLightboxGallery(Component: ComponentType<any>): ComponentType<any> {
    return Kit.withKniffLightboxGallery(Component)
}
export function withKniffLightboxTrigger(Component: ComponentType<any>): ComponentType<any> {
    return Kit.withKniffLightboxTrigger(Component)
}
export function withKniffLightboxCarouselLoop(Component: ComponentType<any>): ComponentType<any> {
    return Kit.withKniffLightboxGallery(Kit.withKniffCarouselLoop(Component))
}
