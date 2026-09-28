/**
 * Central app store (Zustand + Immer). Holds the synced domain state plus lightweight
 * UI/navigation state, and owns persistence + the debounced sync loop. Screens read
 * slices from here; the data/sync layer underneath is framework-agnostic.
 */
import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { enableMapSet } from 'immer'
import type {
  CheckIn,
  DayLog,
  Food,
  IfThenPlan,
  PlanWeek,
  LoggedFood,
  MealSlot,
  Recipe,
  RoutineEffort,
  PlanPhase,
  TrainingPlan,
  RoutineSlot,
  Workout,
  Supplement,
  MacroTarget,
  Profile,
  Session as TrainingSession,
  Effort,
  Schedule,
} from '@/core/types'
import { WORKOUTS } from '@/core/data/workouts'
import { builtinId, keptOnSave, mirrorOf, sessionsOf } from '@/core/domain/sessions'
import { activePlan, cleanPhases, keptAfterEdit, positionOn, scheduleMirror, supersededPlans, weekToKeep, weekToPutBack } from '@/core/domain/plans'
import { canBuild, deriveEffort, estMins, headlineModality, normaliseRx, slotsOf } from '@/core/domain/routines'
import { shorterPrescription } from '@/core/domain/dayOptions'
import { EXERCISE_BY_ID } from '@/core/data/exercises'
import { todayStr, shiftDay, r1 } from '@/core/domain/date'
import { recipePerServing } from '@/core/domain/nutrition'
import { CAPTURE_ERR, scaleEntry } from '@/core/domain/estimate'
import { isRemovedFood, latestWeight, relog } from '@/core/domain/insights'
import { loadState, stateFromBackup, ownerCheck, keepForAccount, freshForAccount, freshForDevice, sameAccount, saveState, ensureMeta, loadMode, saveMode, loadKitchen, saveKitchen, requestPersistentStorage, unsyncedCount, type PersistedState, type SyncMeta } from '@/data/persistence'
import { pushDirty, pullAll, accountRows, clearCloudLog, type SyncStatus } from '@/data/sync'
import { withTimeout } from '@/data/timeout'
import { supabase, setSession, uuid, nowIso, getUid, getToken, ConsentRequiredError } from '@/data/supabase'
import { isAuthRetryableFetchError, type Session } from '@supabase/supabase-js'
import { subscribePush, resubscribePush, unsubscribePush } from '@/data/push'
import { withoutHealth, canSaveHealthAnswers, healthWithdrawalBackup, HEALTH_WITHDRAW_PROMPT, type HealthDataSummary, hasConsent as consented, healthLoggingAllowed, migrateLabelConsent, removeLegacyLabelFlag, recordConsent, withdraw, applyHealthWithdrawal, consentLetsSync, pullConsents, pushConsents, consentLog, resumeAfterYes, pendingCloudClear, needsReupload, markReupload, clearHealthData, grantHealth, pauseHealthSync, settleHealthPause, type ConsentType } from '@/data/consent'
import { deleteAccount as deleteAccountData, defaultDeleteDeps, wipeDevice, reauthWithGoogle, reauthWithPassword, sessionSignedInRecently, tokenMatchesOwner, type DeleteResult, type ReauthResult } from '@/data/account'
import { exportBackup } from '@/data/backup'
import { connectionState, type ConnectionState } from '@/core/domain/connection'
import type { GeneratedPlan } from '@/core/domain/engine/generate'
import { replacementFor } from '@/core/domain/firstSession'
import { clearDraft, clearPendingDeletion, markPendingDeletion, pendingDeletion, underAgeNext, underAgeRetryDue, underAgeWipesDevice } from '@/data/onboardingDraft'
import { clearHealthAnswerIn, confirmPregnancyIn, snoozePregnancyIn, type HealthAnswerKind, type PregnancyStatus } from '@/core/domain/onboarding'

enableMapSet()

export type Tab = 'today' | 'food' | 'train' | 'plan' | 'profile'

export interface StoreState {
  data: PersistedState
  cur: string
  tab: Tab
  /** one-shot: the Profile section to open on arrival (UI only, never persisted) */
  profileOpen: string | null
  sync: SyncStatus
  email: string | null
  authReady: boolean
  signedIn: boolean
  /** true only when a real Supabase session exists (not offline-paused or while asking whose data) */
  authed: boolean
  /** signed-in account opened without a live session (offline): data saves locally, sync waits */
  syncPaused: boolean
  /** why the sign-in screen is showing, when it wasn't the user's choice */
  authNotice: string | null
  /** signed in, but this device's data may belong to another account: nothing shows or syncs
   *  until the user picks keep or start fresh (see ownerCheck) */
  ownerAsk: { uid: string; email: string | null; checking?: boolean } | null
  /** "I have…" snapshot for meal suggestions (device-only) */
  kitchen: string[]
  setKitchen: (have: string[]) => void
  toast: string | null
  /** the full consent screen opened from Profile (agreeing after a "Not now" or never asked) */
  consentOpen: boolean
  setConsentOpen: (open: boolean) => void
  /** an action on the current toast ("Undo"); cleared with the toast */
  toastAction: { label: string; run: () => void } | null
  /** one-shot hand-offs between tabs (UI only, never persisted): Plan's "Do this today" opens
   *  Train's preview for a workout; Train's "Edit in Plan" opens Plan's workout view */
  /** a workout to open: a built-in's type or the id of one of the user's own (WorkoutKey) */
  trainOpen: string | null
  planOpen: string | null
  openTrain: (w: string) => void
  openPlan: (w: string) => void
  clearOpen: () => void

  // navigation
  setTab: (t: Tab) => void
  openProfile: (section: string) => void
  clearProfileOpen: () => void
  setDate: (d: string) => void
  showToast: (msg: string, action?: { label: string; run: () => void }) => void

  // food
  /** log one or more entries on the current day (e.g. a food plus its cooking fat) */
  logEntries: (entries: LoggedFood[], toast?: string) => void
  /** correct an entry's portion by a multiplier and/or move it to another meal */
  updateEntry: (index: number, mult: number, meal: MealSlot | undefined) => void
  /** mark an estimate as confirmed so it isn't surfaced for a check again */
  confirmEntry: (index: number) => void
  removeFood: (index: number) => void
  /** copy yesterday's entries for a meal onto the current day */
  repeatYesterday: (meal: MealSlot) => void
  /** save (or update by name) a custom food definition; returns the saved food */
  saveCustomFood: (def: Omit<Food, 'id'>) => Food
  removeCustomFood: (index: number) => void
  /** give a saved food a barcode (a scan matched it by name); returns the updated food */
  linkBarcode: (id: string, barcode: string) => Food | null
  saveRecipe: (r: { id?: string; name: string; servings: number; items: Recipe['items'] }) => void
  deleteRecipe: (index: number) => void
  logRecipe: (recipe: Recipe, servings: number, meal: MealSlot) => void

  // wellbeing & plans
  setCheckin: (c: CheckIn | null) => void
  savePlan: (p: { id?: string; when: string; then: string; cope?: string }) => void
  deletePlan: (id: string) => void
  reviewPlans: (outcomes: Record<string, IfThenPlan['reviews'][number]['r']>) => void

  // supplements / weight / workout
  toggleSupp: (id: string) => void
  setWeight: (kg: number) => void
  /** save a built-in lift (again = an edit). `extra`: the guided player's per-set quiet saves and
   *  its finish sheet (effort, note, minutes); what isn't given keeps the earlier save's value */
  /** save a workout's session for the day: a built-in lift or one of the user's own (by id) */
  saveWorkout: (type: string, ex: NonNullable<Workout['ex']>, option?: Workout['option'], extra?: { quiet?: boolean; effort?: Effort | null; note?: string; mins?: number; toast?: string; open?: boolean }) => void
  saveCardio: (cardioType: string, mins: string, option?: Workout['option']) => void
  /** the user's own workouts (plan P4): create or edit (returns its id), archive, log */
  saveRoutine: (r: { id?: string; name: string; slots: RoutineSlot[]; effort?: RoutineEffort; baseId?: string }) => string | null
  archiveRoutine: (id: string) => void
  /** add a session (any modality) to the current day, alongside any others */
  addSession: (x: Omit<TrainingSession, 'id' | 'at'>) => void
  removeSession: (id: string) => void
  /** put back a session removed a moment ago (Undo), on the day it came from */
  restoreSession: (date: string, x: TrainingSession) => void

