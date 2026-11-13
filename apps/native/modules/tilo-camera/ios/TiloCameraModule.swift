import AVFoundation
import ExpoModulesCore
import ImageIO
import UIKit
import Vision

/// Tilo's camera (N6 Scanning): AVFoundation and Vision only, no third-party camera library
/// (Benn, 13 Nov 2026). The camera permission, barcodes from a still photo (the web's "Take a
/// photo" row), choosing a photo from the library, making a photo ready to send (resize,
/// re-encode, quality numbers), its own temporary files, and the preview view (TiloCameraView).
public class TiloCameraModule: Module {
  /// the library picker while it's open (released when it finishes)
  private var picker: PhotoPicker?

  public func definition() -> ModuleDefinition {
    Name("TiloCamera")

    /// "granted", "denied" (refused or restricted) or "undetermined".
    AsyncFunction("permissionStatus") { () -> String in
      TiloCameraModule.status(AVCaptureDevice.authorizationStatus(for: .video))
    }

    /// Asks once (the system shows NSCameraUsageDescription); resolves with the status after.
    AsyncFunction("requestPermission") { () async -> String in
      if AVCaptureDevice.authorizationStatus(for: .video) == .notDetermined {
        _ = await AVCaptureDevice.requestAccess(for: .video)
      }
      return TiloCameraModule.status(AVCaptureDevice.authorizationStatus(for: .video))
    }

    /// The retail barcodes Vision finds in a photo file, as [{ type, data }] with the live reader's
    /// type names ("ean13", "ean8", "upce"). Empty when there are none.
    AsyncFunction("barcodesInImage") { (uri: String) throws -> [[String: String]] in
      let image = try TiloCameraModule.cgImage(uri)
      let request = VNDetectBarcodesRequest()
      request.symbologies = [.ean13, .ean8, .upce]
      try VNImageRequestHandler(cgImage: image.cg, orientation: image.orientation, options: [:]).perform([request])
      var out: [[String: String]] = []
      for r in request.results ?? [] {
        guard let data = r.payloadStringValue, !data.isEmpty else { continue }
        let type: String
        switch r.symbology {
        case .ean13: type = "ean13"
        case .ean8: type = "ean8"
        case .upce: type = "upce"
        default: continue
        }
        out.append(["type": type, "data": data])
      }
      return out
    }

    /// One photo from the library (the system picker), copied into the module's temporary folder:
    /// { uri, width, height }, or null when the person cancels.
    AsyncFunction("pickPhoto") { (promise: Promise) in
      guard let vc = self.appContext?.utilities?.currentViewController() else {
        promise.reject(Exception(name: "NoScreen", description: "Nothing to show the photo picker from")); return
      }
      let picker = PhotoPicker()
      self.picker = picker
      picker.present(from: vc, promise: promise) { [weak self] in self?.picker = nil }
    }.runOnQueue(.main)

    /// A photo file made ready to send, as the web's toJpeg: upright, re-encoded with no metadata,
    /// trying each [long edge, quality] in `steps` until it fits in `maxBytes` (the rules are JS's:
    /// screens/scan/photoSize.ts). Also the quality numbers of the photo (FrameQuality on a grey copy
    /// at `qualityEdge`, `clip` from core), judged in JS. The source file is deleted when it's one of
    /// ours. Resolves { uri, base64, width, height, quality }; rejects "TooLarge" when nothing fits.
    AsyncFunction("preparePhoto") { (uri: String, steps: [[Double]], maxBytes: Int, qualityEdge: Int, clip: Int) throws -> [String: Any] in
      defer { TemporaryPhotos.delete(uri) }
      // only the module's own photos (camera shots and library picks) are read
      guard let url = TemporaryPhotos.owned(uri), let src = CGImageSourceCreateWithURL(url as CFURL, nil) else {
        throw Exception(name: "UnreadableImage", description: "The photo couldn't be opened")
      }
      let quality = TiloCameraModule.measure(src, edge: qualityEdge, clip: clip)
      guard let out = TemporaryPhotos.jpeg(src, steps: steps, maxBytes: maxBytes) else {
        throw Exception(name: "TooLarge", description: "The photo couldn't be made small enough")
      }
      let file = try TemporaryPhotos.write(out.data, ext: "jpg")
      var result: [String: Any] = ["uri": file.absoluteString, "base64": out.data.base64EncodedString(), "width": out.width, "height": out.height]
      if let quality { result["quality"] = quality.dictionary }
      return result
    }

    /// Deletes one of the module's temporary files (a retaken photo, a decoded barcode photo).
    AsyncFunction("deleteFile") { (uri: String) in
      TemporaryPhotos.delete(uri)
    }

    /// Deletes every temporary photo: after a read, when a scan screen closes, and at launch.
    AsyncFunction("clearTemporary") {
      TemporaryPhotos.clear()
    }

    View(TiloCameraView.self) {
      Events("onReady", "onMountError", "onBarcode", "onQuality")

      Prop("active", true) { (view: TiloCameraView, v: Bool) in view.active = v }
      /// "barcode", "label" or "off"
      Prop("mode", "barcode") { (view: TiloCameraView, v: String) in view.mode = v }
      /// from core labelQuality: QUALITY_EDGE and QUALITY_LIMITS.clip; how often to measure
      Prop("qualityEdge", 320) { (view: TiloCameraView, v: Int) in view.qualityEdge = max(16, v) }
      Prop("clip", 252) { (view: TiloCameraView, v: Int) in view.clip = v }
      Prop("qualityIntervalMs", 350) { (view: TiloCameraView, v: Int) in view.qualityIntervalMs = max(100, v) }

      AsyncFunction("takePhoto") { (view: TiloCameraView, promise: Promise) in
        view.takePhoto(promise)
      }
    }
  }

