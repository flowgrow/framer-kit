import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import CSSScrollSnapButton from '../../src/scroll-snap/CSSScrollSnap'

export function mountNavigation(mount: HTMLElement) {
  const root = createRoot(mount)
  root.render(createElement('div', { style: { display: 'flex', width: 120, height: 44 } }, ...(['Prev', 'Next'] as const).map(action =>
    createElement(CSSScrollSnapButton, { key: action, carouselID: 'Navigation Test', overflowViewport: true, action }),
  )))
  return root
}
