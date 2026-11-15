import ExpoModulesCore
import Network

/// Online or offline for the shared code's navigator.onLine (dependency policy rule 1: Apple's
/// Network framework, no third-party library). "Online" means the device has a usable network path,
/// as a browser counts it. Nothing is ever sent to test the connection (no reachability probe).
public class TiloNetworkModule: Module {
  private let monitor = NWPathMonitor()
  private let queue = DispatchQueue(label: "fit.tilo.network")
  private let lock = NSLock()
  private var online = true

  private func current() -> Bool {
    lock.lock(); defer { lock.unlock() }
    return online
  }

  public func definition() -> ModuleDefinition {
    Name("TiloNetwork")
    Events("onChange")

    OnCreate {
      self.monitor.pathUpdateHandler = { [weak self] path in
        guard let self = self else { return }
        let next = path.status == .satisfied
        self.lock.lock()
        let changed = next != self.online
        self.online = next
        self.lock.unlock()
        if changed { self.sendEvent("onChange", ["online": next]) }
      }
      self.monitor.start(queue: self.queue)
    }

    OnDestroy {
      self.monitor.cancel()
    }

    /// The last known state (true until the first path update, as a browser assumes online).
    Function("isOnline") { () -> Bool in
      return self.current()
    }
  }
}
