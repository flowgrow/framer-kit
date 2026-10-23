#!/usr/bin/swift
import AppKit
import ApplicationServices
import ScreenCaptureKit
import ImageIO
import UniformTypeIdentifiers

// Native input helper for manual browser carousel stress tests.
// Run: swift scripts/macos-wheel.swift --delta 1600 --events 12 --interval 16
let args = Array(CommandLine.arguments.dropFirst())
func stringOption(_ name: String, _ fallback: String) -> String {
    guard let i = args.firstIndex(of: name), i + 1 < args.count else { return fallback }
    return args[i + 1]
}
let browserName = stringOption("--app", "safari")
let bundleID = ["safari": "com.apple.Safari", "chrome": "com.google.Chrome", "firefox": "org.mozilla.firefox"][browserName] ?? browserName
func option(_ name: String, _ fallback: Double) -> Double {
    guard let i = args.firstIndex(of: name), i + 1 < args.count,
          let value = Double(args[i + 1]), value.isFinite else { return fallback }
    return value
}
if args.contains("--help") {
    print("macos-wheel [--app safari|chrome|firefox] --delta 1600 --events 12 --interval 16 [--x X --y Y] [--gesture] [--test --runs 30]")
    print("Positive delta scrolls right; negative scrolls left. Interval is milliseconds.")
    print("Defaults to a point inside the browser's front window. Requires Accessibility permission.")
    exit(0)
}
guard AXIsProcessTrusted() else {
    fputs("Accessibility permission is missing for this terminal/host process.\n", stderr)
    exit(2)
}
guard let browserApp = NSRunningApplication.runningApplications(withBundleIdentifier: bundleID).first else {
    fputs("Target browser is not running.\n", stderr); exit(3)
}
browserApp.activate(options: [])
try await Task.sleep(nanoseconds: 300_000_000)
let app = AXUIElementCreateApplication(browserApp.processIdentifier)
var window: CFTypeRef?
guard AXUIElementCopyAttributeValue(app, kAXFocusedWindowAttribute as CFString, &window) == .success,
      let window else { fputs("Cannot read the browser's focused window.\n", stderr); exit(4) }
