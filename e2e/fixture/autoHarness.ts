import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { VisibleScrollOverflowSettings } from '../../src/scroll-snap/VisibleScrollOverflowSettings'
export function mountSettings(mount: HTMLElement) {
  const root = createRoot(mount)
  root.render(createElement(VisibleScrollOverflowSettings, {containerID:'Overflow Viewport',boundaryID:'Test Boundary',loop:false,autoMove:'scroll',autoMoveSpeed:30,align:'start'}))
  return root
}
