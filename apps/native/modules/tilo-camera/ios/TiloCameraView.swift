import AVFoundation
import ImageIO
import ExpoModulesCore
import UIKit

/// The camera preview for the scan screens: the rear camera, filling the view (the web's
/// `object-fit: cover`), running only while `active` and on screen.
///
/// - mode "barcode": live retail barcode reads (EAN-13, EAN-8, UPC-E; a UPC-A arrives as a
///   13-digit EAN-13 with a leading 0) through AVCaptureMetadataOutput, sent as `onBarcode`.
/// - mode "label": per-frame quality numbers (FrameQuality) from AVCaptureVideoDataOutput, at most
///   one every `qualityIntervalMs`, sent as `onQuality`; and photo capture (`takePhoto`).
///
/// Unsure without a device build (flagged for the lead's first run): the session preset per mode,
/// and whether the photo output's quality prioritisation is right for small label print.
final class TiloCameraView: ExpoView, AVCaptureMetadataOutputObjectsDelegate, AVCaptureVideoDataOutputSampleBufferDelegate, AVCapturePhotoCaptureDelegate {
  let onReady = EventDispatcher()
  let onMountError = EventDispatcher()
  let onBarcode = EventDispatcher()
  let onQuality = EventDispatcher()

  // props (set on the main thread by the view manager)
  var active = true { didSet { if oldValue != active { updateRunning() } } }
  var mode = "barcode" { didSet { if oldValue != mode { reconfigure() } } }
  var qualityEdge = 320
  var clip = 252
  var qualityIntervalMs = 350

