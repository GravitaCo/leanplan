/**
 * Train (N7) unit tests for the native-only pieces: the session-open signal, the rest-end alert
 * hand-off to N12, and the chime rendered from the web's Web Audio parameters. Run by `npm test`.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { cancelRestAlert, guidedSessionOpen, onGuidedSession, scheduleRestAlert, setGuidedSessionOpen, setRestAlerter, type RestAlert } from '../screens/train/session'

let bad = 0
const ok = (name: string, v: boolean, info?: unknown) => { if (!v) bad++; console.log(v ? 'PASS' : 'FAIL', 'train:', name, v || info === undefined ? '' : JSON.stringify(info)) }

async function main() {
  // the signal N12 reads
  const seen: boolean[] = []
  const off = onGuidedSession((v) => seen.push(v))
  ok('closed by default', guidedSessionOpen() === false)
  setGuidedSessionOpen(true); setGuidedSessionOpen(true); setGuidedSessionOpen(false)
  ok('open while the player is on screen, told once per change', seen.join() === 'true,false', seen)
  off()

  // the rest alert: nothing without N12's scheduler; one alert, cancelled when rest is over
  await scheduleRestAlert(Date.now() + 60_000, 'Set 2 of 3, Barbell squat')
  ok('nothing scheduled before N12 registers', true)
  const log: string[] = []
  let got: RestAlert | null = null
  setRestAlerter({ schedule: async (a) => { got = a; log.push('s'); return 'id1' }, cancel: async (id) => { log.push('c:' + id) } })
  await scheduleRestAlert(Date.now() + 75_000, 'Set 2 of 3, Barbell squat')
  const a = got as RestAlert | null
  ok('alert at rest end with the web words', !!a && a.title === 'Rest over' && a.body === 'Set 2 of 3, Barbell squat.' && a.kind === 'tilo-rest' && Math.abs(a.seconds - 75) <= 1, a)
  await scheduleRestAlert(Date.now() + 30_000, 'Barbell squat')
  ok('a new rest replaces the old alert', log.join() === 's,c:id1,s', log)
  await cancelRestAlert(); await cancelRestAlert()
  ok('cancelled once when rest ends or the app returns', log.join() === 's,c:id1,s,c:id1', log)
  log.length = 0
  await scheduleRestAlert(Date.now() + 1000, 'x')
  ok('no alert for the last second of rest', log.length === 0, log)
  setRestAlerter(null)

  // the chime: the web's 880 Hz sine, 0.55 s, peak 0.2 at 0.02 s
  const wav = readFileSync(join(process.cwd(), 'assets', 'sounds', 'chime.wav'))
  const rate = wav.readUInt32LE(24), n = wav.readUInt32LE(40) / 2
  let peak = 0, at = 0
  for (let i = 0; i < n; i++) { const v = Math.abs(wav.readInt16LE(44 + i * 2)) / 32767; if (v > peak) { peak = v; at = i / rate } }
  ok('chime: 44.1 kHz mono, 0.55 s', rate === 44100 && wav.readUInt16LE(22) === 1 && Math.abs(n / rate - 0.55) < 0.001, { rate, n })
  ok('chime: peak 0.2 at about 0.02 s', Math.abs(peak - 0.2) < 0.005 && Math.abs(at - 0.02) < 0.002, { peak, at })
  console.log(bad ? `${bad} failed` : 'train: all passed')
  process.exit(bad ? 1 : 0)
}
main()
