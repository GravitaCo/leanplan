import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useStore } from '@/store/store'
import type { AccuracyMode, ActivityLevel, DietPattern, HandPortion, Sex } from '@/core/types'
import { DIETS } from '@/core/domain/diet'
import { ACTIVITY } from '@/core/data/constants'
import { fmt, fmtDate, todayStr } from '@/core/domain/date'
import { HELD_AT_MAINTENANCE_NOTE, PROTEIN_EVERYDAY_NOTE, suggestedTargets } from '@/core/domain/nutrition'
import { profileRouting } from '@/core/domain/onboarding'
import { foodView } from '@/core/domain/foodMode'
import { useConsent } from '@/store/hooks'
import { ACCURACY, HANDS, accuracyOf, handGrams } from '@/core/domain/estimate'
import { latestWeight, rangeWidth } from '@/core/domain/insights'
import { pushSupported } from '@/data/push'
import { exportBackup, readBackup } from '@/data/backup'
import { backupSummary, unsyncedCount, type PersistedState } from '@/data/persistence'
import { Disclosure, PageHeader, Seg, SettingRow, Sheet, Toggle } from '@/ui/primitives'
import { Icon, Chevron } from '@/ui/icons'
import { FeedbackSheet } from './profile/FeedbackSheet'
import { LegalLink } from './legal/LegalDoc'
import { LEGAL_LABEL } from '@/copy/legal'
import { RegrantHealthSheet } from './legal/PrivacySheets'
import { ACCOUNT_ROW, BACKUP, PRIVACY_ROW, SIGN_OUT } from '@/copy/account'
import { AiSheet, DeleteAccountView, HEALTH_STATUS_LABEL, HealthDataSheet, useHealthStatus } from './profile/AccountData'
import { LazyHealthAnswersScreen } from './profile/lazyHealthAnswers'
import { ReviewDaySheet, dayName } from './review/WeeklyReview'
import { profileKcal, suggestionWeight, weightPatch } from './profile/profileTargets'
import { GOALS, GOAL_TARGET_LABEL, directionLabel } from './profile/profileModel'
import { PROFILE as P } from '@/copy/profile'
import { consentLetsSync, hasConsent, hasExistingData, latestConsent } from '@/data/consent'
import { MIN_AGE, type LegalDocId } from '@/core/legal'
import { SUPP_NAMES_ENABLED, WELLBEING_ENABLED } from '@/data/wellbeingFlag'
import { SHARED_PRODUCTS_ENABLED } from '@/data/sharedProducts'
import { PillarsSettings } from './profile/PillarsSettings'
import { BackoffNotices, MindReminderRows, SuppNamesFoot, SuppNamesRow, YourTimes } from './profile/NotificationsSettings'

type Section = 'profile' | 'metrics' | 'targets' | 'supplements' | 'diet' | 'accuracy' | 'display' | 'account' | 'backup' | 'about' | 'privacy'

/** No AI feature is live (label reading is off): the AI consent row stays hidden until one is. */
const AI_FEATURES_LIVE = false

