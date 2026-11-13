/**
 * Log a set that differs from the plan (web: screens/train/AdjustSheet.tsx, Flow 2): weight and
 * reps steppers (or seconds, minutes, rounds), an optional "How was that set?" and, when it stopped
 * early, the pain check with a gentler option and the red-flag copy. A warm-up set is logged here
 * too; it never counts.
 */
import { useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import type { Exercise, LogShape, SetEntry, SetFeel } from '@/core/types'
import { fmtTarget, parseRx, type SetTarget } from '@/core/domain/guided'
import { FEELS, PAIN_HELP, RED_FLAG } from '@/screens/train/trainCopy'
import { BareSheet, Button, Foot, LinkBtn, Li, LiText, List, Seg, Stack, Toggle, font, num, useTokens } from './ui'

const n = (v: string) => { const x = parseFloat(v); return Number.isFinite(x) ? x : 0 }
const tidy = (x: number) => String(Math.round(x * 100) / 100)

/** `.stepcard`: the big number with − and + under it */
function Stepper({ label, unit, value, step, onChange }: { label: string; unit?: string; value: string; step: number; onChange: (v: string) => void }) {
  const t = useTokens()
  const pm = (d: -1 | 1) => (
    <Pressable accessibilityRole="button" accessibilityLabel={`${d < 0 ? 'Less' : 'More'} ${label.toLowerCase()}`}
      onPress={() => onChange(tidy(d < 0 ? Math.max(0, n(value) - step) : n(value) + step))}
      style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, backgroundColor: t.fill, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}>
      <Text style={[font(400), { fontSize: 22, color: t.label }]}>{d < 0 ? '−' : '+'}</Text>
    </Pressable>
  )
  return (
    <View style={{ flex: 1, backgroundColor: t.elev, borderRadius: 18, paddingTop: 14, paddingBottom: 12, paddingHorizontal: 10, alignItems: 'center', gap: 4 }}>
      <Text style={[font(400), { fontSize: 13, color: t.label2 }]}>{label}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'center', gap: 4 }}>
        <TextInput accessibilityLabel={label} value={value} placeholder="0" placeholderTextColor={t.label3} keyboardType="decimal-pad" onChangeText={onChange}
          style={[font(400), num, { fontSize: 44, lineHeight: 50, color: t.label, textAlign: 'center', minWidth: 40, padding: 0 }]} />
        {unit && <Text style={[font(400), { fontSize: 17, color: t.label2 }]}>{unit}</Text>}
      </View>
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>{pm(-1)}{pm(1)}</View>
    </View>
  )
}

/** `.feels` / `.effort4` buttons: a grid of choices, the chosen one in ink */
export function ChoiceGrid<T extends string>({ options, value, onPick, cols, label, tall }: { options: [T, string][]; value: T | null; onPick: (v: T) => void; cols: number; label: string; tall?: boolean }) {
  const t = useTokens()
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {options.map(([k, text]) => {
        const on = value === k
        return (
          <Pressable key={k} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => onPick(k)}
            style={{ width: `${(100 - (cols - 1) * 2) / cols}%`, flexGrow: 1, minHeight: tall ? 54 : 36, borderRadius: tall ? 14 : 18, paddingVertical: tall ? 10 : 0, paddingHorizontal: tall ? 12 : 4, justifyContent: 'center', alignItems: tall ? 'flex-start' : 'center', backgroundColor: on ? t.btn : t.elev }}>
            <Text style={[font(400), { fontSize: 14, lineHeight: 17, color: on ? t.btnInk : t.label }]}>{text}</Text>
          </Pressable>
        )
      })}
    </View>
  )
}