  // plan / settings
  /** replace the whole weekly schedule (swap two days, undo) */
  setSchedule: (s: Schedule, quiet?: boolean) => void
  /** weekly plans (plan P5): start one (any active one is put away), edit it, finish it */
  startPlan: (p: { name: string; phases: PlanPhase[]; source: TrainingPlan['source']; baseTemplateId?: string; clonedFromId?: string; startedAt?: string }) => string
  updatePlan: (id: string, patch: { name?: string; phases?: PlanPhase[] }) => void
  finishPlan: (id: string, reflection?: { good?: string; change?: string }, state?: 'completed' | 'archived') => void
  /** "Keep going without a plan": the last week repeats at the full version, open-ended, until another plan */
  carryOn: (id: string, reflection?: { good?: string; change?: string }) => void
  /** after a plan: maintenance, its own week (or the plan's last build week) on the shorter version, open-ended */
  startMaintenance: (id: string, week?: PlanWeek) => void
  /** keep a plan as one of the person's own, to start again later (a template) */
  savePlanCopy: (id: string, name?: string) => string | null
  /** keep a plan's look back without finishing it (its next plan starts later) */
  notePlan: (id: string, reflection: { good?: string; change?: string }) => void
  /** keep the weekly schedule in step with the active plan's current week (phases change by week) */
  syncPlanMirror: () => void
  saveTargets: (t: MacroTarget, rangeWidth?: number) => void
  saveProfileMetrics: (patch: Partial<Profile>) => void
  /** quiet profile update for preferences (accuracy, display, hands…) */
  setPrefs: (patch: Partial<Profile>) => void
  addSupplement: (name: string, time: string) => void
  updateSupplement: (id: string, name: string, time: string) => void
  removeSupplement: (id: string) => void
  updateEmail: (email: string) => Promise<string | null>
  /** true when on/off took effect; 'unsaved' when it did but this device couldn't store the setting */
  setNotifications: (enabled: boolean) => Promise<boolean | 'unsaved'>
  importBackup: (state: PersistedState) => void

  // sync / auth
  initAuth: () => Promise<void>
  runSync: () => Promise<void>
  scheduleSync: () => void
  /** `remove`: also remove this device's log (shared phones), leaving an empty state. */
  signOut: (opts?: { remove?: boolean }) => Promise<void>
  /** Call before a sign-in or sign-up attempt from the sign-in screen. */
  beginSignIn: () => void
  /** Answer ownerAsk: keep this device's data in the account, start fresh, or sign out. */
  resolveOwner: (choice: 'keep' | 'fresh' | 'cancel') => Promise<void>

  // consent (onboarding plan §8): recorded on this device first, synced when online
  /** the device says it has a connection (navigator.onLine, kept current by initAuth) */
  online: boolean
  /** record a yes for a consent type at its current version (see CONSENT_VERSIONS) */
  grantConsent: (type: ConsentType) => void
  /** record a no; for 'health' this also clears the health data (consent.ts HEALTH_FIELDS) here
   *  and, through sync, on the server */
  withdrawConsent: (type: ConsentType) => void
  hasConsent: (type: ConsentType) => boolean
  /** "Not now" on the existing-user health sheet: health data stays here, its sync pauses
   *  (a second "Not now", at the one re-ask, keeps it paused) */
  notNowHealth: () => void
  /** "Not now" on first-run consent (onboarding): recorded as a no for that type */
  declineConsent: (type: ConsentType) => void
  /** the questionnaire's guard: false until a local health consent says yes */
  canSaveHealth: () => boolean
  /** save onboarding health answers (weight, limitations …); refused (false) without health consent */
  saveHealthAnswers: (patch: Partial<Profile>) => boolean
  /** step 1 of withdrawing health consent: what will be cleared, the backup JSON taken before
   *  anything is cleared, and the prompt ("Download a copy first?") */
  prepareHealthWithdrawal: () => { summary: HealthDataSummary; backup: string; prompt: string }
  /** step 2, when the person says yes: download that copy (the usual backup file) */
  downloadBeforeWithdrawal: () => void

  // first-run onboarding (behind ONBOARDING_ENABLED)
  /** the setup card opened on its own (Build my plan on Plan, Finish your setup on Today) */
  setupOpen: boolean
  openSetup: (open: boolean) => void
  /**
   * The summary's Start: the answers into the profile (outcomes only), today's weigh-in, the
   * targets, and the generated plan into the person's plans. Refused (false) for health answers
   * without a local health consent. `plan` null keeps the current plan.
   */
  finishOnboarding: (x: { profile: Profile; plan: GeneratedPlan | null; target: MacroTarget | null; weightKg: number | null }) => boolean
  /** under 18 (§14; the wizard's age stop is 18+ for now): this device's data goes now; the account is deleted now, or on the next connection */
  deleteUnderAge: () => Promise<DeleteResult>
  /** Profile's "Health check answers" (UI not built yet): remove one stored answer, as if skipped */
  clearHealthAnswer: (kind: HealthAnswerKind) => boolean
  /** the 12-week "Does this still apply?" answer; false when a yes can't be kept (no local health yes) */
  confirmPregnancy: (status: PregnancyStatus) => boolean
  /** "Not now" on the re-ask: asked again in a week */
  snoozePregnancyReask: () => boolean
  /** a thumbs up or down on a generated workout's exercise (ob5-3); down swaps it quietly, with Undo */
  rateExercise: (routineId: string, slot: number, rating: 'up' | 'down') => void

  // account deletion (onboarding plan §8)
  /** a deletion is under way (the confirm UI shows progress and blocks a second tap) */
  deletingAccount: boolean
  /** needs a connection; wipes this device and signs out only after the server confirms */
  deleteAccount: (reason?: 'under-age') => Promise<DeleteResult>
  /** how this account signs in, for the re-confirm step ('email' = password, 'google') */
  authProvider: string | null
  /** deletion needs a sign-in from the last 5 minutes: true when this session's is older */
  deleteNeedsReauth: () => boolean
  /** re-confirm identity: the password (email accounts) or a fresh Google sign-in (leaves the page) */
  reauthForDeletion: (how: { password: string } | { google: true }) => Promise<ReauthResult>
}

function ensureDay(s: PersistedState, d: string): DayLog {
  if (!s.days[d]) s.days[d] = { foods: [], supps: {}, weight: null, workout: null }
  return s.days[d]
}

/**
 * With an active plan, the weekly schedule mirrors its current week (plan P5): older installs and
 * one-workout readers see it; nothing reads it back while the plan is active. `mark` sends the
 * settings to sync when something changed: only for a person's own edit, or on a copy freshly
 * pulled in runSync, so a stale device never uploads its old target or profile over newer ones
 * (security-data). Returns whether the schedule changed.
 */
function mirrorPlan(s: PersistedState, mark: boolean): boolean {
  const today = todayStr()
  // a plan chosen to start later has now started: the one it replaces is finished
  const done = supersededPlans(s, today)
  for (const old of done) { old.state = 'completed'; old.completedAt = nowIso(); old._dirty = true; old._u = nowIso() }
  const p = activePlan(s, today)
  const pos = p ? positionOn(p, today) : null
  if (!pos) return done.length > 0
  const next = scheduleMirror(pos.planWeek, s.routines)
  let changed = false
  for (let d = 0; d < 7; d++) if (s.schedule[d] !== next[d]) { s.schedule[d] = next[d]; changed = true }
  if (changed && mark) ensureMeta(s, false).settings = { u: nowIso(), dirty: true }
  return changed || done.length > 0
}

/** Plans all stopped: the weekly schedule from before them comes back, and is forgotten. */
function putBackWeek(s: PersistedState): void {
  const prev = weekToPutBack(s)
  if (!prev) return
  for (let d = 0; d < 7; d++) s.schedule[d] = prev[d] ?? 'Rest'
  delete s.profile.weekBeforePlan
  ensureMeta(s, false).settings = { u: nowIso(), dirty: true }
}

/** Write a day's sessions and the single-workout mirror older installs read (plan §2.5). */

function setSessions(day: DayLog, list: TrainingSession[]): void {
  day.sessions = list
  day.workout = mirrorOf(list)
}

/**
 * Save a session from a card (a built-in or one of the user's own workouts): it replaces an earlier save from
 * the same card that day, since saving again is an edit; other sessions stay.
 */
function putBuiltin(day: DayLog, date: string, x: Omit<TrainingSession, 'id' | 'at'>, keep: ('effort' | 'note' | 'mins')[] = []): void {
  const list = sessionsOf(day, date)
  const i = list.findIndex((y) => y.routineId === x.routineId)
  const prev = i >= 0 ? list[i] : null
  // fields the caller didn't set carry over from the earlier save (a later edit keeps the effort)
  const kept: Partial<TrainingSession> = {}
  for (const k of keep) if (prev?.[k] !== undefined && (x as Partial<TrainingSession>)[k] === undefined) (kept as Record<string, unknown>)[k] = prev[k]
  const next: TrainingSession = { ...kept, ...x, id: prev?.id && !prev.id.startsWith('legacy') ? prev.id : uuid(), at: prev?.at || nowIso() }
  setSessions(day, i >= 0 ? list.map((y, j) => (j === i ? next : y)) : [...list, next])
}

/**
 * A generated plan (engine output) into the person's plans, on the summary's confirm only: its
 * workouts join `routines`, the plan starts today, and whatever plan was running is finished or
 * put away, as startPlan does. The week before plans is kept for when plans stop.
 */
