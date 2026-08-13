import { describe, expect, it } from "vitest"

import {
  createBreadcrumbList,
  serializeJsonLd,
} from "../src/schema/index.js"

describe("serializeJsonLd", () => {
  it("escapes characters that can break out of a script element", () => {
    const serialized = serializeJsonLd({ value: "</script>&" })

    expect(serialized).toBe('{"value":"\\u003c/script\\u003e\\u0026"}')
  })
})

describe("createBreadcrumbList", () => {
  it("creates ordered Schema.org list items", () => {
    expect(
      createBreadcrumbList([
        { name: "Home", url: "https://example.com/" },
        { name: "Journal", url: "https://example.com/journal" },
      ]),
    ).toEqual({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: "https://example.com/",
        },
        {
          "@type": "ListItem",
          position: 2,
          name: "Journal",
          item: "https://example.com/journal",
        },
      ],
    })
  })
})

