import type { CSSProperties, ReactNode } from "react"

function CanvasInstructionsImpl({
  title,
  style,
  children,
  ...marker
}: {
  title: string
  style?: CSSProperties | undefined
  children: ReactNode
  "data-kniff-carousel-settings"?: string
  "data-kniff-ramka-settings"?: string
}) {
  return (
    <div
      {...marker}
      style={{
        ...style,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: 6,
        width: "100%",
        height: "100%",
        minWidth: 180,
        minHeight: 80,
        padding: 14,
        border: "1px solid rgba(0, 0, 0, 0.12)",
        borderRadius: 10,
        background: "rgba(245, 245, 245, 0.96)",
        color: "#111",
        fontFamily: "Inter, sans-serif",
        fontSize: 12,
        lineHeight: 1.4,
      }}
    >
      <strong>{title}</strong>
      <span>{children}</span>
    </div>
  )
}

export const CanvasInstructions = CanvasInstructionsImpl
