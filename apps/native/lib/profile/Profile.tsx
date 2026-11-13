/**
 * Profile, rebuilt from src/screens/ProfileScreen.tsx with the same store, the same core functions
 * and the same words, so every row, value and suggested target equals the web's for the same data.
 * Groups, in the web's order: the identity card; You and your goal (body and goal with the
 * suggested targets, daily targets, training); the pillars and asks (WELLBEING_ENABLED); Tracking;
 * Weekly review; Notifications (the screen only: push is N12); Account and data; Testing; About
 * and Privacy; Sign out.
 *
 * Opened from the avatar beside every title (the lead wires it). `onOpenTab` takes Training's row
 * to Plan; without it the store's tab is set, as on the web. N2's flows sit behind ./n2.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Pressable, ScrollView, Text, View, type LayoutChangeEvent, type ScrollViewInstance } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useStore } from '@/store/store'
import type { AccuracyMode, ActivityLevel, DietPattern, Sex } from '@/core/types'
import { DIETS } from '@/core/domain/diet'
import { ACTIVITY } from '@/core/data/constants'
import { fmt, todayStr } from '@/core/domain/date'
import { HELD_AT_MAINTENANCE_NOTE, PROTEIN_EVERYDAY_NOTE, suggestedTargets } from '@/core/domain/nutrition'
import { profileRouting } from '@/core/domain/onboarding'
import { foodView } from '@/core/domain/foodMode'
import { useConsent } from '@/store/hooks'
import { ACCURACY, accuracyOf, handGrams } from '@/core/domain/estimate'
import { latestWeight, rangeWidth } from '@/core/domain/insights'
import { pushSupported } from '@/data/push'
import { consentLetsSync, hasConsent, latestConsent } from '@/data/consent'
import type { PersistedState } from '@/data/persistence'
import type { LegalDocId } from '@/core/legal'
import { SUPP_NAMES_ENABLED, WELLBEING_ENABLED } from '@/data/wellbeingFlag'
import { SHARED_PRODUCTS_ENABLED } from '@/data/sharedProducts'
import { profileKcal, suggestionWeight, weightPatch } from '@/screens/profile/profileTargets'
import { GOALS, GOAL_TARGET_LABEL, HEALTH_STATUS_LABEL, dayName, directionLabel, healthStatusOf } from '@/screens/profile/profileLogic'
import { NOTIFY_COPY } from '@/screens/profile/notifyCopy'
import { font, num, useTokens } from '../theme'
import { Btn, Chevron, Chips, Disclosure, Field, Foot, Icon, Input, Lbl, List, PlainRow, Seg, Select, SettingRow, Sub, Toast, Toggle } from './ui'
import { BackoffNotices, MindReminderRows, PillarsSettings, SuppNamesRow, YourTimes } from './Settings'
import { HealthAnswersScreen } from './HealthAnswers'
import { HealthDataSheet } from './HealthData'
import { FeedbackSheet } from './Feedback'
import { HandsSheet, ImportSheet, ReviewDaySheet, SignOutSheet } from './Sheets'
import { agreeHealth, exportBackup, openDeleteAccount, openLegal, pickBackup, withdrawHealth } from './n2'

/** legal/LegalDoc.tsx LEGAL_LABEL (a TSX file the native bundle can't import; N2 owns the legal screens). */
const LEGAL_LABEL: Record<LegalDocId, string> = { privacy: 'Privacy policy', terms: 'Terms and conditions', cookies: 'Cookie policy' }

type Section = 'profile' | 'metrics' | 'targets' | 'supplements' | 'diet' | 'accuracy' | 'display' | 'account' | 'backup' | 'about' | 'privacy'

/** No AI feature is live (label reading is off): the AI consent row stays hidden until one is. */
const AI_FEATURES_LIVE = false

/** `.grid2`: two equal columns */
function Grid2({ children }: { children: ReactNode[] }) {
  const rows: ReactNode[][] = []
  const list = children.filter(Boolean)
  for (let i = 0; i < list.length; i += 2) rows.push(list.slice(i, i + 2))
  return <>{rows.map((r, i) => <View key={i} style={{ flexDirection: 'row', gap: 10 }}>{r.map((c, j) => <View key={j} style={{ flex: 1, minWidth: 0 }}>{c}</View>)}{r.length === 1 && <View style={{ flex: 1 }} />}</View>)}</>
}