function acceptGenerated(s: PersistedState, gen: GeneratedPlan): void {
  const now = nowIso()
  const today = todayStr()
  if (!Array.isArray(s.routines)) s.routines = []
  if (!Array.isArray(s.trainingPlans)) s.trainingPlans = []
  const keep = weekToKeep(s)
  if (keep) s.profile.weekBeforePlan = keep
  for (const p of s.trainingPlans) {
    if (p.state !== 'active') continue
    p.state = p.startedAt && p.startedAt < today ? 'completed' : 'archived'
    if (p.state === 'completed') p.completedAt = now
    p._dirty = true; p._u = now
  }
  for (const r of gen.routines) {
    const i = s.routines.findIndex((x) => x.id === r.id)
    const row = { ...structuredClone(r), _dirty: true, _u: now }
    if (i >= 0) s.routines[i] = row; else s.routines.push(row)
  }
  const plan = structuredClone(gen.trainingPlan)
  const i = s.trainingPlans.findIndex((x) => x.id === plan.id)
  const row = { ...plan, phases: cleanPhases(plan.phases), startedAt: today, _dirty: true, _u: now }
  if (i >= 0) s.trainingPlans[i] = row; else s.trainingPlans.push(row)
  mirrorPlan(s, true)
}

/** Lowest calorie target the app will set without medical support. */
const KCAL_FLOOR = 1200

/** Consent refusals from the server in a row (sync backs off after two). */
let consentRefusals = 0

function meta(s: PersistedState): SyncMeta {
  return ensureMeta(s, false)
}

/** Remove Supabase's saved session (\`sb-<project>-auth-token\`) from this device. */
function clearSavedSession() {
  try {
    Object.keys(localStorage).filter((k) => k.startsWith('sb-') && k.endsWith('-auth-token')).forEach((k) => localStorage.removeItem(k))
  } catch { /* storage blocked */ }
}

/** Set by an explicit sign-out; cleared when the user starts signing in again. */
let signingOut = false
const GUEST_GONE_MSG = 'Tali now needs an account. When you’re online, sign in or create one: the log on this phone moves into it.'
/** Shown when a weigh-in or check-in isn't saved because health consent was withdrawn. */
const HEALTH_OFF_MSG = 'Not saved: health data is off. Turn it back on in Profile, then Privacy.'
/** Shown when a height isn't kept because health consent was withdrawn. */
export const HEIGHT_OFF_MSG = 'Height isn’t kept while health data is off. Turn it back on in Profile, then Privacy.'
const SIGNED_OUT_MSG = 'You’ve been signed out. Sign in to sync: your log is still on this phone.'
/** An under-age deletion that stopped trying by itself (register item 37): a fresh sign-in finishes it. */
export const UNDER_AGE_SIGN_IN_MSG = 'Please sign in again to finish removing your account.'

let toastTimer: ReturnType<typeof setTimeout> | null = null
let syncTimer: ReturnType<typeof setTimeout> | null = null
let syncing = false
/** Set while an account deletion runs: no sync may start, so nothing re-uploads rows the server
 *  function is deleting (the JWT stays valid for a while after the login is gone). */
let deleting = false
/** When an under-18 deletion was last retried (runSync). */
let underAgeTried = 0
/** Set by initAuth: make a Supabase session this device's live session. */
let applySession: ((s: Session) => void) | null = null