  /// FrameQuality of an image file on a grey copy at most `edge` px long (orientation doesn't
  /// change these numbers), or nil when it can't be drawn.
  private static func measure(_ src: CGImageSource, edge: Int, clip: Int) -> FrameQuality? {
    let opts: [CFString: Any] = [kCGImageSourceCreateThumbnailFromImageAlways: true, kCGImageSourceThumbnailMaxPixelSize: max(16, edge)]
    guard let cg = CGImageSourceCreateThumbnailAtIndex(src, 0, opts as CFDictionary) else { return nil }
    let (w, h) = FrameQuality.scaledSize(cg.width, cg.height, edge: edge)
    var gray = [UInt8](repeating: 0, count: w * h)
    let drawn = gray.withUnsafeMutableBytes { buf -> Bool in
      guard let ctx = CGContext(data: buf.baseAddress, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w,
                                space: CGColorSpaceCreateDeviceGray(), bitmapInfo: CGImageAlphaInfo.none.rawValue) else { return false }
      ctx.interpolationQuality = .medium
      ctx.draw(cg, in: CGRect(x: 0, y: 0, width: w, height: h))
      return true
    }
    return drawn ? FrameQuality.measure(gray, w, h, clip: clip) : nil
  }

  private static func status(_ s: AVAuthorizationStatus) -> String {
    switch s {
    case .authorized: return "granted"
    case .notDetermined: return "undetermined"
    default: return "denied"
    }
  }

  /// A photo file as a CGImage with its EXIF orientation (Vision reads the image as stored).
  private static func cgImage(_ uri: String) throws -> (cg: CGImage, orientation: CGImagePropertyOrientation) {
    // only the module's own photos are read
    guard let url = TemporaryPhotos.owned(uri),
          let src = CGImageSourceCreateWithURL(url as CFURL, nil),
          let cg = CGImageSourceCreateImageAtIndex(src, 0, nil) else {
      throw Exception(name: "UnreadableImage", description: "The photo couldn't be opened")
    }
    let props = CGImageSourceCopyPropertiesAtIndex(src, 0, nil) as? [CFString: Any]
    let raw = (props?[kCGImagePropertyOrientation] as? UInt32) ?? 1
    return (cg, CGImagePropertyOrientation(rawValue: raw) ?? .up)
  }
}
