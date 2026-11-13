import ExpoModulesCore

/// The app's side of Tilo's Notification Service Extension (apps/native/targets/notify-extension):
/// reads the Mind reminder deliveries it recorded in the app group and empties the list, or deletes
/// it (wipe, sign-out-and-remove, another account on this phone). Records are {id, kind, at}.
public class TiloNotifyModule: Module {
  /// Keep in step with NotificationService.swift (npm test checks).
  static let appGroup = "group.fit.tilo.app"
  static let key = "tali.notify.delivered"

  public func definition() -> ModuleDefinition {
    Name("TiloNotify")

    /// Every delivery recorded since the last call, oldest first; the list is emptied. Not atomic
    /// against the extension: one recorded between the read and the remove is lost, which can only
    /// under-count for the back-off (never over-count). Accepted (ship-critic, 13 Nov 2026).
    Function("takeDelivered") { () -> [[String: Any]] in
      guard let defaults = UserDefaults(suiteName: TiloNotifyModule.appGroup) else { return [] }
      let list = defaults.array(forKey: TiloNotifyModule.key) as? [[String: Any]] ?? []
      defaults.removeObject(forKey: TiloNotifyModule.key)
      return list
    }

    /// Delete the list.
    Function("clear") { () -> Void in
      UserDefaults(suiteName: TiloNotifyModule.appGroup)?.removeObject(forKey: TiloNotifyModule.key)
    }
  }
}
