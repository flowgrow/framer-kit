import React, { forwardRef, useState, useContext } from 'react'
import { createRoot } from 'react-dom/client'
import { withKniffCarousel } from '../../src/scroll-snap/withKniffCarousel'
import { VisibleScrollOverflowSettings } from '../../src/scroll-snap/VisibleScrollOverflowSettings'
import { withKniffLightboxGallery, withKniffLightboxTrigger } from '../../src/ramka/overrides'
import CSSScrollSnapButton from '../../src/scroll-snap/CSSScrollSnap'
import { RamkaSettings } from '../../src/ramka/RamkaSettings'
import { RamkaGalleryContext } from '../../src/ramka/context'
import type { RamkaSettingsProps } from '../../src/ramka/types'
import { ramkaSettingsDefaults } from '../../src/ramka/defaults'
const Frame = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>((props, ref) => <div {...props} ref={ref} />)
const GalleryCarousel = withKniffLightboxGallery(withKniffCarousel(Frame))
const Trigger = withKniffLightboxTrigger(Frame)
function ConfigProbe() { const gallery=useContext(RamkaGalleryContext); return <output data-gallery-config hidden>{JSON.stringify(gallery?.config)}</output> }
interface Options { ramka?: Partial<RamkaSettingsProps>; align?: "start" | "center" | "end"; sync?: boolean; autoMove?: boolean | "off" | "per-slide" | "scroll" }
function App({align="start",sync=true,autoMove=false,ramka={}}: Options) {
  const [clicks, setClicks] = useState(0)
  const [count, setCount] = useState(4)
  const [loop, setLoop] = useState(true)
  return <>
    <button id="add" onClick={() => setCount(count+1)}>Add slide</button>
    <button id="toggle-loop" onClick={() => setLoop(!loop)}>Toggle loop</button>
    <output id="clicks">{clicks}</output>
    <Frame aria-label="Loop boundary" style={{width:360}}>
      <div aria-label="Loop test" style={{width:360,display:'flex',gap:24}}>
        <GalleryCarousel id="react-loop" style={{display:'flex',gap:24,width:360,overflowX:'auto'}}>
          {Array.from({length:count},(_,i) => <Trigger key={i} data-slide={i} onClick={() => setClicks(c => c+1)} style={{flex:'0 0 240px',height:180}}>
            <ConfigProbe /><img src={`/image.svg?loop=${i}`} width={320} height={240} alt={`Photo ${i}`} style={{width:'100%',height:'100%'}} />
          </Trigger>)}
          <RamkaSettings {...ramkaSettingsDefaults} syncKniffCarousel={sync} {...ramka} />
        </GalleryCarousel>
      </div>
      <VisibleScrollOverflowSettings containerID="Loop test" boundaryID="Loop boundary" align={align} edgeSpace={false} loop={loop} autoMove={autoMove === true ? "scroll" : autoMove === false ? "off" : autoMove} />
      <div style={{display:"flex",width:100,height:44}}><CSSScrollSnapButton carouselID="Loop test" overflowViewport action="Next" />
      <CSSScrollSnapButton carouselID="Loop test" overflowViewport action="Prev" /></div>
    </Frame>
  </>
}
export function mountReactLoop(mount: HTMLElement, options: Options = {}) {
  const root=createRoot(mount)
  root.render(<App {...options} />)
  return root
}

export async function mountCanvasSettings(mount: HTMLElement) {
  const {RenderTarget}=await import('./framer')
  RenderTarget.current=()=>RenderTarget.canvas
  const root=createRoot(mount)
  root.render(<VisibleScrollOverflowSettings containerID="Canvas slides" boundaryID="Canvas boundary" align="start" loop />)
  return root
}
