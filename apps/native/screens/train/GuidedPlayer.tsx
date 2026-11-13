/**
 * The guided session (web: screens/train/GuidedPlayer.tsx, Flow 1): one exercise per screen, the
 * demo clip full bleed where there is one (no blur, a light shade top and bottom, the controls below
 * the move), or the cue on a plain dark background where there isn't, with the clip's tempo count
 * ("2 · of 3 · Lower slowly"). Every set is saved the moment it's logged, so leaving part-way keeps
 * it. Nothing here waits on the network: a clip that can't load falls back to its still or the cue.
 * The same logic as the web, line for line; only the drawing is React Native.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AccessibilityInfo, AppState, Modal, Pressable, ScrollView, Text, View } from 'react-native'
import { StatusBar } from 'expo-status-bar'
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake'
import { cancelRestAlert, scheduleRestAlert, setGuidedSessionOpen } from './session'
import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useStore } from '@/store/store'
import { quietNumbers } from '@/data/consent'
import { keyRoutineId, keyTitle, warmupForKey, type WorkoutKey } from '@/core/domain/routines'
import type { Effort, ExerciseMedia, LoggedExercise, Routine, Session, SetEntry, SetFeel, Workout } from '@/core/types'
import { calibrationTarget } from '@/core/domain/engine/calibrate'
import { exposureOf } from '@/core/domain/firstSession'
import { FIRST_SESSION } from '@/screens/onboarding/copyApp'
import { PHASE_LABEL, tempoAt } from '@/core/domain/tempo'
import { todayStr } from '@/core/domain/date'
import { buildLogged, fmtClock, fmtTarget, lastTime, later, parseRx, readyToStepUp, restFor, restHint, setsLine, splitLogged, stintMins, swapInto, targetFor, warmupSlot, working, type Slot } from '@/core/domain/guided'
import { sessionsOf, warmupOnly } from '@/core/domain/sessions'
import { exById, holdAt, holdLabel, holdTarget } from '@/core/domain/library'
import { howToLink } from '@/core/domain/workout'
import { ONBOARDING_ENABLED } from '@/data/onboardingFlag'
import type { ShorterKind } from '@/core/domain/dayOptions'
import { easierAim } from '@/screens/train/hardDay'
import { RED_FLAG, warmupCopy } from '@/copy/train'
import { bareName, firstLine } from '@/screens/train/trainModel'
import * as WebBrowser from 'expo-web-browser'
import { AdjustSheet } from './AdjustSheet'
import { FinishSheet } from './FinishSheet'
import { HoldTimer } from './HoldTimer'
import { SwapSheet } from './SwapSheet'
import { WarmupPlayer } from './WarmupPlayer'
import { ClipView, Still, useClip, useClipTime, useReducedMotion } from './media'
import { BRAND_COLOR, GpBar, GpBot, GpClock, GpMain, GpPill, GpRound, GpSec, GpShade, GpTextBtn, GpTop, vibrate } from './gp'
import { OverlaySheets, BareSheet, Button, Dots, Icon, Li, LiText, List, NavBtn, Sheet, Stack, Sub, Foot, Toggle, font, num, useTokens } from './ui'

const SOUND_KEY = 'tali.sound'
const soundPref = () => { try { return localStorage.getItem(SOUND_KEY) === '1' } catch { return false } }

/**
 * A short chime at the end of rest, only when sound is on: the web's own Web Audio chime, rendered
 * to assets/sounds/chime.wav by make-chime.cjs (same note, envelope and length). It mixes with the
 * person's music and respects the silent switch, as the web's does on an iPhone.
 */
let chimePlayer: AudioPlayer | null = null
function chime() {
  try {
    if (!chimePlayer) {
      chimePlayer = createAudioPlayer(require('../../assets/sounds/chime.wav'))
    }
    chimePlayer.seekTo(0).catch(() => {})
    chimePlayer.play()
  } catch { /* no audio */ }
}

/**
 * The demo's count for the current phase ("2 · of 3 · Lower slowly"). It follows the clip's own
 * clock; it never claims to count the person's reps.
 */
function TempoCount({ player, media, playing }: { player: ReturnType<typeof useClip>['player']; media: ExerciseMedia; playing: boolean }) {
  const t = useClipTime(player)
  if (!playing) return null
  const s = tempoAt(media, t)
  const sh = { textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 24 }
  return (
    <View pointerEvents="none" accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ position: 'absolute', left: 0, right: 0, top: '39%', alignItems: 'center' }}>
      {s.kind === 'ready'
        ? <Text style={[font(500), sh, { fontSize: 17, color: '#fff', marginTop: 4 }]}>{PHASE_LABEL.ready}</Text>
        : <>
          <Text style={[font(400), num, sh, { fontSize: 112, lineHeight: 112, fontWeight: '200', letterSpacing: -5.6, color: '#fff' }]}>{s.count}</Text>
          <Text style={[font(500), sh, { fontSize: 17, color: '#fff', marginTop: 4 }]}>of {s.countOf} · {PHASE_LABEL[s.kind]}</Text>
        </>}
    </View>
  )
}