export function AdjustSheet({ name, x, shape, rx, setNo, target, first, warmup: warm0, allowWarmup, stepUp, onLog, onGentler, onTimer, onClose }: {
  name: string
  x?: Exercise
  shape: LogShape
  rx: string
  /** 0-based working set number */
  setNo: number
  target: SetTarget | null
  /** nothing to aim for yet: the first weighted set of a first session */
  first: boolean
  warmup?: boolean
  allowWarmup: boolean
  /** every set reached the top of the range last time (a passive hint, never applied) */
  stepUp?: boolean
  onLog: (s: SetEntry) => void
  onGentler?: () => void
  onTimer?: () => void
  onClose: () => void
}) {
  const t = useTokens()
  const p = parseRx(rx)
  const [w, setW] = useState(target?.w ?? '')
  const [reps, setReps] = useState(target?.reps || (p.unit === 'reps' && p.reps ? String(first ? p.reps.hi : p.reps.lo) : ''))
  const [sec, setSec] = useState(target?.sec ?? (p.unit === 'sec' && p.reps ? String(p.reps.lo) : ''))
  const [mins, setMins] = useState(target?.mins ?? (p.unit === 'min' && p.reps ? String(p.reps.lo) : ''))
  const [load, setLoad] = useState<'none' | 'added' | 'assist'>(target?.assist ? 'assist' : target?.w ? 'added' : 'none')
  const [feel, setFeel] = useState<SetFeel | null>(null)
  const [warmup, setWarmup] = useState(!!warm0)
  const [help, setHelp] = useState(false)
  const kitStep = x?.equipment.some((q) => q === 'dumbbell' || q === 'kettlebell') && !x.equipment.includes('barbell') ? 1 : 2.5
  // a trap bar loads like a barbell: plates, and the bar's own weight counts
  const barbell = !!x?.equipment.some((q) => q === 'barbell' || q === 'trap-bar')
  const barOnly = barbell && !x!.equipment.includes('dumbbell')

  const log = () => {
    const out: SetEntry = { w: '', reps: '' }
    if (shape === 'weight-reps') { out.w = w; out.reps = reps }
    else if (shape === 'reps') { out.reps = reps; if (load !== 'none' && w) { out.w = w; if (load === 'assist') out.assist = true } }
    else if (shape === 'hold') { out.sec = sec; out.reps = sec }
    else if (shape === 'duration') { out.mins = mins }
    else if (shape === 'rounds') { out.reps = reps }
    else out.done = true
    if (warmup) out.warmup = true
    else if (feel) out.feel = feel
    onLog(out)
  }
  const empty = shape === 'weight-reps' ? !w && !reps : shape === 'hold' ? !sec : shape === 'duration' ? !mins : shape === 'check' ? false : !reps

  return (
    <BareSheet label={`Adjust set ${setNo + 1}, ${name}`} onClose={onClose}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
        <Text accessibilityRole="header" style={[font(600), { flex: 1, fontSize: 22, lineHeight: 26, letterSpacing: -0.2, color: t.label }]}>{warmup ? 'Warm-up' : `Set ${setNo + 1}`} · {name}</Text>
        {target && !warmup && <Text style={[font(400), num, { fontSize: 13, color: t.label2, paddingTop: 4, textAlign: 'right' }]}>Target {fmtTarget(target, shape)}</Text>}
      </View>
      {first && !warmup && (shape === 'weight-reps' || shape === 'reps') && (
        <Foot style={{ paddingTop: 0, paddingHorizontal: 4, paddingBottom: 10 }}>
          {shape === 'weight-reps'
            ? `Start lighter than you think. Pick a weight you could lift ${p.reps?.hi ?? 10} times with two or three reps to spare. You can go up next set.${barbell ? " If you're new to it, the bar on its own is a good start." : ''}`
            : 'Do what feels steady, with two or three reps to spare.'}
        </Foot>
      )}
      {stepUp && !warmup && !first && (
        <Foot style={{ paddingTop: 0, paddingHorizontal: 4, paddingBottom: 10 }}>You reached the top of the range last time. If it felt steady, try a little more weight today.</Foot>
      )}
      {shape === 'reps' && (
        <View style={{ marginBottom: 10 }}><Seg options={[['none', 'Bodyweight'], ['added', 'Added weight'], ['assist', 'Assisted']]} value={load} onChange={setLoad} /></View>
      )}
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {(shape === 'weight-reps' || (shape === 'reps' && load !== 'none')) && (
          <Stepper label={shape === 'reps' && load === 'assist' ? 'Assistance' : shape === 'reps' ? 'Added' : 'Weight'} unit="kg" value={w} step={kitStep} onChange={setW} />
        )}
        {(shape === 'weight-reps' || shape === 'reps' || shape === 'rounds') && (
          <Stepper label={shape === 'rounds' ? 'Rounds' : 'Reps'} value={reps} step={1} onChange={setReps} />
        )}
        {shape === 'hold' && <Stepper label="Seconds" unit="sec" value={sec} step={5} onChange={setSec} />}
        {shape === 'duration' && <Stepper label="Minutes" unit="min" value={mins} step={1} onChange={setMins} />}
        {/* the web's .grid2 keeps a single stepper at half width */}
        {(shape === 'hold' || shape === 'duration' || shape === 'rounds' || (shape === 'reps' && load === 'none')) && <View style={{ flex: 1 }} />}
      </View>
      {shape === 'hold' && onTimer && <View style={{ alignSelf: 'flex-start' }}><LinkBtn title="Use the timer" onPress={onTimer} /></View>}
      {allowWarmup && (
        <List style={{ marginTop: 10 }}>
          <Li><LiText t="Warm-up set" s="Doesn't count towards your targets" /><Toggle on={warmup} label="Warm-up set" onChange={() => setWarmup(!warmup)} /></Li>
        </List>
      )}
      {!warmup && shape !== 'check' && (
        <>
          <Text style={[font(500), { fontSize: 13, color: t.label2, paddingTop: 18, paddingBottom: 8, paddingHorizontal: 4 }]}>How was that set? <Text style={{ color: t.label3 }}>Optional</Text></Text>
          <ChoiceGrid options={FEELS} value={feel} onPick={(k) => setFeel(feel === k ? null : k)} cols={2} label="How was that set?" tall />
        </>
      )}
      {feel === 'stopped' && !warmup && (
        <View style={{ backgroundColor: t.elev, borderRadius: t.radius, paddingVertical: 14, paddingHorizontal: 16, marginTop: 10 }}>
          <Text style={[font(400), { fontSize: 15, lineHeight: 21, color: t.label }]}>Stopping early is fine. If something hurt, stop this exercise for today: pain isn't something to push through.</Text>
          <View style={{ flexDirection: 'row', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
            {onGentler && <LinkBtn inl title="Try a gentler option" onPress={onGentler} />}
            <LinkBtn inl title="When to get help" onPress={() => setHelp(!help)} />
          </View>
          {help && <Foot style={{ paddingTop: 8, paddingHorizontal: 0 }}>{PAIN_HELP} {RED_FLAG}</Foot>}
        </View>
      )}
      {barbell && shape === 'weight-reps' && <Foot style={{ paddingTop: 10, paddingHorizontal: 4 }}>{barOnly ? 'Barbell weight includes the bar.' : "If you're using a barbell, include the bar."}</Foot>}
      <Stack><Button title="Log set" onPress={log} disabled={empty} /></Stack>
    </BareSheet>
  )
}
