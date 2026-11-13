# tilo-camera

Tilo's camera for the scan screens (N6), on Apple's own frameworks: AVFoundation for the preview,
live barcodes, frames and photos; Vision for barcodes in a still photo; PhotosUI for choosing a
photo; ImageIO for resizing and re-encoding. No outside library (Benn's dependency policy,
docs/plans/native-dependencies.md). iOS only in this pass.

## What it offers (index.ts)

| JS | Native |
|---|---|
| `<TiloCameraView mode="barcode">`, `onBarcode({ type, data })` | AVCaptureMetadataOutput, EAN-13, EAN-8, UPC-E (a UPC-A arrives as a 13-digit EAN-13) |
| `<TiloCameraView mode="label">`, `onQuality({ blur, brightness, glare })` | AVCaptureVideoDataOutput, luminance plane scaled to `qualityEdge`, at most one every `qualityIntervalMs` |
| `ref.takePhoto()` → `{ uri, width, height }` | AVCapturePhotoOutput, JPEG in Caches/TiloCamera (deleted by the screen once read) |
| `onReady`, `onMountError('denied' or 'none')` | session started; permission refused or no rear camera |
| `cameraPermission()`, `requestCameraPermission()` | AVCaptureDevice authorizationStatus / requestAccess |
| `barcodesInImage(uri)` | VNDetectBarcodesRequest (the web's "Take a photo" row) |
| `pickPhoto()` → `{ uri, width, height }` or null | PHPickerViewController (no library permission), the chosen file copied into Caches/TiloCamera |
| `preparePhoto(uri, steps, maxBytes, qualityEdge, clip)` | ImageIO: upright, at most each step's long edge (never scaled up), JPEG at each step's quality until it fits, no metadata (no EXIF or GPS); plus the source's quality numbers; the source deleted if it's ours |
| `deletePhoto(uri)`, `clearTemporaryPhotos()` | delete inside Caches/TiloCamera only (after a read, on close, at launch) |

The quality numbers are computed the way `measureFrame` in `src/core/domain/labelQuality.ts`
computes them (Laplacian variance, mean luminance, share of pixels at or above `clip`). The
thresholds are not in Swift: JS passes core's `QUALITY_EDGE` and `QUALITY_LIMITS.clip` in, and
judges the numbers with core's `qualityIssue` (`screens/scan/labelQualityLive.ts`). Two small
differences from the web's numbers, both inside the thresholds' forgiveness: the frame is
averaged down from the camera's luminance plane rather than drawn on a canvas, and luminance is
the camera's own Y (Rec. 601, as the web's `toGray`).

`app.plugin.js` writes `NSCameraUsageDescription` (compliance's wording). Add
`"./modules/tilo-camera/app.plugin.js"` to app.json's plugins.

## To check on the first device build (not compiled here: no Xcode in the cloud session)

- It compiles: `required init?(coder:)` is provided in case ExpoFabricView needs it; the podspec
  pins `swift_version` 5.9 (the capture delegates run on the module's own queues, and a captured
  `var` in `requestAccess`'s callback would be a Swift 6 error).
- A captured photo comes out upright in portrait (the photo connection's rotation isn't set; ImageIO
  applies the EXIF orientation when it re-encodes, so check the JPEG sent is upright).
- Turning the camera off and on (Retake, the front step) shows the live view again and `onReady`
  arrives each time; a photo taken as the camera stops rejects instead of hanging.
- The `.photo` session preset for both modes, and whether `.ean13/.ean8/.upce` are available on
  the metadata output after `addOutput` (they're filtered by `availableMetadataObjectTypes`).
- `TemporaryPhotos.owned` refuses a URI outside Caches/TiloCamera, including `%2E%2E` and
  symlinked forms, and on the device `/var` vs `/private/var` resolves the same on both sides.
- `qualityEdge`, `clip`, `qualityIntervalMs` and `lastQuality` are read on the frame queue and
  written on the main thread: plain Ints, a benign race; move them behind the queue if the
  sanitizer complains.
- The reported photo width and height follow the EXIF orientation (portrait for 5 to 8).
- EXIF check (compliance, blocking): take a label photo with Location Services on for the Camera
  app's own photos and pick one from the library; the base64 `preparePhoto` returns, decoded, has no
  EXIF, GPS or TIFF block (`CGImageSourceCopyPropertiesAtIndex` shows only pixel size and colour).
  `test:scan` guards the code path in the meantime.
- `preparePhoto`'s ImageIO thumbnail at the full long edge keeps full detail, and a HEIC library
  photo opens (CGImageSource reads HEIC).
- `pickPhoto` presents from `currentViewController()` while a React Native modal sheet is up.
- Continuous autofocus with the near range restriction reads both a barcode and small label print.
- The camera stops when the view leaves the window or `active` goes false (the green dot goes out).

## Android (later)

A Kotlin twin with the same names (module `TiloCamera`, view props and events): CameraX
(`androidx.camera`, Google's Jetpack library) with a `PreviewView`; live barcodes through ML Kit's
barcode scanner (`com.google.mlkit:barcode-scanning`, formats EAN-13, EAN-8, UPC-A, UPC-E: map
UPC-A to 'ean13' with a leading 0, or report it as 'upc_a', both handled in `mapping.ts`); an
`ImageAnalysis` use case reading the Y plane for the quality numbers, throttled the same way;
`ImageCapture` for photos into the cache dir; the system Photo Picker (`ActivityResultContracts.PickVisualMedia`) for the library; `BitmapFactory` with `inSampleSize` plus `Bitmap.compress` for the resize and re-encode (no EXIF written); ML Kit on an `InputImage.fromFilePath` for
`barcodesInImage`; `ContextCompat.checkSelfPermission` / an activity-result request for the
permission and `<uses-permission android:name="android.permission.CAMERA" />`. CameraX and ML Kit
are Google libraries, not part of the OS, so they need Benn's dependency policy first.
