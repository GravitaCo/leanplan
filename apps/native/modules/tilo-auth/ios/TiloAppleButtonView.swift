import AuthenticationServices
import ExpoModulesCore
import UIKit

/// Apple's own Sign in with Apple button (ASAuthorizationAppleIDButton), type "continue", as its
/// guidelines ask: the system draws the words, logo and colours; Tilo sets only black or white and
/// the corner radius. Its style can't change after it's made, so it's remade when `appearance` does.
final class TiloAppleButtonView: ExpoView {
  let onPress = EventDispatcher()

  var appearance = "black" { didSet { if oldValue != appearance { rebuild() } } }
  var cornerRadius: CGFloat = 27 { didSet { button?.cornerRadius = cornerRadius } }
  private var button: ASAuthorizationAppleIDButton?

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    backgroundColor = .clear
    rebuild()
  }

  required init?(coder: NSCoder) {
    fatalError("init(coder:) is not used")
  }

  private func rebuild() {
    button?.removeFromSuperview()
    let b = ASAuthorizationAppleIDButton(authorizationButtonType: .continue, authorizationButtonStyle: appearance == "white" ? .white : .black)
    b.cornerRadius = cornerRadius
    b.addTarget(self, action: #selector(pressed), for: .touchUpInside)
    b.frame = bounds
    b.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    addSubview(b)
    button = b
  }

  @objc private func pressed() {
    onPress([:])
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    button?.frame = bounds
  }
}
