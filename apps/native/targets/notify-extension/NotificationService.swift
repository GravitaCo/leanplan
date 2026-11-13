import UserNotifications

/// Tilo's Notification Service Extension (native-build-plan N12; mental-performance, 13 Nov 2026).
///
/// iOS runs this as each Mind reminder arrives (the reminder function sets `mutable-content` on
/// check-in, wind-down and plan check-in reminders only), even when the app isn't running. It
/// records that the reminder was shown, as the web's service worker does, so the back-off sees every
/// delivery, and it changes nothing the person sees: the content goes back exactly as it came.
///
/// What it records, in the app group's shared defaults (the app reads and empties it through the
/// TiloNotify module): {id, kind, at} per delivery, at most 60, no text and nothing from the log.
/// `id` is the reminder function's own id for that send (`body.id`); a reminder without one, or of
/// any other type, isn't recorded. Device-only, never synced.
class NotificationService: UNNotificationServiceExtension {
  /// Keep in step with apps/native/modules/tilo-notify/ios/TiloNotifyModule.swift and
  /// supabase/functions/_shared/reminders.ts MIND_KINDS (npm test checks).
  static let appGroup = "group.fit.tilo.app"
  static let key = "tali.notify.delivered"
  static let mindKinds: Set<String> = ["checkin", "wind-down", "plan"]
  static let maxKept = 60

  override func didReceive(_ request: UNNotificationRequest, withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void) {
    NotificationService.record(request.content.userInfo)
    contentHandler(request.content)
  }

  // Nothing to finish: the content was handed back as soon as it arrived.
  override func serviceExtensionTimeWillExpire() {}

  static func record(_ userInfo: [AnyHashable: Any]) {
    guard
      let body = userInfo["body"] as? [String: Any],
      let kind = body["kind"] as? String, mindKinds.contains(kind),
      let id = body["id"] as? String, id.count >= 8, id.count <= 64,
      id.allSatisfy({ $0.isHexDigit || $0 == "-" }),
      let defaults = UserDefaults(suiteName: appGroup)
    else { return }
    var list = defaults.array(forKey: key) as? [[String: Any]] ?? []
    if list.contains(where: { ($0["id"] as? String) == id }) { return }
    list.append(["id": id, "kind": kind, "at": Date().timeIntervalSince1970 * 1000])
    if list.count > maxKept { list.removeFirst(list.count - maxKept) }
    defaults.set(list, forKey: key)
  }
}
