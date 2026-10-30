export const ControlType = new Proxy({}, { get: (_target, key) => key })
export const RenderTarget = { canvas: 'canvas', current: () => 'preview' }
export function addPropertyControls() {}
