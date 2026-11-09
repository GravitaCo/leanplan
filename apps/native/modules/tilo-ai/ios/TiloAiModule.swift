import ExpoModulesCore
#if canImport(FoundationModels)
import FoundationModels
#endif

/// On-device AI for the native spike (native-app-plan §5): Apple's Foundation Models, on the phone,
/// no data leaves it and no cost per call. iOS 26 on an Apple Intelligence iPhone only; everywhere
/// else `availability()` says why and nothing runs.
public class TiloAiModule: Module {
  public func definition() -> ModuleDefinition {
    Name("TiloAi")

    /// "available", or why not: "deviceNotEligible", "appleIntelligenceNotEnabled",
    /// "modelNotReady", "unsupported-os" (below iOS 26), "no-sdk" (built without the framework).
    AsyncFunction("availability") { () -> String in
      #if canImport(FoundationModels)
      if #available(iOS 26.0, *) {
        let a = SystemLanguageModel.default.availability
        if case .available = a { return "available" }
        if case .unavailable(let reason) = a { return String(describing: reason) }
        return "unavailable"
      }
      return "unsupported-os"
      #else
      return "no-sdk"
      #endif
    }

    /// One prompt, one answer, in a fresh session with the given instructions.
    AsyncFunction("respond") { (instructions: String, prompt: String) async throws -> String in
      #if canImport(FoundationModels)
      if #available(iOS 26.0, *) {
        let session = LanguageModelSession(instructions: instructions)
        let response = try await session.respond(to: prompt)
        return response.content
      }
      #endif
      throw NSError(domain: "TiloAi", code: 1, userInfo: [NSLocalizedDescriptionKey: "On-device AI needs iOS 26 on an Apple Intelligence iPhone"])
    }
  }
}
