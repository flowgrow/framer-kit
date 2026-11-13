// @ts-ignore Framer resolves sibling code files at runtime; the repo build checks this path.
import { installTouchIntent } from "https://framer.com/m/touchIntent-1GV9VC.js@yw9Bc4mMxSyGwxci63kz"

// @ts-ignore Framer cannot resolve local code-file imports.
import { restartAtFirstSlide, slideRect } from "./snapGeometry.ts"
// @ts-ignore Framer cannot resolve local code-file imports.
import { cancelOverflowMove } from "./snapNavigation.ts"

export interface AutoMoveOptions {
  speed: number
  direction: "left" | "right"
  startDelay?: number
  stopOnInteraction?: boolean
  stopOnLastSlide?: boolean
  resumeDelay?: number
}

// Resolve boxless Framer responsive wrappers without measuring unrelated descendants.
function boxes(parent: Element): HTMLElement[] {
  return Array.from(parent.children).flatMap((child) => {
    if (!(child instanceof HTMLElement) || ["STYLE", "SCRIPT"].includes(child.tagName)) return []
    if (getComputedStyle(child).display === "contents") return boxes(child)
    return child.getClientRects().length ? [child] : []
  })
}

export function installAutoMove(
  viewport: HTMLElement,
  { speed, direction, resumeDelay = 300, startDelay = 0, stopOnInteraction = false, stopOnLastSlide = false }: AutoMoveOptions,
) {
  const doc = viewport.ownerDocument,
    win = doc.defaultView!
  const reduced = win.matchMedia("(prefers-reduced-motion: reduce)")
  const snap = viewport.style.scrollSnapType,
    behavior = viewport.style.scrollBehavior
  let phase: "running" | "held" | "settling" | "waiting" | "stopped" = "waiting"
  let frame = 0,
    timer = 0,
    last = 0,
    position = viewport.scrollLeft
  let disposed = false,
    verticalWheelUntil = 0
  const hasTouch = win.navigator.maxTouchPoints > 0
  let writtenPosition = viewport.scrollLeft
  let awaitingScroll = false
  let nativeHandoff = false
  let inView = false,
    suspended = true,
    resumeMoving = true
  let cycle = 0,
    origin = 0,
    max = 0,
    points: number[] = []
  let started = false
  let terminal = 0
  let manuallyPaused = false
  const externallyPaused = () => manuallyPaused || viewport.hasAttribute("data-kniff-auto-move-paused")
  const state = (next: typeof phase) => {
    phase = next
    viewport.dataset.kniffAutoMove = next
  }
  const measure = () => {
    const slides = boxes(viewport),
      rect = viewport.getBoundingClientRect(),
      css = getComputedStyle(viewport)
    const left = parseFloat(css.scrollPaddingLeft) || 0,
      right = parseFloat(css.scrollPaddingRight) || 0
    max = Math.max(0, viewport.scrollWidth - viewport.clientWidth)
    const offset = (slide: HTMLElement) => {
      const r = slideRect(viewport, slide),
        align = getComputedStyle(slide).scrollSnapAlign
      const factor = align.includes("end") ? 1 : align.includes("center") ? 0.5 : 0
      return (
        r.left -
        rect.left -
        viewport.clientLeft +
        viewport.scrollLeft -
        left -
        (viewport.clientWidth - left - right - r.width) * factor
      )
    }
    points = slides.map((slide) => Math.max(0, Math.min(max, offset(slide))))
    const originals = slides.filter((s) => !s.closest("[data-kniff-loop-copy]"))
    const first = originals[0],
      following = slides[slides.indexOf(originals[originals.length - 1]!) + 1]
    cycle =
      viewport.hasAttribute("data-kniff-loop") && first && following
        ? slideRect(viewport, following).left - slideRect(viewport, first).left
        : 0
    origin = first ? offset(first) : 0
    const farEdge = originals.length ? offset(originals[originals.length - 1]!) : max
    terminal = Math.min(max, Math.max(0, direction === "left" ? farEdge : origin))
    if (cycle > 0) {
      const cycles = (viewport.scrollLeft - terminal) / cycle
      terminal += cycle * (direction === "left" ? Math.ceil(cycles - 0.0001) : Math.floor(cycles + 0.0001))
    }
  }
  const wrap = (x: number) =>
    cycle > 0 ? origin + ((((x - origin) % cycle) + cycle) % cycle) : Math.max(0, Math.min(max, x))
  const stop = () => {
    win.cancelAnimationFrame(frame)
    win.clearTimeout(timer)
    frame = 0
    last = 0
  }
  const restore = () => {
    viewport.style.scrollSnapType = snap
    viewport.style.scrollBehavior = behavior
  }
  const tick = (now: number) => {
    if (disposed || externallyPaused() || !inView || phase !== "running") return
    const next = position + (last ? ((direction === "left" ? 1 : -1) * speed * Math.min(now - last, 50)) / 1000 : 0)
    if (stopOnLastSlide && (direction === "left" ? next >= terminal : next <= terminal)) {
      viewport.scrollLeft = terminal
      pause("stopped")
      return
    }
    position = wrap(next)
    if (cycle > 0) terminal += position - next
    last = now
    // Keep fractional accumulation independent of browsers that round scrollLeft.
    viewport.scrollLeft = position
    writtenPosition = viewport.scrollLeft
    if (
      !cycle &&
      ((direction === "left" && position >= max) || (direction === "right" && position <= 0))
    ) {
      restore()
      pause("stopped")
      frame = 0
      last = 0
      return
    }
    frame = win.requestAnimationFrame(tick)
  }
  const start = () => {
    if (
      disposed ||
      externallyPaused() ||
      !inView ||
      gesture.holding ||
      doc.hidden ||
      reduced.matches ||
      speed <= 0
    )
      return
    stop()
    started = true
    measure()
    position = viewport.scrollLeft
    writtenPosition = position
    awaitingScroll = false
    nativeHandoff = false
    viewport.style.scrollSnapType = "none"
    viewport.style.scrollBehavior = "auto"
    state("running")
    frame = win.requestAnimationFrame(tick)
  }
  const wait = () => {
    stop()
    awaitingScroll = false
    restore()
    state("waiting")
    timer = win.setTimeout(start, resumeDelay)
  }
  const settled = () => {
    if (
      disposed ||
      externallyPaused() ||
      !inView ||
      doc.hidden ||
      reduced.matches ||
      gesture.holding ||
      phase === "running"
    )
      return
    const nearest = points.reduce(
      (a, b) => (Math.abs(b - viewport.scrollLeft) < Math.abs(a - viewport.scrollLeft) ? b : a),
      points[0] ?? viewport.scrollLeft,
    )
    // Let native snapping finish first. WebKit can leave a mandatory snap
    // unaligned after toggling snap type; correct only that idle fallback.
    const snapType = getComputedStyle(viewport).scrollSnapType
    const needsCorrection = !nativeHandoff || snapType === "none" || snapType.includes("mandatory")
    if (needsCorrection && Math.abs(nearest - viewport.scrollLeft) > 1) {
      state("settling")
      viewport.scrollTo({ left: nearest, behavior: reduced.matches ? "instant" : "smooth" })
      schedule()
      return
    }
    // Snap coordinates and native scroll positions can differ by a fraction of
    // a pixel. Treat either side of a loop seam as the same canonical origin.
    const offset = cycle > 0 ? (((viewport.scrollLeft - origin) % cycle) + cycle) % cycle : 0
    const next =
      cycle > 0 && Math.min(offset, cycle - offset) < 1 ? origin : wrap(viewport.scrollLeft)
    viewport.scrollTo({ left: next, behavior: "instant" })
    writtenPosition = viewport.scrollLeft
    wait()
  }
  const schedule = () => {
    if (
      externallyPaused() ||
      !inView ||
      doc.hidden ||
      reduced.matches ||
      phase === "running" ||
      gesture.holding
    )
      return
    win.clearTimeout(timer)
    timer = win.setTimeout(settled, 150)
  }
  const interrupt = (nativeSnap = false) => {
    if (externallyPaused()) return
    if (suspended) resumeMoving = false
    // Automatic motion is disabled: user input must retain native snapping,
    // because reduced-motion guards also skip our settle/resume path.
    if (reduced.matches) {
      stop()
      awaitingScroll = false
      nativeHandoff = true
      restore()
      viewport.style.scrollBehavior = "auto"
      state("held")
      return
    }
    nativeHandoff = nativeSnap
    stop()
    viewport.style.scrollBehavior = nativeSnap && !reduced.matches ? "smooth" : "auto"
    viewport.style.scrollSnapType = nativeSnap ? snap : "none"
    state("held")
    measure()
  }
  const scroll = () => {
    if (externallyPaused() || !inView || doc.hidden || reduced.matches) return
    // Auto Move also emits scroll events. Only a position different from our
    // last write is user scrolling; wheel/key intent cancels rAF before it moves.
    const delta = viewport.scrollLeft - writtenPosition
    if (phase === "running" && performance.now() < verticalWheelUntil) return
    if (gesture.ignoreScroll(delta)) return
    const userScrolled = Math.abs(delta) > 0.01
    if (stopOnInteraction && userScrolled && (gesture.holding || awaitingScroll)) { pause("stopped"); return }
    if (gesture.holding && userScrolled) {
      nativeHandoff = true
      awaitingScroll = false
      viewport.style.scrollSnapType = snap
      viewport.style.scrollBehavior = behavior
    }
    if ((awaitingScroll || (!hasTouch && phase === "running")) && userScrolled) {
      awaitingScroll = false
      interrupt(true)
    }
    // Our own instant loop normalization emits an asynchronous scroll event.
    // It must not reset the resume timer after we have already settled.
    if (phase === "waiting" && !userScrolled) return
    if (phase !== "running" && !awaitingScroll) {
      state("settling")
      schedule()
    }
  }
  const wheel = (event?: WheelEvent) => {
    if (
      event &&
      !event.shiftKey &&
      (Math.abs(event.deltaX) < 0.5 || Math.abs(event.deltaY) > Math.abs(event.deltaX))
    ) {
      verticalWheelUntil = performance.now() + 180
      return
    }
    verticalWheelUntil = 0
    if (stopOnInteraction) { pause("stopped"); return }
    gesture.reset()
    awaitingScroll = true
    interrupt()
    schedule()
  }
  const key = (e: KeyboardEvent) => {
    if (["ArrowLeft", "ArrowRight", "Home", "End", "PageUp", "PageDown", " "].includes(e.key))
      wheel()
  }
  const navigation = () => {
    gesture.reset()
    interrupt()
    schedule()
  }
  const gesture = installTouchIntent(viewport, {
    start: () => {
      awaitingScroll = false
      interrupt()
    },
    end: () => schedule(),
  })
  const visibility = () => {
    if (externallyPaused() || !inView || doc.hidden || reduced.matches) {
      if (!suspended) {
        resumeMoving = !started || phase === "running"
        suspended = true
        stop()
        state("held")
      }
      if (reduced.matches) restore()
      return
    }
    if (suspended) {
      suspended = false
      if (resumeMoving && !gesture.holding) {
        if (!started && startDelay > 0) {
          state("waiting")
          timer = win.setTimeout(start, startDelay * 1000)
        } else start()
      }
      else {
        measure()
        schedule()
      }
    }
  }
  const pause = (next: "held" | "stopped") => {
    manuallyPaused = true
    stop()
    restore()
    suspended = true
    state(next)
  }
  const manual = () => { if (stopOnInteraction) pause("stopped") }
  const toggle = () => {
    if (phase !== "held" && phase !== "stopped") pause("held")
    else {
      manuallyPaused = false
      if (phase === "stopped") {
        cancelOverflowMove(viewport)
        restartAtFirstSlide(viewport)
        writtenPosition = viewport.scrollLeft
      }
      resumeMoving = true
      suspended = true
      visibility()
    }
  }
  viewport.addEventListener("kniff-manual-navigation", manual)
  viewport.addEventListener("kniff-toggle-playback", toggle)
  // No movement until the observer confirms a positive visible area. This also
  // respects clipping by scrollable ancestors, not just the window bounds.
  const intersection = new IntersectionObserver(
    (entries) => {
      if (disposed) return
      const entry = entries[entries.length - 1]
      inView =
        !!entry?.isIntersecting &&
        entry.intersectionRect.width > 0 &&
        entry.intersectionRect.height > 0
      visibility()
    },
    { threshold: [0, 0.001] },
  )
  intersection.observe(viewport)
  const resize = new ResizeObserver(() => {
    measure()
    if (phase === "running") position = viewport.scrollLeft
  })
  resize.observe(viewport)
  const mutation = new MutationObserver(() => {
    visibility()
    measure()
    resize.disconnect()
    resize.observe(viewport)
    boxes(viewport).forEach((s) => resize.observe(s))
  })
  mutation.observe(viewport, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["data-kniff-auto-move-paused"],
  })
  viewport.addEventListener("wheel", wheel, { passive: true })
  viewport.addEventListener("keydown", key)
  viewport.addEventListener("scroll", scroll, { passive: true })
  viewport.addEventListener("kniff-scroll-navigation", navigation)
  doc.addEventListener("visibilitychange", visibility)
  reduced.addEventListener("change", visibility)
  measure()
  return () => {
    disposed = true
    stop()
    viewport.removeEventListener("kniff-manual-navigation", manual)
    viewport.removeEventListener("kniff-toggle-playback", toggle)
    gesture.dispose()
    intersection.disconnect()
    resize.disconnect()
    mutation.disconnect()
    restore()
    delete viewport.dataset.kniffAutoMove
    viewport.removeEventListener("wheel", wheel)
    viewport.removeEventListener("keydown", key)
    viewport.removeEventListener("scroll", scroll)
    viewport.removeEventListener("kniff-scroll-navigation", navigation)
    doc.removeEventListener("visibilitychange", visibility)
    reduced.removeEventListener("change", visibility)
  }
}
