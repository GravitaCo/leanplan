import TiloAi from './src/TiloAiModule'

export async function aiAvailability(): Promise<string> {
  if (!TiloAi) return 'not-in-this-build'
  try { return await TiloAi.availability() } catch (e) { return 'error: ' + String(e) }
}

export async function aiRespond(instructions: string, prompt: string): Promise<string> {
  if (!TiloAi) throw new Error('On-device AI is not in this build')
  return TiloAi.respond(instructions, prompt)
}
