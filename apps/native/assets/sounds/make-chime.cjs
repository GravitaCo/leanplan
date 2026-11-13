/**
 * Renders the rest-end chime as a WAV from the web app's own Web Audio synthesis
 * (src/screens/train/GuidedPlayer.tsx, chime()), so the phone plays the web's sound, not a lookalike:
 *   a sine oscillator at 880 Hz; gain 0.0001 at 0, exponential ramp to 0.2 at 0.02 s, exponential
 *   ramp to 0.0001 at 0.5 s; the oscillator stops at 0.55 s.
 * Exponential ramps follow the Web Audio spec: v(t) = v0 · (v1 / v0)^((t − t0) / (t1 − t0)).
 *
 *   node assets/sounds/make-chime.cjs   # writes assets/sounds/chime.wav (44.1 kHz, 16-bit, mono)
 */
const fs = require('node:fs')
const path = require('node:path')

const RATE = 44100
const FREQ = 880
const END = 0.55
const ramp = (t, t0, v0, t1, v1) => v0 * Math.pow(v1 / v0, (t - t0) / (t1 - t0))
function gainAt(t) {
  if (t <= 0) return 0.0001
  if (t <= 0.02) return ramp(t, 0, 0.0001, 0.02, 0.2)
  if (t <= 0.5) return ramp(t, 0.02, 0.2, 0.5, 0.0001)
  return 0.0001 // held after the last ramp, as Web Audio does, until the stop
}

const n = Math.round(END * RATE)
const data = Buffer.alloc(n * 2)
for (let i = 0; i < n; i++) {
  const t = i / RATE
  const v = Math.sin(2 * Math.PI * FREQ * t) * gainAt(t)
  data.writeInt16LE(Math.max(-32768, Math.min(32767, Math.round(v * 32767))), i * 2)
}
const h = Buffer.alloc(44)
h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8)
h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22)
h.writeUInt32LE(RATE, 24); h.writeUInt32LE(RATE * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34)
h.write('data', 36); h.writeUInt32LE(data.length, 40)
fs.writeFileSync(path.join(__dirname, 'chime.wav'), Buffer.concat([h, data]))
console.log('chime.wav', n, 'samples')
