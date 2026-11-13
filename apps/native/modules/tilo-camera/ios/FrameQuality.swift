import Foundation

/// Label photo quality measured on a small greyscale copy of a frame: the same three numbers, by
/// the same arithmetic, as `measureFrame` in src/core/domain/labelQuality.ts (variance of the
/// 4-neighbour Laplacian, mean luminance, share of pixels at or above `clip`). Thresholds are NOT
/// here: JavaScript passes `edge` and `clip` in and judges the result with core's `qualityIssue`.
struct FrameQuality {
  let blur: Double
  let brightness: Double
  let glare: Double

  var dictionary: [String: Any] { ["blur": blur, "brightness": brightness, "glare": glare] }

  /// `gray`: one byte per pixel, row-major, `w` × `h`.
  static func measure(_ gray: [UInt8], _ w: Int, _ h: Int, clip: Int) -> FrameQuality {
    let n = w * h
    guard n > 0, gray.count >= n else { return FrameQuality(blur: 0, brightness: 0, glare: 0) }
    var sum = 0
    var clipped = 0
    for i in 0..<n {
      let v = Int(gray[i])
      sum += v
      if v >= clip { clipped += 1 }
    }
    var lSum = 0.0
    var lSq = 0.0
    var count = 0.0
    if w > 2 && h > 2 {
      for y in 1..<(h - 1) {
        let row = y * w
        for x in 1..<(w - 1) {
          let i = row + x
          let l = Double(Int(gray[i - w]) + Int(gray[i + w]) + Int(gray[i - 1]) + Int(gray[i + 1]) - 4 * Int(gray[i]))
          lSum += l
          lSq += l * l
          count += 1
        }
      }
    }
    let mean = count > 0 ? lSum / count : 0
    return FrameQuality(
      blur: count > 0 ? lSq / count - mean * mean : 0,
      brightness: Double(sum) / Double(n),
      glare: Double(clipped) / Double(n)
    )
  }

  /// The size a `width` × `height` frame is scaled to so its long edge is at most `edge` (never up).
  static func scaledSize(_ width: Int, _ height: Int, edge: Int) -> (Int, Int) {
    let long = max(width, height)
    guard long > edge, long > 0 else { return (max(1, width), max(1, height)) }
    let s = Double(edge) / Double(long)
    return (max(1, Int((Double(width) * s).rounded())), max(1, Int((Double(height) * s).rounded())))
  }

  /// A luminance plane (one byte per pixel, `bytesPerRow` apart) scaled down to at most `edge` on
  /// its long edge by averaging each block of source pixels (the web draws the frame onto a small
  /// canvas, which also averages).
  static func downscale(plane: UnsafePointer<UInt8>, width: Int, height: Int, bytesPerRow: Int, edge: Int) -> ([UInt8], Int, Int) {
    let (w, h) = scaledSize(width, height, edge: edge)
    var out = [UInt8](repeating: 0, count: w * h)
    for oy in 0..<h {
      let y0 = oy * height / h
      let y1 = max(y0 + 1, (oy + 1) * height / h)
      for ox in 0..<w {
        let x0 = ox * width / w
        let x1 = max(x0 + 1, (ox + 1) * width / w)
        var s = 0
        var c = 0
        // sample at most a 4 × 4 grid inside the block: enough for an average, cheap per frame
        let sy = max(1, (y1 - y0) / 4)
        let sx = max(1, (x1 - x0) / 4)
        var y = y0
        while y < y1 {
          let row = plane + y * bytesPerRow
          var x = x0
          while x < x1 { s += Int(row[x]); c += 1; x += sx }
          y += sy
        }
        out[oy * w + ox] = UInt8(c > 0 ? s / c : 0)
      }
    }
    return (out, w, h)
  }
}
