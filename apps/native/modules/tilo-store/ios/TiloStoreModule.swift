import ExpoModulesCore
import Foundation
import Security

/// On-device storage for the shared code (dependency policy rule 1: Apple's frameworks, no
/// third-party library). Synchronous, because the web's localStorage is and persistence.ts relies on it.
///
/// Namespaces:
/// - "session": Supabase's saved sign-in, in the Keychain, readable after the first unlock, this
///   device only (never restored to another phone: that phone signs in again).
/// - anything else ("local", "notify"): one file per key under Application Support/tilo-store/<ns>,
///   written atomically, protected until the first unlock after a restart (iOS Data Protection), and
///   included in the phone's backups so a restored phone keeps its log.
public class TiloStoreModule: Module {
  private var files: [String: FileStore] = [:]
  private let filesLock = NSLock()
  private let keychain = KeychainStore(service: "fit.tilo.session")

  private func fileStore(_ ns: String) throws -> FileStore {
    filesLock.lock(); defer { filesLock.unlock() }
    if let s = files[ns] { return s }
    let s = try FileStore(namespace: ns)
    files[ns] = s
    return s
  }

  public func definition() -> ModuleDefinition {
    Name("TiloStore")

    Function("get") { (ns: String, key: String) throws -> String? in
      ns == "session" ? try self.keychain.get(key) : try self.fileStore(ns).get(key)
    }
    Function("set") { (ns: String, key: String, value: String) throws in
      if ns == "session" { try self.keychain.set(key, value) } else { try self.fileStore(ns).set(key, value) }
    }
    Function("remove") { (ns: String, key: String) throws in
      if ns == "session" { try self.keychain.remove(key) } else { try self.fileStore(ns).remove(key) }
    }
    Function("keys") { (ns: String) throws -> [String] in
      ns == "session" ? try self.keychain.keys() : try self.fileStore(ns).keys()
    }
    Function("clear") { (ns: String) throws in
      if ns == "session" { try self.keychain.clear() } else { try self.fileStore(ns).clear() }
    }
  }
}

private func storeError(_ message: String, _ status: OSStatus = 0) -> NSError {
  NSError(domain: "TiloStore", code: Int(status), userInfo: [NSLocalizedDescriptionKey: message])
}

/// One file per key; an in-memory copy is read once and kept current, so reads never touch the disk.
final class FileStore {
  private let dir: URL
  private var cache: [String: String]?
  private let lock = NSLock()
  private let protection = FileProtectionType.completeUntilFirstUserAuthentication

  init(namespace: String) throws {
    guard namespace.range(of: "^[a-z0-9-]+$", options: .regularExpression) != nil else {
      throw storeError("Bad namespace")
    }
    let base = try FileManager.default.url(for: .applicationSupportDirectory, in: .userDomainMask, appropriateFor: nil, create: true)
    dir = base.appendingPathComponent("tilo-store", isDirectory: true).appendingPathComponent(namespace, isDirectory: true)
    try FileManager.default.createDirectory(at: dir, withIntermediateDirectories: true, attributes: [.protectionKey: protection])
  }

  /// A key as a safe file name (base64url of its UTF-8), and back.
  private func fileName(_ key: String) -> String {
    Data(key.utf8).base64EncodedString()
      .replacingOccurrences(of: "+", with: "-").replacingOccurrences(of: "/", with: "_").replacingOccurrences(of: "=", with: "")
  }
  private func key(fromFileName name: String) -> String? {
    var b = name.replacingOccurrences(of: "-", with: "+").replacingOccurrences(of: "_", with: "/")
    while b.count % 4 != 0 { b += "=" }
    guard let d = Data(base64Encoded: b) else { return nil }
    return String(data: d, encoding: .utf8)
  }

