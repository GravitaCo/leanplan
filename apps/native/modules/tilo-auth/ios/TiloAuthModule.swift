import AuthenticationServices
import ExpoModulesCore
import UIKit

/// Sign in with Apple (Benn, 13 Nov 2026), on Apple's AuthenticationServices: no outside library
/// (dependency policy rule 1). `signIn` shows the system sheet and resolves with Apple's credential
/// for Supabase's signInWithIdToken, or null when the person closes it. The button is the system's
/// own (TiloAppleButtonView), as Apple's guidelines ask.
///
/// Only the email scope is asked for: Tilo doesn't keep a name from Apple (the profile's name is the
/// one the person types), so nothing more is collected than the sign-in needs.
public class TiloAuthModule: Module {
  /// the request while its sheet is open (released when it finishes)
  private var request: AppleSignIn?

  public func definition() -> ModuleDefinition {
    Name("TiloAuth")

    /// Sign in with Apple is part of iOS 13 and later (the app needs 17).
    Function("isAvailable") { () -> Bool in true }

    /// Shows Apple's sheet. `nonceSha256` is the SHA-256 (hex) of a one-time nonce whose raw value
    /// only the app holds; Supabase checks the token's nonce against it. Resolves
    /// { identityToken, authorizationCode, user, email } or null when cancelled.
    AsyncFunction("signIn") { (nonceSha256: String, promise: Promise) in
      if self.request != nil {
        promise.reject(Exception(name: "Busy", description: "Sign in with Apple is already open")); return
      }
      // no window to show the sheet over: say so, rather than a sheet that never appears and a
      // request that stays open (every later try would then be "Busy")
      guard let anchor = self.appContext?.utilities?.currentViewController()?.view.window else {
        promise.reject(Exception(name: "NoScreen", description: "Nothing to show Sign in with Apple from")); return
      }
      let request = AppleSignIn(promise: promise, anchor: anchor) { [weak self] in self?.request = nil }
      self.request = request
      request.start(nonceSha256: nonceSha256)
    }.runOnQueue(.main)

    /// The system "Continue with Apple" button, black or white (`appearance`: "black" | "white").
    View(TiloAppleButtonView.self) {
      Events("onPress")
      Prop("appearance") { (view: TiloAppleButtonView, value: String) in view.appearance = value }
      Prop("cornerRadius") { (view: TiloAppleButtonView, value: Double) in view.cornerRadius = CGFloat(value) }
    }
  }
}

/// One Sign in with Apple request: the controller's delegate and presentation anchor.
final class AppleSignIn: NSObject, ASAuthorizationControllerDelegate, ASAuthorizationControllerPresentationContextProviding {
  private let promise: Promise
  private let anchor: UIWindow
  private let done: () -> Void
  /// held for as long as the request is open (not left to the system)
  private var controller: ASAuthorizationController?

  init(promise: Promise, anchor: UIWindow, done: @escaping () -> Void) {
    self.promise = promise
    self.anchor = anchor
    self.done = done
  }

  func start(nonceSha256: String) {
    let request = ASAuthorizationAppleIDProvider().createRequest()
    request.requestedScopes = [.email]
    request.nonce = nonceSha256
    let controller = ASAuthorizationController(authorizationRequests: [request])
    controller.delegate = self
    controller.presentationContextProvider = self
    self.controller = controller
    controller.performRequests()
  }

  func presentationAnchor(for controller: ASAuthorizationController) -> ASPresentationAnchor {
    anchor
  }

  func authorizationController(controller: ASAuthorizationController, didCompleteWithAuthorization authorization: ASAuthorization) {
    defer { self.controller = nil; done() }
    guard let c = authorization.credential as? ASAuthorizationAppleIDCredential,
          let tokenData = c.identityToken, let token = String(data: tokenData, encoding: .utf8) else {
      promise.reject(Exception(name: "NoToken", description: "Apple didn't return a sign-in token")); return
    }
    var out: [String: Any] = ["identityToken": token, "user": c.user]
    if let code = c.authorizationCode, let s = String(data: code, encoding: .utf8) { out["authorizationCode"] = s }
    if let email = c.email { out["email"] = email }
    promise.resolve(out)
  }

  func authorizationController(controller: ASAuthorizationController, didCompleteWithError error: Error) {
    defer { self.controller = nil; done() }
    // closing the sheet is a choice, not a failure: resolve null, as the Google sheet's cancel
    if let e = error as? ASAuthorizationError, e.code == .canceled {
      promise.resolve(nil); return
    }
    promise.reject(Exception(name: "AppleSignInFailed", description: error.localizedDescription))
  }
}
