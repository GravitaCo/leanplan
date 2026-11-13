import ExpoModulesCore
import UIKit

/// The web's form controls as iOS Safari presents them (native-build-plan N1; the lead: match what
/// Safari does). Our own module, no outside library. Each view lies invisibly over text the app
/// draws in the web's style, as the web lays a transparent input over its label, and a tap opens
/// the system's own presentation:
/// - TiloDatePicker: UIDatePicker in its compact style. A tap opens the system pop-up (a calendar
///   for a date, a time pop-up for a time), anchored to the field. Values cross as the web's input
///   values: "HH:mm" and "yyyy-MM-dd".
/// - TiloMenu: a button whose menu (UIMenu) lists the options, the chosen one ticked, anchored to
///   the field, as Safari opens a `<select>`.
public class TiloPickersModule: Module {
  public func definition() -> ModuleDefinition {
    Name("TiloPickers")

    /// "HH:mm" as this phone shows a time (its 12 or 24 hour setting, as Safari shows a time input)
    Function("formatTime") { (hhmm: String) -> String in
      guard let d = timeFormat.date(from: hhmm) else { return hhmm }
      let f = DateFormatter()
      f.locale = .autoupdatingCurrent
      f.timeZone = .autoupdatingCurrent
      f.dateStyle = .none
      f.timeStyle = .short
      return f.string(from: d)
    }

    View(TiloDatePickerView.self) {
      Name("TiloDatePicker")
      Events("onPick")

      /// "time" or "date"
      Prop("mode", "time") { (view: TiloDatePickerView, v: String) in view.mode = v == "date" ? "date" : "time" }
      /// the current value, "HH:mm" or "yyyy-MM-dd"; empty opens on now (or today)
      Prop("value", "") { (view: TiloDatePickerView, v: String) in view.value = v }
      /// the date mode's earliest and latest days, "yyyy-MM-dd" (empty: none)
      Prop("min", "") { (view: TiloDatePickerView, v: String) in view.min = v }
      Prop("max", "") { (view: TiloDatePickerView, v: String) in view.max = v }
      /// the minute step (1 to 30)
      Prop("minuteInterval", 1) { (view: TiloDatePickerView, v: Int) in view.minuteInterval = v }
      /// the field's name and shown value, for VoiceOver (the text under it is hidden from it)
      Prop("label", "") { (view: TiloDatePickerView, v: String) in view.picker.accessibilityLabel = v }
      Prop("enabled", true) { (view: TiloDatePickerView, v: Bool) in view.picker.isEnabled = v }

      // every prop is in before the picker is set, whatever order they arrive in
      OnViewDidUpdateProps { (view: TiloDatePickerView) in view.apply() }
    }

    View(TiloMenuView.self) {
      Name("TiloMenu")
      Events("onPick")

      /// the options' words, in order
      Prop("options", [String]()) { (view: TiloMenuView, v: [String]) in view.options = v }
      /// the chosen option's index (-1: none)
      Prop("selected", -1) { (view: TiloMenuView, v: Int) in view.selected = v }
      /// the field's name and the chosen option, for VoiceOver
      Prop("label", "") { (view: TiloMenuView, v: String) in view.button.accessibilityLabel = v }
      Prop("enabled", true) { (view: TiloMenuView, v: Bool) in view.button.isEnabled = v }

      OnViewDidUpdateProps { (view: TiloMenuView) in view.apply() }
    }
  }
}

/// The web's value formats, at file level (not on a view class, so `formatTime` may use them off
/// the main thread). The zone follows the phone's, as Calendar.current does.
private func valueFormatter(_ format: String) -> DateFormatter {
  let f = DateFormatter()
  f.locale = Locale(identifier: "en_US_POSIX")
  f.calendar = Calendar(identifier: .gregorian)
  f.timeZone = .autoupdatingCurrent
  f.dateFormat = format
  return f
}
private let timeFormat = valueFormatter("HH:mm")
private let dateFormat = valueFormatter("yyyy-MM-dd")

final class TiloDatePickerView: ExpoView {
  let onPick = EventDispatcher()
  let picker = UIDatePicker()

  var mode = "time"
  var value = ""
  var min = ""
  var max = ""
  var minuteInterval = 1

  private var format: DateFormatter { mode == "date" ? dateFormat : timeFormat }

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    clipsToBounds = true
    picker.preferredDatePickerStyle = .compact
    picker.datePickerMode = .time
    // drawn all but invisibly (UIKit ignores touches below 0.01 alpha): the app draws the field,
    // the picker takes the tap and presents its pop-up, which isn't faded
    picker.alpha = 0.02
    picker.addTarget(self, action: #selector(changed), for: .valueChanged)
    addSubview(picker)
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    // the compact picker draws at its own size: stretch it over the whole field so every point of
    // the field opens it (the pop-up anchors to it)
    picker.transform = .identity
    let natural = picker.systemLayoutSizeFitting(UIView.layoutFittingCompressedSize)
    guard natural.width > 0, natural.height > 0, bounds.width > 0, bounds.height > 0 else { return }
    picker.bounds = CGRect(origin: .zero, size: natural)
    picker.center = CGPoint(x: bounds.midX, y: bounds.midY)
    picker.transform = CGAffineTransform(scaleX: bounds.width / natural.width, y: bounds.height / natural.height)
  }

  func apply() {
    picker.datePickerMode = mode == "date" ? .date : .time
    picker.minuteInterval = Swift.max(1, Swift.min(30, minuteInterval))
    picker.minimumDate = mode == "date" && !min.isEmpty ? dateFormat.date(from: min) : nil
    picker.maximumDate = mode == "date" && !max.isEmpty ? dateFormat.date(from: max) : nil
    // set the picker only when the value differs from what it shows (no jump mid-change)
    if !value.isEmpty, let d = format.date(from: value), format.string(from: picker.date) != value {
      if mode == "time" {
        // today at that time, so the picker never crosses a daylight-saving gap on an old date
        let parts = Calendar.current.dateComponents([.hour, .minute], from: d)
        picker.setDate(Calendar.current.date(bySettingHour: parts.hour ?? 0, minute: parts.minute ?? 0, second: 0, of: Date()) ?? d, animated: false)
      } else {
        picker.setDate(d, animated: false)
      }
    }
    setNeedsLayout()
  }

  @objc private func changed() {
    onPick(["value": format.string(from: picker.date)])
  }
}

final class TiloMenuView: ExpoView {
  let onPick = EventDispatcher()
  let button = UIButton(type: .custom)

  var options: [String] = []
  var selected = -1

  required init(appContext: AppContext? = nil) {
    super.init(appContext: appContext)
    // no title and no fill: the app draws the field; the button takes the tap and opens the menu
    button.showsMenuAsPrimaryAction = true
    button.backgroundColor = .clear
    addSubview(button)
  }

  override func layoutSubviews() {
    super.layoutSubviews()
    button.frame = bounds
  }

  func apply() {
    let actions = options.enumerated().map { (i, title) in
      UIAction(title: title, state: i == selected ? .on : .off) { [weak self] _ in
        guard let self = self, i != self.selected else { return }
        self.onPick(["index": i])
      }
    }
    button.menu = UIMenu(title: "", options: .singleSelection, children: actions)
    button.accessibilityValue = selected >= 0 && selected < options.count ? options[selected] : nil
  }
}
