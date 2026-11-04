import { NavigationControl } from "../shared/NavigationControl.js"
import { useOverflowNavigation } from "./useOverflowNavigation.js"
import { Children, cloneElement, isValidElement, useRef, type CSSProperties, type ReactElement, type ReactNode } from "react"
import { RenderTarget, addPropertyControls, ControlType, type PropertyControls } from "framer"

export interface CSSScrollSnapButtonProps { carouselID?: string; action?: "Prev" | "Next"; componentSlot?: ReactNode; inactiveOpacity?: number; style?: CSSProperties }
/**
 * @framerIntrinsicWidth 44
 * @framerIntrinsicHeight 44
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 */
export default function CSSScrollSnapButton({carouselID="Percentage Sized Carousel",action="Next",componentSlot,inactiveOpacity=0.35,style}: CSSScrollSnapButtonProps) {
  const canvas = RenderTarget.current() === RenderTarget.canvas
  const buttonRef = useRef<HTMLElement>(null)
  const { available, move } = useOverflowNavigation(carouselID, !canvas, buttonRef)
  const disabled = !canvas && (!carouselID.trim() || !(available & (action === "Next" ? 2 : 1)))
  const component = Children.toArray(componentSlot).find(isValidElement) as ReactElement<any> | undefined
  return <NavigationControl ref={buttonRef} hasSlot={Boolean(component)} label={action === "Next" ? "Next slide" : "Previous slide"} disabled={disabled}
    onActivate={() => {
      if (disabled) return
      const direction = action === "Next" ? 1 : -1
      move(direction)
    }}
    style={{...style, userSelect:"none", WebkitUserSelect:"none", position:"relative", width:"100%",height:"100%",appearance:"none",padding:0,border:component?"none":"1px solid #c5cbbf",borderRadius:component?0:999,background:component?"transparent":"white",color:"#203923",fontSize:22,cursor:disabled?"default":"pointer",opacity:disabled?inactiveOpacity:1,display:"flex",alignItems:"center",justifyContent:"center"}}>
    {component ? cloneElement(component,{style:{...component.props.style, userSelect:"none",WebkitUserSelect:"none",maxWidth:"100%",maxHeight:"100%",pointerEvents:disabled?"none":"auto"}}) : action === "Next" ? "→" : "←"}
  </NavigationControl>
}
export const cssScrollSnapButtonPropertyControls = {
  carouselID:{title:"ID",type:ControlType.String,defaultValue:"Percentage Sized Carousel",description:"Match the overflow viewport layer name."},
  action:{type:ControlType.Enum,options:["Prev","Next"],defaultValue:"Next"},
  componentSlot:{title:"Connect",type:ControlType.Slot,maxCount:1},
  inactiveOpacity:{type:ControlType.Number,defaultValue:0.35,min:0,max:1,step:0.01},
} satisfies PropertyControls<CSSScrollSnapButtonProps>
addPropertyControls(CSSScrollSnapButton, cssScrollSnapButtonPropertyControls)
