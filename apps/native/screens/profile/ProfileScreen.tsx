/**
 * Profile (stream N10), from src/screens/ProfileScreen.tsx: the same store, core functions and
 * words (src/copy/profile.ts), on N1's kit (lib/ui). Groups in the web's order: the identity card;
 * You and your goal; the pillars and asks (WELLBEING_ENABLED); Tracking; Weekly review;
 * Notifications (the screen only: push is N12); Account and data; Testing; About and Privacy;
 * Sign out. N2's flows (consent, withdraw, delete, export, import) sit behind ./n2.
 * Pieces N1 hasn't built yet render nothing and say so: TODO(N1-followup).
 *
 * `onOpenTab` takes Training's row to Plan; without it the store's tab is set, as on the web.
 */
import { useEffect, useRef, useState } from 'react'
import { Pressable, ScrollView, Text, View, type LayoutChangeEvent, type ScrollViewInstance } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useStore } from '@/store/store'
import type { AccuracyMode, DietPattern } from '@/core/types'
import { DIETS } from '@/core/domain/diet'
import { fmt, todayStr } from '@/core/domain/date'
import { HELD_AT_MAINTENANCE_NOTE, PROTEIN_EVERYDAY_NOTE, suggestedTargets } from '@/core/domain/nutrition'
import { profileRouting } from '@/core/domain/onboarding'
import { foodView } from '@/core/domain/foodMode'
import { useConsent } from '@/store/hooks'
import { ACCURACY, accuracyOf, handGrams } from '@/core/domain/estimate'
import { latestWeight, rangeWidth } from '@/core/domain/insights'
import { consentLetsSync, hasConsent, latestConsent } from '@/data/consent'
import type { PersistedState } from '@/data/persistence'
import { SUPP_NAMES_ENABLED, WELLBEING_ENABLED } from '@/data/wellbeingFlag'
import { SHARED_PRODUCTS_ENABLED } from '@/data/sharedProducts'
import { PROFILE as P } from '@/copy/profile'
import { NOTIFY_COPY } from '@/copy/notify'
import { profileKcal, suggestionWeight } from '@/screens/profile/profileTargets'
import { GOALS, GOAL_TARGET_LABEL, HEALTH_STATUS_LABEL, directionLabel, healthStatusOf } from '@/screens/profile/profileModel'
import { dayName } from '@/screens/review/reviewModel'
import { GEIST, num, tx, useTokens } from '../../lib/theme'
import { Foot, Lbl, Sub } from '../../lib/ui/text'
import { Btn, Card, Chip, Chips, LinkBtn, List, initials as initialsOf } from '../../lib/ui/kit'
import { Disclosure, PageHeader, Row, Seg, SettingRow, Toggle } from '../../lib/ui/primitives'
import { Chevron, Icon } from '../../lib/ui/icons'
import { FLAT_FOOT, NOTE, PROSE } from './text'
import { BackoffNotices, MindReminderRows, PillarsSettings, SuppNamesRow, YourTimes } from './Settings'
import { HealthAnswersScreen } from './HealthAnswers'
import { HealthDataSheet } from './HealthData'
import { SupportSheet } from './Support'
import { FeedbackSheet } from './Feedback'
import { HandsSheet, ImportSheet, ReviewDaySheet, SignOutSheet } from './Sheets'
import { LEGAL_DOCS, LEGAL_LABEL, agreeHealth, exportBackup, openDeleteAccount, openLegal, pickBackup, withdrawHealth } from './n2'
import { pushReady } from './n12'

type Section = 'profile' | 'metrics' | 'targets' | 'supplements' | 'diet' | 'accuracy' | 'display' | 'account' | 'backup' | 'about' | 'privacy'