type SheetKind = null | 'adjust' | 'warmup' | 'menu' | 'leave' | 'finish' | 'hold' | 'swap' | 'stopped'

export function GuidedPlayer({ type, slots, option, onSwap, onClose, onFinished, generated, shorterKind }: {
  /** a built-in's type or the id of one of the user's own workouts */
  type: WorkoutKey
  slots: Slot[]
  option?: Workout['option']
  onSwap: (i: number, id: string) => void
  onClose: () => void
  /** after Finish: back to the today list */
  onFinished?: () => void
  /** a workout the engine generated (onboarding flag): "Find your weight" and "How was that set?" (ob5-1, ob5-2) */
  generated?: Routine
  /** which shorter version today is (wellbeing flag): 'easier' aims for 3 or 4 to spare, never +1 */
  shorterKind?: ShorterKind | null
}) {
  const tk = useTokens()
  const cur = useStore((s) => s.cur)
  const days = useStore((s) => s.data.days)
  const gentle = useStore((s) => quietNumbers(s.data))
  const saveWorkout = useStore((s) => s.saveWorkout)
  const removeSession = useStore((s) => s.removeSession)
  const restoreSession = useStore((s) => s.restoreSession)
  const showToast = useStore((s) => s.showToast)
  const routines = useStore((s) => s.data.routines)
  const title = keyTitle(type, routines)
  const session = sessionsOf(days[cur], cur).find((x) => x.routineId === keyRoutineId(type))
  const isToday = cur === todayStr()
  const shorter = option === 'shorter'

  // what's already logged today (resume); anything that isn't a slot's now is kept as an extra
  const [init] = useState(() => splitLogged(session?.ex, slots))
  const [logged, setLogged] = useState<Record<number, SetEntry[]>>(init.bySlot)
  const [extras, setExtras] = useState<LoggedExercise[]>(init.extras)
  const [prevMins] = useState(() => session?.mins)
  const [order, setOrder] = useState(() => slots.map((s) => s.i))
  const [pos, setPos] = useState(() => {
    const k = slots.findIndex((s) => working(logged[s.i]).length < s.sets)
    return k < 0 ? 0 : k
  })
  const [started] = useState(() => Date.now())
  const [now, setNow] = useState(() => Date.now())
  const [rest, setRest] = useState<{ end: number; total: number } | null>(null)
  const [sheet, setSheet] = useState<SheetKind>(null)
  const [sound, setSound] = useState(soundPref)
  const [discard, setDiscard] = useState(false)
  const say = (s: string) => { if (s) AccessibilityInfo.announceForAccessibility(s) }

  // the warm-up block opens the session (ob5-0), unless it's done already or sets are logged; a
  // resume with part of it left and no sets picks it up from the minutes done
  const training = useStore((s) => s.data.profile.training)
  const [block] = useState(() => (ONBOARDING_ENABLED ? warmupForKey(type, routines, training) : null))
  const [warm, setWarm] = useState<Session['warmup'] | undefined>(session?.warmup)
  const [warmFrom] = useState(() => (session?.warmup && block ? Math.min(session.warmup.mins, block.mins) * 60 : 0))
  const [inWarm, setInWarm] = useState(() => !!block && (!session?.warmup || session.warmup.mins < session.warmup.of) && !Object.values(init.bySlot).some((l) => working(l).length))
  const warmSec = useRef(warmFrom)
  const onWarmProgress = useCallback((sec: number) => { warmSec.current = sec }, [])
  /** the warm-up as it stands: whole minutes done of the block (never sets) */
  const warmNow = (): Session['warmup'] | undefined => (inWarm && block ? { mins: Math.min(block.mins, Math.round(warmSec.current / 60)), of: block.mins } : warm)

  const slot = slots.find((s) => s.i === order[pos]) ?? slots[0]
  const sets = logged[slot.i] || []
  const done = working(sets)
  const setNo = done.length
  const complete = setNo >= slot.sets
  const last = useMemo(() => lastTime(days, cur, slot.x?.id, slot.shown.n, slot.fullRx), [days, cur, slot.x?.id, slot.shown.n, slot.fullRx])
  // "Find your weight" (engine §3.3 step 7): sessions 1–2 of a loaded move start from no number
  const calib = useMemo(() => {
    if (!generated || slot.swapped || slot.shape !== 'weight-reps' || !slot.x) return null
    const rs = generated.blocks[0]?.slots[slot.i]
    if (!rs || rs.exId !== slot.x.id || !rs.why?.some((w) => w.code === 'calibration')) return null
    const ex = exposureOf(days, cur, slot.x.id)
    const t = calibrationTarget({ exId: slot.x.id, sets: slot.sets, reps: parseRx(slot.rx).reps, calibrate: true }, ex.n, ex.last?.feel)
    return t ? { t, n: ex.n, lastW: ex.last?.w } : null
  }, [generated, slot.i, slot.swapped, slot.shape, slot.x, slot.sets, slot.rx, days, cur])
  const [found, setFound] = useState<Record<number, string>>({})
  const [findW, setFindW] = useState<number | null>(null)
  const finding = !!calib && setNo === 0 && found[slot.i] === undefined && !complete
  const lastW = calib?.lastW && +calib.lastW ? +calib.lastW : null
  useEffect(() => { setFindW(lastW) }, [slot.i, lastW])
  const t0 = complete ? null : targetFor(slot.shape, slot.rx, last, setNo, done, { shorter: shorter ? shorterKind : null })
  // an easier Shorter day (B3.16): the effort to aim for, under the name
  const aimReps = parseRx(slot.rx).reps
  const easierLine = shorter && shorterKind === 'easier' && !complete && aimReps && (slot.shape === 'weight-reps' || slot.shape === 'reps') ? easierAim(aimReps) : null
  const target = t0 && found[slot.i] !== undefined && setNo === 0 ? { ...t0, w: found[slot.i] }
    : !t0 && found[slot.i] !== undefined && setNo === 0 && !complete ? { w: found[slot.i], reps: String(calib?.t.reps?.hi ?? parseRx(slot.rx).reps?.hi ?? 10) } : t0
  // "How was that set?" on the last set of each exercise (ob5-2), with Skip
  const [askFeel, setAskFeel] = useState<{ i: number; k: number; line: string } | null>(null)
  const [feel, setFeel] = useState<SetFeel | null>(null)
  const isLastSlot = pos >= order.length - 1
  const name = bareName(slot.shown.n)
  const video = slot.shown.video
  // a hold with its clip on screen (boards h2–h4): the timer runs over the clip, not in a sheet
  const [holdStart, setHoldStart] = useState<number | null>(null)
  useEffect(() => { setHoldStart(null) }, [slot.i, slot.shown.id, slot.shown.n])

  // native (Benn, 13 Nov): the screen stays awake while the session is open (released when the player
  // closes; the system ends it in the background), and N12 can see a session is in progress
  useEffect(() => {
    const tag = 'tilo-guided'
    const on = activateKeepAwakeAsync(tag).catch(() => {})
    // the chime mixes with music and follows the silent switch: set before any chime plays
    setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch(() => {})
    setGuidedSessionOpen(true)
    return () => {
      setGuidedSessionOpen(false); cancelRestAlert()
      // released after it has taken hold (releasing first throws on some platforms)
      on.then(() => Promise.resolve(deactivateKeepAwake(tag))).catch(() => {})
    }
  }, [])
  // the rest that keeps running in the background: an alert at its end, only while the app is away
  const restLine = `${complete ? name : `Set ${setNo + 1} of ${slot.sets}, ${name}`}`
  const restRef = useRef({ rest, restLine, sound })
  restRef.current = { rest, restLine, sound }
  useEffect(() => {
    const sub = AppState.addEventListener('change', (st) => {
      const r = restRef.current
      if (st === 'active') cancelRestAlert()
      else if (st === 'background' && r.rest) scheduleRestAlert(r.rest.end, r.restLine, r.sound)
    })
    return () => sub.remove()
  }, [])
  useEffect(() => { if (!rest) cancelRestAlert() }, [rest])

  // one clock for the elapsed time and the rest countdown (device clock: works offline)
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(i) }, [])
  const restLeft = rest ? Math.max(0, Math.ceil((rest.end - now) / 1000)) : 0
  useEffect(() => {
    if (!rest || now < rest.end) return
    // never counts past zero: rest ends, it's announced once, and the set is back
    // back after rest ended away from the app: the notification already said so, no second cue
    const late = now - rest.end > 3000
    setRest(null)
    if (late) return
    say(`Rest over. ${complete ? name : `Set ${setNo + 1} of ${slot.sets}, ${name}`}.`)
    vibrate(180)
    if (sound) chime()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [now, rest, sound, complete, name, setNo, slot.sets])

  const write = useCallback((next: Record<number, SetEntry[]>, ex: LoggedExercise[], extra: Parameters<typeof saveWorkout>[3], w: Session['warmup'] | undefined = warm) => {
    saveWorkout(type, buildLogged(slots, next, ex), option, { ...extra, ...(w ? { warmup: w } : {}) })
  }, [slots, type, option, saveWorkout, warm])
  // every set saves at once, marked open until Finish
  const save = (next: Record<number, SetEntry[]>, ex = extras) => write(next, ex, { quiet: true, open: true })

  /** the next slot in play order that still has sets to do, after `from` */
  const nextOpen = (from: number, lg = logged) => {
    for (let k = from + 1; k < order.length; k++) {
      const s = slots.find((y) => y.i === order[k])!
      if (working(lg[s.i]).length < s.sets) return k
    }
    return -1
  }
  const moveOn = () => { setRest(null); const k = nextOpen(pos); if (k < 0) setSheet('finish'); else { setPos(k); setSheet(null) } }

  function logSet(entry: SetEntry) {
    const next = { ...logged, [slot.i]: [...sets, entry] }
    setLogged(next)
    save(next)
    setSheet(null)
    if (entry.warmup) return
    // stopped early: no rest timer, ask what next (the pain check lives in Adjust)
    if (entry.feel === 'stopped') { setRest(null); setSheet('stopped'); return }
    const nowDone = working(next[slot.i]).length >= slot.sets
    if (nowDone && generated && !entry.feel && (slot.shape === 'weight-reps' || slot.shape === 'reps')) {
      setFeel(null)
      setAskFeel({ i: slot.i, k: next[slot.i].length - 1, line: `Last set · ${name} · ${entry.w ? entry.w + ' kg × ' : ''}${entry.reps}` })
    }
    if (nowDone) {
      const k = nextOpen(pos, next)
      if (k < 0) { setRest(null); setSheet('finish'); return }
      setPos(k)
    }
    const sec = restFor(slot.x, slot.shown)
    if (sec > 0) setRest({ end: Date.now() + sec * 1000, total: sec })
  }

  function primary() {
    if (complete) { moveOn(); return }
    if (slot.shape === 'hold') { startHold(); return }
    if (!target) { setSheet('adjust'); return }
    // "Done as planned": the target, ticked (SetEntry.done marks the one-tap log)
    logSet({ w: target.w, reps: target.reps, ...(target.mins ? { mins: target.mins } : {}), ...(target.assist ? { assist: true } : {}), done: true })
  }
  function startHold() {
    if (!overClip) { setSheet('hold'); return }
    setSheet(null); setRest(null); setHoldStart(Date.now()); setNow(Date.now())
  }
  const go = (d: -1 | 1) => {
    setRest(null)
    if (d === 1 && isLastSlot) { setSheet('finish'); return }
    setPos(Math.max(0, Math.min(order.length - 1, pos + d)))
  }

  /** a swap keeps what was logged for the move swapped out (as an extra), and the new move starts fresh */
  function swapTo(id: string) {
    setHoldStart(null)
    const r = swapInto(slot, id, sets, extras, shorter, exById)
    const next = { ...logged, [slot.i]: r.sets }
    setExtras(r.extras)
    setLogged(next)
    if (sets.length || r.sets.length) {
      // saved with the slot as it now is (the parent's slots update on the next render)
      saveWorkout(type, buildLogged(slots.map((s) => (s.i === slot.i ? r.slot : s)), next, r.extras), option, { quiet: true, open: true })
    }
    onSwap(slot.i, id)
  }

  // sets logged (working or warm-up sets, extras): only these make the session a workout done
  const anySets = Object.values(logged).some((l) => l.length) || extras.length > 0
  // a warm-up of a minute or more is movement too, so leaving keeps it like a logged set (Resume)
  const anything = anySets || (warmNow()?.mins ?? 0) >= 1
  const finish = (effort: Effort | null, note: string, mins: number | undefined) => {
    // nothing logged: nothing to save (an empty session would count as a day moved). Only the
    // warm-up done: its minutes are kept as movement, closed, never a workout done (warmupOnly)
    if (!anySets && (!session || warmupOnly(session))) {
      const w = warmNow()
      if (w && (w.mins >= 1 || session)) write(logged, extras, { quiet: true }, w)
      showToast('Nothing logged this time'); onClose(); return
    }
    write(logged, extras, { effort, note, ...(mins != null ? { mins } : {}), toast: `${title} saved` }, warmNow())
    onClose(); onFinished?.()
  }
  const leave = () => {
    if (anything) {
      const m = stintMins(prevMins, Date.now() - started, isToday)
      write(logged, extras, { quiet: true, open: true, ...(m != null ? { mins: m } : {}) }, warmNow())
    }
    onClose()
  }
  /** the block ended (done or skipped): it's recorded with the session's next save, or now if it ran a minute or more */
  const endWarm = (sec: number, completeW: boolean) => {
    const w = block ? { mins: completeW ? block.mins : Math.min(block.mins, Math.round(sec / 60)), of: block.mins } : undefined
    setWarm(w); setInWarm(false)
    say(`Warm-up ${completeW ? 'done' : 'over'}. ${name}.`)
    if (w && (w.mins >= 1 || session)) write(logged, extras, { quiet: true, open: true }, w)
  }

  // video: plays muted on a loop unless reduced motion is on; a clip that fails shows its poster, then the cue
  const reduced = useReducedMotion()
  const [clip, setClip] = useState<'ok' | 'poster' | 'none'>(video ? 'ok' : 'none')
  useEffect(() => { setClip(video ? 'ok' : 'none') }, [video])

  const elapsed = Math.floor((now - started) / 1000)
  const mm = `${String(Math.floor(elapsed / 60)).padStart(2, '0')}:${String(elapsed % 60).padStart(2, '0')}`
  const optional = !complete && setNo >= slot.setsLo
  const upNext = complete ? '' : `Set ${setNo + 1} of ${slot.sets}${optional ? ' (optional)' : ''}${target ? ' · ' + fmtTarget(target, slot.shape) + (slot.shape === 'hold' && slot.x?.perSide ? ' each side' : '') : ''}`
  const plain = clip === 'none'
  const holdClip = !!video?.hold && !plain
  const overClip = holdClip && slot.shape === 'hold'
  const hTarget = holdTarget(slot.rx)
  const perSide = !!slot.x?.perSide
  const h = holdStart == null ? null : holdAt((now - holdStart) / 1000, hTarget, perSide)
  // the hold's label ("Switch sides", "Good place to stop") is spoken when it changes, as the web's
  // aria-live does (accessibilityLiveRegion is Android only)
  const holdSay = h ? holdLabel(h, hTarget, perSide, video?.hold === 'move') : ''
  useEffect(() => { if (holdSay) say(holdSay) }, [holdSay]) // eslint-disable-line react-hooks/exhaustive-deps
  const findSay = finding && findW != null ? String(findW) : ''
  useEffect(() => { if (findSay) say(findSay + ' kg') }, [findSay]) // eslint-disable-line react-hooks/exhaustive-deps
  const stopHold = () => { const sec = h?.logSec ?? 0; setHoldStart(null); if (sec > 0 && slot.shape === 'hold') logSet({ w: '', reps: String(sec), sec: String(sec) }) }
  const wSlot = warmupSlot(slots.map((s) => s.shape))
  const W = { color: '#fff' }
  const dim = { color: 'rgba(255,255,255,0.85)' }
  const insets = useSafeAreaInsets()

  return (
    <Modal visible animationType="fade" onRequestClose={() => { if (askFeel) setAskFeel(null); else if (sheet) { setSheet(null); setDiscard(false) } else setSheet('leave') }} statusBarTranslucent supportedOrientations={['portrait']}>
      <StatusBar style="light" />
      <OverlaySheets.Provider value={true}>
      <View accessibilityViewIsModal accessibilityLabel={inWarm ? `${title}: warm-up` : `${title}: ${name}`} style={{ flex: 1, backgroundColor: plain && !inWarm ? '#121214' : '#000' }}>
        {inWarm && block ? (
          <WarmupPlayer block={block} after={bareName(slots[0]?.shown.n ?? '')} from={warmFrom} hold={sheet !== null} onEnd={endWarm} onLeave={() => setSheet('leave')} onProgress={onWarmProgress} />
        ) : <>
          {clip === 'ok' && video && (
            <PlayerClip key={video.src} media={video} name={name} autoPlay={!reduced} showCount={!video.hold && !rest} showPlay={reduced && !rest}
              onFail={() => setClip(video.poster ? 'poster' : 'none')} />
          )}
          {clip === 'poster' && video?.poster && <Still path={video.poster} label={`Demo still: ${name}`} onError={() => setClip('none')} />}
          {!plain && <GpShade holding={!!h} />}

          {plain && !rest && (
            <ScrollView style={{ position: 'absolute', left: 20, right: 20, top: insets.top + 96, bottom: 290 }}>
              <Text style={[font(400), { fontSize: 20, lineHeight: 28, color: 'rgba(255,255,255,0.92)' }]}>{slot.shown.cue}</Text>
            </ScrollView>
          )}

          <GpTop>
            <GpRound label="Leave the workout" onPress={() => setSheet('leave')} plain={plain}><Icon name="x" size={20} stroke={2.6} color="#fff" /></GpRound>
            <GpPill plain={plain}>{pos + 1} of {order.length}{gentle ? '' : ` · ${mm}`}</GpPill>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {clip === 'ok' && <PlayToggle />}
              <GpRound label="More: swap, do this later, skip, sound" onPress={() => setSheet('menu')} plain={plain}><Dots color="#fff" /></GpRound>
            </View>
          </GpTop>

          {rest ? (
            <GpBot label="Rest">
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <Text style={[font(500), W, { fontSize: 17 }]}>Rest</Text>
                <Text style={[font(400), dim, { fontSize: 13 }]}>{restHint(rest.total)}</Text>
              </View>
              <GpClock big={fmtClock(restLeft)} small={`of ${fmtClock(rest.total)}`} label={`${fmtClock(restLeft)} of ${fmtClock(rest.total)} rest left`} />
              <GpBar value={Math.min(1, 1 - restLeft / rest.total)} />
              <Text style={[font(400), W, { fontSize: 15 }]}>Up next: {setNo === 0 && !complete ? name + ' · ' : ''}{upNext || name}</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <GpSec title="+15 s" onPress={() => setRest({ end: rest.end + 15000, total: rest.total + 15 })} />
                <GpMain title="Skip rest" onPress={() => setRest(null)} />
              </View>
            </GpBot>
          ) : h ? (
            <GpBot label={video?.hold === 'move' ? 'Timer' : 'Hold timer'}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                <Text accessibilityLiveRegion="polite" style={[font(600), W, { fontSize: 17 }]}>{holdLabel(h, hTarget, perSide, video?.hold === 'move')}</Text>
                <Text style={[font(400), dim, { fontSize: 13, flexShrink: 1, textAlign: 'right' }]}>{name} · set {setNo + 1} of {slot.sets}</Text>
              </View>
              <GpClock big={fmtClock(h.sec)} label={`${h.sec} seconds${perSide && hTarget ? (h.side === 1 ? ', first side' : ', second side') : ''}`}
                small={hTarget ? `of ${hTarget.lo === hTarget.hi ? fmtClock(hTarget.hi) : `${fmtClock(hTarget.lo)}–${fmtClock(hTarget.hi)}`}${perSide && h.side === 2 ? ' · second side' : ''}` : undefined} />
              {hTarget && <GpBar value={Math.min(1, h.sec / (perSide ? hTarget.lo : hTarget.hi))} />}
              <Text style={[font(400), W, { fontSize: 15 }]}>{h.switchNow ? 'Swap to the other side. The timer has started again.' : 'Breathe steadily. Stop sooner if your form slips or anything hurts.'}</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <GpSec title="Cancel" onPress={() => setHoldStart(null)} />
                <GpMain title="Stop and save" onPress={stopHold} />
              </View>
              <Text style={[font(400), { fontSize: 13, lineHeight: 18, color: 'rgba(255,255,255,0.8)' }]}>{RED_FLAG}</Text>
            </GpBot>
          ) : finding && calib ? (
            <GpBot label={`Find your weight: ${name}`}>
              <View>
                <Text style={[font(600), { fontSize: 13, color: BRAND_COLOR }]}>{FIRST_SESSION.findK(calib.n + 1)}</Text>
                <Text accessibilityRole="header" style={[font(600), W, { fontSize: 28, lineHeight: 32, letterSpacing: -0.56 }]}>{name}</Text>
                <Text style={[font(400), dim, { fontSize: 15, lineHeight: 21, marginTop: 4 }]}>{FIRST_SESSION.find}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(255,255,255,0.16)', borderRadius: 18, paddingVertical: 8, paddingHorizontal: 12 }}>
                <StepBtn label="Lighter" sign="−" onPress={() => setFindW(Math.max(0, (findW ?? 0) - ((findW ?? 0) > 10 ? 2.5 : 1)))} />
                <Text accessibilityLiveRegion="polite" style={[font(400), num, W, { fontSize: 34, fontWeight: '300' }]}>{findW == null ? '–' : findW}<Text style={[font(400), { fontSize: 15, color: 'rgba(255,255,255,0.8)' }]}> kg</Text></Text>
                <StepBtn label="Heavier" sign="+" onPress={() => setFindW((findW ?? 0) + ((findW ?? 0) >= 10 ? 2.5 : 1))} />
              </View>
              <Text style={[font(400), num, dim, { fontSize: 13, textAlign: 'center' }]}>Aim for {calib.t.reps?.hi ?? 10} reps with {calib.t.rir.lo} or {calib.t.rir.hi} to spare</Text>
              <View style={{ flexDirection: 'row' }}><GpMain title="Start set 1" disabled={findW == null} onPress={() => setFound({ ...found, [slot.i]: String(findW) })} /></View>
              <GpTextBtn regular title={FIRST_SESSION.know} onPress={() => { setFound({ ...found, [slot.i]: '' }); setSheet('adjust') }} />
            </GpBot>
          ) : (
            <GpBot label={name}>
              <View>
                {holdClip && slot.shape === 'hold' && <Text style={[font(500), dim, { fontSize: 13, marginBottom: 4 }]}>{video?.hold === 'move' ? 'A timed move' : perSide ? 'A hold · one side shown, do both' : 'A hold'}</Text>}
                <Text accessibilityRole="header" style={[font(600), W, { fontSize: 28, lineHeight: 32, letterSpacing: -0.56 }]}>{name}</Text>
                {!plain && <Text numberOfLines={2} style={[font(400), dim, { fontSize: 15, lineHeight: 21, marginTop: 6 }]}>{firstLine(slot.shown.cue)}</Text>}
                {easierLine && <Text numberOfLines={2} style={[font(400), num, dim, { fontSize: 13, lineHeight: 18, marginTop: 4 }]}>{easierLine}</Text>}
                {slot.swapped && <Text numberOfLines={2} style={[font(400), dim, { fontSize: 13, lineHeight: 18, marginTop: 4 }]}>In place of {bareName(slot.planned.n)}, today only.</Text>}
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={{ flex: 1, flexDirection: 'row', gap: 4 }}>
                  {Array.from({ length: slot.sets }, (_, k) => {
                    const on = k < setNo, opt = k >= slot.setsLo
                    return <View key={k} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: on ? BRAND_COLOR : opt ? 'transparent' : 'rgba(255,255,255,0.3)', borderWidth: opt && !on ? 1 : 0, borderColor: 'rgba(255,255,255,0.45)' }} />
                  })}
                </View>
                <Text numberOfLines={1} style={[font(400), num, dim, { fontSize: 13, flexShrink: 1 }]}>{complete ? `All ${slot.sets} ${slot.sets === 1 ? 'set' : 'sets'} logged` : upNext}</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <Arrow label="Previous exercise" icon="chevL" disabled={pos === 0} onPress={() => go(-1)} />
                <GpMain onPress={primary}
                  title={complete ? (nextOpen(pos) < 0 ? 'Finish' : 'Next exercise') : slot.shape === 'hold' ? (holdClip && video?.hold === 'move' ? 'Start timer' : 'Start hold') : target ? 'Done as planned' : 'Log set'} />
                <Arrow label={isLastSlot ? 'Finish' : 'Next exercise'} icon="chevR" onPress={() => go(1)} />
              </View>
              {!complete && slot.shape !== 'check' && (
                <GpTextBtn title={slot.shape === 'hold' ? 'Enter seconds instead' : slot.shape === 'duration' ? 'Adjust minutes' : 'Adjust weight or reps'} onPress={() => setSheet('adjust')} />
              )}
            </GpBot>
          )}
        </>}

        {(sheet === 'adjust' || sheet === 'warmup') && (
          <AdjustSheet key={slot.i + '-' + setNo + sheet} name={name} x={slot.x} shape={slot.shape} rx={slot.rx} setNo={setNo}
            target={sheet === 'warmup' ? null : target} first={!target && sheet !== 'warmup'} warmup={sheet === 'warmup'}
            allowWarmup={slot.shape === 'weight-reps'} stepUp={!shorter && setNo === 0 && readyToStepUp(last, slot.fullRx)}
            onLog={logSet} onGentler={slot.x ? () => setSheet('swap') : undefined} onTimer={startHold} onClose={() => setSheet(null)} />
        )}
        {sheet === 'hold' && (
          <HoldTimer name={slot.shown.n} rx={slot.rx} perSide={slot.x?.perSide}
            onDone={(sec) => logSet({ w: '', reps: String(sec), sec: String(sec) })} onClose={() => setSheet((s) => (s === 'hold' ? null : s))} />
        )}
        {sheet === 'swap' && slot.x && (
          <SwapSheet current={slot.x} planned={slot.swapped ? exById(slot.planned.id) : undefined} shorter={shorter}
            loggedSets={done.length} onPick={swapTo} onClose={() => setSheet(null)} />
        )}
        {sheet === 'stopped' && (
          <Sheet title="Stopped early" onClose={() => setSheet(null)} left={null}>
            <Sub style={{ paddingHorizontal: 4, paddingBottom: 14 }}>That's fine. If something hurt, leave this one for today.</Sub>
            <Stack style={{ marginTop: 0 }}>
              <Button title="Move to the next exercise" onPress={moveOn} />
              {slot.x && <Button title="Try a gentler option" kind="gray" onPress={() => setSheet('swap')} />}
              <Button title="Carry on with this one" kind="gray" onPress={() => setSheet(null)} />
            </Stack>
          </Sheet>
        )}
        {sheet === 'menu' && (
          <Sheet title={name} onClose={() => setSheet(null)} left={null} right={<NavBtn bold title="Done" onPress={() => setSheet(null)} />}>
            <List>
              {slot.x && <Li onPress={() => setSheet('swap')}><LiText t="Swap exercise" s="Today only" /></Li>}
              {!isLastSlot && <Li onPress={() => { setOrder(later(order, pos)); setRest(null); setSheet(null) }}><LiText t="Do this later" s="Moves it to the end of today's workout" /></Li>}
              <Li onPress={() => { setSheet(null); go(1) }}><LiText t="Skip this exercise" s={'It shows as "Not today"'} /></Li>
              {slot.shape === 'weight-reps' && <Li onPress={() => setSheet('warmup')}><LiText wrap t="Log a warm-up set" s={slot.i === wSlot ? warmupCopy(name, block?.mins) : "Doesn't count towards your targets"} sStyle={{ lineHeight: 18 }} /></Li>}
              {!video && <Li onPress={() => { WebBrowser.openBrowserAsync(howToLink(slot.shown.n)).catch(() => {}) }}><LiText t="Watch how to do it" s="Opens a video search" /></Li>}
              <Li><LiText t="Sound" s="A chime when rest ends" />
                <Toggle on={sound} label="Sound" onChange={() => { const v = !sound; setSound(v); try { localStorage.setItem(SOUND_KEY, v ? '1' : '0') } catch { /* blocked */ } }} /></Li>
            </List>
            <List><Li onPress={() => setSheet('finish')}><Text style={[font(500), { fontSize: 16, color: tk.tint }]}>Finish now</Text></Li></List>
          </Sheet>
        )}
        {sheet === 'leave' && (
          <Sheet title="Leave the workout?" onClose={() => { setSheet(null); setDiscard(false) }} left={null}>
            <Foot style={{ paddingTop: 0, paddingHorizontal: 4, paddingBottom: 12 }}>Everything you've logged is saved. You can pick it up again from Train.</Foot>
            <Stack style={{ marginTop: 0 }}>
              <Button title="Keep going" onPress={() => setSheet(null)} />
              <Button title="Finish now" kind="gray" onPress={() => setSheet('finish')} />
              <Button title="Leave for now" kind="gray" onPress={leave} />
              {session && (discard
                ? <Button title="Yes, discard this session" kind="danger" onPress={() => {
                    const kept = session, day = cur
                    removeSession(session.id)
                    showToast(`${title} discarded`, { label: 'Undo', run: () => restoreSession(day, kept) })
                    onClose()
                  }} />
                : <Button title="Discard this session" kind="danger" onPress={() => setDiscard(true)} />)}
            </Stack>
          </Sheet>
        )}
        {askFeel && (
          <BareSheet label={FIRST_SESSION.feelT} onClose={() => setAskFeel(null)}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text accessibilityRole="header" style={[font(600), { fontSize: 22, color: tk.label }]}>{FIRST_SESSION.feelT}</Text>
              <NavBtn title="Skip" onPress={() => setAskFeel(null)} />
            </View>
            <Text style={[font(400), num, { fontSize: 15, color: tk.label2, marginTop: 2, marginBottom: 12 }]}>{askFeel.line}</Text>
            <View accessibilityRole="radiogroup" accessibilityLabel={FIRST_SESSION.feelT} style={{ gap: 6 }}>
              {FIRST_SESSION.feels.map(([k, label]) => (
                <Pressable key={k} accessibilityRole="radio" accessibilityState={{ checked: feel === k }} onPress={() => setFeel(k)}
                  style={{ minHeight: 48, borderRadius: 14, paddingHorizontal: 14, justifyContent: 'center', backgroundColor: feel === k ? tk.btn : tk.elev }}>
                  <Text style={[font(400), { fontSize: 15, color: feel === k ? tk.btnInk : tk.label }]}>{label}</Text>
                </Pressable>
              ))}
            </View>
            <Foot style={{ paddingTop: 12, paddingHorizontal: 4, paddingBottom: 14 }}>{FIRST_SESSION.feelNote}</Foot>
            <Button title="Done" disabled={!feel} onPress={() => {
              if (feel) {
                const list = [...(logged[askFeel.i] || [])]
                if (list[askFeel.k]) list[askFeel.k] = { ...list[askFeel.k], feel }
                const next = { ...logged, [askFeel.i]: list }
                setLogged(next); save(next)
              }
              setAskFeel(null)
            }} />
          </BareSheet>
        )}
        {/* the last exercise's "How was that set?" comes first; the finish sheet follows it */}
        {sheet === 'finish' && !askFeel && (
          <FinishSheet title={title} gentle={gentle} mins={stintMins(prevMins, now - started, isToday)}
            rows={slots.map((s) => { const line = setsLine(logged[s.i], s.shape); return { name: bareName(s.swapped && s.x ? s.x.n : s.planned.n), line, none: line === 'Not today' } })}
            effort0={session?.effort} note0={session?.note} onFinish={finish} onBack={() => setSheet(null)} />
        )}
      </View>
      </OverlaySheets.Provider>
    </Modal>
  )
}

