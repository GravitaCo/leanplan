package expo.modules.tiloai

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

// Android: on-device models are uneven across phones (native-app-plan §5); cloud AI with the AI
// consent is the plan there. The spike reports it as unsupported.
class TiloAiModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("TiloAi")
    AsyncFunction("availability") { "unsupported-platform" }
    AsyncFunction("respond") { _: String, _: String -> throw Exception("On-device AI is not set up on Android") }
  }
}