export function ProfileScreen({ onOpenTab }: { onOpenTab?: (tab: 'plan') => void }) {
  const t = useTokens()
  const insets = useSafeAreaInsets()
  const data = useStore((s) => s.data)
  const resumeCopy = data.consents?.resumeCopy
  const resumeDays = Object.keys(resumeCopy?.days || {}).length
  const resumeSaved = (['customFoods', 'recipes', 'routines', 'trainingPlans'] as const).reduce((n, k) => n + Object.keys(resumeCopy?.[k] || {}).length, 0)
  const resumeWhat = [resumeDays ? (resumeDays === 1 ? '1 day' : resumeDays + ' days') : '', resumeSaved ? (resumeSaved === 1 ? '1 saved food, recipe or workout' : resumeSaved + ' saved foods, recipes or workouts') : '', resumeCopy?.settings ? 'your settings' : ''].filter(Boolean)
  const resumeList = resumeWhat.length > 1 ? resumeWhat.slice(0, -1).join(', ') + ' and ' + resumeWhat[resumeWhat.length - 1] : resumeWhat[0] || 'some of your log'
  // this phone's earlier version: its own days, settings and saved records where another device's won
  const withResumeCopy = (c: NonNullable<typeof resumeCopy>): PersistedState => {
    const swap = <T extends { id?: string }>(list: T[] | undefined, mine: Record<string, T> | undefined): T[] => (list || []).map((x) => (x.id && mine?.[x.id]) || x)
    return {
      ...data,
      days: { ...data.days, ...(c.days || {}) },
      ...(c.settings ? (c.settings as Pick<PersistedState, 'target' | 'schedule' | 'profile'>) : {}),
      customFoods: swap(data.customFoods, c.customFoods),
      recipes: swap(data.recipes, c.recipes),
      routines: swap(data.routines, c.routines),
      trainingPlans: swap(data.trainingPlans, c.trainingPlans),
    }
  }
  const email = useStore((s) => s.email)
  const authed = useStore((s) => s.authed)
  const syncPaused = useStore((s) => s.syncPaused)
  const saveProfileMetrics = useStore((s) => s.saveProfileMetrics)
  const saveTargets = useStore((s) => s.saveTargets)
  const setTab = useStore((s) => s.setTab)
  const setPrefs = useStore((s) => s.setPrefs)
  const setShareProducts = useStore((s) => s.setShareProducts)
  const addSupplement = useStore((s) => s.addSupplement)
  const updateSupplement = useStore((s) => s.updateSupplement)
  const removeSupplement = useStore((s) => s.removeSupplement)
  const updateEmail = useStore((s) => s.updateEmail)
  const importBackup = useStore((s) => s.importBackup)
  const showToast = useStore((s) => s.showToast)
  const openRedo = useStore((s) => s.openRedo)
  const [reviewDayOpen, setReviewDayOpen] = useState(false)

  const pr = data.profile
  const weight = latestWeight(data, todayStr())
  // a card elsewhere can ask for a section to be open on arrival (e.g. after an activity update)
  const profileOpen = useStore((s) => s.profileOpen)
  const clearProfileOpen = useStore((s) => s.clearProfileOpen)
  const arrival = profileOpen
  const [open, setOpen] = useState<Section | null>(() => (arrival && arrival !== 'health' && arrival !== 'delete-confirm' && arrival !== 'health-answers' ? arrival as Section : null))
  const [view, setView] = useState<'main' | 'answers'>(() => (arrival === 'health-answers' ? 'answers' : 'main'))
  const [healthOpen, setHealthOpen] = useState(arrival === 'health')

  // where to scroll on arrival: the suggested targets, Notifications, or Display
  const scroll = useRef<ScrollViewInstance>(null)
  const at = useRef<Record<string, number>>({})
  const want = useRef<string | null>(null)
  const mark = (k: string) => (e: LayoutChangeEvent) => {
    at.current[k] = e.nativeEvent.layout.y
    if (want.current === k) { want.current = null; scroll.current?.scrollTo({ y: Math.max(0, e.nativeEvent.layout.y - 120), animated: false }) }
  }
  useEffect(() => {
    if (!profileOpen) return
    clearProfileOpen()
    if (profileOpen === 'health-answers' || profileOpen === 'health') return
    // Wind down's "Set a wind-down time" (B12): Notifications, where the times are, brought into view
    // anything else: bring the suggested targets into view, accepting them is the next step (plan P1.5)
    want.current = profileOpen === 'notifications' ? 'nf' : profileOpen === 'delete-confirm' ? null : 'sug'
    if (profileOpen === 'delete-confirm') openDeleteAccount()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const [handsOpen, setHandsOpen] = useState(false)
  const [pendingBackup, setPendingBackup] = useState<PersistedState | null>(null)
  const [signOutOpen, setSignOutOpen] = useState(false)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  // agreeing from Profile: the full consent screen for someone who never agreed; after a withdrawal, the one-box sheet (N2)
  const agree = () => agreeHealth((data.consents?.records || []).some((r) => r.type === 'health' && r.granted))
  const health = useConsent('health')
  const healthStatus = healthStatusOf(data)
  const healthRec = latestConsent(data, 'health')
  const healthAt = healthRec?.granted ? new Date(healthRec.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : null
  const toggle = (s: Section) => setOpen((o) => (o === s ? null : s))
  // B1.16's "Gentle display": Profile › Display opened and brought into view (one tap)
  const openDisplay = () => {
    setOpen('display')
    const y = at.current.display
    if (y != null) scroll.current?.scrollTo({ y: Math.max(0, y - 200), animated: true })
  }

  const [name, setName] = useState(pr.name || '')
  const [emailField, setEmailField] = useState(email || '')
  const [metrics, setMetrics] = useState({
    sex: pr.sex, age: pr.age?.toString() || '', height: pr.height?.toString() || '',
    // weight not shown back (Sometimes and Yes): the field starts empty, and an empty field leaves
    // the stored weight as it is (weightPatch); the suggestion still reads it (suggestionWeight)
    weight: foodView(pr).weightBack ? weight?.toString() || '' : '', activityLevel: pr.activityLevel,
  })
  const [targets, setTargets] = useState({
    kcal: data.target.kcal.toString(), p: data.target.p.toString(), c: data.target.c.toString(), f: data.target.f.toString(),
    range: rangeWidth(pr).toString(),
  })
  const [suppForm, setSuppForm] = useState<{ id: string | null; name: string; time: string } | null>(null)

  const healthConsent = health.granted
  const sugProfile = { ...pr, age: parseInt(metrics.age) || null, height: parseInt(metrics.height) || null }
  const weightBack = foodView(pr).weightBack
  const sugWeight = suggestionWeight(metrics.weight, weight, weightBack)
  // the same safety routing as the onboarding summary, so the two never disagree
  const sug = suggestedTargets(sugProfile, sugWeight, profileRouting(sugProfile, sugWeight, healthConsent))
  // push is stream N12: until it lands the phone has none, so the switches show the web's no-push state
  const notifReady = pushSupported()
  const notifStatus = !notifReady ? 'Not supported in this browser'
    : globalThis.Notification?.permission === 'denied' ? 'Blocked in your phone settings'
    : pr.notificationsEnabled ? 'On' : 'Off'
  const initials = (pr.name || '').trim().split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase()

  const pk = profileKcal(data, todayStr())
  const kcalText = pk.kind === 'none' ? '' : `${fmt(pk.lo)}–${fmt(pk.hi)} kcal`
  const goalLabel = GOALS.find((g) => g.value === pr.goal)?.label
  const trainDays = Object.values(data.schedule).filter((x) => x && x !== 'Rest').length
  const dietLabel = pr.diet && pr.diet !== 'none' ? DIETS.find(([d]) => d === pr.diet)?.[1] : 'None'
  const FOODF = t.foodFill, MINDF = t.mindFill, MOVEF = t.moveFill, GRAY = t.fill2

  const b = (x: ReactNode) => <Text style={[font(600), num, { color: t.label }]}>{x}</Text>
  const muted = { color: t.label2 }
  const note = (x: ReactNode) => <Text style={[font(), { fontSize: 13, lineHeight: 18, color: t.label2, marginTop: 6 }]}>{x}</Text>
  const numInput = (label: string, v: string, set: (x: string) => void, placeholder?: string, decimal?: boolean) =>
    <Field label={label}><Input label={label} value={v} onChangeText={set} placeholder={placeholder} keyboardType={decimal ? 'decimal-pad' : 'number-pad'} style={num} /></Field>

  // ob7-1: back goes to the Health data sheet it came from
  if (view === 'answers') return <HealthAnswersScreen onBack={() => { setView('main'); setHealthOpen(true) }} />

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 16, paddingTop: insets.top + 18, paddingBottom: insets.bottom + 40 }}>
        {/* the header: no avatar on Profile itself (web PageHeader profile={false}); the connection pill is N1's */}
        <View style={{ paddingBottom: 12 }}>
          <View style={{ minHeight: 20 }} />
          <Text accessibilityRole="header" style={[font(600), { fontSize: 34, lineHeight: 40, letterSpacing: -0.85, color: t.label, marginTop: 2 }]}>Profile</Text>
        </View>

        {/* identity: tap to edit your name and email */}
        <List>
          <Disclosure0 open={open === 'profile'} onToggle={() => toggle('profile')}
            avatar={<View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: WELLBEING_ENABLED ? t.tintSoft : t.tint, alignItems: 'center', justifyContent: 'center' }}>
              {initials ? <Text style={[font(600), { fontSize: 24, color: WELLBEING_ENABLED ? t.tint : t.onTint }]}>{initials}</Text> : <Icon name="person" size={28} color={WELLBEING_ENABLED ? t.tint : t.onTint} />}
            </View>}
            title={pr.name || 'Add your name'}
            lines={[(goalLabel || kcalText) ? [goalLabel, kcalText && kcalText + ' a day'].filter(Boolean).join(' · ') : null, syncPaused ? 'Account · not syncing right now' : email]}>
            <Field label="Display name"><Input label="Display name" value={name} onChangeText={setName} placeholder="Your name" autoCap="words" /></Field>
            {authed && <Field label="Email"><Input label="Email" value={emailField} onChangeText={(v) => setEmailField(v.trim())} keyboardType="email-address" /></Field>}
            <Btn title="Save profile" onPress={async () => {
              saveProfileMetrics({ name })
              if (authed && emailField && emailField !== email) {
                const err = await updateEmail(emailField)
                showToast(err ? 'Email error: ' + err : 'Check your email to confirm')
              }
            }} />
          </Disclosure0>
        </List>

        <Lbl>You and your goal</Lbl>
        <List icons>
          <Disclosure icon="scale" color={FOODF} label="Body and goal" value={[weight && weightBack ? `${weight} kg` : '', goalLabel].filter(Boolean).join(' · ') || undefined}
            open={open === 'metrics'} onToggle={() => toggle('metrics')}>
            <Grid2>{[
              <Field key="sex" label="Sex"><Select<Sex> label="Sex" value={metrics.sex} options={[['M', 'Male'], ['F', 'Female']]} onChange={(v) => setMetrics({ ...metrics, sex: v })} /></Field>,
              <View key="age">{numInput('Age', metrics.age, (v) => setMetrics({ ...metrics, age: v }), '35')}</View>,
              <View key="h">{numInput('Height (cm)', metrics.height, (v) => setMetrics({ ...metrics, height: v }), '178')}</View>,
              <View key="w">{numInput('Weight (kg)', metrics.weight, (v) => setMetrics({ ...metrics, weight: v }), '82.5', true)}</View>,
            ]}</Grid2>
            <Field label="Activity level">
              <Select<ActivityLevel> label="Activity level" value={metrics.activityLevel} options={(Object.keys(ACTIVITY) as ActivityLevel[]).map((k) => [k, ACTIVITY[k].label] as const)} onChange={(v) => setMetrics({ ...metrics, activityLevel: v })} />
            </Field>
            {/* 18+: checked on Save, never while typing; an under-18 age saves nothing and the app's stop shows (store) */}
            <Btn kind="gray" title="Save metrics" onPress={() => saveProfileMetrics({
              sex: metrics.sex, age: parseInt(metrics.age) || null, height: parseInt(metrics.height) || null,
              ...weightPatch(metrics.weight), activityLevel: metrics.activityLevel,
              ...(metrics.activityLevel !== pr.activityLevel ? { activityAsked: todayStr(), activityMult: undefined } : {}),
              ...(metrics.sex !== pr.sex ? { sexAnswer: metrics.sex === 'M' ? 'male' as const : 'female' as const } : {}),
            })} />

            <Lbl style={{ paddingLeft: 0 }}>Main goal</Lbl>
            <Chips options={GOALS} value={pr.goal} onPick={(g) => saveProfileMetrics({ goal: g })} />
            {sug || pk.kind === 'none' ? (
              <View testID="sug-targets" onLayout={mark('sug')} style={{ marginTop: 12, backgroundColor: t.fill, borderRadius: t.radius, padding: 16 }}>
                {!sug || 'hidden' in sug || pk.kind === 'none' ? (
                  <Text style={[font(), { fontSize: 15, lineHeight: 22 }, muted]}>Calorie suggestions are off for now, so there's no number here.</Text>
                ) : pk.kind === 'range' ? (
                  // Sometimes: Food's range, never a single number or a target to use
                  <Text style={[font(), { fontSize: 15, lineHeight: 22, color: t.label }]}>Your food range is about {b(kcalText)} a day, around maintenance.</Text>
                ) : 'goalNeeded' in sug ? (
                  <Text style={[font(), { fontSize: 15, lineHeight: 22, color: t.label }]}>Maintenance about {b(`${fmt(sug.maint)} kcal`)}.{'\n'}<Text style={muted}>Choose your main goal to see a suggested daily target.</Text></Text>
                ) : (
                  <>
                    <Text style={[font(), { fontSize: 15, lineHeight: 22, color: t.label }]}>
                      Maintenance {b(`${fmt(sug.maint)} kcal`)} · {GOAL_TARGET_LABEL[sug.goal]} {b(`${fmt(sug.kcal)} kcal`)}{' '}
                      <Text style={muted}>({directionLabel(sug.adjustPct)})</Text>{'\n'}
                      Protein {b(`${sug.proteinEveryday ? 'about ' : ''}${sug.p} g`)} · Carbs {b(`${sug.c} g`)} · Fat {b(`${sug.f} g`)}
                    </Text>
                    {sug.proteinEveryday && note(PROTEIN_EVERYDAY_NOTE)}
                    {sug.floored && note('Held at a safe minimum. We never suggest eating below your resting metabolic rate.')}
                    {sug.heldAtMaintenance && note(HELD_AT_MAINTENANCE_NOTE)}
                    <Btn title="Use these targets" style={{ marginTop: 10 }} onPress={() => {
                      saveTargets({ kcal: sug.kcal, p: sug.p, c: sug.c, f: sug.f })
                      setTargets({ ...targets, kcal: sug.kcal.toString(), p: sug.p.toString(), c: sug.c.toString(), f: sug.f.toString() })
                    }} />
                  </>
                )}
              </View>
            ) : <Foot style={{ paddingHorizontal: 0, paddingTop: 10 }}>{sugWeight && !weightBack ? 'Add age and height to see suggested targets.' : 'Add age, height and weight to see suggested targets.'}</Foot>}
          </Disclosure>
          {pk.kind === 'range' && (
            <Disclosure icon="target" color={FOODF} label="Daily targets" value={kcalText} open={open === 'targets'} onToggle={() => toggle('targets')}>
              <Foot style={{ padding: 0, paddingTop: 0, paddingHorizontal: 0 }}>A range around maintenance, worked out from your body and activity level, so there's no calorie target to set.</Foot>
            </Disclosure>
          )}
          {pk.kind === 'target' && (
            <Disclosure icon="target" color={FOODF} label="Daily targets" value={kcalText} open={open === 'targets'} onToggle={() => toggle('targets')}>
              <Grid2>{[
                <View key="k">{numInput('Calories', targets.kcal, (v) => setTargets({ ...targets, kcal: v }))}</View>,
                <View key="r">{numInput('Range ±', targets.range, (v) => setTargets({ ...targets, range: v }))}</View>,
                <View key="p">{numInput('Protein (g)', targets.p, (v) => setTargets({ ...targets, p: v }))}</View>,
                <View key="c">{numInput('Carbs (g)', targets.c, (v) => setTargets({ ...targets, c: v }))}</View>,
                <View key="f">{numInput('Fat (g)', targets.f, (v) => setTargets({ ...targets, f: v }))}</View>,
              ]}</Grid2>
              <Btn title="Save targets" onPress={() => {
                saveTargets({
                  kcal: parseInt(targets.kcal) || data.target.kcal, p: parseInt(targets.p) || data.target.p,
                  c: parseInt(targets.c) || data.target.c, f: parseInt(targets.f) || data.target.f,
                }, parseInt(targets.range))
                // show what was actually stored (the calorie floor and range cap may have applied)
                const st = useStore.getState().data
                setTargets({ kcal: String(st.target.kcal), p: String(st.target.p), c: String(st.target.c), f: String(st.target.f), range: String(rangeWidth(st.profile)) })
              }} />
              <Foot style={{ paddingHorizontal: 0, paddingTop: 10 }}>
                Your day is judged against a range (up to ± 400), not a single number. Calories won't go below 1,200 here. Going lower is something to do with medical support.
              </Foot>
            </Disclosure>
          )}
          <SettingRow icon="dumbbell" color={MOVEF} label="Training" value={trainDays === 1 ? '1 day a week' : `${trainDays} days a week`} onPress={() => (onOpenTab ? onOpenTab('plan') : setTab('plan'))} />
        </List>
        <Foot>Your weekly training schedule lives on Plan.</Foot>

        {/* WP9, board B1: pillars and how often Tilo asks (flag on only) */}
        {WELLBEING_ENABLED && <PillarsSettings onDisplay={openDisplay} />}

        <Lbl>Tracking</Lbl>
        <List icons>
          <Disclosure icon="pill" color={MINDF} label="Supplements" value={(pr.supplements || []).length || undefined} open={open === 'supplements'} onToggle={() => toggle('supplements')}>
            {(pr.supplements || []).map((s) => (
              <View key={s.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={[font(), { fontSize: 17, color: t.label }]}>{s.name}</Text>
                  <Text style={[font(), num, { fontSize: 13, color: t.label2, marginTop: 2 }]}>{s.time}</Text>
                </View>
                <Text accessibilityRole="button" onPress={() => setSuppForm({ id: s.id, name: s.name, time: s.time })} style={[font(), { fontSize: 17, color: t.tint }]}>Edit</Text>
                <Text accessibilityRole="button" onPress={() => removeSupplement(s.id)} style={[font(), { fontSize: 17, color: t.red, marginLeft: 12 }]}>Delete</Text>
              </View>
            ))}
            {suppForm ? (
              <View style={{ paddingTop: 10 }}>
                <Field label="Name"><Input label="Name" value={suppForm.name} placeholder="Creatine 5 g" autoCap="sentences" onChangeText={(v) => setSuppForm({ ...suppForm, name: v })} /></Field>
                <Field label="Time"><Input label="Time" value={suppForm.time} placeholder="08:00" keyboardType="numbers-and-punctuation" style={num} onChangeText={(v) => setSuppForm({ ...suppForm, time: v })} /></Field>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}><Btn title={suppForm.id ? 'Update' : 'Add'} onPress={() => {
                    // a time field on the web only ever holds a valid time; typed here, it's checked
                    if (!suppForm.name || !/^([01]\d|2[0-3]):[0-5]\d$/.test(suppForm.time)) return
                    if (suppForm.id) updateSupplement(suppForm.id, suppForm.name, suppForm.time)
                    else addSupplement(suppForm.name, suppForm.time)
                    setSuppForm(null)
                  }} /></View>
                  <View style={{ flex: 1 }}><Btn kind="gray" title="Cancel" onPress={() => setSuppForm(null)} /></View>
                </View>
              </View>
            ) : <Btn kind="tinted" title="Add supplement" style={{ marginTop: 8 }} onPress={() => setSuppForm({ id: null, name: '', time: '08:00' })} />}
          </Disclosure>
          <Disclosure icon="leaf" color={FOODF} label="Diet" value={dietLabel} open={open === 'diet'} onToggle={() => toggle('diet')}>
            <Seg<DietPattern> options={DIETS.map(([d, l]) => [d, d === 'none' ? 'None' : l] as const)} value={pr.diet ?? 'none'} onChange={(v) => setPrefs({ diet: v })} />
            {note("Meal suggestions offer swaps for ingredients that don't fit. Nothing is hidden.")}
          </Disclosure>
          <SettingRow icon="hand" color={FOODF} label="Hand portions" value={`palm ${handGrams(pr, 'palm')} g`} onPress={() => setHandsOpen(true)} />
          <Disclosure icon="target" color={FOODF} label="Accuracy" value={accuracyOf(pr).label} open={open === 'accuracy'} onToggle={() => toggle('accuracy')}>
            <Seg<AccuracyMode> options={(Object.keys(ACCURACY) as AccuracyMode[]).map((k) => [k, ACCURACY[k].label] as const)} value={pr.accuracy ?? 'balanced'} onChange={(v) => setPrefs({ accuracy: v })} />
            {note(accuracyOf(pr).desc)}
          </Disclosure>
          <View onLayout={mark('display')}>
            <Disclosure icon="smile" color={MINDF} label="Display" value={pr.gentle ? 'Gentle' : 'Standard'} open={open === 'display'} onToggle={() => toggle('display')}>
              <Seg<'std' | 'gentle'> options={[['std', 'Standard'], ['gentle', 'Gentle']]} value={pr.gentle ? 'gentle' : 'std'} onChange={(v) => setPrefs({ gentle: v === 'gentle' })} />
              {note(pr.gentle ? 'Calorie numbers are hidden while you log and review your day, and body weight is off your Summary. You see how the day is going in words, and protein stays visible. Targets stay editable here.'
                : 'Full numbers, with a ± margin on anything estimated.')}
            </Disclosure>
          </View>
        </List>

        {/* ml-e4: the weekly review (boards ml-c4, ml-d1) */}
        <Lbl>Weekly review</Lbl>
        <List icons>
          <SettingRow icon="review" color={MINDF} label="Review day" value={dayName(pr.reviewDay ?? 0)} onPress={() => setReviewDayOpen(true)} />
          <SettingRow icon="weight" color={FOODF} label="Include weight in reviews"
            right={<Toggle label="Include weight in reviews" on={pr.reviewWeight === true} disabled={!!pr.gentle} onChange={() => setPrefs({ reviewWeight: pr.reviewWeight !== true })} />} />
        </List>
        <Foot>Your review shows how often you weighed in and, after 4 weeks, the trend in words. Summary shows your latest weigh-in. Never with gentle display. Change it any time.</Foot>

        <View onLayout={mark('nf')}><Lbl>Notifications</Lbl></View>
        {WELLBEING_ENABLED && <BackoffNotices />}
        <List icons>
          {WELLBEING_ENABLED && <MindReminderRows />}
          <SettingRow icon="bell" color={MINDF} label="Supplement reminders" sub={notifStatus}
            right={<Toggle label="Supplement reminders" on={pr.notificationsEnabled} disabled={!notifReady} onChange={() => undefined /* N12 wires push; never switched from here until then */} />} />
          {SUPP_NAMES_ENABLED && pr.notificationsEnabled && <SuppNamesRow />}
          <SettingRow icon="bell" color={MINDF} label="Weekly review reminder" sub={`One note on ${dayName(pr.reviewDay ?? 0)} morning`}
            right={<Toggle label="Weekly review reminder" on={!!pr.reviewPush} disabled={!notifReady} onChange={() => undefined} />} />
        </List>
        {SUPP_NAMES_ENABLED && pr.notificationsEnabled && <Foot>{NOTIFY_COPY.namesFoot}</Foot>}
        {WELLBEING_ENABLED && <YourTimes />}
        <Foot>iPhone needs iOS 16.4 or later, with Tilo added to your Home Screen from Safari.</Foot>

        <Lbl>Account and data</Lbl>
        <List icons>
          <Disclosure icon="person" color={GRAY} label="Account" open={open === 'account'} onToggle={() => toggle('account')}>
            <Text style={[font(), { fontSize: 13, color: t.label2 }]}>Signed in as</Text>
            <Text style={[font(), { fontSize: 17, color: t.label }]}>{syncPaused ? 'Your account (not syncing right now)' : email}</Text>
            {authed && <Foot style={{ paddingHorizontal: 0, paddingTop: 8 }}>Change your name or email from the card at the top.</Foot>}
          </Disclosure>
          <SettingRow icon="heart" color={MINDF} label="Health data" value={HEALTH_STATUS_LABEL[healthStatus]} onPress={() => setHealthOpen(true)} />
          {/* AI features: hidden until one ships (the privacy policy doesn't describe AI processing yet) */}
          {AI_FEATURES_LIVE && <SettingRow icon="bulb" color={GRAY} label="AI features" value={hasConsent(data, 'ai') ? 'On' : 'Off'} onPress={() => undefined} />}
          <Disclosure icon="cloud" color={GRAY} label="Back up and restore" value="Export, import" open={open === 'backup'} onToggle={() => toggle('backup')}>
            <Sub style={{ marginBottom: 10 }}>{!consentLetsSync(data)
              ? 'Your log is only on this phone until you agree to Tilo keeping your health data, so export a copy now and then.'
              : `Your log is stored on this device, so Tilo works without a connection${authed ? ', and it syncs to your private database when you’re online' : syncPaused ? '. Not syncing right now: changes sync when you’re back online, or sign in again from Account' : ''}. Export a copy now and then.`}</Sub>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}><Btn kind="gray" title="Export" onPress={() => exportBackup(data)} /></View>
              <View style={{ flex: 1 }}><Btn kind="gray" title="Import" onPress={async () => {
                try { const b2 = await pickBackup(); if (b2) setPendingBackup(b2) } catch { showToast("That isn't a valid backup file") }
              }} /></View>
            </View>
            {resumeCopy && (
              <View style={{ marginTop: 12 }}>
                <Sub style={{ marginBottom: 8 }}>When sync started again, {resumeList} had changed on another device, so Tilo kept those. This phone’s earlier version is saved here: download it as a backup you can import.</Sub>
                <Btn kind="gray" title="Download this phone’s earlier version" onPress={() => exportBackup(withResumeCopy(resumeCopy))} />
              </View>
            )}
          </Disclosure>
          <SettingRow icon="x" color={GRAY} label="Delete account" onPress={openDeleteAccount} />
        </List>

        <Lbl>Testing</Lbl>
        <List icons>
          <SettingRow icon="mail" color={MINDF} label="Send feedback" sub="What’s working, and what you’d like to see" onPress={() => setFeedbackOpen(true)} />
        </List>

        <List icons style={{ marginTop: 24 }}>
          <Disclosure icon="info" color={GRAY} label="About Tilo" open={open === 'about'} onToggle={() => toggle('about')}>
            <Sub style={{ marginBottom: 10 }}><Text style={[font(600), { color: t.label2 }]}>Tilo</Text> is a personal health and fitness tracker.</Sub>
            <Sub>General fitness information only, not medical advice. Talk to a GP before starting a new diet or exercise programme.</Sub>
          </Disclosure>
          <Disclosure icon="key" color={GRAY} label="Privacy" value={health.granted ? undefined : 'Health data off'} open={open === 'privacy'} onToggle={() => toggle('privacy')}>
            <Sub style={{ marginBottom: 10 }}>
              {health.granted && healthAt ? `You agreed to Tilo using your health information on ${healthAt}. ` : healthStatus === 'off' ? 'You’ve withdrawn consent, so your log is on your phones only and Tilo doesn’t keep your weigh-ins, check-ins or body details. ' : ''}
              {consentLetsSync(data) ? 'Your data is stored on this phone and in your private account database.' : 'Your log is only on this phone until you agree.'} It’s never sold or used for ads.
            </Sub>
            {SHARED_PRODUCTS_ENABLED && (
              // sp-5: on after a yes at the first shared product (sp-1), off after Not now
              <>
                <List style={{ margin: 0, marginBottom: 0 }}>
                  <PlainRow title="Share new products I scan" right={<Toggle label="Share new products I scan" on={hasConsent(data, 'shared-products')} onChange={() => setShareProducts(!hasConsent(data, 'shared-products'))} />} />
                </List>
                <Foot style={{ marginBottom: 16 }}>Barcode, name and figures only, never who added them.</Foot>
              </>
            )}
            <List style={{ marginBottom: 8 }}>
              {(['privacy', 'terms', 'cookies'] as LegalDocId[]).map((id) => <PlainRow key={id} title={LEGAL_LABEL[id]} onPress={() => openLegal(id)} />)}
            </List>
            {/* the same flows as the Health data and Delete account rows above */}
            {health.granted
              ? <Btn kind="gray" title="Withdraw consent for health data" onPress={withdrawHealth} />
              : <Btn kind="gray" title="Turn health data back on" onPress={agree} />}
            <Btn kind="danger" title="Delete account" style={{ marginTop: 6 }} onPress={openDeleteAccount} />
          </Disclosure>
        </List>

        <Btn kind="signout" title="Sign out" style={{ marginTop: 24 }} onPress={() => setSignOutOpen(true)} />
        <Foot style={{ textAlign: 'center', paddingTop: 12 }}>Tilo offers general wellness guidance, not medical advice.</Foot>
      </ScrollView>

      {reviewDayOpen && <ReviewDaySheet onClose={() => setReviewDayOpen(false)} />}
      {handsOpen && <HandsSheet onClose={() => setHandsOpen(false)} />}
      {signOutOpen && <SignOutSheet onClose={() => setSignOutOpen(false)} />}
      {feedbackOpen && <FeedbackSheet onClose={() => setFeedbackOpen(false)} />}
      {healthOpen && <HealthDataSheet onClose={() => setHealthOpen(false)} onAgree={() => { setHealthOpen(false); agree() }}
        onAnswers={() => { setHealthOpen(false); setView('answers') }} onRedo={() => { setHealthOpen(false); openRedo(true) }} />}
      {pendingBackup && <ImportSheet backup={pendingBackup} onClose={() => setPendingBackup(null)} onImport={() => { importBackup(pendingBackup); setPendingBackup(null) }} />}
      <Toast />
    </View>
  )
}

/** The identity card's row (`.idcard .li`): a large avatar, the name in 20 pt, two small lines. */
function Disclosure0({ open, onToggle, avatar, title, lines, children }: { open: boolean; onToggle: () => void; avatar: ReactNode; title: string; lines: (string | null)[]; children: ReactNode }) {
  const t = useTokens()
  return (
    <>
      <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} onPress={onToggle}
        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, backgroundColor: pressed ? t.fill : 'transparent' })}>
        {avatar}
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text numberOfLines={1} style={[font(600), { fontSize: 20, color: t.label }]}>{title}</Text>
          {lines.filter((x): x is string => !!x).map((l, i) => <Text key={i} numberOfLines={1} style={[font(), num, { fontSize: 14, color: t.label2, marginTop: 2 }]}>{l}</Text>)}
        </View>
        <Chevron rotate={open ? 90 : 0} />
      </Pressable>
      {open && <View style={{ paddingTop: 4, paddingHorizontal: 16, paddingBottom: 16 }}>{children}</View>}
    </>
  )
}