/* ---------------- the clip and its controls ---------------- */

/** The play/pause button in the top row talks to the clip below it through this tiny store. */
const clipCtl: { toggle?: () => void; playing: boolean; listeners: Set<() => void> } = { playing: false, listeners: new Set() }
function PlayToggle() {
  const [, force] = useState(0)
  useEffect(() => { const f = () => force((n) => n + 1); clipCtl.listeners.add(f); return () => { clipCtl.listeners.delete(f) } }, [])
  return (
    <GpRound label={clipCtl.playing ? 'Pause the demo' : 'Play the demo'} onPress={() => clipCtl.toggle?.()}>
      <Icon name={clipCtl.playing ? 'pause' : 'play'} size={20} stroke={2.6} color="#fff" />
    </GpRound>
  )
}

function PlayerClip({ media, name, autoPlay, showCount, showPlay, onFail }: { media: ExerciseMedia; name: string; autoPlay: boolean; showCount: boolean; showPlay: boolean; onFail: () => void }) {
  const { player, playing, failed, toggle } = useClip(media.src, autoPlay)
  useEffect(() => { if (failed) onFail() }, [failed, onFail])
  useEffect(() => { clipCtl.toggle = toggle; clipCtl.playing = playing; clipCtl.listeners.forEach((f) => f()) }, [toggle, playing])
  useEffect(() => () => { clipCtl.toggle = undefined; clipCtl.playing = false }, [])
  return (
    <>
      <Pressable accessibilityLabel={`Demo: ${name}, on a loop`} onPress={toggle} style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}>
        <ClipView player={player} poster={media.poster} label={`Demo: ${name}, on a loop`} />
      </Pressable>
      {showCount && <TempoCount player={player} media={media} playing={playing} />}
      {showPlay && !playing && (
        <View pointerEvents="box-none" style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center' }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Play the demo" onPress={toggle}
            style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', paddingLeft: 4 }}>
            <Icon name="play" size={32} color="#fff" fill />
          </Pressable>
        </View>
      )}
    </>
  )
}

/** `.gp-arrow`: 56 px round previous / next */
function Arrow({ label, icon, onPress, disabled }: { label: string; icon: 'chevL' | 'chevR'; onPress: () => void; disabled?: boolean }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} onPress={onPress}
      style={({ pressed }) => ({ width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.16)', alignItems: 'center', justifyContent: 'center', opacity: disabled ? 0.35 : pressed ? 0.75 : 1 })}>
      <Icon name={icon} size={20} stroke={2.4} color="#fff" />
    </Pressable>
  )
}
/** `.gp-step` buttons in Find your weight */
function StepBtn({ label, sign, onPress }: { label: string; sign: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
      style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.75 : 1 })}>
      <Text style={[font(400), { fontSize: 24, lineHeight: 28, color: '#fff' }]}>{sign}</Text>
    </Pressable>
  )
}