/** No AI feature is live (label reading is off): the AI consent row stays hidden until one is. */
const AI_FEATURES_LIVE = false

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
  const importBackup = useStore((s) => s.importBackup)
  const showToast = useStore((s) => s.showToast)
  const openRedo = useStore((s) => s.openRedo)

  const pr = data.profile
  const weight = latestWeight(data, todayStr())
  // a card elsewhere can ask for a section to be open on arrival (e.g. after an activity update)
  const profileOpen = useStore((s) => s.profileOpen)
  const clearProfileOpen = useStore((s) => s.clearProfileOpen)
  const arrival = profileOpen
  const [open, setOpen] = useState<Section | null>(() => (arrival && arrival !== 'health' && arrival !== 'delete-confirm' && arrival !== 'health-answers' ? arrival as Section : null))
  const [view, setView] = useState<'main' | 'answers'>(() => (arrival === 'health-answers' ? 'answers' : 'main'))
  const [healthOpen, setHealthOpen] = useState(arrival === 'health')
  const [supportOpen, setSupportOpen] = useState<false | 'profile' | 'mind'>(false)

  // where to scroll on arrival: the suggested targets or Notifications; Display for B1.16's link
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
    if (profileOpen === 'delete-confirm') { openDeleteAccount(); return }
    want.current = profileOpen === 'notifications' ? 'nf' : 'sug'
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const [handsOpen, setHandsOpen] = useState(false)
  const [reviewDayOpen, setReviewDayOpen] = useState(false)
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

  // the form fields wait on N1's text fields and pickers (TODO below); their state is the web's
  const [metrics] = useState({ age: pr.age?.toString() || '', height: pr.height?.toString() || '', weight: foodView(pr).weightBack ? weight?.toString() || '' : '' })
  const [targets, setTargets] = useState({
    kcal: data.target.kcal.toString(), p: data.target.p.toString(), c: data.target.c.toString(), f: data.target.f.toString(),
    range: rangeWidth(pr).toString(),
  })
  const [suppForm, setSuppForm] = useState<{ id: string | null; name: string; time: string } | null>(null)

  const sugProfile = { ...pr, age: parseInt(metrics.age) || null, height: parseInt(metrics.height) || null }
  const weightBack = foodView(pr).weightBack
  const sugWeight = suggestionWeight(metrics.weight, weight, weightBack)
  // the same safety routing as the onboarding summary, so the two never disagree
  const sug = suggestedTargets(sugProfile, sugWeight, profileRouting(sugProfile, sugWeight, health.granted))
  // push is N12: until it lands the switches show the web's no-push state and never change the account
  const notifReady = pushReady()
  const notifStatus = !notifReady ? P.notify.unsupported : pr.notificationsEnabled ? P.notify.on : P.notify.off
  const ini = initialsOf(pr.name || '')

  const pk = profileKcal(data, todayStr())
  const kcalText = pk.kind === 'none' ? '' : `${fmt(pk.lo)}–${fmt(pk.hi)} kcal`
  const goalLabel = GOALS.find((g) => g.value === pr.goal)?.label
  const trainDays = Object.values(data.schedule).filter((x) => x && x !== 'Rest').length
  const dietLabel = pr.diet && pr.diet !== 'none' ? DIETS.find(([d]) => d === pr.diet)?.[1] : P.diet.none
  const FOODF = t.foodFill, MINDF = t.mindFill, MOVEF = t.moveFill, GRAY = t.fill2

  const body = [tx(15, 400, 1.45), { color: t.label }]
  const b = (x: string) => <Text style={[tx(15, 700, 1.45), num, { color: t.label }]}>{x}</Text>
  const muted = { color: t.label2 }

  // ob7-1: back goes to the Health data sheet it came from
  if (view === 'answers') return <HealthAnswersScreen onBack={() => { setView('main'); setHealthOpen(true) }} />

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView ref={scroll} keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: insets.bottom + 40 }}>
        <PageHeader title={P.title} profile={false} />

        {/* identity (`.idcard`): a Profile-only row, the large avatar (`.avatar.lg`, soft with the wellbeing flag), name and two lines */}
        <List style={{ marginBottom: 8 }}>
          <View>
            <Pressable accessibilityRole="button" accessibilityState={{ expanded: open === 'profile' }} onPress={() => toggle('profile')}
              style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, backgroundColor: pressed ? t.fill : 'transparent' })}>
              <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: WELLBEING_ENABLED ? t.tintSoft : t.tint, alignItems: 'center', justifyContent: 'center' }}>
                {ini ? <Text style={[tx(24, 600), { color: WELLBEING_ENABLED ? t.tint : t.onTint }]}>{ini}</Text> : <Icon name="person" size={28} color={WELLBEING_ENABLED ? t.tint : t.onTint} />}
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text numberOfLines={1} style={[tx(20, 600), { color: t.label }]}>{pr.name || P.id.addName}</Text>
                {(goalLabel || kcalText) ? <Text numberOfLines={1} style={[tx(14), num, { color: t.label2, marginTop: 2 }]}>{[goalLabel, kcalText && kcalText + P.id.perDay].filter(Boolean).join(' · ')}</Text> : null}
                <Text numberOfLines={1} style={[tx(14), { color: t.label2, marginTop: 2 }]}>{syncPaused ? P.id.notSyncing : email}</Text>
              </View>
              <Chevron color={t.label3} rotate={open === 'profile' ? 90 : 0} />
            </Pressable>
            {open === 'profile' && (
              <View style={{ paddingTop: 4, paddingHorizontal: 16, paddingBottom: 16 }}>
                {/* TODO(N1-followup) item 1, `.field` inputs: P.id.displayName (placeholder P.id.namePh) and, signed in, P.id.email; then the
                    button saves the name and, for a new email, calls updateEmail and toasts P.id.emailError(err) or P.id.checkEmail (src/screens/ProfileScreen.tsx) */}
                <Btn title={P.id.save} onPress={() => saveProfileMetrics({ name: pr.name })} />
              </View>
            )}
          </View>
        </List>

        <Lbl>{P.groups.goal}</Lbl>
        <List icons>
          <Disclosure soft icon="scale" color={FOODF} label={P.body.row} value={[weight && weightBack ? `${weight} kg` : '', goalLabel].filter(Boolean).join(' · ') || undefined}
            open={open === 'metrics'} onToggle={() => toggle('metrics')}>
            {/* TODO(N1-followup) items 1 and 2: Sex and Activity level selects, Age, Height (cm) and Weight (kg) number fields in `.grid2`, then
                "Save metrics" with weightPatch, the activity cool-down and sexAnswer as src/screens/ProfileScreen.tsx does */}
            <Lbl>{P.body.mainGoal}</Lbl>
            <Chips>{GOALS.map((g) => <Chip key={g.value} title={g.label} on={pr.goal === g.value} onPress={() => saveProfileMetrics({ goal: g.value })} />)}</Chips>
            {sug || pk.kind === 'none' ? (
              <View onLayout={mark('sug')} testID="sug-targets">
                <Card style={{ marginTop: 12, backgroundColor: t.fill }}>
                  {!sug || 'hidden' in sug || pk.kind === 'none' ? (
                    <Text style={[body, muted]}>{P.sug.off}</Text>
                  ) : pk.kind === 'range' ? (
                    // Sometimes: Food's range, never a single number or a target to use
                    <Text style={body}>{P.sug.range[0]}{b(kcalText)}{P.sug.range[1]}</Text>
                  ) : 'goalNeeded' in sug ? (
                    <Text style={body}>{P.sug.maintAbout[0]}{b(`${fmt(sug.maint)} kcal`)}{P.sug.maintAbout[1]}{'\n'}<Text style={muted}>{P.sug.chooseGoal}</Text></Text>
                  ) : (
                    <View>
                      <Text style={body}>
                        {P.sug.maint}{b(`${fmt(sug.maint)} kcal`)} · {GOAL_TARGET_LABEL[sug.goal]} {b(`${fmt(sug.kcal)} kcal`)}{' '}
                        <Text style={muted}>({directionLabel(sug.adjustPct)})</Text>{'\n'}
                        {P.sug.protein}{b(`${sug.proteinEveryday ? P.sug.about : ''}${sug.p} g`)} · {P.sug.carbs}{b(`${sug.c} g`)} · {P.sug.fat}{b(`${sug.f} g`)}
                      </Text>
                      {sug.proteinEveryday && <Sub style={[NOTE, { marginTop: 6 }]}>{PROTEIN_EVERYDAY_NOTE}</Sub>}
                      {sug.floored && <Sub style={[NOTE, { marginTop: 6 }]}>{P.sug.floored}</Sub>}
                      {sug.heldAtMaintenance && <Sub style={[NOTE, { marginTop: 6 }]}>{HELD_AT_MAINTENANCE_NOTE}</Sub>}
                      <Btn title={P.sug.use} style={{ marginTop: 10 }} onPress={() => {
                        saveTargets({ kcal: sug.kcal, p: sug.p, c: sug.c, f: sug.f })
                        setTargets({ ...targets, kcal: sug.kcal.toString(), p: sug.p.toString(), c: sug.c.toString(), f: sug.f.toString() })
                      }} />
                    </View>
                  )}
                </Card>
              </View>
            ) : <Foot style={FLAT_FOOT}>{sugWeight && !weightBack ? P.sug.needAgeHeight : P.sug.needAll}</Foot>}
          </Disclosure>
          {pk.kind === 'range' && (
            <Disclosure soft icon="target" color={FOODF} label={P.targets.row} value={kcalText} open={open === 'targets'} onToggle={() => toggle('targets')}>
              <Foot style={{ paddingHorizontal: 0, paddingTop: 0 }}>{P.targets.rangeOnly}</Foot>
            </Disclosure>
          )}
          {pk.kind === 'target' && (
            <Disclosure soft icon="target" color={FOODF} label={P.targets.row} value={kcalText} open={open === 'targets'} onToggle={() => toggle('targets')}>
              {/* TODO(N1-followup) item 1, `.field` number fields in `.grid2`: P.targets.kcal, range, p, c, f editing `targets` (src/screens/ProfileScreen.tsx) */}
              <Btn title={P.targets.save} onPress={() => {
                saveTargets({
                  kcal: parseInt(targets.kcal) || data.target.kcal, p: parseInt(targets.p) || data.target.p,
                  c: parseInt(targets.c) || data.target.c, f: parseInt(targets.f) || data.target.f,
                }, parseInt(targets.range))
                // show what was actually stored (the calorie floor and range cap may have applied)
                const st = useStore.getState().data
                setTargets({ kcal: String(st.target.kcal), p: String(st.target.p), c: String(st.target.c), f: String(st.target.f), range: String(rangeWidth(st.profile)) })
              }} />
              <Foot style={FLAT_FOOT}>{P.targets.foot}</Foot>
            </Disclosure>
          )}
          <SettingRow soft icon="dumbbell" color={MOVEF} label={P.training.row} value={P.training.days(trainDays)} onPress={() => (onOpenTab ? onOpenTab('plan') : setTab('plan'))} />
        </List>
        <Foot>{P.training.foot}</Foot>

        {/* WP9, board B1: pillars and how often Tilo asks (flag on only) */}
        {WELLBEING_ENABLED && <PillarsSettings onDisplay={openDisplay} onSupport={() => setSupportOpen('mind')} />}

        <Lbl>{P.groups.tracking}</Lbl>
        <List icons>
          <Disclosure soft icon="pill" color={MINDF} label={P.supps.row} value={(pr.supplements || []).length || undefined} open={open === 'supplements'} onToggle={() => toggle('supplements')}>
            {(pr.supplements || []).map((s) => (
              <View key={s.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 }}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={[tx(17), { color: t.label }]}>{s.name}</Text>
                  <Text style={[tx(13), num, { color: t.label2, marginTop: 2 }]}>{s.time}</Text>
                </View>
                <LinkBtn title={P.supps.edit} onPress={() => setSuppForm({ id: s.id, name: s.name, time: s.time })} style={[tx(17), { paddingHorizontal: 0 }]} />
                <LinkBtn title={P.supps.del} onPress={() => removeSupplement(s.id)} style={[tx(17), { color: t.red, paddingHorizontal: 0, marginLeft: 12 }]} />
              </View>
            ))}
            {suppForm ? (
              <View style={{ paddingTop: 10 }}>
                {/* TODO(N1-followup) items 1 and 2: P.supps.name field (placeholder P.supps.namePh) and P.supps.time with the TimePicker, editing suppForm */}
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  <View style={{ flex: 1 }}><Btn title={suppForm.id ? P.supps.update : P.supps.add} onPress={() => {
                    if (!suppForm.name || !suppForm.time) return
                    if (suppForm.id) updateSupplement(suppForm.id, suppForm.name, suppForm.time)
                    else addSupplement(suppForm.name, suppForm.time)
                    setSuppForm(null)
                  }} /></View>
                  <View style={{ flex: 1 }}><Btn kind="gray" title={P.supps.cancel} onPress={() => setSuppForm(null)} /></View>
                </View>
              </View>
            ) : <Btn kind="tinted" title={P.supps.addRow} style={{ marginTop: 8 }} onPress={() => setSuppForm({ id: null, name: '', time: '08:00' })} />}
          </Disclosure>
          <Disclosure soft icon="leaf" color={FOODF} label={P.diet.row} value={dietLabel} open={open === 'diet'} onToggle={() => toggle('diet')}>
            <Seg<DietPattern> options={DIETS.map(([d, l]): [DietPattern, string] => [d, d === 'none' ? P.diet.none : l])} value={pr.diet ?? 'none'} onChange={(v) => setPrefs({ diet: v })} />
            <Sub style={NOTE}>{P.diet.note}</Sub>
          </Disclosure>
          <SettingRow soft icon="hand" color={FOODF} label={P.hands.row} value={P.hands.value(handGrams(pr, 'palm'))} onPress={() => setHandsOpen(true)} />
          <Disclosure soft icon="target" color={FOODF} label={P.accuracy.row} value={accuracyOf(pr).label} open={open === 'accuracy'} onToggle={() => toggle('accuracy')}>
            <Seg<AccuracyMode> options={(Object.keys(ACCURACY) as AccuracyMode[]).map((k): [AccuracyMode, string] => [k, ACCURACY[k].label])} value={pr.accuracy ?? 'balanced'} onChange={(v) => setPrefs({ accuracy: v })} />
            <Sub style={NOTE}>{accuracyOf(pr).desc}</Sub>
          </Disclosure>
          <View onLayout={mark('display')}>
            <Disclosure soft icon="smile" color={MINDF} label={P.display.row} value={pr.gentle ? P.display.gentle : P.display.standard} open={open === 'display'} onToggle={() => toggle('display')}>
              <Seg<'std' | 'gentle'> options={[['std', P.display.standard], ['gentle', P.display.gentle]]} value={pr.gentle ? 'gentle' : 'std'} onChange={(v) => setPrefs({ gentle: v === 'gentle' })} />
              <Sub style={NOTE}>{pr.gentle ? P.display.gentleNote : P.display.standardNote}</Sub>
            </Disclosure>
          </View>
        </List>

        {/* ml-e4: the weekly review (boards ml-c4, ml-d1) */}
        <Lbl>{P.groups.review}</Lbl>
        <List icons>
          <SettingRow soft icon="review" color={MINDF} label={P.review.day} value={dayName(pr.reviewDay ?? 0)} onPress={() => setReviewDayOpen(true)} />
          <SettingRow soft icon="weight" color={FOODF} label={P.review.weight}
            right={<Toggle label={P.review.weight} on={pr.reviewWeight === true} disabled={!!pr.gentle} onChange={() => setPrefs({ reviewWeight: pr.reviewWeight !== true })} />} />
        </List>
        <Foot>{P.review.foot}</Foot>

        <View onLayout={mark('nf')}><Lbl>{P.groups.notifications}</Lbl></View>
        {WELLBEING_ENABLED && <BackoffNotices />}
        <List icons>
          {WELLBEING_ENABLED && <MindReminderRows />}
          <SettingRow soft icon="bell" color={MINDF} label={P.notify.supps} sub={notifStatus}
            right={<Toggle label={P.notify.supps} on={pr.notificationsEnabled} disabled={!notifReady} onChange={() => undefined /* N12 wires push */} />} />
          {SUPP_NAMES_ENABLED && pr.notificationsEnabled && <SuppNamesRow />}
          <SettingRow soft icon="bell" color={MINDF} label={P.notify.weekly} sub={P.notify.weeklySub(dayName(pr.reviewDay ?? 0))}
            right={<Toggle label={P.notify.weekly} on={!!pr.reviewPush} disabled={!notifReady} onChange={() => undefined /* N12 wires push */} />} />
        </List>
        {SUPP_NAMES_ENABLED && pr.notificationsEnabled && <Foot>{NOTIFY_COPY.namesFoot}</Foot>}
        {WELLBEING_ENABLED && <YourTimes />}
        <Foot>{P.notify.iphone}</Foot>

        <Lbl>{P.groups.account}</Lbl>
        <List icons>
          <Disclosure soft icon="person" color={GRAY} label={P.account.row} open={open === 'account'} onToggle={() => toggle('account')}>
            <Text style={[tx(13), { color: t.label2 }]}>{P.account.signedInAs}</Text>
            <Text style={[tx(17), { color: t.label }]}>{syncPaused ? P.account.notSyncing : email}</Text>
            {authed && <Foot style={{ paddingHorizontal: 0, paddingTop: 8 }}>{P.account.changeHint}</Foot>}
          </Disclosure>
          <SettingRow soft icon="heart" color={MINDF} label={P.healthRow} value={HEALTH_STATUS_LABEL[healthStatus]} onPress={() => setHealthOpen(true)} />
          {AI_FEATURES_LIVE && <SettingRow soft icon="bulb" color={GRAY} label={P.aiRow} value={hasConsent(data, 'ai') ? P.notify.on : P.notify.off} onPress={() => undefined} />}
          <Disclosure soft icon="cloud" color={GRAY} label={P.backup.row} value={P.backup.value} open={open === 'backup'} onToggle={() => toggle('backup')}>
            <Sub style={[PROSE, { marginBottom: 10 }]}>{!consentLetsSync(data) ? P.backup.phoneOnly : P.backup.stored + (authed ? P.backup.syncs : syncPaused ? P.backup.paused : '') + P.backup.exportNote}</Sub>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1 }}><Btn kind="gray" title={P.backup.export} onPress={() => exportBackup(data)} /></View>
              <View style={{ flex: 1 }}><Btn kind="gray" title={P.backup.import} onPress={async () => {
                try { const got = await pickBackup(); if (got) setPendingBackup(got) } catch { showToast(P.backup.invalid) }
              }} /></View>
            </View>
            {resumeCopy && (
              <View style={{ marginTop: 12 }}>
                <Sub style={[PROSE, { marginBottom: 8 }]}>{P.backup.resume(resumeList)}</Sub>
                <Btn kind="gray" title={P.backup.resumeBtn} onPress={() => exportBackup(withResumeCopy(resumeCopy))} />
              </View>
            )}
          </Disclosure>
          <SettingRow soft icon="x" color={GRAY} label={P.deleteRow} onPress={openDeleteAccount} />
        </List>

        <Lbl>{P.groups.testing}</Lbl>
        <List icons>
          <SettingRow soft icon="mail" color={MINDF} label={P.feedbackRow.label} sub={P.feedbackRow.sub} onPress={() => setFeedbackOpen(true)} />
        </List>

        <List icons style={{ marginTop: 24 }}>
          <Disclosure soft icon="info" color={GRAY} label={P.about.row} open={open === 'about'} onToggle={() => toggle('about')}>
            <Sub style={[PROSE, { marginBottom: 10 }]}><Text style={{ fontFamily: GEIST[700] }}>{P.about.name}</Text>{P.about.lead}</Sub>
            <Sub style={PROSE}>{P.about.body}</Sub>
          </Disclosure>
          <Disclosure soft icon="key" color={GRAY} label={P.privacy.row} value={health.granted ? undefined : P.privacy.off} open={open === 'privacy'} onToggle={() => toggle('privacy')}>
            <Sub style={[PROSE, { marginBottom: 10 }]}>
              {health.granted && healthAt ? P.privacy.agreedOn(healthAt) : healthStatus === 'off' ? P.privacy.withdrawn : ''}
              {consentLetsSync(data) ? P.privacy.stored : P.privacy.phoneOnly}{P.privacy.neverSold}
            </Sub>
            {SHARED_PRODUCTS_ENABLED && (
              // sp-5: on after a yes at the first shared product (sp-1), off after Not now
              <>
                <List>
                  <Row title={P.privacy.shareProducts} right={<Toggle label={P.privacy.shareProducts} on={hasConsent(data, 'shared-products')} onChange={() => setShareProducts(!hasConsent(data, 'shared-products'))} />} />
                </List>
                <Foot style={{ marginBottom: 16 }}>{P.privacy.shareFoot}</Foot>
              </>
            )}
            <List style={{ marginBottom: 8 }}>
              {LEGAL_DOCS.map((id) => <Row key={id} title={LEGAL_LABEL[id]} onPress={() => openLegal(id)} />)}
            </List>
            {health.granted
              ? <Btn kind="gray" title={P.privacy.withdraw} onPress={withdrawHealth} />
              : <Btn kind="gray" title={P.privacy.turnOn} onPress={agree} />}
            <Btn kind="danger" title={P.privacy.del} style={{ marginTop: 6 }} onPress={openDeleteAccount} />
          </Disclosure>
        </List>

        <Btn kind="signout" title={P.signOut} onPress={() => setSignOutOpen(true)} />
        <Foot style={{ textAlign: 'center', paddingTop: 12 }}>{P.wellness}</Foot>
      </ScrollView>

      {reviewDayOpen && <ReviewDaySheet onClose={() => setReviewDayOpen(false)} />}
      {handsOpen && <HandsSheet onClose={() => setHandsOpen(false)} />}
      {signOutOpen && <SignOutSheet onClose={() => setSignOutOpen(false)} />}
      {feedbackOpen && <FeedbackSheet onClose={() => setFeedbackOpen(false)} />}
      {healthOpen && <HealthDataSheet onClose={() => setHealthOpen(false)} onAgree={() => { setHealthOpen(false); agree() }}
        onAnswers={() => { setHealthOpen(false); setView('answers') }} onRedo={() => { setHealthOpen(false); openRedo(true) }}
        onSupport={() => setSupportOpen('profile')} />}
      {supportOpen && <SupportSheet context={supportOpen} onClose={() => setSupportOpen(false)} />}
      {pendingBackup && <ImportSheet backup={pendingBackup} onClose={() => setPendingBackup(null)} onImport={() => { importBackup(pendingBackup); setPendingBackup(null) }} />}
    </View>
  )
}
