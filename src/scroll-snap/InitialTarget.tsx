import type { CSSProperties } from "react"
export interface InitialTargetProps { style?: CSSProperties }
/**
 * Place inside the chosen slide, set Position to Absolute and pin all four edges.
 * Uses Roma Komarov's container-query scroll-start workaround:
 * https://blog.kizu.dev/snappy-scroll-start/
 * @framerIntrinsicWidth 1
 * @framerIntrinsicHeight 1
 * @framerSupportedLayoutWidth fixed
 * @framerSupportedLayoutHeight fixed
 */
export function InitialTarget({ style }: InitialTargetProps) {
    return <div aria-hidden="true" style={{ ...style, pointerEvents: "none" }}>
        <style>{`
.kniff-initial-target-marker {
    position:absolute;
    left:clamp(0px, calc(var(--kniff-initial-position, 50%) - 0.5px), calc(100% - 1px));
    top:50%;
    width:1px;
    height:1px;
    container:kniff-initial-target / size;
    visibility:hidden;
    pointer-events:none;
    animation:kniff-initial-target-release 0.01s both;
}
.kniff-initial-target-marker::before {
    content:"";
    display:block;
    width:1px;
    height:1px;
}
@container kniff-initial-target (min-width:1px) {
    .kniff-initial-target-marker::before {
        scroll-snap-align:var(--kniff-initial-align, center);
    }
}
@keyframes kniff-initial-target-release {
    to { width:0px; }
}
        `}</style>
        <span className="kniff-initial-target-marker" />
    </div>
}