export const useStore = create<StoreState>()(
  immer((set, get) => {
    // helper to persist after any mutation
    // Tell the user once if the device refuses to save, instead of losing data silently.
    let storageWarned = false
    /** Save on this device; false (and a one-off warning) when storage is full. */
    const persist = (): boolean => {
      if (saveState(get().data)) { storageWarned = false; return true }
      if (!storageWarned) { storageWarned = true; get().showToast('Couldn’t save on this device. Storage may be full: export a backup in Profile.') }
      return false
    }

    /** After a change: save it on this device, queue the sync, then confirm it (when there's a message). */
    const saved = (toast?: string) => {
      persist(); get().scheduleSync()
      if (toast !== undefined) get().showToast(toast)
    }

    const markSettingsDirty = (s: PersistedState) => {
      meta(s).settings = { u: nowIso(), dirty: true }
    }
    const markDayDirty = (s: PersistedState, d: string) => {
      meta(s).days[d] = { u: nowIso(), dirty: true }
    }

    return {
      data: loadState(),
      cur: todayStr(),
      tab: 'today',
      profileOpen: null,
      sync: 'idle',
      email: null,
      authReady: false,
      signedIn: false,
      authed: false,
      syncPaused: false,
      authNotice: null,
      ownerAsk: null,
      online: typeof navigator === 'undefined' || navigator.onLine !== false,
      deletingAccount: false,
      authProvider: null,
      kitchen: loadKitchen(),
      setKitchen: (have) => { saveKitchen(have); set((st) => { st.kitchen = have }) },
      toast: null,
      consentOpen: false,
      setConsentOpen: (open) => set((st) => { st.consentOpen = open }),
      toastAction: null,
      trainOpen: null,
      planOpen: null,
      openTrain: (w) => set((st) => { st.tab = 'train'; st.trainOpen = w }),
      openPlan: (w) => set((st) => { st.tab = 'plan'; st.planOpen = w }),
      clearOpen: () => set((st) => { st.trainOpen = null; st.planOpen = null }),

      setTab: (t) => set((st) => { st.tab = t }),
      openProfile: (section) => set((st) => { st.tab = 'profile'; st.profileOpen = section }),
      clearProfileOpen: () => set((st) => { st.profileOpen = null }),
      setDate: (d) => set((st) => { st.cur = d }),

      showToast: (msg, action) => {
        set((st) => { st.toast = msg; st.toastAction = action ?? null })
        if (toastTimer) clearTimeout(toastTimer)
        // an Undo needs time to be read and reached
        toastTimer = setTimeout(() => set((st) => { st.toast = null; st.toastAction = null }), action ? 5000 : 1600)
      },

      logEntries: (entries, toast) => {
        if (!entries.length) return
        set((st) => {
          ensureDay(st.data, st.cur).foods.push(...entries)
          markDayDirty(st.data, st.cur)
        })
        saved(toast ?? entries[0].n + ' added')
      },

      updateEntry: (index, mult, meal) => {
        set((st) => {
          const d = ensureDay(st.data, st.cur)
          const x = d.foods[index]
          if (!x) return
          d.foods[index] = { ...scaleEntry(x, mult), meal: meal ?? x.meal }
          markDayDirty(st.data, st.cur)
        })
        saved()
      },

      confirmEntry: (index) => {
        set((st) => {
          const x = ensureDay(st.data, st.cur).foods[index]
          if (!x) return
          x.ok = true
          markDayDirty(st.data, st.cur)
        })
        saved('Thanks, noted')
      },

      removeFood: (index) => {
        set((st) => {
          const d = ensureDay(st.data, st.cur)
          d.foods.splice(index, 1)
          markDayDirty(st.data, st.cur)
        })
        saved()
      },

      repeatYesterday: (meal) => {
        const { data, cur } = get()
        const all = (data.days[shiftDay(cur, -1)]?.foods || []).filter((x) => x.meal === meal)
        if (!all.length) return
        // foods no longer in Tali (removed as unverified) aren't copied, nor their cooking fat
        const gone = new Set(all.filter(isRemovedFood).map((x) => x.n))
        const prev = all.filter((x) => !gone.has(x.n) && !(x.src === 'fat' && x.fatFor && gone.has(x.fatFor)))
        const note = gone.size ? ` · ${gone.size} food${gone.size > 1 ? 's' : ''} no longer in Tali, not copied` : ''
        if (!prev.length) { get().showToast(`Not copied: ${gone.size > 1 ? 'those foods are' : 'that food is'} no longer in Tali`); return }
        get().logEntries(prev.map((x) => ({ ...relog(x, meal), how: x.how })), 'Copied from yesterday' + note)
      },

      saveCustomFood: (def) => {
        const existing = get().data.customFoods.find((x) => x.n.toLowerCase() === def.n.toLowerCase())
        const id = existing?.id ?? uuid()
        const food: Food = { ...def, g: Math.round(def.g), id }
        set((st) => {
          if (!Array.isArray(st.data.customFoods)) st.data.customFoods = []
          const cur = st.data.customFoods.find((x) => x.id === id)
          if (cur) Object.assign(cur, food, { _dirty: true, _u: nowIso() })
          else st.data.customFoods.push({ ...food, _dirty: true, _u: nowIso() })
        })
        saved('Food saved')
        return food
      },

      linkBarcode: (id, barcode) => {
        if (!get().data.customFoods.some((x) => x.id === id)) return null
        set((st) => {
          const cur = st.data.customFoods.find((x) => x.id === id)
          if (cur) Object.assign(cur, { barcode, _dirty: true, _u: nowIso() })
        })
        saved()
        const food = get().data.customFoods.find((x) => x.id === id)!
        get().showToast(`Barcode linked to your “${food.n}”`)
        return food
      },

      removeCustomFood: (index) => {
        set((st) => {
          const gone = st.data.customFoods.splice(index, 1)[0]
          if (gone?.id) meta(st.data).foodDeletes.push(gone.id)
        })
        saved('Removed from saved')
      },

      saveRecipe: (input) => {
        set((st) => {
          if (!Array.isArray(st.data.recipes)) st.data.recipes = []
          let r: Recipe | undefined
          if (input.id) r = st.data.recipes.find((x) => x.id === input.id)
          // renaming onto another recipe's name would leave two with one name (the server allows one)
          if (r && st.data.recipes.some((x) => x !== r && x.name.toLowerCase() === input.name.toLowerCase())) return
          if (!r) r = st.data.recipes.find((x) => x.name.toLowerCase() === input.name.toLowerCase())
          if (r) {
            r.name = input.name; r.servings = input.servings; r.items = input.items
            r._dirty = true; r._u = nowIso()
          } else {
            st.data.recipes.push({ id: uuid(), name: input.name, servings: input.servings, items: input.items, _dirty: true, _u: nowIso() })
          }
        })
        saved('Recipe saved')
      },

      deleteRecipe: (index) => {
        set((st) => {
          const r = st.data.recipes[index]
          if (!r) return
          st.data.recipes.splice(index, 1)
          if (r.id) meta(st.data).recipeDeletes.push(r.id)
        })
        saved('Recipe deleted')
      },

      logRecipe: (recipe, servings, meal) => {
        const per = recipePerServing(recipe)
        get().logEntries([{
          n: recipe.name, grams: Math.round(per.g * servings),
          k: r1(per.k * servings), p: r1(per.p * servings), c: r1(per.c * servings), f: r1(per.f * servings),
          meal, src: 'recipe', how: 'recipe', err: CAPTURE_ERR.recipe, serv: servings,
        }], recipe.name + ' added')
      },

      setCheckin: (c) => {
        if (c && !healthLoggingAllowed(get().data)) { get().showToast(HEALTH_OFF_MSG); return }
        set((st) => {
          ensureDay(st.data, st.cur).checkin = c
          markDayDirty(st.data, st.cur)
        })
        saved('Check-in saved')
      },

      savePlan: ({ id, when, then, cope }) => {
        set((st) => {
          const plans = (st.data.profile.plans ??= [])
          const existing = id ? plans.find((p) => p.id === id) : undefined
          if (existing) Object.assign(existing, { when, then, cope })
          else plans.push({ id: uuid(), when, then, cope, created: todayStr(), reviews: [] })
          markSettingsDirty(st.data)
        })
        saved('Plan saved')
      },

      deletePlan: (id) => {
        set((st) => {
          st.data.profile.plans = (st.data.profile.plans ?? []).filter((p) => p.id !== id)
          markSettingsDirty(st.data)
        })
        saved()
      },

      reviewPlans: (outcomes) => {
        const t = todayStr()
        set((st) => {
          for (const pl of st.data.profile.plans ?? []) {
            const r = outcomes[pl.id]
            if (!r) continue
            pl.reviews.push({ d: t, r })
            pl.lastReview = t
          }
          markSettingsDirty(st.data)
        })
        saved('Thanks for checking in')
      },

      toggleSupp: (id) => {
        set((st) => {
          const d = ensureDay(st.data, st.cur)
          d.supps[id] = !d.supps[id]
          markDayDirty(st.data, st.cur)
        })
        saved()
      },

      setWeight: (kg) => {
        if (!healthLoggingAllowed(get().data)) { get().showToast(HEALTH_OFF_MSG); return }
        set((st) => {
          ensureDay(st.data, st.cur).weight = kg
          markDayDirty(st.data, st.cur)
          // Profile shows latestWeight, so this is its weight too; profile.weight isn't rewritten,
          // which would upload the whole settings record on every weigh-in
        })
        saved('Weight saved')
      },

      saveWorkout: (type, ex, option, extra) => {
        set((st) => {
          const more: Partial<TrainingSession> = {}
          if (extra?.effort) more.effort = extra.effort
          if (extra?.note) more.note = extra.note
          if (extra?.mins != null && Number.isFinite(extra.mins)) more.mins = Math.max(1, Math.round(extra.mins))
          if (extra?.open) more.open = true
          // one of the user's own workouts: its kind and name, and its time estimate standing in for
          // minutes that weren't logged (plan §2.9; a shorter day's from the shorter prescriptions)
          const own = WORKOUTS[type] ? undefined : (st.data.routines || []).find((r) => r.id === type)
          if (!WORKOUTS[type] && !own) return
          const base = own
            ? { modality: own.modality, title: own.name, routineId: own.id,
                estMins: estMins(slotsOf(own).map((x) => (option === 'shorter' ? { ...x, rx: shorterPrescription(x.rx || EXERCISE_BY_ID[x.exId]?.defaultRx || '') } : x))) }
            : { modality: 'strength' as const, title: WORKOUTS[type].title, routineId: builtinId(type) }
          putBuiltin(ensureDay(st.data, st.cur), st.cur, { ...base, ex, ...(option ? { option } : {}), ...more },
            // what the caller didn't set carries over; an explicit null effort or empty note clears it
            keptOnSave(extra))
          markDayDirty(st.data, st.cur)
        })
        saved()
        const ownName = WORKOUTS[type] ? null : (get().data.routines || []).find((r) => r.id === type)?.name
        if (!extra?.quiet) get().showToast(extra?.toast ?? (ownName ? ownName + ' saved' : type + ' session saved'))
      },

      saveRoutine: (input) => {
        if (!canBuild(get().data.profile) || !input.slots.length) return null
        let id: string | null = null
        set((st) => {
          if (!Array.isArray(st.data.routines)) st.data.routines = []
          const name = input.name.trim().slice(0, 120) || 'My workout'
          // sets and reps in the app's notation, so estimates and "Shorter" read them
          const slots = input.slots.map((x) => { const rx = normaliseRx(x.rx); return { exId: x.exId, ...(rx ? { rx } : {}), ...(x.note ? { note: x.note } : {}) } })
          const body = {
            name, modality: headlineModality(slots), effort: input.effort ?? deriveEffort(slots),
            blocks: [{ id: 'main', kind: 'sets' as const, slots }], estMins: estMins(slots),
          }
          const r = input.id ? st.data.routines.find((x) => x.id === input.id) : undefined
          if (r) Object.assign(r, body, { archived: false, _dirty: true, _u: nowIso() })
          else st.data.routines.push({ id: uuid(), ...body, source: 'custom', ...(input.baseId ? { baseId: input.baseId } : {}), _dirty: true, _u: nowIso() })
          id = r?.id ?? st.data.routines[st.data.routines.length - 1].id
        })
        persist(); get().scheduleSync(); get().showToast('Workout saved')
        return id
      },

      archiveRoutine: (id) => {
        set((st) => {
          const r = (st.data.routines || []).find((x) => x.id === id)
          if (r) { r.archived = true; r._dirty = true; r._u = nowIso() }
        })
        persist(); get().scheduleSync(); get().showToast('Workout removed')
      },

      saveCardio: (cardioType, mins, option) => {
        set((st) => {
          const typed = parseFloat(mins)
          putBuiltin(ensureDay(st.data, st.cur), st.cur, {
            modality: cardioType === 'Mobility' ? 'mobility' : 'cardio', title: cardioType, routineId: builtinId('Cardio'),
            // blank minutes mean the Cardio card's default of 25, for Mobility too (as the box shows)
            ...(Number.isFinite(typed) ? { mins: typed } : cardioType === 'Mobility' ? { mins: 25 } : {}), cardio: { key: cardioType }, ...(option ? { option } : {}),
          })
          markDayDirty(st.data, st.cur)
        })
        saved('Cardio saved')
      },

      addSession: (x) => {
        set((st) => {
          const day = ensureDay(st.data, st.cur)
          setSessions(day, [...sessionsOf(day, st.cur), { ...x, id: uuid(), at: nowIso() }])
          markDayDirty(st.data, st.cur)
        })
        saved(x.title + ' saved')
      },

      restoreSession: (date, x) => {
        set((st) => {
          const day = ensureDay(st.data, date)
          const list = sessionsOf(day, date).filter((y) => y.id !== x.id)
          setSessions(day, [...list, x].sort((a, b) => (a.at || '').localeCompare(b.at || '')))
          markDayDirty(st.data, date)
        })
        saved()
      },

      removeSession: (id) => {
        set((st) => {
          const day = ensureDay(st.data, st.cur)
          setSessions(day, sessionsOf(day, st.cur).filter((y) => y.id !== id))
          markDayDirty(st.data, st.cur)
        })
        saved('Session removed')
      },

      setSchedule: (sch, quiet) => {
        set((st) => {
          for (let d = 0; d < 7; d++) st.data.schedule[d] = sch[d] || 'Rest'
          const kept = keptAfterEdit(st.data, st.data.schedule, todayStr())
          if (kept) st.data.profile.weekBeforePlan = kept
          markSettingsDirty(st.data)
        })
        saved(quiet ? undefined : 'Schedule updated')
      },

      startPlan: (input) => {
        const id = uuid()
        set((st) => {
          if (!Array.isArray(st.data.trainingPlans)) st.data.trainingPlans = []
          const today = todayStr()
          const start = input.startedAt ?? today
          // the person's own week, kept before the first plan's mirror writes over it
          const keep = weekToKeep(st.data)
          if (keep) { st.data.profile.weekBeforePlan = keep; ensureMeta(st.data, false).settings = { u: nowIso(), dirty: true } }
          // one plan in charge: the one in progress is finished (or put away if it never started).
          // A plan chosen to start later leaves it running until then (mirrorPlan finishes it).
          for (const p of st.data.trainingPlans) {
            if (p.state !== 'active') continue
            if (start > today && p.startedAt && p.startedAt <= today) continue
            p.state = p.startedAt && p.startedAt < today ? 'completed' : 'archived'
            if (p.state === 'completed') p.completedAt = nowIso()
            p._dirty = true; p._u = nowIso()
          }
          st.data.trainingPlans.push({
            id, name: input.name.trim().slice(0, 120) || 'My plan', source: input.source, state: 'active',
            phases: cleanPhases(input.phases), startedAt: input.startedAt ?? today,
            ...(input.baseTemplateId ? { baseTemplateId: input.baseTemplateId } : {}), ...(input.clonedFromId ? { clonedFromId: input.clonedFromId } : {}),
            _dirty: true, _u: nowIso(),
          })
          mirrorPlan(st.data, true)
        })
        saved('Plan started')
        return id
      },

      updatePlan: (id, patch) => {
        set((st) => {
          const p = (st.data.trainingPlans || []).find((x) => x.id === id)
          if (!p) return
          if (patch.name != null) p.name = patch.name.trim().slice(0, 120) || p.name
          if (patch.phases) p.phases = cleanPhases(patch.phases)
          p._dirty = true; p._u = nowIso()
          mirrorPlan(st.data, true)
        })
        saved('Plan updated')
      },

      carryOn: (id, reflection) => {
        set((st) => {
          const p = (st.data.trainingPlans || []).find((x) => x.id === id)
          if (!p || p.state !== 'active' || p.phases.some((x) => x.after)) return
          const good = reflection?.good?.trim().slice(0, 500), change = reflection?.change?.trim().slice(0, 500)
          if (good || change) p.reflection = { at: nowIso(), ...(good ? { good } : {}), ...(change ? { change } : {}) }
          p.phases = cleanPhases([...p.phases, { id: uuid(), name: 'Carrying on', weeks: 1, after: true, full: true, since: todayStr(), week: {} }])
          p._dirty = true; p._u = nowIso()
          mirrorPlan(st.data, true)
        })
        saved('Your last week carries on')
      },

      startMaintenance: (id, week) => {
        set((st) => {
          const p = (st.data.trainingPlans || []).find((x) => x.id === id)
          if (!p || p.state !== 'active' || p.phases.some((x) => x.after)) return
          p.phases = cleanPhases([...p.phases, { id: uuid(), name: 'Maintenance', weeks: 1, after: true, since: todayStr(), week: week ?? {} }])
          p._dirty = true; p._u = nowIso()
          mirrorPlan(st.data, true)
        })
        saved('Maintenance started')
      },

      savePlanCopy: (id, name) => {
        const src = (get().data.trainingPlans || []).find((x) => x.id === id)
        if (!src) return null
        const nid = uuid()
        set((st) => {
          if (!Array.isArray(st.data.trainingPlans)) st.data.trainingPlans = []
          st.data.trainingPlans.push({
            id: nid, name: [...(name ?? src.name).trim()].slice(0, 120).join('') || 'My plan', source: 'custom', state: 'template',
            phases: cleanPhases(src.phases.filter((x) => !x.after)), clonedFromId: src.id,
            ...(src.baseTemplateId ? { baseTemplateId: src.baseTemplateId } : {}), _dirty: true, _u: nowIso(),
          })
        })
        saved('Saved to your plans')
        return nid
      },

      notePlan: (id, reflection) => {
        set((st) => {
          const p = (st.data.trainingPlans || []).find((x) => x.id === id)
          if (!p) return
          const good = reflection.good?.trim().slice(0, 500), change = reflection.change?.trim().slice(0, 500)
          if (!good && !change) return
          p.reflection = { at: nowIso(), ...(good ? { good } : {}), ...(change ? { change } : {}) }
          p._dirty = true; p._u = nowIso()
        })
        saved()
      },

      finishPlan: (id, reflection, state = 'completed') => {
        set((st) => {
          const p = (st.data.trainingPlans || []).find((x) => x.id === id)
          if (!p) return
          p.state = state
          if (state === 'completed') p.completedAt = nowIso()
          const good = reflection?.good?.trim().slice(0, 500), change = reflection?.change?.trim().slice(0, 500)
          if (good || change) p.reflection = { at: nowIso(), ...(good ? { good } : {}), ...(change ? { change } : {}) }
          p._dirty = true; p._u = nowIso()
          // no plan left running: the week the person had before plans comes back (the mirror only
          // holds one ready-made workout a day, so keeping it would turn Tali's plan workouts into cardio)
          putBackWeek(st.data)
        })
        saved(state === 'completed' ? 'Plan finished' : 'Plan put away')
      },

      syncPlanMirror: () => {
        const snap = () => JSON.stringify([get().data.schedule, (get().data.trainingPlans || []).map((p) => p.state)])
        const before = snap()
        // local only (launch, back to the app): the next sync mirrors again on fresh data and uploads
        set((st) => { mirrorPlan(st.data, false) })
        if (snap() !== before) persist()
      },

      saveTargets: (t, rangeWidth) => {
        const floored = t.kcal < KCAL_FLOOR
        // when the floor lifts calories, top up carbs so the macros still add up to it
        const macroKcal = t.p * 4 + t.c * 4 + t.f * 9
        const c = floored && macroKcal < KCAL_FLOOR ? t.c + Math.round((KCAL_FLOOR - macroKcal) / 4) : t.c
        set((st) => {
          st.data.target = { ...t, c, kcal: Math.max(KCAL_FLOOR, t.kcal) }
          if (rangeWidth != null && rangeWidth >= 0) st.data.profile.rangeWidth = Math.min(400, Math.round(rangeWidth))
          markSettingsDirty(st.data)
        })
        saved()
        get().showToast(floored ? `Kept at 1,200 kcal${c !== t.c ? ', with carbs raised to match' : ''}. Going lower needs medical support.` : 'Targets saved')
      },

      saveProfileMetrics: (patch) => {
        // health consent withdrawn: the health fields (weight, body fat, height …) aren't saved, the
        // rest is; a height that isn't kept says so rather than vanishing quietly (Benn's copy)
        const dropped = !healthLoggingAllowed(get().data) && patch.height != null
        if (!healthLoggingAllowed(get().data)) patch = withoutHealth(patch)
        set((st) => {
          // a new weight on Profile is today's entry (Profile has no date); an unchanged one logs nothing
          const today = todayStr()
          if (patch.weight && patch.weight !== latestWeight(st.data, today)) {
            ensureDay(st.data, today).weight = patch.weight
            markDayDirty(st.data, today)
          }
          Object.assign(st.data.profile, patch)
          markSettingsDirty(st.data)
        })
        saved(dropped ? HEIGHT_OFF_MSG : 'Saved')
      },

      setPrefs: (patch) => {
        set((st) => { Object.assign(st.data.profile, patch); markSettingsDirty(st.data) })
        saved()
      },

      addSupplement: (name, time) => {
        set((st) => {
          if (!Array.isArray(st.data.profile.supplements)) st.data.profile.supplements = []
          st.data.profile.supplements.push({ id: uuid(), name, time })
          markSettingsDirty(st.data)
        })
        saved('Saved')
      },

      updateSupplement: (id, name, time) => {
        set((st) => {
          const s = (st.data.profile.supplements || []).find((x: Supplement) => x.id === id)
          if (s) { s.name = name; s.time = time }
          markSettingsDirty(st.data)
        })
        saved('Saved')
      },

      removeSupplement: (id) => {
        set((st) => {
          st.data.profile.supplements = (st.data.profile.supplements || []).filter((x: Supplement) => x.id !== id)
          markSettingsDirty(st.data)
        })
        saved()
      },

      updateEmail: async (email) => {
        const { error } = await supabase.auth.updateUser({ email })
        return error ? error.message : null
      },

      setNotifications: async (enabled) => {
        // registering for reminders writes to the account: not before the health answer
        if (enabled && !consentLetsSync(get().data)) { get().showToast('Reminders start once you’ve agreed in Profile, then Privacy.'); return false }
        if (enabled) {
          const ok = await subscribePush()
          if (!ok) return false
        } else {
          await unsubscribePush()
        }
        set((st) => {
          st.data.profile.notificationsEnabled = enabled
          markSettingsDirty(st.data)
        })
        const stored = persist()
        get().scheduleSync()
        return stored || 'unsaved'
      },

      importBackup: (incoming) => {
        const fresh = stateFromBackup(structuredClone(incoming), structuredClone(get().data))
        // health consent withdrawn: a restored backup must not bring the health fields back (or sync them)
        if (!healthLoggingAllowed(get().data)) clearHealthData(fresh, ensureMeta(fresh, false))
        set((st) => { st.data = fresh })
        const stored = persist()
        set((st) => { st.cur = todayStr() })
        // one message at a time: say here if the device couldn't keep it (it still syncs)
        get().showToast(stored ? 'Backup loaded' : 'Backup loaded, but this device couldn’t save it. Storage may be full.')
        get().scheduleSync()
      },

      initAuth: async () => {
        requestPersistentStorage()
        const mode = loadMode()
        // Migration: flag local-only data dirty on first run so it uploads once signed in. Runs
        // first, before any session is applied (which records the owner and so creates _meta).
        set((st) => {
          const d = st.data
          const migrate =
            !d._meta &&
            (Object.keys(d.days || {}).length > 0 ||
              (d.customFoods || []).length > 0 ||
              (d.recipes || []).length > 0 ||
              (d.routines || []).length > 0 ||
              (d.trainingPlans || []).length > 0)
          ensureMeta(d, migrate)
        })
        saveState(get().data)
        // the old device-only label-photo consent becomes a consent record (once); the old flag
        // goes only after the record is safely saved
        let legacyStore: Storage | null = null
        try { legacyStore = localStorage } catch { /* blocked */ }
        const copy = structuredClone(get().data) as PersistedState
        if (migrateLabelConsent(copy, legacyStore)) {
          set((st) => { st.data = copy })
          if (saveState(get().data)) removeLegacyLabelFlag(legacyStore)
        } else if (copy.consents?.records.some((r) => r.type === 'label-photo')) removeLegacyLabelFlag(legacyStore)

        const live = (s: Session) => {
          const uid = s.user.id
          if (get().ownerAsk?.uid === uid) return // still waiting on the user's choice (a token refresh)
          // A different account's data must not show or sync until the user chooses. Until then
          // the session isn't applied and the mode isn't saved, so a reload asks again.
          const check = ownerCheck(get().data, uid, loadMode() === 'account')
          if (check === 'ask' || check === 'verify') {
            setSession(null, null)
            // not 'account' until the user chooses, so an offline reload can't open this data
            // as a signed-in account
            saveMode(null)
            const checking = check === 'verify'
            set((st) => { st.ownerAsk = { uid, email: s.user.email ?? null, checking }; st.signedIn = false; st.authed = false; st.syncPaused = false; st.email = null })
            if (checking) {
              // Data an older version synced without recording whose it was: if it matches this
              // account's rows it's theirs, so carry on without a question (and without marking
              // it all to upload over newer server data). Any doubt, including no connection: ask.
              withTimeout(accountRows(uid, s.access_token).then((rows) => sameAccount(get().data, rows)), 6000, false)
                .catch(() => false)
                .then(async (same) => {
                  const still = () => !signingOut && get().ownerAsk?.uid === uid && !!get().ownerAsk?.checking
                  if (!still()) return // answered, cancelled or signed out meanwhile
                  if (!same) { set((st) => { if (st.ownerAsk) st.ownerAsk.checking = false }); return }
                  // the token may have been refreshed while this ran: apply the current session
                  const r = await withTimeout(supabase.auth.getSession().catch(() => null), 4000, null)
                  const now = r?.data.session
                  if (!still()) return
                  if (!now || now.user.id !== uid) { set((st) => { if (st.ownerAsk) st.ownerAsk.checking = false }); return }
                  set((st) => { ensureMeta(st.data, false).owner = uid; st.ownerAsk = null })
                  saveState(get().data)
                  live(now)
                  get().runSync()
                })
            }
            return
          }
          if (check === 'claim') {
            set((st) => { ensureMeta(st.data, false).owner = uid })
            saveState(get().data)
          }
          setSession(s.access_token, uid)
          saveMode('account')
          set((st) => { st.signedIn = true; st.authed = true; st.syncPaused = false; st.authNotice = null; st.ownerAsk = null; st.email = s.user.email ?? null; st.authProvider = (s.user.app_metadata?.provider as string | undefined) ?? null })
        }
        applySession = live
        const toSignIn = (msg?: string) => {
          setSession(null, null)
          saveMode(null)
          set((st) => { st.signedIn = false; st.authed = false; st.syncPaused = false; st.email = null; st.ownerAsk = null; st.authNotice = msg ?? null })
        }

        // Listen before restoring, so a sign-out the server forces during startup (password
        // changed, "sign out everywhere", expired refresh token) is never missed.
        let serverSignedOut = false
        supabase.auth.onAuthStateChange((event, session) => {
          // after a sign-out, ignore late events (e.g. a refresh that was mid-retry) until the
          // user signs in again from the sign-in screen
          if (signingOut) return
          if (session) {
            live(session)
            if (get().authReady) get().runSync()
          } else if (event === 'SIGNED_OUT') {
            serverSignedOut = true
            if (get().authReady) toSignIn(SIGNED_OUT_MSG)
          }
        })

        // Launch must never depend on the network: restoring a session can stall offline while
        // it retries a token refresh, so give it a few seconds, then open with local data.
        // `definite` = the server answered (no session), as opposed to no connection.
        const r = await withTimeout(
          supabase.auth.getSession()
            .then((x) => ({ session: x.data.session, definite: !x.error || !isAuthRetryableFetchError(x.error) }))
            .catch(() => ({ session: null, definite: false })),
          4000, { session: null, definite: false })
        const session = r.session
        if (session) live(session)
        // mode 'guest' (the old "continue without an account"): there is no guest mode any more, so
        // it opens the sign-in screen; the log stays and moves into the account on first sign-in
        else if (mode === 'guest') { saveMode(null); set((st) => { st.authNotice = GUEST_GONE_MSG }) }
        else if (mode === 'account') {
          if ((r.definite || serverSignedOut) && navigator.onLine) {
            // signed out on the server: say so and ask to sign in, rather than quietly not syncing
            toSignIn(SIGNED_OUT_MSG)
          } else {
            // offline or a weak signal: open the account's local data now; sync resumes when the
            // session does. Only an explicit sign-out leads back to the sign-in screen.
            set((st) => { st.signedIn = true; st.authed = false; st.syncPaused = true })
          }
        }
        set((st) => { st.authReady = true })

        if (session) get().runSync()
        window.addEventListener('offline', () => set((st) => { st.online = false }))
        window.addEventListener('online', async () => {
          set((st) => { st.online = true })
          // back online: an under-18 deletion still to do retries straight away (runSync)
          underAgeTried = 0
          if (get().syncPaused) {
            const res = await supabase.auth.getSession().catch(() => null)
            if (res?.data.session) live(res.data.session)
            else {
              // only a definite answer from the server means signed out; a flaky reconnect stays paused
              if (res && (!res.error || !isAuthRetryableFetchError(res.error))) toSignIn(SIGNED_OUT_MSG)
              return
            } // local data stays and uploads after sign-in
          }
          get().runSync()
        })
        document.addEventListener('visibilitychange', () => { if (!document.hidden) { get().syncPlanMirror(); get().runSync() } })
        get().syncPlanMirror()
      },

      runSync: async () => {
        // Only sync with a real authenticated session (none while offline or while asking whose
        // data this is); the database rejects anything without a JWT matching the row's user_id.
        if (!get().authed) return
        if (syncing || deleting) return
        // an under-18 account still to delete (onboarding §14): nothing syncs, the deletion retries
        // (at most once a minute: a failed deletion schedules a sync of its own)
        const pend = pendingDeletion()
        // only this account's: another account signed in on the device syncs as normal
        if (pend && pend.uid === getUid()) {
          // backed off after a failure (underAgeNext); at most once a minute either way
          if (navigator.onLine && Date.now() - underAgeTried > 60_000 && underAgeRetryDue(pend, Date.now())) { underAgeTried = Date.now(); void get().deleteUnderAge() }
          return
        }
        if (!navigator.onLine) { set((st) => { st.sync = 'offline' }); return }
        // Nothing of the log reaches the cloud without a yes to health data (UK GDPR Art. 9(2)(a)):
        // not before an answer, not during a "Not now", not after a withdrawal. Until then only the
        // consent records sync (an answer given on another device counts here), and after a
        // withdrawal the account's copy of the log is deleted.
        if (!consentLetsSync(get().data)) {
          syncing = true
          // data changed while the pull ran (e.g. Continue was tapped): run again afterwards, since
          // that tap's own scheduled sync was dropped while this one was in flight
          let again = false
          try {
            const src = get().data
            const uid0 = getUid()
            const d = structuredClone(src) as PersistedState
            consentRefusals = 0
            await pushConsents(d)
            await pullConsents(d)
            const m = ensureMeta(d, false)
            // a withdrawal made on another device: this device's health data is cleared too (once)
            applyHealthWithdrawal(d, m)
            // the latest answer is a no that's on the server, and this device hasn't seen its clear
            // done: ask the server to delete the account's copy (it re-checks the latest answer
            // itself, in one transaction, so a yes given on another phone meanwhile is kept)
            const owed = pendingCloudClear(d)
            let cleared: string | null = null
            if (owed && get().authed && getUid() === uid0 && (await clearCloudLog())) cleared = owed.id
            if (cleared) {
              // reminders were deleted with the log: say so on this phone
              d.consents!.cloudClearedFor = cleared
              d.profile.notificationsEnabled = false
              void withTimeout(unsubscribePush(), 2000, undefined)
            }
            if (get().data !== src) {
              // something changed meanwhile: keep that, and still record the clear so it isn't lost
              if (cleared) { set((st) => { consentLog(st.data).cloudClearedFor = cleared!; st.data.profile.notificationsEnabled = false }); persist() }
              again = true
              return
            }
            if (!get().authed || getUid() !== uid0) return
            // a yes that came in from another device ends this device's pause here
            if (consentLetsSync(d)) resumeAfterYes(d)
            saveState(d)
            set((st) => { st.data = d })
            again = consentLetsSync(d)
          } catch (e) {
            console.warn('consent check failed:', e)
          } finally {
            syncing = false
            if (again) get().scheduleSync()
          }
          return
        }
        syncing = true
        let rerun = false
        set((st) => { st.sync = 'syncing' })
        try {
          // Work on a plain mutable clone — the store's live data is frozen by Immer,
          // and the sync engine mutates records in place.
          const src = get().data
          const uid0 = getUid()
          const d = structuredClone(src) as PersistedState
          const m = ensureMeta(d, false)
          // consent first: a no (or a pause) made on another device must be known before any of the
          // log moves, or this phone would upload over, or pull away, what that answer protects
          await pushConsents(d)
          await pullConsents(d)
          if (!consentLetsSync(d)) {
            if (get().data === src && get().authed && getUid() === uid0) { saveState(d); set((st) => { st.data = d }) }
            set((st) => { st.sync = 'idle' })
            rerun = true // the consent-only path takes over
            return
          }
          // a yes after a withdrawal: the account's copy was deleted, so the whole log goes up
          const re = needsReupload(d)
          if (re) {
            // marked on the live state and saved first, so a run that stops part-way doesn't mark
            // it all again; the next run (with the consent records this one pulled) uploads it
            if (get().data !== src || !get().authed || getUid() !== uid0) { rerun = true; return }
            const synced = d.consents!.records
            set((st) => {
              const log = consentLog(st.data)
              for (const r of synced) if (!log.records.some((x) => x.id === r.id)) log.records.push(r)
              markReupload(st.data, meta(st.data), re)
            })
            persist()
            // the account's reminders went with its copy of the log: register this phone again
            if (d.profile.notificationsEnabled) void withTimeout(resubscribePush(), 5000, false)
            set((st) => { st.sync = 'idle' })
            rerun = true
            return
          }
          let failed: string[]
          try {
            failed = await pushDirty(d, m)
            consentRefusals = 0
          } catch (e) {
            // the server says there's no current yes (a no from another phone arrived meanwhile):
            // drop this copy without pulling (the account's copy may be being cleared, and a pull
            // would take this phone's own foods, recipes and workouts away with it); live records
            // stay dirty, and the consent-only path takes over
            if (!(e instanceof ConsentRequiredError)) throw e
            set((st) => { st.sync = 'idle' })
            // straight away once; if the server still refuses, wait for the next edit, focus or
            // connection rather than asking every 800 ms
            rerun = ++consentRefusals < 2
            return
          }
          await pullAll(d, m)
          // the same check after the pull: a clear only follows a no the server has, so if the
          // answer is still a yes here, the pull read the account before any clear
          await pullConsents(d)
          if (!consentLetsSync(d)) { set((st) => { st.sync = 'idle' }); rerun = true; return }
          // a health withdrawal made on another device clears this one's health data too (once)
          if (applyHealthWithdrawal(d, m)) rerun = true
          // an answer given on another device ends a "Not now" pause here (a yes uploads what was held)
          if (settleHealthPause(d, m)) rerun = true
          // the plan's week moved on (a new phase) while settings were current: upload the mirror next run
          if (mirrorPlan(d, true)) rerun = true
          // Data changed while we were on the network (an edit, a backup import): writing this
          // copy back would lose that change. Drop it; live records are still dirty, so the
          // next run pushes them again and pulls afresh.
          if (get().data !== src) { rerun = true; return }
          // signed out, or another account's session held back, while this ran: its requests may
          // have gone out without this account's token (an anon read returns no rows), so drop it
          if (!get().authed || getUid() !== uid0) return
          saveState(d)
          // Rejected records stay dirty on the device and retry next time; the rest synced.
          if (failed.length) console.warn('sync: some records were rejected:', failed)
          // Replace data wholesale so selectors see fresh references and re-render.
          set((st) => { st.data = d; st.sync = failed.length ? 'error' : 'synced' })
        } catch (e) {
          console.warn('sync failed:', e)
          set((st) => { st.sync = 'error' })
        } finally {
          syncing = false
          if (rerun) get().scheduleSync()
        }
      },

      scheduleSync: () => {
        if (syncTimer) clearTimeout(syncTimer)
        if (deleting) return
        syncTimer = setTimeout(() => get().runSync(), 800)
      },

      /** Call before a sign-in attempt: ends the post-sign-out wait for late session events. */
      beginSignIn: () => {
        signingOut = false
      },

      resolveOwner: async (choice) => {
        const ask = get().ownerAsk
        if (!ask) return
        if (choice === 'cancel') { await get().signOut(); return }
        const next = choice === 'keep' ? keepForAccount(structuredClone(get().data) as PersistedState, ask.uid) : freshForAccount(ask.uid)
        if (choice === 'fresh') get().setKitchen([])
        // the browser's push subscription still belongs to the previous account: end it
        await withTimeout(unsubscribePush(), 2000, undefined)
        saveState(next)
        set((st) => { st.data = next; st.cur = todayStr(); st.ownerAsk = null })
        // the session was held back while asking; it comes from local storage, so this works offline
        // raced like at launch: getSession can stall offline while it retries a token refresh
        const r = await withTimeout(supabase.auth.getSession().catch(() => null), 4000, null)
        const session = r?.data.session
        if (session && session.user.id === ask.uid && applySession) {
          applySession(session)
          get().runSync()
        } else {
          set((st) => { st.signedIn = false; st.authNotice = SIGNED_OUT_MSG })
        }
      },

      grantConsent: (type) => {
        // a yes to health also uploads what a "Not now" held back on this device
        set((st) => { if (type === 'health') grantHealth(st.data, meta(st.data)); else recordConsent(st.data, type, true) })
        saved()
      },

      notNowHealth: () => {
        set((st) => { pauseHealthSync(st.data) })
        saved()
      },

      declineConsent: (type) => {
        // nothing to clear for someone new, but withdraw() also covers anything logged meanwhile
        set((st) => { withdraw(st.data, meta(st.data), type) })
        saved()
      },

      withdrawConsent: (type) => {
        set((st) => { withdraw(st.data, meta(st.data), type) })
        saved()
      },

      hasConsent: (type) => consented(get().data, type),

      canSaveHealth: () => canSaveHealthAnswers(get().data),

      saveHealthAnswers: (patch) => {
        if (!canSaveHealthAnswers(get().data)) return false
        get().setPrefs(patch)
        return true
      },

      setupOpen: false,
      openSetup: (open) => set((st) => { st.setupOpen = open }),

      finishOnboarding: ({ profile, plan, target, weightKg }) => {
        const consent = canSaveHealthAnswers(get().data)
        set((st) => {
          // no health consent: nothing health-related is kept (the wizard didn't ask it either)
          st.data.profile = consent ? profile : { ...st.data.profile, ...withoutHealth(profile) }
          if (consent && weightKg) {
            const today = todayStr()
            // the wizard's weight is today's weigh-in (as a weight saved on Profile is)
            if (st.data.days[today]?.weight !== weightKg) { ensureDay(st.data, today).weight = weightKg; markDayDirty(st.data, today) }
          }
          if (target) st.data.target = target
          markSettingsDirty(st.data)
          if (plan) acceptGenerated(st.data, plan)
        })
        clearDraft()
        saved()
        return consent
      },

      deleteUnderAge: async () => {
        underAgeTried = Date.now()
        const owner = get().data._meta?.owner
        // offline (no live session) the device's owner is the account: its session is still saved here
        const uid = get().authed ? getUid() : owner
        const prev = pendingDeletion()
        const pend = prev && prev.uid === uid ? prev : uid ? { uid, at: nowIso() } : null
        if (pend) markPendingDeletion(pend)
        // this device's data goes now, whatever the connection; the account follows (plan §14).
        // Its own data or nobody's yet (a new device), never another account's (underAgeWipesDevice)
        clearDraft()
        if (underAgeWipesDevice(owner, uid)) {
          const next = uid ? freshForAccount(uid) : freshForDevice()
          saveState(next)
          set((st) => { st.data = next; st.cur = todayStr(); st.kitchen = [] })
          get().setKitchen([])
        }
        const res = await get().deleteAccount('under-age')
        if (!pend) return res
        const step = underAgeNext(res.status, pend, Date.now())
        if (step.kind === 'done') clearPendingDeletion()
        else if (step.kind === 'wait') markPendingDeletion(step.pending)
        else {
          // stop trying by itself (the server refused re-auth for an account over 24 hours old, or it
          // kept failing): sign this device out, wipe it, and ask for a fresh sign-in, which passes
          // re-auth and finishes the deletion (runSync). Another account's data is never touched.
          signingOut = true
          if (syncTimer) { clearTimeout(syncTimer); syncTimer = null }
          await withTimeout(unsubscribePush(), 2000, undefined)
          setSession(null, null)
          await defaultDeleteDeps.signOut()
          clearSavedSession()
          saveMode(null)
          const wipe = underAgeWipesDevice(get().data._meta?.owner, pend.uid)
          if (wipe) wipeDevice()
          // the wipe takes every tali.* key: the record goes back, so the next sign-in finishes it
          markPendingDeletion(step.pending)
          underAgeTried = 0
          set((st) => {
            if (wipe) { st.data = freshForDevice(); st.cur = todayStr(); st.kitchen = [] }
            st.signedIn = false; st.authed = false; st.syncPaused = false; st.email = null; st.ownerAsk = null; st.sync = 'idle'
            st.authNotice = UNDER_AGE_SIGN_IN_MSG
          })
        }
        return res
      },

      clearHealthAnswer: (kind) => {
        // removing is always allowed (no consent needed to delete); the clear is stamped to sync
        let changed = false
        set((st) => { changed = clearHealthAnswerIn(st.data.profile, kind, nowIso()); if (changed) markSettingsDirty(st.data) })
        if (changed) saved()
        return changed
      },

      confirmPregnancy: (status) => {
        // "still applies" keeps a health answer: only with the local health yes; "no longer" removes it
        if (status === 'still-applies' && !canSaveHealthAnswers(get().data)) return false
        set((st) => { confirmPregnancyIn(st.data.profile, status, todayStr(), nowIso()); markSettingsDirty(st.data) })
        saved()
        return true
      },

      snoozePregnancyReask: () => {
        let changed = false
        set((st) => { changed = snoozePregnancyIn(st.data.profile, todayStr(), nowIso()); if (changed) markSettingsDirty(st.data) })
        if (changed) saved()
        return changed
      },

      rateExercise: (routineId, slot, rating) => {
        const before = get().data
        const r = (before.routines || []).find((x) => x.id === routineId)
        const sl = r?.blocks[0]?.slots[slot]
        if (!r || !sl) return
        const exId = sl.exId
        let swapped: string | null = null
        set((st) => {
          const t = (st.data.profile.training ??= {})
          const prefs = (t.exPrefs ??= {})
          const liked = new Set(prefs.liked ?? []), disliked = new Set(prefs.disliked ?? [])
          if (rating === 'up') { if (liked.has(exId)) liked.delete(exId); else { liked.add(exId); disliked.delete(exId) } }
          else {
            disliked.add(exId); liked.delete(exId)
            const rr = (st.data.routines || []).find((x) => x.id === routineId)!
            const all = rr.blocks.flatMap((b) => b.slots.map((x) => x.exId))
            swapped = replacementFor(exId, { ...t, exPrefs: { liked: [...liked], disliked: [...disliked] } }, all)
            if (swapped) {
              const target = rr.blocks[0].slots[slot]
              rr.blocks[0].slots[slot] = { ...target, exId: swapped, why: [{ code: 'disliked', about: 'exercise', data: { exId: swapped, alt: exId } }] }
              rr._dirty = true; rr._u = nowIso()
            }
          }
          prefs.liked = [...liked]; prefs.disliked = [...disliked]
          markSettingsDirty(st.data)
        })
        saved()
        if (rating === 'down') {
          const prevPrefs = before.profile.training?.exPrefs
          get().showToast('Got it. We’ll pick something else.', { label: 'Undo', run: () => {
            set((st) => {
              const t = (st.data.profile.training ??= {})
              t.exPrefs = structuredClone(prevPrefs ?? {})
              const rr = (st.data.routines || []).find((x) => x.id === routineId)
              if (rr && swapped) { rr.blocks[0].slots[slot] = structuredClone(sl); rr._dirty = true; rr._u = nowIso() }
              markSettingsDirty(st.data)
            })
            saved()
          } })
        }
      },

      prepareHealthWithdrawal: () => {
        const { json, summary } = healthWithdrawalBackup(get().data)
        return { summary, backup: json, prompt: HEALTH_WITHDRAW_PROMPT }
      },

      downloadBeforeWithdrawal: () => exportBackup(get().data),

      deleteNeedsReauth: () => !sessionSignedInRecently(getToken()),

      reauthForDeletion: async (how) => {
        const email = get().email
        if ('google' in how) return email ? reauthWithGoogle(email, getUid()) : 'error'
        if (!email) return 'error'
        const r = await reauthWithPassword(email, how.password)
        if (r !== 'ok') return r
        // the new session arrives through onAuthStateChange; make sure it's the one applied
        const now = await withTimeout(supabase.auth.getSession().catch(() => null), 4000, null)
        if (now?.data.session && applySession) applySession(now.data.session)
        return 'ok'
      },

      deleteAccount: async (reason) => {
        if (deleting) return { status: 'busy' }
        if (!navigator.onLine) return { status: 'offline' }
        if (!get().authed) return { status: 'no-session' }
        deleting = true
        let failed = false
        set((st) => { st.deletingAccount = true })
        try {
          if (syncTimer) { clearTimeout(syncTimer); syncTimer = null }
          // let a sync already in flight finish, so none is mid-upload while rows are deleted
          for (let i = 0; syncing && i < 50; i++) await new Promise((r) => setTimeout(r, 200))
          if (syncing) { failed = true; return { status: 'busy' } }
          const res = await deleteAccountData({
            ...defaultDeleteDeps,
            hasSession: () => get().authed,
            accountMatches: () => tokenMatchesOwner(getToken(), get().data._meta?.owner, !!get().ownerAsk),
            signOut: async () => {
              // late session events from here on are ignored, as after a sign-out
              signingOut = true
              // the browser's push subscription ends here (its row went with the account)
              await withTimeout(unsubscribePush(), 2000, undefined)
              setSession(null, null)
              await defaultDeleteDeps.signOut()
              clearSavedSession()
            },
          }, reason)
          if (res.status !== 'ok') { failed = true; return res }
          // in memory too: nothing of the account stays on screen (not saved: the device stays empty)
          set((st) => {
            st.data = freshForDevice(); st.cur = todayStr(); st.kitchen = []
            st.signedIn = false; st.authed = false; st.syncPaused = false; st.email = null; st.ownerAsk = null; st.authNotice = null; st.sync = 'idle'
          })
          return res
        } finally {
          deleting = false
          set((st) => { st.deletingAccount = false })
          // nothing was deleted: the sync that was held back runs again
          if (failed) get().scheduleSync()
        }
      },

      signOut: async (opts) => {
        // Supabase keeps the saved session if its sign-out call can't reach the server
        // (offline), which would sign the user straight back in: clear it locally as well, and
        // ignore late session events (see onAuthStateChange). A refresh already in flight can
        // re-save the session, so clear again once the sign-out call settles.
        signingOut = true
        // Stop this device's reminders for this account while its token can still delete the row;
        // otherwise they keep arriving for the next person on a shared phone. Never waits long.
        await withTimeout(unsubscribePush(), 2000, undefined)
        const out = supabase.auth.signOut().catch(() => {}).finally(() => { if (signingOut) clearSavedSession() })
        await withTimeout(out, 3000, undefined)
        clearSavedSession()
        get().setKitchen([]) // shared phones: the next person doesn't see this kitchen
        setSession(null, null)
        saveMode(null)
        if (opts?.remove) {
          // shared phones: the next person finds an empty device, not this log
          const next = freshForDevice()
          saveState(next)
          set((st) => { st.data = next; st.cur = todayStr() })
        }
        set((st) => { st.signedIn = false; st.authed = false; st.syncPaused = false; st.email = null; st.authNotice = null; st.ownerAsk = null })
      },
    }
  }),
)

/** The header indicator's state (onboarding plan §7), derived from the store alone. */
export function selectConnection(st: Pick<StoreState, 'signedIn' | 'authed' | 'syncPaused' | 'ownerAsk' | 'online' | 'sync' | 'data'>): ConnectionState {
  return connectionState({
    signedIn: st.signedIn, authed: st.authed, syncPaused: st.syncPaused, ownerAsk: !!st.ownerAsk,
    online: st.online, sync: st.sync, pending: unsyncedCount(st.data), phoneOnly: !consentLetsSync(st.data),
  })
}
