import React,{forwardRef,useState} from 'react'
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
