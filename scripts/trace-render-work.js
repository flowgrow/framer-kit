// Test-only instrumentation. Injected after page hydration, never published.
;(() => {
  const events = (window.__renderTrace = [])
  let activeUntil = 0
  let start = 0
  const active = () => performance.now() < activeUntil
  const label = (e) =>
    e?.tagName
      ? `${e.tagName}${e.id ? "#" + e.id : ""}.${String(e.className).slice(0, 100)}[${e.getAttribute("data-framer-name") || ""}]`
      : String(e?.nodeName || e)
  const push = (kind, data = {}) => {
    if (active() && events.length < 12000)
      events.push({ at: performance.now() - start, kind, ...data })
  }
  const observer = new MutationObserver((records) => {
    if (!active()) return
    push("mutations", {
      records: records.slice(0, 100).map((r) => ({
        target: label(r.target),
        attr: r.attributeName,
        added: r.addedNodes.length,
        removed: r.removedNodes.length,
      })),
    })
  })
  observer.observe(document.documentElement, { subtree: true, attributes: true, childList: true })
  document.addEventListener(
    "click",
    () => {
      if (start) return
      start = performance.now()
      activeUntil = start + 1800
      push("click", {
        elements: document.querySelectorAll("*").length,
        sheets: document.styleSheets.length,
      })
    },
    true,
  )
  function read(kind, e, fn) {
    if (!active()) return fn()
    const t = performance.now()
    const value = fn()
    const ms = performance.now() - t
    if (ms >= 4) push(kind, { ms, target: label(e), stack: new Error().stack })
    return value
  }
  for (const proto of [Document.prototype, ShadowRoot.prototype]) {
    const d = Object.getOwnPropertyDescriptor(proto, "adoptedStyleSheets")
    if (d?.set)
      Object.defineProperty(proto, "adoptedStyleSheets", {
        ...d,
        set(value) {
          push("sheets.adopt", {
            count: value.length,
            rules: value
              .map((s) => [...s.cssRules].map((r) => r.cssText).join("\n"))
              .map((s) => s.slice(0, 1500)),
            stack: new Error().stack,
          })
          d.set.call(this, value)
        },
      })
  }
  const computed = window.getComputedStyle
  window.getComputedStyle = function (e, ...args) {
    const css = read("getComputedStyle", e, () => computed.call(this, e, ...args))
    return new Proxy(css, {
      get(target, key) {
        const value = read("css." + String(key), e, () => Reflect.get(target, key, target))
        return typeof value === "function" ? value.bind(target) : value
      },
    })
  }
  for (const [proto, keys] of [
    [Element.prototype, ["clientWidth", "clientHeight", "scrollWidth", "scrollLeft"]],
    [HTMLElement.prototype, ["offsetWidth", "offsetHeight", "offsetLeft"]],
  ]) {
    for (const key of keys) {
      const d = Object.getOwnPropertyDescriptor(proto, key)
      if (d?.get)
        Object.defineProperty(proto, key, {
          ...d,
          get() {
            return read(key, this, () => d.get.call(this))
          },
        })
    }
  }
  const rect = Element.prototype.getBoundingClientRect
  Element.prototype.getBoundingClientRect = function () {
    return read("rect", this, () => rect.call(this))
  }
  for (const [proto, keys] of [
    [Element.prototype, ["setAttribute", "removeAttribute"]],
    [Node.prototype, ["appendChild", "removeChild", "insertBefore"]],
    [CSSStyleDeclaration.prototype, ["setProperty", "removeProperty"]],
    [CSSStyleSheet.prototype, ["insertRule", "deleteRule"]],
  ]) {
    for (const key of keys) {
      const fn = proto[key]
      proto[key] = function (...args) {
        if (active())
          push("write." + key, {
            target: label(this),
            args: args.map((v) => (typeof v === "string" ? v.slice(0, 180) : label(v))),
            stack: new Error().stack,
          })
        return fn.apply(this, args)
      }
    }
  }
  // React and Ramka also assign style properties directly.
  for (const key of [
    "viewTransitionName",
    "overflow",
    "position",
    "width",
    "height",
    "display",
    "visibility",
    "transform",
    "transition",
    "paddingRight",
    "scrollSnapType",
    "cssText",
  ]) {
    const proto = CSSStyleDeclaration.prototype
    const d = Object.getOwnPropertyDescriptor(proto, key)
    if (d?.set)
      Object.defineProperty(proto, key, {
        ...d,
        set(value) {
          if (active())
            push("style." + key, { value: String(value).slice(0, 200), stack: new Error().stack })
          d.set.call(this, value)
        },
      })
  }
  if (document.startViewTransition) {
    const fn = document.startViewTransition.bind(document)
    document.startViewTransition = function (cb) {
      push("vt.start")
      const wrapped = async () => {
        push("vt.update.begin")
        await cb()
        push("vt.update.end")
      }
      const vt = fn(typeof cb === "function" ? wrapped : cb)
      vt.ready.then(
        () => push("vt.ready"),
        (e) => push("vt.error", { message: String(e) }),
      )
      vt.finished.then(
        () => push("vt.finished"),
        () => {},
      )
      return vt
    }
  }
})()
