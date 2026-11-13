import ExpoModulesCore
import ImageIO
import PhotosUI
import UIKit
import UniformTypeIdentifiers

/// One photo from the library through the system picker (PHPickerViewController: no library
/// permission, Tilo sees only the photo chosen). The chosen file is copied into TemporaryPhotos
/// and resolved as { uri, width, height }, or nil when the person cancels.
final class PhotoPicker: NSObject, PHPickerViewControllerDelegate {
  private var promise: Promise?
  private var done: (() -> Void)?

  /// On the main thread. `done` lets the module release this picker afterwards.
  func present(from vc: UIViewController, promise: Promise, done: @escaping () -> Void) {
    self.promise = promise
    self.done = done
    var config = PHPickerConfiguration()
    config.filter = .images
    config.selectionLimit = 1
    let picker = PHPickerViewController(configuration: config)
    picker.delegate = self
    vc.present(picker, animated: true)
  }

  func picker(_ picker: PHPickerViewController, didFinishPicking results: [PHPickerResult]) {
    picker.dismiss(animated: true)
    guard let provider = results.first?.itemProvider, provider.hasItemConformingToTypeIdentifier(UTType.image.identifier) else {
      finish(.success(nil)); return
    }
    provider.loadFileRepresentation(forTypeIdentifier: UTType.image.identifier) { [weak self] url, error in
      // `url` lives only inside this callback: copy it now
      guard let self else { return }
      guard let url else { self.finish(.failure(error ?? Exception(name: "UnreadableImage", description: "The photo couldn't be opened"))); return }
      do {
        let copy = try TemporaryPhotos.newFile(ext: url.pathExtension.isEmpty ? "img" : url.pathExtension.lowercased())
        try FileManager.default.copyItem(at: url, to: copy)
        guard let src = CGImageSourceCreateWithURL(copy as CFURL, nil), let (w, h) = TemporaryPhotos.uprightSize(src) else {
          TemporaryPhotos.delete(copy.absoluteString)
          throw Exception(name: "UnreadableImage", description: "The photo couldn't be opened")
        }
        self.finish(.success(["uri": copy.absoluteString, "width": w, "height": h]))
      } catch {
        self.finish(.failure(error))
      }
    }
  }

  private func finish(_ r: Result<[String: Any]?, Error>) {
    DispatchQueue.main.async {
      switch r {
      case .success(let v): self.promise?.resolve(v)
      case .failure(let e): self.promise?.reject(e)
      }
      self.promise = nil
      self.done?()
      self.done = nil
    }
  }
}
