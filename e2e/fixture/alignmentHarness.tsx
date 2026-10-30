import React,{forwardRef} from 'react'
import {createRoot} from 'react-dom/client'
import {RenderTarget} from './framer'
import {withKniffCarousel} from '../../src/scroll-snap/withKniffCarousel'
import {VisibleScrollOverflowSettings} from '../../src/scroll-snap/VisibleScrollOverflowSettings'
const Frame=forwardRef<HTMLDivElement,React.HTMLAttributes<HTMLDivElement>>((props,ref)=><div {...props} ref={ref}/>),Viewport=withKniffCarousel(Frame)
export function mountAlignment(mount:HTMLElement,{align,edgeSpace,canvas}:{align:'start'|'center'|'end';edgeSpace:boolean;canvas:boolean}){
 RenderTarget.current=()=>canvas?RenderTarget.canvas:'preview'
 const root=createRoot(mount)
 root.render(<div aria-label="Alignment boundary" style={{width:'100%'}}><Viewport aria-label="Alignment viewport" id="alignment-viewport" style={{position:'relative',boxSizing:'border-box',width:'100%',maxWidth:600,height:180,padding:'20px 64px 20px 0px',gap:24}}>{[180,260,120,340,210].map((width,i)=><div key={i} className="ssr-variant" style={{display:"contents"}}><div data-slide={i} data-framer-name={'Slide '+i} style={{flex:'none',width,height:100,background:'steelblue'}}>Slide {i+1}</div></div>)}<div style={{position:"absolute"}}><span hidden data-kniff-ramka-settings=""/></div></Viewport><VisibleScrollOverflowSettings containerID="Alignment viewport" boundaryID="Alignment boundary" align={align} edgeSpace={edgeSpace} loop={false}/></div>)
 return root
}
