export type JsonLdPrimitive = string | number | boolean | null

export type JsonLdValue =
  | JsonLdPrimitive
  | JsonLdValue[]
  | { [key: string]: JsonLdValue | undefined }

export interface BreadcrumbItem {
  name: string
  url: string
}

/**
 * Serialize JSON-LD safely for embedding in an HTML script element.
 */
export function serializeJsonLd(value: JsonLdValue): string {
  return JSON.stringify(value)
    .replaceAll("<", "\\u003c")
    .replaceAll(">", "\\u003e")
    .replaceAll("&", "\\u0026")
    .replaceAll("\u2028", "\\u2028")
    .replaceAll("\u2029", "\\u2029")
}

export function createBreadcrumbList(
  items: readonly BreadcrumbItem[],
): JsonLdValue {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  }
}