let axWindow = window as! AXUIElement
func attribute(_ key: String) -> CFTypeRef? {
    var value: CFTypeRef?
    AXUIElementCopyAttributeValue(axWindow, key as CFString, &value)
    return value
}
var origin = CGPoint.zero
var size = CGSize.zero
if let value = attribute(kAXPositionAttribute) { AXValueGetValue(value as! AXValue, .cgPoint, &origin) }
if let value = attribute(kAXSizeAttribute) { AXValueGetValue(value as! AXValue, .cgSize, &size) }
guard size.width > 0, size.height > 0 else { fputs("Invalid browser window bounds.\n", stderr); exit(4) }
let point = CGPoint(x: option("--x", origin.x + size.width * 0.5), y: option("--y", origin.y + size.height * 0.4))
let count = max(1, min(1000, Int(option("--events", 1))))
let delta = Int32(max(-100000, min(100000, option("--delta", 1200))))
let interval = max(1, min(1000, option("--interval", 16))) / 1000
let source = CGEventSource(stateID: .hidSystemState)
CGEvent(mouseEventSource: source, mouseType: .mouseMoved, mouseCursorPosition: point, mouseButton: .left)?.post(tap: .cghidEventTap)
try await Task.sleep(nanoseconds: 100_000_000)
func post(_ amount: Int32, phase: Int64 = 0, momentum: Int64 = 0) {
    guard let event = CGEvent(scrollWheelEvent2Source: source, units: .pixel, wheelCount: 2, wheel1: 0, wheel2: -amount, wheel3: 0) else { exit(5) }
    event.location = point
    event.setIntegerValueField(.scrollWheelEventScrollPhase, value: phase)
    event.setIntegerValueField(.scrollWheelEventMomentumPhase, value: momentum)
    event.post(tap: .cghidEventTap)
    Thread.sleep(forTimeInterval: interval)
}
func burst(_ amount: Int32, events: Int, gesture: Bool) {
    if gesture {
        post(amount / 4, phase: 1)
        for _ in 0..<events { post(amount, phase: 2) }
        post(0, phase: 4)
        for i in 0..<30 { post(Int32(Double(amount) * pow(0.82, Double(i))), momentum: i == 0 ? 1 : 2) }
        post(0, momentum: 3)
    } else {
        for _ in 0..<events { post(amount) }
    }
}
func pause(_ seconds: Double) async { try? await Task.sleep(nanoseconds: UInt64(seconds * 1_000_000_000)) }
if args.contains("--test") {
    let content = try await SCShareableContent.excludingDesktopWindows(true, onScreenWindowsOnly: true)
    guard let captureWindow = content.windows.filter({ $0.owningApplication?.processID == browserApp.processIdentifier && $0.frame.width > 200 && $0.frame.height > 100 }).min(by: { a, b in
        func distance(_ w: SCWindow) -> Double { abs(w.frame.minX - origin.x) + abs(w.frame.minY - origin.y) + abs(w.frame.width - size.width) + abs(w.frame.height - size.height) }
        return distance(a) < distance(b)
    }) else {
        fatalError("Could not locate browser window for capture")
    }
    let filter = SCContentFilter(desktopIndependentWindow: captureWindow)
    let configuration = SCStreamConfiguration()
    configuration.width = Int(size.width)
    configuration.height = Int(size.height)
    configuration.showsCursor = false
    let directory = URL(fileURLWithPath: "/tmp/" + browserName + "-wheel-" + String(Int(Date().timeIntervalSince1970)))
    try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    var records: [[String: Any]] = []
    func capture(_ label: String) async throws -> Double {
        let image = try await SCScreenshotManager.captureImage(contentFilter: filter, configuration: configuration)
        let url = directory.appendingPathComponent(label + ".png")
        guard let dest = CGImageDestinationCreateWithURL(url as CFURL, UTType.png.identifier as CFString, 1, nil) else { fatalError("PNG output failed") }
        CGImageDestinationAddImage(dest, image, nil)
        guard CGImageDestinationFinalize(dest) else { fatalError("PNG write failed") }
        // Inspect the image band occupied by the carousel, excluding header and debug output.
        let rect = CGRect(x: Double(image.width) * 0.08, y: Double(image.height) * 0.27, width: Double(image.width) * 0.84, height: Double(image.height) * 0.28)
        guard let crop = image.cropping(to: rect) else { fatalError("Invalid capture ROI") }
        let w = 200, h = 80
        var pixels = [UInt8](repeating: 0, count: w * h * 4)
        pixels.withUnsafeMutableBytes { bytes in
            let ctx = CGContext(data: bytes.baseAddress, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w * 4, space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
            ctx.draw(crop, in: CGRect(x: 0, y: 0, width: w, height: h))
        }
        var white = 0
        for i in stride(from: 0, to: pixels.count, by: 4) {
            if (pixels[i] > 242 && pixels[i+1] > 242 && pixels[i+2] > 242) || (pixels[i] > 235 && pixels[i+1] > 195 && pixels[i+1] < 235 && pixels[i+2] > 195 && pixels[i+2] < 235) { white += 1 }
        }
        return Double(white) / Double(w * h)
    }
    // Locate the carousel's image band through Accessibility, without browser JavaScript.
    func imageCenter(_ element: AXUIElement, depth: Int = 0) -> Double? {
        if depth > 25 { return nil }
        var role: CFTypeRef?
        AXUIElementCopyAttributeValue(element, kAXRoleAttribute as CFString, &role)
        if role as? String == kAXImageRole {
            var pos: CFTypeRef?, extent: CFTypeRef?
            AXUIElementCopyAttributeValue(element, kAXPositionAttribute as CFString, &pos)
            AXUIElementCopyAttributeValue(element, kAXSizeAttribute as CFString, &extent)
            var p = CGPoint.zero, z = CGSize.zero
            if let pos, let extent {
                AXValueGetValue(pos as! AXValue, .cgPoint, &p)
                AXValueGetValue(extent as! AXValue, .cgSize, &z)
                if z.height > 100 { return p.y + z.height / 2 - origin.y }
            }
        }
        var children: CFTypeRef?
        AXUIElementCopyAttributeValue(element, kAXChildrenAttribute as CFString, &children)
        for child in children as? [AXUIElement] ?? [] {
            if let y = imageCenter(child, depth: depth + 1) { return y }
        }
        return nil
    }
    let stripY = option("--strip-y", imageCenter(axWindow) ?? size.height * 0.4)
    print("Watching a 30px strip at x=0, y=\(stripY)")
    let watcher = Task.detached { () -> String? in
        var sample = 0
        while !Task.isCancelled {
            do {
                let img = try await SCScreenshotManager.captureImage(contentFilter: filter, configuration: configuration)
                let strip = img.cropping(to: CGRect(x: 0, y: stripY, width: 30, height: 1))!
                var bytes = [UInt8](repeating: 0, count: 120)
                bytes.withUnsafeMutableBytes { data in
                    let ctx = CGContext(data: data.baseAddress, width: 30, height: 1, bitsPerComponent: 8, bytesPerRow: 120, space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)!
                    ctx.draw(strip, in: CGRect(x: 0, y: 0, width: 30, height: 1))
                }
                let allWhite = stride(from: 0, to: 120, by: 4).allSatisfy { bytes[$0] >= 250 && bytes[$0+1] >= 250 && bytes[$0+2] >= 250 }
                if allWhite {
                    let url = directory.appendingPathComponent("strip-blank-\(sample).png")
                    let dest = CGImageDestinationCreateWithURL(url as CFURL, UTType.png.identifier as CFString, 1, nil)!
                    CGImageDestinationAddImage(dest, img, nil)
                    CGImageDestinationFinalize(dest)
                    print("WHITE STRIP detected: \(url.path)")
                    fflush(stdout)
                    return url.path
                }
                sample += 1
                try await Task.sleep(nanoseconds: 50_000_000)
            } catch { return nil }
        }
        return nil
    }
    defer { watcher.cancel() }
    let baseline = try await capture("baseline")
    print("Capture directory: \(directory.path); baseline white fraction: \(baseline)")
    fflush(stdout)
    let runs = max(1, min(200, Int(option("--runs", 30))))
    let deltas: [Int32] = [20, 40, -60, 80, -100, 30, -45, 120]
    for run in 0..<runs {
        let amount = deltas[run % deltas.count]
        let gesture = true
        let events = [8, 12, 18, 10][run % 4]
        burst(amount, events: events, gesture: gesture)
        await pause(0.12)
        let early = try await capture(String(format: "%03d-early", run))
        await pause(0.55)
        let settled = try await capture(String(format: "%03d-settled", run))
        if (try? FileManager.default.contentsOfDirectory(atPath: directory.path).contains(where: { $0.hasPrefix("strip-blank-") })) == true {
            print("Stopped after native gesture \(run): white-strip screenshot saved.")
            break
        }
        let record: [String: Any] = ["run": run, "delta": amount, "events": events, "gesture": gesture, "earlyWhite": early, "settledWhite": settled]
        records.append(record)
        try JSONSerialization.data(withJSONObject: records, options: [.prettyPrinted, .sortedKeys]).write(to: directory.appendingPathComponent("results.json"))
        print("Run \(run): delta=\(amount), gesture=\(gesture), white=\(early)/\(settled)")
        fflush(stdout)
        if early > max(0.9, baseline + 0.4) || settled > max(0.9, baseline + 0.4) {
            print("BLANK CANDIDATE: inspect saved screenshots before concluding.")
            break
        }
    }
} else {
    burst(delta, events: count, gesture: args.contains("--gesture"))
    print("Posted native wheel burst: \(count) events, \(delta) px each, at (\(Int(point.x)), \(Int(point.y))).")
}
