import { createElement } from "react"

import { serializeJsonLd, type JsonLdValue } from "../schema/jsonLd.js"

export interface JsonLdProps {
  data: JsonLdValue
}

/**
 * Renders valid JSON-LD without requiring the script to live in document head.
 */
export function JsonLd({ data }: JsonLdProps) {
  return createElement("script", {
    type: "application/ld+json",
    dangerouslySetInnerHTML: { __html: serializeJsonLd(data) },
  })
}

