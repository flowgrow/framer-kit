import { addPropertyControls, ControlType } from "framer"
import {
  CSSScrollSnapButton as KitComponent,
  CSSScrollSnapGallery as KitGallery,
  cssScrollSnapButtonPropertyControls,
// @ts-ignore Framer resolves remote HTTPS modules without TypeScript declarations.
} from "https://framer-kit.kniff.at/builds/3c1b881ec7a2c897d33b20e0/index.js?external=react,react-dom,framer&target=es2022&v=editor-20261030"

/**
 * @framerIntrinsicWidth 44
 * @framerIntrinsicHeight 44
 * @framerSupportedLayoutWidth any-prefer-fixed
 * @framerSupportedLayoutHeight any-prefer-fixed
 */
export default function CSSScrollSnapButton(props: Record<string, unknown>) {
  return <KitComponent {...props} />
}
addPropertyControls(CSSScrollSnapButton, cssScrollSnapButtonPropertyControls)

/**
 * @framerIntrinsicWidth 1
 * @framerIntrinsicHeight 1
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 */
export function CSSScrollSnapGallery(props: Record<string, unknown>) { return <KitGallery {...props} /> }
addPropertyControls(CSSScrollSnapGallery, {
  align:{title:"Snap Align",type:ControlType.Enum,options:["start","center","end"],optionIcons:["align-left","align-center","align-right"],displaySegmentedControl:true,defaultValue:"start"} as any,
  stopAlways:{title:"Stop Each Slide",type:ControlType.Boolean,defaultValue:false,description:"Prevent swipe gestures from skipping snap points."},
  smoothScroll:{title:"Smooth Scroll",type:ControlType.Boolean,defaultValue:true,description:"Arrow navigation always respects reduced-motion preferences."},
  contentWidth:{title:"Content Width",type:ControlType.Number,defaultValue:87.5,min:10,max:100,step:0.5,unit:"%"},
  contentMaxWidth:{title:"Content Max",type:ControlType.Number,defaultValue:1040,min:200,max:2400,step:10,unit:"px"},
  carouselID:{title:"ID",type:ControlType.String,defaultValue:"CSS Scroll Snap Gallery",description:"Match the canvas stack’s aria-label, or its custom layer name (data-framer-name) when no aria-label is set."},
})
