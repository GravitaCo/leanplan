/**
 * The spike's lab (native-app-plan phase 0): measures and checks that aren't screens. For Benn,
 * Sara and the lead engineer only; never part of the app's parity build.
 *  1. storage: load and save times for this phone's real `leanplan.v1`
 *  2. sync: what the shared store reports
 *  3. HealthKit: last night's sleep and today's walking (read, shown, not kept)
 *  4. on-device AI: Apple Foundation Models parsing a typed meal (ai-platform-plan task A)
 *  5. a haptic (an improvement candidate: needs a board before it goes anywhere in the app)
 */
import { useEffect, useState, type ReactNode } from 'react'
import { ScrollView, Text, TextInput } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import Constants from 'expo-constants'
import { useStore } from '@/store/store'
import { loadState, saveState } from '@/data/persistence'
import { aiAvailability, aiRespond } from '../modules/tilo-ai'
import { askHealth, healthAvailable, lastNight, walking, type NightRead, type WalkingRead } from './health'
import { Btn, Card } from './ui/kit'
import { font, num, useTokens } from './theme'

const ms = (a: number) => `${(performance.now() - a).toFixed(1)} ms`

const PARSE_INSTRUCTIONS = 'You turn a short description of a meal into a list of foods. Reply with JSON only: an array of objects with "name" (a plain food name), "amount" (a number) and "unit" (one of g, ml, slice, item, tbsp, tsp, cup, portion). Only list foods the person mentioned. Never comment on health, calories or choices.'

export function Lab() {
  const t = useTokens()
  const insets = useSafeAreaInsets()
  const sync = useStore((s) => s.sync)
  const authed = useStore((s) => s.authed)
  const online = useStore((s) => s.online)
  const days = useStore((s) => Object.keys(s.data.days).length)
  const signOut = useStore((s) => s.signOut)

  const [store, setStore] = useState<string[]>([])
  const measure = () => {
    const out: string[] = []
    const raw = localStorage.getItem('leanplan.v1') || ''
    out.push(`leanplan.v1: ${(raw.length / 1024).toFixed(1)} KB, ${days} days`)
    let a = performance.now(); const s = loadState(); out.push(`load (read + parse + migrate): ${ms(a)}`)
    a = performance.now(); saveState(s); out.push(`save (stringify + write): ${ms(a)}`)
    a = performance.now(); for (let i = 0; i < 20; i++) localStorage.getItem('leanplan.v1'); out.push(`20 raw reads: ${ms(a)}`)
    setStore(out)
  }

  const [night, setNight] = useState<NightRead | null | undefined>(undefined)
  const [walk, setWalk] = useState<WalkingRead | null>(null)
  const [hkErr, setHkErr] = useState('')
  const readHealth = async () => {
    setHkErr('')
    try {
      if (!healthAvailable()) return setHkErr('Health data is not available on this device.')
      await askHealth()
      const [n, w] = await Promise.all([lastNight(), walking()])
      setNight(n); setWalk(w)
    } catch (e) { setHkErr(String(e)) }
  }

  const [avail, setAvail] = useState('…')
  const [meal, setMeal] = useState('two eggs and a slice of toast with butter')
  const [ai, setAi] = useState('')
  const [aiBusy, setAiBusy] = useState(false)
  useEffect(() => { aiAvailability().then(setAvail) }, [])
  const parse = async () => {
    setAiBusy(true); setAi('')
    const a = performance.now()
    try { const r = await aiRespond(PARSE_INSTRUCTIONS, meal); setAi(`${r}\n\n(${ms(a)})`) } catch (e) { setAi(String(e)) }
    setAiBusy(false)
  }

  const H = ({ children }: { children: ReactNode }) => <Text style={[font(600), { fontSize: 17, color: t.label }]}>{children}</Text>
  const L = ({ children }: { children: ReactNode }) => <Text style={[font(400), num, { fontSize: 15, lineHeight: 21, color: t.label }]}>{children}</Text>
  const S = ({ children }: { children: ReactNode }) => <Text style={[font(400), { fontSize: 13, lineHeight: 18, color: t.label2 }]}>{children}</Text>

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={{ padding: 16, paddingTop: insets.top + 18, gap: 14 }}>
      <Text accessibilityRole="header" style={[font(600), { fontSize: 34, letterSpacing: -0.85, color: t.label }]}>Spike</Text>
      <S>Build {Constants.expoConfig?.version} · For testing only, not part of the app.</S>

      <Card>
        <H>Storage</H>
        {store.map((x) => <L key={x}>{x}</L>)}
        <Btn kind="gray" title="Measure" onPress={measure} />
      </Card>

      <Card>
        <H>Sync</H>
        <L>Signed in: {authed ? 'yes' : 'no'} · Online: {online ? 'yes' : 'no'} · Sync: {sync}</L>
        <S>Uses the web app's own sync code. Days logged on the web appear here after a pull.</S>
      </Card>

      <Card>
        <H>Sleep and walking (Apple Health)</H>
        {night === null && <L>No sleep recorded last night.</L>}
        {night && <>
          <L>Your watch: {night.words}, up around {night.wakeAt}.</L>
          <S>Your own answer is what Tilo goes by.</S>
        </>}
        {walk && <>
          <L>Steps today: {walk.steps == null ? 'none recorded' : walk.steps.toLocaleString('en-GB')}</L>
          <L>Walks in the last 7 days: {walk.walks.length ? walk.walks.map((w) => `${w.day} (${w.mins} min)`).join(', ') : 'none'}</L>
        </>}
        {hkErr ? <S>{hkErr}</S> : null}
        <Btn kind="gray" title="Read from Apple Health" onPress={readHealth} />
        <S>Read on this phone and shown here only. Nothing is saved or sent.</S>
      </Card>

      <Card>
        <H>On-device AI</H>
        <L>Apple Intelligence: {avail}</L>
        <TextInput value={meal} onChangeText={setMeal} multiline
          style={{ minHeight: 60, borderRadius: 14, backgroundColor: t.fill, padding: 12, fontSize: 15, color: t.label, fontFamily: 'Geist_400Regular' }} />
        <Btn kind="gray" title={aiBusy ? 'Working…' : 'Parse this meal'} disabled={aiBusy || avail !== 'available'} onPress={parse} />
        {ai ? <L>{ai}</L> : null}
        <S>Runs on the phone. Nothing leaves it.</S>
      </Card>

      <Card>
        <H>Haptic</H>
        <S>A candidate for later (key taps), only here until a board is approved.</S>
        <Btn kind="gray" title="Tap for a selection haptic" onPress={() => void Haptics.selectionAsync()} />
      </Card>

      <Btn kind="tinted" title="Sign out" onPress={() => void signOut()} />
    </ScrollView>
  )
}
