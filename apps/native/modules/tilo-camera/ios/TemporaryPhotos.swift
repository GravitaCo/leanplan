import Foundation
import ImageIO
import UniformTypeIdentifiers

/// The module's own temporary folder (Caches/TiloCamera): every photo the camera takes, every
/// library pick and every prepared JPEG lives here, and only here, until JS asks for it to go. The
/// module deletes only inside this folder.
enum TemporaryPhotos {
  static var directory: URL {
    FileManager.default.urls(for: .cachesDirectory, in: .userDomainMask)[0].appendingPathComponent("TiloCamera", isDirectory: true)
  }

  /// A new file URL in the folder (created if needed).
  static func newFile(ext: String) throws -> URL {
    try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
    return directory.appendingPathComponent(UUID().uuidString + "." + ext)
  }

  /// Writes `data` with complete file protection (unreadable while the phone is locked).
  static func write(_ data: Data, ext: String) throws -> URL {
    let url = try newFile(ext: ext)
    try data.write(to: url, options: [.atomic, .completeFileProtection])
    return url
  }

  static func contains(_ url: URL) -> Bool {
    url.isFileURL && url.standardizedFileURL.path.hasPrefix(directory.standardizedFileURL.path + "/")
  }

  /// Deletes `uri` if it's one of ours; anything else is left alone.
  static func delete(_ uri: String) {
    guard let url = URL(string: uri), contains(url) else { return }
    try? FileManager.default.removeItem(at: url)
  }

  /// Deletes the whole folder (after a read, when a screen closes, and at launch).
  static func clear() {
    try? FileManager.default.removeItem(at: directory)
  }

  /// The upright pixel size of an image file (EXIF orientations 5 to 8 swap width and height).
  static func uprightSize(_ src: CGImageSource) -> (Int, Int)? {
    guard let p = CGImageSourceCopyPropertiesAtIndex(src, 0, nil) as? [CFString: Any],
          let w = p[kCGImagePropertyPixelWidth] as? Int, let h = p[kCGImagePropertyPixelHeight] as? Int else { return nil }
    let o = (p[kCGImagePropertyOrientation] as? UInt32) ?? 1
    return o >= 5 ? (h, w) : (w, h)
  }

  /// The web's toJpeg on ImageIO: for each [long edge, JPEG quality] step, the image upright, at
  /// most that long edge (never scaled up), re-encoded with no metadata at all (so no EXIF or GPS
  /// leaves the phone), until it fits in `maxBytes`. Nil when no step fits.
  static func jpeg(_ src: CGImageSource, steps: [[Double]], maxBytes: Int) -> (data: Data, width: Int, height: Int)? {
    guard let (w, h) = uprightSize(src) else { return nil }
    let long = max(w, h)
    for step in steps where step.count == 2 {
      let edge = min(Int(step[0]), long)
      let opts: [CFString: Any] = [
        kCGImageSourceCreateThumbnailFromImageAlways: true,
        kCGImageSourceCreateThumbnailWithTransform: true,
        kCGImageSourceThumbnailMaxPixelSize: edge,
        kCGImageSourceShouldCacheImmediately: true,
      ]
      guard let image = CGImageSourceCreateThumbnailAtIndex(src, 0, opts as CFDictionary) else { continue }
      let out = NSMutableData()
      guard let dest = CGImageDestinationCreateWithData(out as CFMutableData, UTType.jpeg.identifier as CFString, 1, nil) else { continue }
      CGImageDestinationAddImage(dest, image, [kCGImageDestinationLossyCompressionQuality: step[1]] as CFDictionary)
      guard CGImageDestinationFinalize(dest) else { continue }
      if out.length <= maxBytes { return (out as Data, image.width, image.height) }
    }
    return nil
  }
}
