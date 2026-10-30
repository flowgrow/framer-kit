interface TouchIntentOptions {
  start: () => void
  end: () => void
}

// Passive intent detection: pending/vertical touches never interrupt animation.
// The browser retains page scrolling; native carousel scrolling takes over only
// after horizontal movement exceeds the gesture slop.
export function installTouchIntent(viewport: HTMLElement, options: TouchIntentOptions) {
  const win=viewport.ownerDocument.defaultView!
  let intent: 'none' | 'pending' | 'horizontal' | 'vertical'='none'
  let pointer=false, touches=0, x=0, y=0
  const set=(value: typeof intent) => { intent=value; viewport.dataset.kniffTouchIntent=value }
  const horizontal=() => { if(intent==='horizontal')return;set('horizontal');options.start() }
  const move=(nextX: number, nextY: number) => {
    if(intent!=='pending')return
    const dx=Math.abs(nextX-x),dy=Math.abs(nextY-y)
    if(Math.max(dx,dy)<6)return
    if(dy>dx*1.15)set('vertical')
    else if(dx>dy*1.15)horizontal()
    else if(Math.max(dx,dy)>12){if(dy>=dx)set('vertical');else horizontal()}
  }
  const begin=(nextX: number,nextY: number) => {x=nextX;y=nextY;set('pending')}
  const finish=() => {
    if(pointer||touches)return
    const interrupted=intent==='horizontal'
    set('none')
    if(interrupted)options.end()
  }
  const down=(event: PointerEvent) => {
    if(event.button!==0)return
    if(event.pointerType==='touch'){
      if(!touches)begin(event.clientX,event.clientY)
      pointer=true
    }
  }
  const pointerMove=(event: PointerEvent) => {if(event.pointerType==='touch'&&pointer)move(event.clientX,event.clientY)}
  const up=(event: PointerEvent) => {
    if(!pointer)return
    if(event.type!=='pointercancel'&&event.pointerType==='touch')move(event.clientX,event.clientY)
    pointer=false;finish()
  }
  const touchStart=(event: TouchEvent) => {
    const point=event.touches?.[0]
    if(!pointer&&!touches)begin(point?.clientX??0,point?.clientY??0)
    touches=event.touches?.length??1
  }
  const touchMove=(event: TouchEvent) => {const point=event.touches?.[0];if(point)move(point.clientX,point.clientY)}
  const touchEnd=(event: TouchEvent) => {
    const point=event.changedTouches?.[0];if(event.type!=='touchcancel'&&point)move(point.clientX,point.clientY)
    touches=event.touches?.length??0;finish()
  }
  viewport.addEventListener('pointerdown',down,{passive:true,capture:true})
  viewport.addEventListener('pointermove',pointerMove,{passive:true,capture:true})
  viewport.addEventListener('touchstart',touchStart,{passive:true,capture:true})
  viewport.addEventListener('touchmove',touchMove,{passive:true,capture:true})
  win.addEventListener('pointerup',up);win.addEventListener('pointercancel',up)
  win.addEventListener('touchend',touchEnd,{passive:true});win.addEventListener('touchcancel',touchEnd,{passive:true})
  return {
    get holding(){return (intent==='horizontal')&&(pointer||touches>0)},
    // A browser may deliver async native scrolling before touchmove reaches JS.
    // Never interpret vertical intent (or our own automatic scroll writes) as it.
    ignoreScroll(delta: number){
      if(intent==='pending'&&Math.abs(delta)>=6)horizontal()
      return intent==='pending'||intent==='vertical'
    },
    reset(){pointer=false;touches=0;set('none')},
    dispose(){
      viewport.removeEventListener('pointerdown',down,true);viewport.removeEventListener('pointermove',pointerMove,true)
      viewport.removeEventListener('touchstart',touchStart,true);viewport.removeEventListener('touchmove',touchMove,true)
      win.removeEventListener('pointerup',up);win.removeEventListener('pointercancel',up)
      win.removeEventListener('touchend',touchEnd);win.removeEventListener('touchcancel',touchEnd)
      delete viewport.dataset.kniffTouchIntent
    },
  }
}
