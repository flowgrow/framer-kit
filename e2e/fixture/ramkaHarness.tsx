import React, { forwardRef } from 'react'
import { createRoot } from 'react-dom/client'
import { withKniffLightboxGallery, withKniffLightboxTrigger } from '../../src/ramka/overrides'
import { RamkaSettings } from '../../src/ramka/RamkaSettings'
import { ramkaSettingsDefaults } from '../../src/ramka/defaults'
import { installAutoMove } from '../../src/scroll-snap/autoMove'
const Frame = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>((props, ref) => <div {...props} ref={ref} />)
const Gallery = withKniffLightboxGallery(Frame)
const Trigger = withKniffLightboxTrigger(Frame)
export function mountRamka(mount: HTMLElement) {
  const root = createRoot(mount)
  root.render(<Gallery><RamkaSettings {...ramkaSettingsDefaults} /><div id="ramka-viewport" style={{display:'flex',width:360,overflowX:'auto'}}>
    {[0,1,2,3].map(i => <Trigger key={i} style={{flex:'0 0 240px',height:180}}><img src={`/image.svg?ramka=${i}`} alt={`Lightbox image ${i}`} /></Trigger>)}
  </div></Gallery>)
  const install = () => {
    const viewport = document.querySelector<HTMLElement>('#ramka-viewport')
    if (!viewport) { requestAnimationFrame(install); return }
    installAutoMove(viewport, {speed:30,direction:'left'})
  }
  requestAnimationFrame(install)
  return root
}