export function ProfileScreen() {
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
  const setNotifications = useStore((s) => s.setNotifications)
  const setReviewPush = useStore((s) => s.setReviewPush)
  const [reviewDayOpen, setReviewDayOpen] = useState(false)
  const importBackup = useStore((s) => s.importBackup)
  const showToast = useStore((s) => s.showToast)

  const pr = data.profile
  const weight = latestWeight(data, todayStr())
  // a card elsewhere can ask for a section to be open on arrival (e.g. after an activity update)
  const profileOpen = useStore((s) => s.profileOpen)
  const clearProfileOpen = useStore((s) => s.clearProfileOpen)
  // 'health' opens the health data sheet; 'delete-confirm' (back from a Google re-sign-in) the
  // delete confirm step; anything else is a section to open
  const arrival = profileOpen
  const [open, setOpen] = useState<Section | null>(() => (arrival && arrival !== 'health' && arrival !== 'delete-confirm' && arrival !== 'health-answers' ? arrival as Section : null))
  const [view, setView] = useState<'main' | 'delete' | 'answers'>(() => (arrival === 'delete-confirm' ? 'delete' : arrival === 'health-answers' ? 'answers' : 'main'))
  const [confirmOpen, setConfirmOpen] = useState(arrival === 'delete-confirm')
  // the health data sheet, opened at its start or straight at the withdraw step (Privacy's button)
  const [healthOpen, setHealthOpen] = useState<false | 'main' | 'withdraw'>(arrival === 'health' ? 'main' : false)
  const [aiOpen, setAiOpen] = useState(false)
  const healthStatus = useHealthStatus()
  useEffect(() => {
    if (!profileOpen) return
    clearProfileOpen()
    if (profileOpen === 'health-answers') { setView('answers'); return }
    if (profileOpen === 'health' || profileOpen === 'delete-confirm') return
    // Wind down's "Set a wind-down time" (B12): Notifications, where the times are, brought into view
    if (profileOpen === 'notifications') { requestAnimationFrame(() => document.getElementById('nf-h')?.scrollIntoView({ block: 'start' })); return }
    // bring the suggested targets into view: accepting them is the next step (plan P1.5)
    requestAnimationFrame(() => document.getElementById('sug-targets')?.scrollIntoView({ block: 'center' }))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const [handsOpen, setHandsOpen] = useState(false)
  const [pendingBackup, setPendingBackup] = useState<PersistedState | null>(null)
  const [signOutOpen, setSignOutOpen] = useState(false)
  const openRedo = useStore((s) => s.openRedo)
  const [feedbackOpen, setFeedbackOpen] = useState(false)
  // giving health consent from Profile: the explicit statement and unticked box (legal/PrivacySheets)
  const [regrantOpen, setRegrantOpen] = useState(false)
  // agreeing to health data from Profile: someone who never agreed on the full screen (a "Not now",
  // or not asked yet) gets its three boxes, so the record covers the terms and age too; after a
  // withdrawal, the one-box sheet
  const agree = () => {
    if ((data.consents?.records || []).some((r) => r.type === 'health' && r.granted)) setRegrantOpen(true)
    else useStore.getState().setConsentOpen(true)
  }
  const health = useConsent('health')
  const healthRec = latestConsent(data, 'health')
  const healthAt = healthRec?.granted ? new Date(healthRec.at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : null
  const toggle = (s: Section) => setOpen((o) => (o === s ? null : s))
  // B1.16's "Gentle display": Profile › Display opened and brought into view (one tap)
  const openDisplay = () => {
    setOpen('display')
    requestAnimationFrame(() => {
      const row = [...document.querySelectorAll<HTMLElement>('button.li[aria-expanded]')].find((b) => b.querySelector('.t')?.textContent === 'Display')
      row?.scrollIntoView({ block: 'center' })
      row?.focus({ preventScroll: true })
    })
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
  const fileRef = useRef<HTMLInputElement>(null)

  const healthConsent = useConsent('health').granted
  const sugProfile = { ...pr, age: parseInt(metrics.age) || null, height: parseInt(metrics.height) || null }
  const weightBack = foodView(pr).weightBack
  const sugWeight = suggestionWeight(metrics.weight, weight, weightBack)
  // the same safety routing as the onboarding summary, so the two never disagree
  const sug = suggestedTargets(sugProfile, sugWeight, profileRouting(sugProfile, sugWeight, healthConsent))
  const notifReady = pushSupported()
  const notifStatus = !notifReady ? P.notify.unsupported
    : Notification.permission === 'denied' ? P.notify.blocked
    : pr.notificationsEnabled ? P.notify.on : P.notify.off
  const initials = (pr.name || '').trim().split(/\s+/).filter(Boolean).map((w) => w[0]).slice(0, 2).join('').toUpperCase()

  const field = (label: string, input: ReactNode) => <div className="field"><label>{label}</label>{input}</div>

  // the everyday range (workout days can add to it; Summary and Food show the day's own). Sometimes:
  // Food's maintenance range, nothing to edit; Yes (and pregnant Sometimes): no kcal at all
  const pk = profileKcal(data, todayStr())
  const kcalText = pk.kind === 'none' ? '' : `${fmt(pk.lo)}–${fmt(pk.hi)} kcal`
  const goalLabel = GOALS.find((g) => g.value === pr.goal)?.label
  const trainDays = Object.values(data.schedule).filter((x) => x && x !== 'Rest').length
  const dietLabel = pr.diet && pr.diet !== 'none' ? DIETS.find(([d]) => d === pr.diet)?.[1] : P.diet.none
  const FOODF = 'var(--food-fill)', MINDF = 'var(--mind-fill)', MOVEF = 'var(--move-fill)', GRAY = 'var(--fill2)'

  // ob7-1: back goes to the Health data sheet it came from
  if (view === 'answers') return <LazyHealthAnswersScreen onBack={() => { setView('main'); setHealthOpen('main') }} />
  if (view === 'delete') return <DeleteAccountView onBack={() => { setView('main'); setConfirmOpen(false) }} confirmOpen={confirmOpen} setConfirmOpen={setConfirmOpen} />

  return (
    <div className="screen">
      <PageHeader title={P.title} profile={false} />

      {/* identity: tap to edit your name and email */}
      <div className="list idcard">
        <button className="li" onClick={() => toggle('profile')} aria-expanded={open === 'profile'}>
          <span className={WELLBEING_ENABLED ? 'avatar lg soft' : 'avatar lg'}>{initials || <Icon name="person" size={28} />}</span>
          <div className="m">
            <div className="idn">{pr.name || P.id.addName}</div>
            {(goalLabel || kcalText) && <div className="s num">{[goalLabel, kcalText && kcalText + P.id.perDay].filter(Boolean).join(' · ')}</div>}
            <div className="s">{syncPaused ? P.id.notSyncing : email}</div>
          </div>
          <Chevron rotate={open === 'profile' ? 90 : 0} />
        </button>
        {open === 'profile' && <div className="acc-bd">
          {field(P.id.displayName, <input value={name} onChange={(e) => setName(e.target.value)} placeholder={P.id.namePh} autoComplete="name" />)}
          {authed && field(P.id.email, <input type="email" value={emailField} onChange={(e) => setEmailField(e.target.value.trim())} autoComplete="email" />)}
          <button className="btn" onClick={async () => {
            saveProfileMetrics({ name })
            if (authed && emailField && emailField !== email) {
              const err = await updateEmail(emailField)
              showToast(err ? P.id.emailError(err) : P.id.checkEmail)
            }
          }}>{P.id.save}</button>
        </div>}
      </div>

      <div className="lbl">{P.groups.goal}</div>
      <div className="list icons">
        <Disclosure icon="scale" color={FOODF} soft label={P.body.row} value={[weight && weightBack ? `${weight} kg` : '', goalLabel].filter(Boolean).join(' · ') || undefined}
          open={open === 'metrics'} onToggle={() => toggle('metrics')}>
          <div className="grid2">
            {field(P.body.sex, <select value={metrics.sex} onChange={(e) => setMetrics({ ...metrics, sex: e.target.value as Sex })}>
              <option value="M">{P.body.male}</option><option value="F">{P.body.female}</option></select>)}
            {field(P.body.age, <input type="number" inputMode="numeric" min={MIN_AGE} max={120} value={metrics.age} placeholder={P.body.agePh} onChange={(e) => setMetrics({ ...metrics, age: e.target.value })} />)}
            {field(P.body.height, <input type="number" value={metrics.height} placeholder={P.body.heightPh} onChange={(e) => setMetrics({ ...metrics, height: e.target.value })} />)}
            {field(P.body.weight, <input type="number" step="0.1" value={metrics.weight} placeholder={P.body.weightPh} onChange={(e) => setMetrics({ ...metrics, weight: e.target.value })} />)}
          </div>
          {field(P.body.activity, <select value={metrics.activityLevel} onChange={(e) => setMetrics({ ...metrics, activityLevel: e.target.value as ActivityLevel })}>
            {Object.entries(ACTIVITY).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select>)}
          {/* 18+: checked on Save, never while typing; an under-18 age saves nothing and the app's stop shows (store) */}
          <button className="btn gray" onClick={() => saveProfileMetrics({
            sex: metrics.sex, age: parseInt(metrics.age) || null, height: parseInt(metrics.height) || null,
            ...weightPatch(metrics.weight), activityLevel: metrics.activityLevel,
            // choosing a level yourself starts the suggestion's cool-down, so the app never
            // offers a different level based on logs from before the decision; it also replaces
            // the onboarding multiplier, which would otherwise keep overriding it
            ...(metrics.activityLevel !== pr.activityLevel ? { activityAsked: todayStr(), activityMult: undefined } : {}),
            // picking Male or Female here is a real answer; leaving it keeps the onboarding one
            ...(metrics.sex !== pr.sex ? { sexAnswer: metrics.sex === 'M' ? 'male' as const : 'female' as const } : {}),
          })}>{P.body.save}</button>

          <div className="lbl" style={{ paddingLeft: 0 }}>{P.body.mainGoal}</div>
          <div className="chips">
            {GOALS.map((g) => (
              <button key={g.value} className={'chip' + (pr.goal === g.value ? ' on' : '')} onClick={() => saveProfileMetrics({ goal: g.value })}>{g.label}</button>
            ))}
          </div>
          {sug || pk.kind === 'none' ? (
            <div className="card" id="sug-targets" style={{ marginTop: 12, background: 'var(--fill)', fontSize: 15, lineHeight: 1.45 }}>
              {!sug || 'hidden' in sug || pk.kind === 'none' ? (
                <span className="muted">{P.sug.off}</span>
              ) : pk.kind === 'range' ? (
                // Sometimes: Food's range, never a single number or a target to use
                <>{P.sug.range[0]}<b className="num">{kcalText}</b>{P.sug.range[1]}</>
              ) : 'goalNeeded' in sug ? (
                <>{P.sug.maintAbout[0]}<b className="num">{fmt(sug.maint)} kcal</b>{P.sug.maintAbout[1]}<br /><span className="muted">{P.sug.chooseGoal}</span></>
              ) : (
                <>
                  {P.sug.maint}<b className="num">{fmt(sug.maint)} kcal</b> · {GOAL_TARGET_LABEL[sug.goal]} <b className="num">{fmt(sug.kcal)} kcal</b>{' '}
                  <span className="muted">({directionLabel(sug.adjustPct)})</span><br />
                  {P.sug.protein}<b className="num">{sug.proteinEveryday ? P.sug.about : ''}{sug.p} g</b> · {P.sug.carbs}<b className="num">{sug.c} g</b> · {P.sug.fat}<b className="num">{sug.f} g</b>
                  {sug.proteinEveryday && <div className="sub" style={{ fontSize: 13, marginTop: 6 }}>{PROTEIN_EVERYDAY_NOTE}</div>}
                  {sug.floored && <div className="sub" style={{ fontSize: 13, marginTop: 6 }}>{P.sug.floored}</div>}
                  {sug.heldAtMaintenance && <div className="sub" style={{ fontSize: 13, marginTop: 6 }}>{HELD_AT_MAINTENANCE_NOTE}</div>}
                  <button className="btn" style={{ marginTop: 10 }} onClick={() => {
                    saveTargets({ kcal: sug.kcal, p: sug.p, c: sug.c, f: sug.f })
                    setTargets({ ...targets, kcal: sug.kcal.toString(), p: sug.p.toString(), c: sug.c.toString(), f: sug.f.toString() })
                  }}>{P.sug.use}</button>
                </>
              )}
            </div>
          ) : <div className="foot" style={{ padding: '10px 0 0' }}>{sugWeight && !weightBack ? P.sug.needAgeHeight : P.sug.needAll}</div>}
        </Disclosure>
        {pk.kind === 'range' && (
          <Disclosure icon="target" color={FOODF} soft label={P.targets.row} value={kcalText}
            open={open === 'targets'} onToggle={() => toggle('targets')}>
            <div className="foot" style={{ padding: 0 }}>{P.targets.rangeOnly}</div>
          </Disclosure>
        )}
        {pk.kind === 'target' && <Disclosure icon="target" color={FOODF} soft label={P.targets.row} value={kcalText}
          open={open === 'targets'} onToggle={() => toggle('targets')}>
          <div className="grid2">
            {field(P.targets.kcal, <input type="number" value={targets.kcal} onChange={(e) => setTargets({ ...targets, kcal: e.target.value })} />)}
            {field(P.targets.range, <input type="number" value={targets.range} onChange={(e) => setTargets({ ...targets, range: e.target.value })} />)}
            {field(P.targets.p, <input type="number" value={targets.p} onChange={(e) => setTargets({ ...targets, p: e.target.value })} />)}
            {field(P.targets.c, <input type="number" value={targets.c} onChange={(e) => setTargets({ ...targets, c: e.target.value })} />)}
            {field(P.targets.f, <input type="number" value={targets.f} onChange={(e) => setTargets({ ...targets, f: e.target.value })} />)}
          </div>
          <button className="btn" onClick={() => {
            saveTargets({
              kcal: parseInt(targets.kcal) || data.target.kcal, p: parseInt(targets.p) || data.target.p,
              c: parseInt(targets.c) || data.target.c, f: parseInt(targets.f) || data.target.f,
            }, parseInt(targets.range))
            // show what was actually stored (the calorie floor and range cap may have applied)
            const st = useStore.getState().data
            setTargets({ kcal: String(st.target.kcal), p: String(st.target.p), c: String(st.target.c), f: String(st.target.f), range: String(rangeWidth(st.profile)) })
          }}>{P.targets.save}</button>
          <div className="foot" style={{ padding: '10px 0 0' }}>
            {P.targets.foot}
          </div>
        </Disclosure>}
        <SettingRow icon="dumbbell" color={MOVEF} soft label={P.training.row} value={P.training.days(trainDays)} onPress={() => setTab('plan')} />
      </div>
      <div className="foot">{P.training.foot}</div>

      {/* WP9, board B1: pillars and how often Tilo asks (flag on only) */}
      {WELLBEING_ENABLED && <PillarsSettings onDisplay={openDisplay} />}

      <div className="lbl">{P.groups.tracking}</div>
      <div className="list icons">
        <Disclosure icon="pill" color={MINDF} soft label={P.supps.row} value={(pr.supplements || []).length || undefined} open={open === 'supplements'} onToggle={() => toggle('supplements')}>
          {(pr.supplements || []).map((s) => (
            <div className="li" key={s.id} style={{ padding: '8px 0' }}>
              <div className="m"><div className="t">{s.name}</div><div className="s num">{s.time}</div></div>
              <button className="navbtn" onClick={() => setSuppForm({ id: s.id, name: s.name, time: s.time })}>{P.supps.edit}</button>
              <button className="navbtn" style={{ color: 'var(--red)', marginLeft: 12 }} onClick={() => removeSupplement(s.id)}>{P.supps.del}</button>
            </div>
          ))}
          {suppForm ? (
            <div style={{ paddingTop: 10 }}>
              {field(P.supps.name, <input value={suppForm.name} placeholder={P.supps.namePh} onChange={(e) => setSuppForm({ ...suppForm, name: e.target.value })} />)}
              {field(P.supps.time, <input type="time" value={suppForm.time} onChange={(e) => setSuppForm({ ...suppForm, time: e.target.value })} />)}
              <div className="grid2">
                <button className="btn" onClick={() => {
                  if (!suppForm.name || !suppForm.time) return
                  if (suppForm.id) updateSupplement(suppForm.id, suppForm.name, suppForm.time)
                  else addSupplement(suppForm.name, suppForm.time)
                  setSuppForm(null)
                }}>{suppForm.id ? P.supps.update : P.supps.add}</button>
                <button className="btn gray" onClick={() => setSuppForm(null)}>{P.supps.cancel}</button>
              </div>
            </div>
          ) : <button className="btn tinted" style={{ marginTop: 8 }} onClick={() => setSuppForm({ id: null, name: '', time: '08:00' })}>{P.supps.addRow}</button>}
        </Disclosure>
        <Disclosure icon="leaf" color={FOODF} soft label={P.diet.row} value={dietLabel} open={open === 'diet'} onToggle={() => toggle('diet')}>
          <Seg<DietPattern> options={DIETS.map(([d, l]) => [d, d === 'none' ? P.diet.none : l])} value={pr.diet ?? 'none'} onChange={(v) => setPrefs({ diet: v })} />
          <div className="sub" style={{ fontSize: 13, marginTop: 8 }}>{P.diet.note}</div>
        </Disclosure>
        <SettingRow icon="hand" color={FOODF} soft label={P.hands.row} value={P.hands.value(handGrams(pr, 'palm'))} onPress={() => setHandsOpen(true)} />
        <Disclosure icon="target" color={FOODF} soft label={P.accuracy.row} value={accuracyOf(pr).label} open={open === 'accuracy'} onToggle={() => toggle('accuracy')}>
          <Seg<AccuracyMode> options={(Object.keys(ACCURACY) as AccuracyMode[]).map((k) => [k, ACCURACY[k].label])}
            value={pr.accuracy ?? 'balanced'} onChange={(v) => setPrefs({ accuracy: v })} />
          <div className="sub" style={{ fontSize: 13, marginTop: 8 }}>{accuracyOf(pr).desc}</div>
        </Disclosure>
        <Disclosure icon="smile" color={MINDF} soft label={P.display.row} value={pr.gentle ? P.display.gentle : P.display.standard} open={open === 'display'} onToggle={() => toggle('display')}>
          <Seg<'std' | 'gentle'> options={[['std', P.display.standard], ['gentle', P.display.gentle]]} value={pr.gentle ? 'gentle' : 'std'}
            onChange={(v) => setPrefs({ gentle: v === 'gentle' })} />
          <div className="sub" style={{ fontSize: 13, marginTop: 8 }}>
            {pr.gentle ? P.display.gentleNote : P.display.standardNote}
          </div>
        </Disclosure>
      </div>

      {/* ml-e4: the weekly review (boards ml-c4, ml-d1) */}
      <div className="lbl">{P.groups.review}</div>
      <div className="list icons">
        <SettingRow icon="review" color={MINDF} soft label={P.review.day} value={dayName(pr.reviewDay ?? 0)} onPress={() => setReviewDayOpen(true)} />
        <SettingRow icon="weight" color={FOODF} soft label={P.review.weight}
          right={<Toggle label={P.review.weight} on={pr.reviewWeight === true} disabled={!!pr.gentle} onChange={() => setPrefs({ reviewWeight: pr.reviewWeight !== true })} />} />
      </div>
      <div className="foot">{P.review.foot}</div>
      {reviewDayOpen && <ReviewDaySheet onClose={() => setReviewDayOpen(false)} />}

      <div className="lbl" id="nf-h">{P.groups.notifications}</div>
      {/* wellbeing (B11): the back-off notice, then the Mind reminder types above supplements */}
      {WELLBEING_ENABLED && <BackoffNotices />}
      <div className={'list icons' + (WELLBEING_ENABLED ? ' nf-rows' : '')}>
        {WELLBEING_ENABLED && <MindReminderRows />}
        <SettingRow icon="bell" color={MINDF} soft label={P.notify.supps} sub={notifStatus}
          right={<Toggle label={P.notify.supps} on={pr.notificationsEnabled} disabled={!notifReady} onChange={async () => {
              const ok = await setNotifications(!pr.notificationsEnabled)
              const done = pr.notificationsEnabled ? P.notify.remindersOff : P.notify.remindersOn
              showToast(ok === 'unsaved' ? done + P.notify.unsaved
                : ok ? done : Notification.permission === 'denied' ? P.notify.denied : !authed ? P.notify.signIn : P.notify.failed)
            }} />} />
        {/* wellbeing (B11b): whether supplement reminders name the supplement, off by default */}
        {SUPP_NAMES_ENABLED && pr.notificationsEnabled && <SuppNamesRow />}
        {/* ml-e4: the weekly review reminder, switched on separately (off unless someone turns it on) */}
        <SettingRow icon="bell" color={MINDF} soft label={P.notify.weekly} sub={P.notify.weeklySub(dayName(pr.reviewDay ?? 0))}
          right={<Toggle label={P.notify.weekly} on={!!pr.reviewPush} disabled={!notifReady} onChange={async () => {
              const on = !pr.reviewPush
              const ok = await setReviewPush(on)
              showToast(ok ? (on ? P.notify.weeklyOn : P.notify.weeklyOff) : Notification.permission === 'denied' ? P.notify.denied : !authed ? P.notify.signIn : P.notify.weeklyFailed)
            }} />} />
      </div>
      {SUPP_NAMES_ENABLED && pr.notificationsEnabled && <SuppNamesFoot />}
      {WELLBEING_ENABLED && <YourTimes />}
      <div className="foot">{P.notify.iphone}</div>

      <div className="lbl">{ACCOUNT_ROW.heading}</div>
      <div className="list icons">
        <Disclosure icon="person" color={GRAY} soft label={ACCOUNT_ROW.account} open={open === 'account'} onToggle={() => toggle('account')}>
          <div className="sub" style={{ fontSize: 13 }}>{ACCOUNT_ROW.signedInAs}</div>
          <div style={{ overflowWrap: 'anywhere' }}>{syncPaused ? ACCOUNT_ROW.notSyncing : email}</div>
          {authed && <div className="foot" style={{ padding: '8px 0 0' }}>{ACCOUNT_ROW.changeFoot}</div>}
        </Disclosure>
        <SettingRow icon="heart" color={MINDF} soft label={P.healthRow} value={HEALTH_STATUS_LABEL[healthStatus]} onPress={() => setHealthOpen('main')} />
        {/* AI features: hidden until one ships (the privacy policy doesn't describe AI processing yet,
            so a consent given here wouldn't be informed) */}
        {AI_FEATURES_LIVE && <SettingRow icon="bulb" color={GRAY} soft label={P.aiRow} value={hasConsent(data, 'ai') ? P.notify.on : P.notify.off} onPress={() => setAiOpen(true)} />}
        <Disclosure icon="cloud" color={GRAY} soft label={BACKUP.row} value={BACKUP.value} open={open === 'backup'} onToggle={() => toggle('backup')}>
          <div className="sub" style={{ marginBottom: 10 }}>{!consentLetsSync(data)
            ? BACKUP.phoneOnly
            : BACKUP.stored(authed ? BACKUP.storedSyncing : syncPaused ? BACKUP.storedPaused : '')}</div>
          <div className="grid2">
            <button className="btn gray" onClick={() => exportBackup(data)}>{BACKUP.exportBtn}</button>
            <button className="btn gray" onClick={() => fileRef.current?.click()}>{BACKUP.importBtn}</button>
          </div>
          {resumeCopy && (
            <div style={{ marginTop: 12 }}>
              <div className="sub" style={{ marginBottom: 8 }}>
                {P.backup.resume(resumeList)}
              </div>
              <button className="btn gray" onClick={() => exportBackup(withResumeCopy(resumeCopy))}>{P.backup.resumeBtn}</button>
            </div>
          )}
          <input ref={fileRef} type="file" accept="application/json,.json" style={{ display: 'none' }} onChange={async (e) => {
            const input = e.target
            const file = input.files?.[0]
            input.value = '' // so picking the same file again still fires onChange
            if (!file) return
            try { setPendingBackup(await readBackup(file)) } catch { showToast(BACKUP.invalid) }
          }} />
        </Disclosure>
        <SettingRow icon="x" color={GRAY} soft label={ACCOUNT_ROW.deleteRow} onPress={() => setView('delete')} />
      </div>

      <div className="lbl">{P.groups.testing}</div>
      <div className="list icons">
        <SettingRow icon="mail" color={MINDF} soft label={P.feedbackRow.label} sub={P.feedbackRow.sub} onPress={() => setFeedbackOpen(true)} />
      </div>

      <div className="list icons" style={{ marginTop: 24 }}>
        <Disclosure icon="info" color={GRAY} soft label={P.about.row} open={open === 'about'} onToggle={() => toggle('about')}>
          <div className="prose sub">
            <p><b>{P.about.name}</b>{P.about.lead}</p>
            <p style={{ margin: 0 }}>{P.about.body}</p>
          </div>
        </Disclosure>
        <Disclosure icon="key" color={GRAY} soft label={PRIVACY_ROW.label} value={health.granted ? undefined : PRIVACY_ROW.off} open={open === 'privacy'} onToggle={() => toggle('privacy')}>
          <div className="prose sub" style={{ marginBottom: 10 }}>
            <p style={{ margin: 0 }}>
              {health.granted && healthAt ? PRIVACY_ROW.agreedOn(healthAt) : healthStatus === 'off' ? PRIVACY_ROW.withdrawn : null}
              {consentLetsSync(data) ? PRIVACY_ROW.stored : PRIVACY_ROW.phoneOnly}{PRIVACY_ROW.neverSold}
            </p>
          </div>
          {SHARED_PRODUCTS_ENABLED && (
            // sp-5: on after a yes at the first shared product (sp-1), off after Not now
            <>
              <div className="list" style={{ margin: 0 }}>
                <div className="li">
                  <div className="m"><div className="t">{P.privacy.shareProducts}</div></div>
                  <Toggle label={P.privacy.shareProducts} on={hasConsent(data, 'shared-products')} onChange={() => setShareProducts(!hasConsent(data, 'shared-products'))} />
                </div>
              </div>
              <div className="foot" style={{ marginBottom: 16 }}>{P.privacy.shareFoot}</div>
            </>
          )}
          <div className="list legal-rows" style={{ margin: '0 0 8px' }}>
            {(['privacy', 'terms', 'cookies'] as LegalDocId[]).map((id) => (
              <LegalLink key={id} id={id} className="li act"><div className="m"><div className="t">{LEGAL_LABEL[id]}</div></div><Chevron /></LegalLink>
            ))}
          </div>
          {/* the same flows as the Health data and Delete account rows above (one of each; the
              legal texts point here, at Profile, then Privacy) */}
          {health.granted
            ? <button className="btn gray" onClick={() => setHealthOpen('withdraw')}>{PRIVACY_ROW.withdraw}</button>
            : <button className="btn gray" onClick={agree}>{PRIVACY_ROW.turnBackOn}</button>}
          <button className="btn danger" style={{ marginTop: 6 }} onClick={() => setView('delete')}>{ACCOUNT_ROW.deleteRow}</button>
        </Disclosure>
      </div>

      <button className="btn signout" onClick={() => setSignOutOpen(true)}>{SIGN_OUT.title}</button>
      <div className="foot" style={{ textAlign: 'center', padding: '12px 16px 0' }}>{PRIVACY_ROW.wellness}</div>

      {handsOpen && <HandsSheet onClose={() => setHandsOpen(false)} />}
      {signOutOpen && <SignOutSheet onClose={() => setSignOutOpen(false)} />}
      {feedbackOpen && <FeedbackSheet onClose={() => setFeedbackOpen(false)} />}
      {healthOpen && <HealthDataSheet start={healthOpen} onClose={() => setHealthOpen(false)} onAgree={() => { setHealthOpen(false); agree() }} onAnswers={() => { setHealthOpen(false); setView('answers') }} onRedo={() => { setHealthOpen(false); openRedo(true) }} />}
      {regrantOpen && <RegrantHealthSheet onClose={() => setRegrantOpen(false)} />}
      {aiOpen && <AiSheet onClose={() => setAiOpen(false)} />}
      {pendingBackup && <ImportSheet backup={pendingBackup} onClose={() => setPendingBackup(null)} onImport={() => { importBackup(pendingBackup); setPendingBackup(null) }} />}
    </div>
  )
}

/** Confirm step before a backup replaces data: it overwrites those days (and, signed in, the
 *  cloud copy every device pulls), so say what's in it and what changes. */
function ImportSheet({ backup, onClose, onImport }: { backup: PersistedState; onClose: () => void; onImport: () => void }) {
  const b = backupSummary(backup)
  const span = b.first && b.last ? (b.first === b.last ? ' (' + fmtDate(b.first).full + ')' : ' (' + fmtDate(b.first).full + ' to ' + fmtDate(b.last).full + ')') : ''
  return (
    <Sheet title={BACKUP.importTitle} onClose={onClose}>
      <div className="prose sub" style={{ padding: '0 4px 12px' }}>
        <p>{BACKUP.has(b, span)}</p>
        <p>{BACKUP.replaces(b)}</p>
      </div>
      <div className="stack"><button className="btn tinted" onClick={onImport}>{BACKUP.importBtn}</button></div>
    </Sheet>
  )
}

/** Sign out, optionally removing this device's log (shared phones). It stays in the account. */
function SignOutSheet({ onClose }: { onClose: () => void }) {
  const signOut = useStore((s) => s.signOut)
  const data = useStore((s) => s.data)
  const [busy, setBusy] = useState<'keep' | 'remove' | null>(null)
  const [sure, setSure] = useState(false)
  const unsynced = unsyncedCount(data)
  // no yes to health data: the log isn't in the account at all, so removing it deletes the only copy
  const phoneOnly = !consentLetsSync(data) && hasExistingData(data)
  const go = async (remove: boolean) => {
    if (busy) return
    if (remove && (unsynced > 0 || phoneOnly) && !sure) { setSure(true); return } // losing data takes a second tap
    setBusy(remove ? 'remove' : 'keep')
    try { await signOut({ remove }) } finally { setBusy(null) }
  }
  return (
    <Sheet title={SIGN_OUT.title} onClose={onClose}>
      <div className="prose sub" style={{ padding: '0 4px 12px' }}>
        {phoneOnly ? (
          <p>{SIGN_OUT.phoneOnly}</p>
        ) : <p>{SIGN_OUT.stays}</p>}
        {!phoneOnly && unsynced > 0 && <p>{SIGN_OUT.unsynced(unsynced)}</p>}
      </div>
      <div className="stack">
        <button className="btn tinted" disabled={!!busy} onClick={() => go(false)}>{busy === 'keep' ? SIGN_OUT.signingOut : SIGN_OUT.title}</button>
        {phoneOnly && <button className="btn gray" disabled={!!busy} onClick={() => exportBackup(data)}>{SIGN_OUT.exportCopy}</button>}
        <button className="btn danger" disabled={!!busy} onClick={() => go(true)}>{busy === 'remove' ? SIGN_OUT.signingOut : sure && phoneOnly ? SIGN_OUT.removeSure : sure && unsynced > 0 ? SIGN_OUT.removeLose(unsynced) : SIGN_OUT.remove}</button>
      </div>
    </Sheet>
  )
}

/** Weigh one of each once; after that "a palm" is a measurement, not a guess. */
function HandsSheet({ onClose }: { onClose: () => void }) {
  const profile = useStore((s) => s.data.profile)
  const setPrefs = useStore((s) => s.setPrefs)
  const showToast = useStore((s) => s.showToast)
  const types = Object.keys(HANDS) as HandPortion[]
  const [vals, setVals] = useState<Record<HandPortion, string>>(
    Object.fromEntries(types.map((k) => [k, String(handGrams(profile, k))])) as Record<HandPortion, string>,
  )
  const save = () => {
    const hands: Partial<Record<HandPortion, number>> = { ...profile.hands }
    for (const k of types) { const v = parseFloat(vals[k]); if (v > 0) hands[k] = Math.round(v) }
    setPrefs({ hands }); showToast(P.hands.saved); onClose()
  }
  return (
    <Sheet title={P.hands.title} onClose={onClose} right={<button className="navbtn b" onClick={save}>{P.hands.save}</button>}>
      <div className="sub" style={{ padding: '0 4px 12px' }}>
        {P.hands.lead}
      </div>
      <div className="list">
        {types.map((k) => (
          <div className="frow" key={k}>
            <label htmlFor={'hand_' + k}>{HANDS[k].label}<div className="sub" style={{ fontSize: 13 }}>{HANDS[k].hint}</div></label>
            <input id={'hand_' + k} type="number" inputMode="numeric" value={vals[k]} onChange={(e) => setVals({ ...vals, [k]: e.target.value })} />
            <span className="u">{P.hands.unit}</span>
          </div>
        ))}
      </div>
    </Sheet>
  )
}
