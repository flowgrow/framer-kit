import React,{forwardRef,useState} from 'react'
import {createRoot} from 'react-dom/client'
import {RenderTarget} from './framer'
import {withKniffCarousel} from '../../src/scroll-snap/withKniffCarousel'
import {VisibleScrollOverflowSettings} from '../../src/scroll-snap/VisibleScrollOverflowSettings'
const Frame=forwardRef<HTMLDivElement,React.HTMLAttributes<HTMLDivElement>>((props,ref)=><div {...props} ref={ref}/>),Viewport=withKniffCarousel(Frame)
export function mountAlignment(mount:HTMLElement,{align,edgeSpace,canvas,paddingWrapper=false}:{align:'start'|'center'|'end';edgeSpace:boolean;canvas:boolean;paddingWrapper?:boolean}){
 RenderTarget.current=()=>canvas?RenderTarget.canvas:'preview'
 const root=createRoot(mount)
 const viewport=<Viewport aria-label="Alignment viewport" id="alignment-viewport" style={{position:'relative',boxSizing:'border-box',width:'100%',maxWidth:600,height:180,padding:'20px 64px 20px 0px',gap:24}}>{(paddingWrapper?['50%',160,120,180,90]:[180,260,120,340,210]).map((width,i)=><div key={i} className="ssr-variant" style={{display:"contents"}}><div data-slide={i} data-framer-name={'Slide '+i} style={{flex:'none',width,height:100,background:'steelblue'}}>Slide {i+1}</div></div>)}<div style={{position:"absolute"}}><span hidden data-kniff-ramka-settings=""/></div></Viewport>
 root.render(<div aria-label="Alignment boundary" style={{width:'100%'}}>{paddingWrapper?<><style>{`.padding-wrapper{box-sizing:border-box;width:100%;padding-inline:0}@media(max-width:1199px){.padding-wrapper{padding-inline:48px}}@media(max-width:809px){.padding-wrapper{padding-inline:24px}}`}</style><div className="padding-wrapper">{viewport}</div></>:viewport}<VisibleScrollOverflowSettings containerID="Alignment viewport" boundaryID="Alignment boundary" align={align} edgeSpace={edgeSpace} loop={false}/></div>)
 return root
}

// Framer renders all breakpoint canvases together; settings updates are local
// to one instance even when every boundary and viewport has the same layer name.
export function mountCanvasBreakpoints(mount:HTMLElement){
 RenderTarget.current=()=>RenderTarget.canvas
 function Breakpoint({index,initialAlign}:{index:number;initialAlign:'start'|'center'|'end'}){
  const [align,setAlign]=useState(initialAlign)
  const [edgeSpace,setEdgeSpace]=useState(true)
  return <section data-breakpoint={index} aria-label="Shared boundary" style={{width:[600,500,400][index]}}>
   <button onClick={()=>setAlign(align==='start'?'center':align==='center'?'end':'start')}>Change alignment</button>
   <button onClick={()=>setEdgeSpace(!edgeSpace)}>Toggle edge space</button>
   <div aria-label="Shared viewport" data-viewport style={{position:'relative',display:'flex',width:'100%',boxSizing:'border-box',padding:'10px 60px 10px 20px',gap:24}}>
    {[180,220,140].map((width,i)=><div key={i} data-slide={i} style={{flex:'none',width,height:60}}/>)}
   </div>
   <VisibleScrollOverflowSettings containerID="Shared viewport" boundaryID="Shared boundary" align={align} edgeSpace={edgeSpace} loop={false}/>
  </section>
 }
 const root=createRoot(mount)
 root.render(<>{(['start','center','end'] as const).map((align,index)=><Breakpoint key={index} index={index} initialAlign={align}/>)}</>)
 return root
}
