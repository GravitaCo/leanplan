import ExpoModulesCore
import UIKit

/// The date and time wheels (native-build-plan N1, Benn: our own module, no outside library): the
/// system UIDatePicker in its wheels style, as iOS shows a web page's `<input type="time">` or
/// `<input type="date">`. Values cross as the web's input values: "HH:mm" and "yyyy-MM-dd".
public class TiloPickersModule: Module {
  public func definition() -> ModuleDefinition {
    Name("TiloPickers")

    /// "HH:mm" as this phone shows a time (its 12 or 24 hour setting, as Safari shows a time input)
    Function("formatTime") { (hhmm: String) -> String in
      guard let d = TiloDateWheelView.parseTime(hhmm) else { return hhmm }
      let f = DateFormatter()
      f.locale = .autoupdatingCurrent
      f.dateStyle = .none
      f.timeStyle = .short
      return f.string(from: d)
    }

    View(TiloDateWheelView.self) {
      Events("onPick")

      /// "time" or "date"
      Prop("mode", "time") { (view: TiloDateWheelView, v: String) in view.mode = v == "date" ? "date" : "time" }
      /// the current value, "HH:mm" or "yyyy-MM-dd"; empty leaves the wheels where they are
      Prop("value", "") { (view: TiloDateWheelView, v: String) in view.value = v }
      /// the date mode's earliest and latest days, "yyyy-MM-dd" (empty: none)
      Prop("min", "") { (view: TiloDateWheelView, v: String) in view.min = v }
      Prop("max", "") { (view: TiloDateWheelView, v: String) in view.max = v }
      /// the minute wheel's step (1 to 30)
      Prop("minuteInterval", 1) { (view: TiloDateWheelView, v: Int) in view.minuteInterval = v }

      // every prop is in before the wheels are set, whatever order they arrive in
      OnViewDidUpdateProps { (view: TiloDateWheelView) in view.apply() }
    }
  }
}

final class TiloDateWheelView: ExpoView {
  let onPick = EventDispatcher()
  let picker = UIDatePicker()

  var mode = "time"
  var value = ""
  var min = ""
  var max = ""
  var minuteInterval = 1

  private static func formatter(_ format: String) -> DateFormatter {
    let f = DateFormatter()
    f.locale = Locale(identifier: "en_US_POSIX")
    f.calendar = Calendar(identifier: .gregorian)
    f.timeZone = .current
    f.dateFormat = format
    return f
  }
  private static let timeFormat = formatter("HH:mm")
  private static let dateFormat = formatter("yyyy-MM-dd")
  private var format: DateFormatter { mode == "date" ? Self.dateFormat : Self.timeFormat }
  static func parseTime(_ v: String) -> Date? { timeFormat.date(from: v) }

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    picker.preferredDatePickerStyle = .wheels
    picker.datePickerMode = .time
    picker.addTarget(self, action: #selector(changed), for: .valueChanged)
    addSubview(picker)
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    picker.frame = bounds
  }

  func apply() {
    picker.datePickerMode = mode == "date" ? .date : .time
    picker.minuteInterval = Swift.max(1, Swift.min(30, minuteInterval))
    picker.minimumDate = mode == "date" && !min.isEmpty ? Self.dateFormat.date(from: min) : nil
    picker.maximumDate = mode == "date" && !max.isEmpty ? Self.dateFormat.date(from: max) : nil
    // set the wheels only when the value differs from what they show (no jump mid-spin)
    if !value.isEmpty, let d = format.date(from: value), format.string(from: picker.date) != value {
      if mode == "time" {
        // today at that time, so the wheels never cross a daylight-saving gap on an old date
        let parts = Calendar.current.dateComponents([.hour, .minute], from: d)
        picker.setDate(Calendar.current.date(bySettingHour: parts.hour ?? 0, minute: parts.minute ?? 0, second: 0, of: Date()) ?? d, animated: false)
      } else {
        picker.setDate(d, animated: false)
      }
    }
  }

  @objc private func changed() {
    onPick(["value": format.string(from: picker.date)])
  }
}
