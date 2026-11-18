import React from "react"
// Carousel-only fixture: preserve the loop wrapper without loading the remote lightbox.
// Lightbox interactions are outside these layout tests.
export function RamkaLoopScope(props: React.HTMLAttributes<HTMLSpanElement>) {
  return <span {...props} />
}
