import AVFoundation
import ExpoModulesCore
import ImageIO
import UIKit
import Vision

/// Tilo's camera (N6 Scanning): AVFoundation and Vision only, no third-party camera library
/// (Benn, 13 Nov 2026). The camera permission, barcodes from a still photo (the web's "Take a
/// photo" row), the quality numbers of a still photo, and the preview view (TiloCameraView).
public class TiloCameraModule: Module {
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

    /// The quality numbers of a photo file (FrameQuality on a grey copy at most `edge` px long),
    /// for the review row's "May be hard to read" after a capture or a pick. JS judges them.
    AsyncFunction("measureImage") { (uri: String, edge: Int, clip: Int) throws -> [String: Any] in
      let image = try TiloCameraModule.cgImage(uri)
      let (w, h) = FrameQuality.scaledSize(image.cg.width, image.cg.height, edge: edge)
      var gray = [UInt8](repeating: 0, count: w * h)
      let drawn = gray.withUnsafeMutableBytes { buf -> Bool in
        guard let ctx = CGContext(data: buf.baseAddress, width: w, height: h, bitsPerComponent: 8, bytesPerRow: w,
                                  space: CGColorSpaceCreateDeviceGray(), bitmapInfo: CGImageAlphaInfo.none.rawValue) else { return false }
        ctx.interpolationQuality = .medium
        ctx.draw(image.cg, in: CGRect(x: 0, y: 0, width: w, height: h))
        return true
      }
      guard drawn else { throw Exception(name: "UnreadableImage", description: "The photo couldn't be read") }
      return FrameQuality.measure(gray, w, h, clip: clip).dictionary
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

  private static func status(_ s: AVAuthorizationStatus) -> String {
    switch s {
    case .authorized: return "granted"
    case .notDetermined: return "undetermined"
    default: return "denied"
    }
  }

  /// A photo file as a CGImage with its EXIF orientation (Vision reads the image as stored).
  private static func cgImage(_ uri: String) throws -> (cg: CGImage, orientation: CGImagePropertyOrientation) {
    guard let url = URL(string: uri), url.isFileURL,
          let src = CGImageSourceCreateWithURL(url as CFURL, nil),
          let cg = CGImageSourceCreateImageAtIndex(src, 0, nil) else {
      throw Exception(name: "UnreadableImage", description: "The photo couldn't be opened")
    }
    let props = CGImageSourceCopyPropertiesAtIndex(src, 0, nil) as? [CFString: Any]
    let raw = (props?[kCGImagePropertyOrientation] as? UInt32) ?? 1
    return (cg, CGImagePropertyOrientation(rawValue: raw) ?? .up)
  }
}
