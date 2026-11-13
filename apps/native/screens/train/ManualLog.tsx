/**
 * "Log sets by hand" (web: screens/train/ManualLog.tsx): the full set form (every log shape,
 * bodyweight load choice, hold timer, add set), for logging after the fact and for editing a session
 * already logged. It saves exactly what the web form saves (buildLogged, setHasData).
 */
import { useCallback, useContext, useState } from 'react'
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native'
import * as WebBrowser from 'expo-web-browser'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useStore } from '@/store/store'
import { keyRoutineId, keyTitle, type WorkoutKey } from '@/core/domain/routines'
import type { LoggedExercise, LogShape, SetEntry, Workout } from '@/core/types'
import { exById, fmtSet, setHasData } from '@/core/domain/library'
import { sessionsOf } from '@/core/domain/sessions'
import { howToLink } from '@/core/domain/workout'
import { todayStr } from '@/core/domain/date'
import { buildLogged, lastTime, splitLogged, swapInto, working, type Slot } from '@/core/domain/guided'
import { careList } from '@/core/data/libraryLabels'
import { HARD_DAY_COPY } from '@/screens/train/hardDay'
import { CARE_DISCLAIMER, RED_FLAG } from '@/copy/train'
import { SwapSheet } from './SwapSheet'
import { HoldTimer } from './HoldTimer'
import { DemoPlayer } from './DemoPlayer'
import { ExCard } from './Preview'
import { Btn, LinkBtn, Stack } from '../../lib/ui/kit'
import { BackButton, Seg, TitleRow, Toggle } from '../../lib/ui/primitives'
import { Icon } from '../../lib/ui/icons'
import { font, num, tx, useTokens } from '../../lib/theme'
import { Foot, Sub, TextLink as InlineLink } from '../../lib/ui/text'
import { TrainNav, toPoint } from './nav'

const blankRows = (): SetEntry[] => [{ w: '', reps: '' }, { w: '', reps: '' }]

/** Saved sets back into the form (holds edit `sec` only; flags ride along), as the web. */
function toRows(sets: SetEntry[], shape: LogShape): SetEntry[] {
  return sets.map((s) => (shape === 'hold' ? { ...s, sec: s.sec || s.reps, reps: '' } : { ...s }))
}

/** `.setrow input`: a small filled box, centred figures */
function Box({ value, ph, label, onChange, decimal, w = 64 }: { value: string; ph: string; label: string; onChange: (v: string) => void; decimal?: boolean; w?: number }) {
  const t = useTokens()
  return (
    <TextInput accessibilityLabel={label} value={value} placeholder={ph} placeholderTextColor={t.label3} keyboardType={decimal ? 'decimal-pad' : 'number-pad'} onChangeText={(v) => onChange(decimal ? toPoint(v) : v)}
      style={[font(400), num, { flex: 1, minWidth: w, fontSize: 17, color: t.label, backgroundColor: t.fill, borderRadius: 10, paddingVertical: 9, paddingHorizontal: 10, textAlign: 'center' }]} />
  )
}
function U({ s }: { s: string }) {
  const t = useTokens()
  return <Text style={[tx(13, 400), { color: t.label2, width: 34 }]}>{s}</Text>
}