  private let session = AVCaptureSession()
  private let sessionQueue = DispatchQueue(label: "fit.tilo.camera.session")
  private let frameQueue = DispatchQueue(label: "fit.tilo.camera.frames")
  private let previewLayer = AVCaptureVideoPreviewLayer()
  private var input: AVCaptureDeviceInput?
  private let metadataOutput = AVCaptureMetadataOutput()
  private let videoOutput = AVCaptureVideoDataOutput()
  private let photoOutput = AVCapturePhotoOutput()
  private var configured = false
  private var failed = false
  private var lastQuality: CFTimeInterval = 0
  private var pendingPhotos: [Int64: Promise] = [:]

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    clipsToBounds = true
    backgroundColor = .clear
    previewLayer.session = session
    previewLayer.videoGravity = .resizeAspectFill
    layer.addSublayer(previewLayer)
  }

  required init?(coder: NSCoder) {
    fatalError("init(coder:) is not used")
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    previewLayer.frame = bounds
  }

  override func didMoveToWindow() {
    super.didMoveToWindow()
    updateRunning()
  }

  deinit {
    let s = session
    sessionQueue.async { if s.isRunning { s.stopRunning() } }
  }

  // MARK: - running

  private var shouldRun: Bool { active && window != nil && mode != "off" }

  /// On the main thread: UIKit state (`window`) and the props are read here and handed to the
  /// session queue as values.
  private func updateRunning() {
    let run = shouldRun
    let mode = self.mode
    sessionQueue.async { [weak self] in
      guard let self else { return }
      if run {
        guard self.ensureConfigured(mode: mode) else { return }
        if !self.session.isRunning {
          self.session.startRunning()
          // on every start, not only the first: JS shows "Starting the camera…" each time a
          // capture step turns the camera back on, and waits for this
          DispatchQueue.main.async { self.onReady() }
        }
      } else if self.session.isRunning {
        self.session.stopRunning()
        // a photo still being taken won't arrive now: settle its promise so JS never waits
        DispatchQueue.main.async { self.rejectPendingPhotos() }
      }
    }
  }

  /// On the session queue. False (with onMountError sent once) when the camera can't be used.
  private func ensureConfigured(mode: String) -> Bool {
    if configured { return true }
    if failed { return false }
    switch AVCaptureDevice.authorizationStatus(for: .video) {
    case .authorized: break
    case .notDetermined:
      // the screen asks first (TiloCamera.requestPermission); asked here only as a fallback,
      // waiting on the session queue (never the main thread) for the answer
      let answered = DispatchSemaphore(value: 0)
      var granted = false
      AVCaptureDevice.requestAccess(for: .video) { ok in granted = ok; answered.signal() }
      answered.wait()
      if !granted { fail("denied"); return false }
    default:
      fail("denied"); return false
    }
    guard let device = AVCaptureDevice.default(.builtInWideAngleCamera, for: .video, position: .back),
          let input = try? AVCaptureDeviceInput(device: device) else {
      fail("none"); return false
    }
    session.beginConfiguration()
    session.sessionPreset = .photo
    if session.canAddInput(input) { session.addInput(input); self.input = input } else {
      session.commitConfiguration(); fail("none"); return false
    }
    if session.canAddOutput(metadataOutput) { session.addOutput(metadataOutput) }
    metadataOutput.setMetadataObjectsDelegate(self, queue: frameQueue)
    if session.canAddOutput(videoOutput) {
      videoOutput.videoSettings = [kCVPixelBufferPixelFormatTypeKey as String: kCVPixelFormatType_420YpCbCr8BiPlanarFullRange]
      videoOutput.alwaysDiscardsLateVideoFrames = true
      session.addOutput(videoOutput)
    }
    if session.canAddOutput(photoOutput) {
      session.addOutput(photoOutput)
      photoOutput.maxPhotoQualityPrioritization = .quality
    }
    applyMode(mode)
    session.commitConfiguration()
    // continuous autofocus suits both a barcode at arm's length and a label close up
    if (try? device.lockForConfiguration()) != nil {
      if device.isFocusModeSupported(.continuousAutoFocus) { device.focusMode = .continuousAutoFocus }
      if device.isAutoFocusRangeRestrictionSupported { device.autoFocusRangeRestriction = .near }
      device.unlockForConfiguration()
    }
    configured = true
    return true
  }

  /// On the session queue: which outputs deliver for `mode` (read on main, passed in).
  private func applyMode(_ mode: String) {
    let barcode = mode == "barcode"
    // the retail formats only; asked for after the output joins the session, as AVFoundation requires
    let wanted: [AVMetadataObject.ObjectType] = [.ean13, .ean8, .upce]
    metadataOutput.metadataObjectTypes = barcode ? wanted.filter { metadataOutput.availableMetadataObjectTypes.contains($0) } : []
    videoOutput.setSampleBufferDelegate(mode == "label" ? self : nil, queue: frameQueue)
  }

  /// On the main thread, like updateRunning.
  private func reconfigure() {
    let mode = self.mode
    sessionQueue.async { [weak self] in
      guard let self else { return }
      guard self.configured else { DispatchQueue.main.async { self.updateRunning() }; return }
      self.session.beginConfiguration()
      self.applyMode(mode)
      self.session.commitConfiguration()
      DispatchQueue.main.async { self.updateRunning() }
    }
  }

  private func fail(_ reason: String) {
    failed = true
    DispatchQueue.main.async { self.onMountError(["reason": reason]) }
  }

  // MARK: - barcodes

  func metadataOutput(_ output: AVCaptureMetadataOutput, didOutput metadataObjects: [AVMetadataObject], from connection: AVCaptureConnection) {
    for case let code as AVMetadataMachineReadableCodeObject in metadataObjects {
      guard let data = code.stringValue, !data.isEmpty else { continue }
      let type: String
      switch code.type {
      case .ean13: type = "ean13"
      case .ean8: type = "ean8"
      case .upce: type = "upce"
      default: continue
      }
      DispatchQueue.main.async { [weak self] in self?.onBarcode(["type": type, "data": data]) }
    }
  }

  // MARK: - label quality

  func captureOutput(_ output: AVCaptureOutput, didOutput sampleBuffer: CMSampleBuffer, from connection: AVCaptureConnection) {
    let now = CACurrentMediaTime()
    guard (now - lastQuality) * 1000 >= Double(qualityIntervalMs),
          let pixels = CMSampleBufferGetImageBuffer(sampleBuffer) else { return }
    lastQuality = now
    CVPixelBufferLockBaseAddress(pixels, .readOnly)
    defer { CVPixelBufferUnlockBaseAddress(pixels, .readOnly) }
    // plane 0 of a 420 bi-planar full-range buffer is luminance, one byte per pixel
    guard let base = CVPixelBufferGetBaseAddressOfPlane(pixels, 0) else { return }
    let w = CVPixelBufferGetWidthOfPlane(pixels, 0)
    let h = CVPixelBufferGetHeightOfPlane(pixels, 0)
    let row = CVPixelBufferGetBytesPerRowOfPlane(pixels, 0)
    let (gray, gw, gh) = FrameQuality.downscale(plane: base.assumingMemoryBound(to: UInt8.self), width: w, height: h, bytesPerRow: row, edge: qualityEdge)
    let q = FrameQuality.measure(gray, gw, gh, clip: clip)
    DispatchQueue.main.async { [weak self] in self?.onQuality(q.dictionary) }
  }

  // MARK: - photos

  /// A JPEG of the current frame in the app's cache (Caches/TiloCamera), resolved as
  /// { uri, width, height }. The screen deletes it as soon as it's read.
  func takePhoto(_ promise: Promise) {
    sessionQueue.async { [weak self] in
      guard let self, self.configured, self.session.isRunning else {
        promise.reject(Exception(name: "CameraNotRunning", description: "The camera isn't running")); return
      }
      let settings = AVCapturePhotoSettings(format: [AVVideoCodecKey: AVVideoCodecType.jpeg])
      settings.photoQualityPrioritization = .balanced
      DispatchQueue.main.async {
        self.pendingPhotos[settings.uniqueID] = promise
        self.sessionQueue.async { self.photoOutput.capturePhoto(with: settings, delegate: self) }
      }
    }
  }

  /// On the main thread.
  private func rejectPendingPhotos() {
    let pending = pendingPhotos
    pendingPhotos.removeAll()
    for promise in pending.values {
      promise.reject(Exception(name: "CameraStopped", description: "The camera stopped before the photo was taken"))
    }
  }

  func photoOutput(_ output: AVCapturePhotoOutput, didFinishProcessingPhoto photo: AVCapturePhoto, error: Error?) {
    let id = photo.resolvedSettings.uniqueID
    let result: Result<[String: Any], Error>
    if let error {
      result = .failure(error)
    } else if let data = photo.fileDataRepresentation() {
      do {
        let url = try TemporaryPhotos.write(data, ext: "jpg")
        // the stored JPEG is upright by its EXIF orientation; report the upright size
        let dims = photo.resolvedSettings.photoDimensions
        let portrait = (photo.metadata[kCGImagePropertyOrientation as String] as? UInt32).map { $0 >= 5 } ?? false
        result = .success(["uri": url.absoluteString, "width": Int(portrait ? dims.height : dims.width), "height": Int(portrait ? dims.width : dims.height)])
      } catch {
        result = .failure(error)
      }
    } else {
      result = .failure(Exception(name: "NoPhoto", description: "The photo had no data"))
    }
    DispatchQueue.main.async { [weak self] in
      guard let promise = self?.pendingPhotos.removeValue(forKey: id) else {
        // nobody waits for it any more (the camera stopped and its promise was rejected): the file goes
        if case .success(let v) = result, let uri = v["uri"] as? String { TemporaryPhotos.delete(uri) }
        return
      }
      switch result {
      case .success(let v): promise.resolve(v)
      case .failure(let e): promise.reject(e)
      }
    }
  }
}
