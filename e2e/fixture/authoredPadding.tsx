import React, { forwardRef } from 'react'
import { hydrateRoot } from 'react-dom/client'
import { withKniffCarousel } from '../../src/scroll-snap/withKniffCarousel'
import { VisibleScrollOverflowSettings } from '../../src/scroll-snap/VisibleScrollOverflowSettings'
import { cssCollector } from './framer'
export const authoredCSS = `.authored-page .authored-viewport{display:flex;width:100%;height:160px;padding:20px 96px 20px 32px;gap:24px}
@media(max-width:700px){.authored-page .authored-viewport{padding:20px 50px 20px 12px;gap:16px}}
.authored-page.variant .authored-viewport{padding-left:44px}`
const Frame = forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>((props, ref) => <div {...props} ref={ref} />)
const Viewport = withKniffCarousel(Frame)
export function AuthoredPadding() {
  if (typeof document === 'undefined') cssCollector.styles.add(authoredCSS)
  return <div className="authored-page" aria-label="Authored boundary" style={{width:'100%'}}>
    <div aria-label="Authored sizing" style={{width:'70%',margin:'auto',gap:24}}>
      <Viewport id="authored-viewport" className="authored-viewport"><div style={{flex:'0 0 200px'}}>One</div><div style={{flex:'0 0 200px'}}>Two</div><div style={{flex:'0 0 200px'}}>Three</div></Viewport>
    </div>
    <VisibleScrollOverflowSettings containerID="Authored sizing" boundaryID="Authored boundary" align="start" loop={false} edgeSpace={false} />
  </div>
}
export function hydrateAuthoredPadding() {
  cssCollector.styles.clear()
  const errors: string[]=[]
  const original=console.error
  console.error=(...args)=>{errors.push(args.map(String).join(' '));original(...args)}
  const root=hydrateRoot(document.querySelector('#authored-root')!,<AuthoredPadding/>,{onRecoverableError:error=>errors.push(String(error))})
  return {root,errors,collectorSize:cssCollector.styles.size}
}