  private func loaded() throws -> [String: String] {
    if let c = cache { return c }
    var out: [String: String] = [:]
    for url in try FileManager.default.contentsOfDirectory(at: dir, includingPropertiesForKeys: nil) {
      guard let k = key(fromFileName: url.lastPathComponent) else { continue }
      if let v = try? String(contentsOf: url, encoding: .utf8) { out[k] = v }
    }
    cache = out
    return out
  }

  func get(_ key: String) throws -> String? {
    lock.lock(); defer { lock.unlock() }
    return try loaded()[key]
  }

  func set(_ key: String, _ value: String) throws {
    lock.lock(); defer { lock.unlock() }
    var c = try loaded()
    try Data(value.utf8).write(to: dir.appendingPathComponent(fileName(key)), options: [.atomic, .completeFileProtectionUntilFirstUserAuthentication])
    c[key] = value
    cache = c
  }

  func remove(_ key: String) throws {
    lock.lock(); defer { lock.unlock() }
    var c = try loaded()
    let url = dir.appendingPathComponent(fileName(key))
    if FileManager.default.fileExists(atPath: url.path) { try FileManager.default.removeItem(at: url) }
    c.removeValue(forKey: key)
    cache = c
  }

  func keys() throws -> [String] {
    lock.lock(); defer { lock.unlock() }
    return Array(try loaded().keys)
  }

  func clear() throws {
    lock.lock(); defer { lock.unlock() }
    for url in try FileManager.default.contentsOfDirectory(at: dir, includingPropertiesForKeys: nil) {
      try FileManager.default.removeItem(at: url)
    }
    cache = [:]
  }
}

/// Generic-password items under one service. Errors other than "not found" are thrown, never
/// mistaken for an empty store (security-data, 9 Nov).
final class KeychainStore {
  private let service: String
  init(service: String) { self.service = service }

  private func base(_ account: String? = nil) -> [String: Any] {
    var q: [String: Any] = [kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: service]
    if let a = account { q[kSecAttrAccount as String] = a }
    return q
  }

  func get(_ key: String) throws -> String? {
    var q = base(key)
    q[kSecReturnData as String] = true
    q[kSecMatchLimit as String] = kSecMatchLimitOne
    var out: AnyObject?
    let status = SecItemCopyMatching(q as CFDictionary, &out)
    if status == errSecItemNotFound { return nil }
    guard status == errSecSuccess, let data = out as? Data else { throw storeError("Keychain read failed", status) }
    return String(data: data, encoding: .utf8)
  }

  func set(_ key: String, _ value: String) throws {
    let data = Data(value.utf8)
    let update: [String: Any] = [kSecValueData as String: data]
    let status = SecItemUpdate(base(key) as CFDictionary, update as CFDictionary)
    if status == errSecSuccess { return }
    guard status == errSecItemNotFound else { throw storeError("Keychain update failed", status) }
    var add = base(key)
    add[kSecValueData as String] = data
    add[kSecAttrAccessible as String] = kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
    let added = SecItemAdd(add as CFDictionary, nil)
    guard added == errSecSuccess else { throw storeError("Keychain write failed", added) }
  }

  func remove(_ key: String) throws {
    let status = SecItemDelete(base(key) as CFDictionary)
    guard status == errSecSuccess || status == errSecItemNotFound else { throw storeError("Keychain delete failed", status) }
  }

  func keys() throws -> [String] {
    var q = base()
    q[kSecReturnAttributes as String] = true
    q[kSecMatchLimit as String] = kSecMatchLimitAll
    var out: AnyObject?
    let status = SecItemCopyMatching(q as CFDictionary, &out)
    if status == errSecItemNotFound { return [] }
    guard status == errSecSuccess, let items = out as? [[String: Any]] else { throw storeError("Keychain list failed", status) }
    return items.compactMap { $0[kSecAttrAccount as String] as? String }
  }

  func clear() throws {
    let status = SecItemDelete(base() as CFDictionary)
    guard status == errSecSuccess || status == errSecItemNotFound else { throw storeError("Keychain clear failed", status) }
  }
}