export function ManualLog({ type, slots, option, swaps, onSwap, onBack, easier }: {
  type: WorkoutKey
  slots: Slot[]
  option?: Workout['option']
  swaps: Record<number, string>
  onSwap: (i: number, id: string) => void
  onBack: () => void
  easier?: boolean
}) {
  const t = useTokens()
  const insets = useSafeAreaInsets()
  const onProfile = useContext(TrainNav).onProfile
  const cur = useStore((s) => s.cur)
  const days = useStore((s) => s.data.days)
  const saveWorkout = useStore((s) => s.saveWorkout)
  const isToday = cur === todayStr()
  const session = sessionsOf(days[cur], cur).find((x) => x.routineId === keyRoutineId(type))
  const routines = useStore((s) => s.data.routines)
  const title = keyTitle(type, routines)
  const shorter = option === 'shorter'

  const [init] = useState(() => splitLogged(session?.ex, slots))
  const [extras, setExtras] = useState<LoggedExercise[]>(init.extras)
  const [sets, setSets] = useState<Record<number, SetEntry[]>>(() => {
    const out: Record<number, SetEntry[]> = {}
    slots.forEach((s) => {
      const L = init.bySlot[s.i]
      out[s.i] = L.length ? toRows(L, init.logs[s.i] ?? s.shape) : blankRows()
    })
    return out
  })
  const [swapFor, setSwapFor] = useState<number | null>(null)
  const [timer, setTimer] = useState<{ exi: number; si: number } | null>(null)
  const [demo, setDemo] = useState<number | null>(null)
  const closeDemo = useCallback(() => setDemo(null), [])
  const [loadMode, setLoadMode] = useState<Record<number, 'none' | 'added' | 'assist'>>({})

  function updateSet(exi: number, si: number, patch: Partial<SetEntry>) {
    setSets((prev) => ({ ...prev, [exi]: prev[exi].map((s, i) => (i === si ? { ...s, ...patch } : s)) }))
  }
  const addSet = (exi: number) => setSets((prev) => ({ ...prev, [exi]: [...prev[exi], { w: '', reps: '' }] }))
  function setLoad(exi: number, v: 'none' | 'added' | 'assist') {
    setLoadMode((p) => ({ ...p, [exi]: v }))
    setSets((prev) => ({ ...prev, [exi]: prev[exi].map((s) => (v === 'none' ? { ...s, w: '', assist: undefined } : { ...s, assist: v === 'assist' ? true : undefined })) }))
  }
  function swapSlot(exi: number, id: string) {
    const sl = slots.find((s) => s.i === exi)
    if (!sl) return
    const had = (sets[exi] || []).filter((r) => setHasData(r, sl.shape))
    const r = swapInto(sl, id, had, extras, shorter, exById)
    setExtras(r.extras)
    onSwap(exi, id)
    setSets((prev) => ({ ...prev, [exi]: r.sets.length ? toRows(r.sets, r.log ?? r.slot.shape) : blankRows() }))
    setLoadMode((p) => { const n = { ...p }; delete n[exi]; return n })
  }
  function commit() {
    const kept: Record<number, SetEntry[]> = {}
    slots.forEach((s) => { kept[s.i] = (sets[s.i] || []).filter((r) => setHasData(r, s.shape)) })
    const ex = buildLogged(slots, kept, extras)
    saveWorkout(type, ex, option, { toast: `${title} saved` })
    onBack()
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: insets.top + 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <View style={{ paddingBottom: 6, alignSelf: 'flex-start', marginLeft: -6 }}><BackButton label={title} onPress={onBack} /></View>
      <TitleRow title="Log sets by hand" onProfile={onProfile} />
      <Sub style={{ marginTop: 2, marginBottom: 16 }}>Type in what you did. Blank sets aren't saved.</Sub>
      {slots.map((sl) => {
        const exi = sl.i
        const { shown, x, shape, rx, swapped, planned: e } = sl
        const lastEx = lastTime(days, cur, x?.id, shown.n, sl.fullRx)
        const lastTxt = lastEx ? lastEx.sets.map((r) => fmtSet(r, lastEx.log ?? shape)).filter(Boolean).join(', ') : ''
        const rows = sets[exi] || []
        const load = loadMode[exi] ?? (rows.some((r) => r.assist) ? 'assist' : rows.some((r) => r.w) ? 'added' : 'none')
        const loadOn = load !== 'none'
        let n = 0
        return (
          <ExCard key={exi} n={shown.n} tg={rx}>
            {swapped && (
              <Text style={[tx(13, 400), { lineHeight: 18, color: t.label2, marginTop: 4, marginBottom: 10 }]}>
                In place of {e.n}, {isToday ? 'today' : 'this day'} only. <InlineLink label={`Undo, back to ${e.n}`} onPress={() => swapSlot(exi, e.id!)}>Undo</InlineLink>
                {x!.care?.length ? <> Asks quite a lot of {careList(x!.care)}. {CARE_DISCLAIMER}</> : null}
              </Text>
            )}
            <Text style={[tx(15, 400), { lineHeight: 21, color: t.label2, marginTop: 6, marginBottom: 8 }]}>{shown.cue}</Text>
            <View style={{ flexDirection: 'row', gap: 18, alignItems: 'baseline', flexWrap: 'wrap', marginBottom: 10 }}>
              {shown.video
                ? <Pressable accessibilityRole="button" onPress={() => setDemo(exi)} style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}><Icon name="play" size={15} color={t.tint} fill /><Text style={[tx(15, 400), { color: t.tint }]}>Watch example</Text></Pressable>
                : <LinkBtn flat title="Watch how to do it ›" onPress={() => { WebBrowser.openBrowserAsync(howToLink(shown.n)).catch(() => {}) }} />}
              {x && <LinkBtn flat title="Swap" label={`Swap ${shown.n}`} onPress={() => setSwapFor(exi)} />}
            </View>
            {!!lastTxt && <Text style={[tx(13, 600), num, { color: t.label2, marginBottom: 8 }]}>Last time: {lastTxt}</Text>}
            {shape === 'reps' && loadOn && (
              <View style={{ marginBottom: 10 }}><Seg options={[['none', 'Bodyweight'], ['added', 'Added weight'], ['assist', 'Assisted']]} value={load} onChange={(v) => setLoad(exi, v)} /></View>
            )}
            {rows.map((r, si) => {
              const label = r.warmup ? 'Warm-up' : `Set ${++n}`
              return (
                <View key={si} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                  <Text style={[font(600), { width: 50, fontSize: 13, color: t.label2 }]} numberOfLines={1}>{label}</Text>
                  {shape === 'weight-reps' && <><Box decimal value={r.w} ph="kg" label={`${label} weight`} onChange={(v) => updateSet(exi, si, { w: v })} /><U s="kg" /></>}
                  {shape === 'reps' && loadOn && <><Box decimal value={r.w} ph="kg" label={`${label} ${load === 'assist' ? 'assistance' : 'added weight'}`} onChange={(v) => updateSet(exi, si, { w: v, ...(load === 'assist' ? { assist: true } : {}) })} /><U s="kg" /></>}
                  {(shape === 'weight-reps' || shape === 'reps' || shape === 'rounds') && <><Box value={r.reps} ph={shape === 'rounds' ? 'rounds' : 'reps'} label={`${label} ${shape === 'rounds' ? 'rounds' : 'reps'}`} onChange={(v) => updateSet(exi, si, { reps: v })} /><U s={shape === 'rounds' ? 'rounds' : 'reps'} /></>}
                  {shape === 'hold' && (
                    <>
                      <Box value={r.sec ?? ''} ph="sec" label={`${label} seconds`} onChange={(v) => updateSet(exi, si, { sec: v })} /><U s="sec" />
                      <Pressable accessibilityRole="button" accessibilityLabel={`Time ${label}`} onPress={() => setTimer({ exi, si })} style={{ backgroundColor: t.fill, borderRadius: 8, paddingVertical: 8, paddingHorizontal: 10 }}>
                        <Text style={[tx(15, 600), { color: t.tint }]}>Timer</Text>
                      </Pressable>
                    </>
                  )}
                  {shape === 'duration' && (
                    <>
                      <Box value={r.mins ?? ''} ph="min" label={`${label} minutes`} onChange={(v) => updateSet(exi, si, { mins: v })} /><U s="min" />
                      <Box decimal value={r.km ?? ''} ph="km" label={`${label} distance`} onChange={(v) => updateSet(exi, si, { km: v })} /><U s="km" />
                    </>
                  )}
                  {shape === 'check' && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Toggle on={!!r.done} label={`${label} done`} onChange={() => updateSet(exi, si, { done: !r.done })} />
                      <Text style={[tx(15, 400), { color: t.label }]}>Done</Text>
                    </View>
                  )}
                </View>
              )
            })}
            <View style={{ flexDirection: 'row', gap: 18, flexWrap: 'wrap', paddingTop: 6 }}>
              <LinkBtn flat title="Add set" onPress={() => addSet(exi)} />
              {shape === 'reps' && !loadOn && <LinkBtn flat title="Add weight or assistance" onPress={() => setLoad(exi, 'added')} />}
            </View>
          </ExCard>
        )
      })}
      <Stack><Btn title={`Save ${shorter ? 'shorter ' : ''}${title}`} onPress={commit} /></Stack>
      <Foot style={{ paddingTop: 12, paddingHorizontal: 4 }}>
        {easier && shorter ? HARD_DAY_COPY.spareEasier : 'Stop each set with two or three reps to spare.'}{shorter ? '' : ' When every set hits the top of the range with good form, add a little weight next time.'} {RED_FLAG}
      </Foot>

      {demo != null && (() => { const sh = slots.find((s) => s.i === demo)?.shown; return sh?.video ? <DemoPlayer ex={sh} onClose={closeDemo} /> : null })()}
      {swapFor != null && (() => {
        const sl = slots.find((s) => s.i === swapFor)
        return sl?.x ? <SwapSheet current={sl.x} planned={swaps[swapFor] ? exById(sl.planned.id) : undefined} shorter={shorter}
          loggedSets={working((sets[swapFor] || []).filter((r) => setHasData(r, sl.shape))).length} onPick={(id) => swapSlot(swapFor, id)} onClose={() => setSwapFor(null)} /> : null
      })()}
      {timer && (() => {
        const sl = slots.find((s) => s.i === timer.exi)!
        return <HoldTimer name={sl.shown.n} rx={sl.rx} perSide={sl.x?.perSide}
          onDone={(sec) => updateSet(timer.exi, timer.si, { sec: String(sec) })} onClose={() => setTimer(null)} />
      })()}
    </ScrollView>
  )
}
