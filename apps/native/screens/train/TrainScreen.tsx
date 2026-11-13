/**
 * Train: what I'm doing today (web: src/screens/TrainScreen.tsx). The day's planned workouts with
 * Start, a catch-up offer, "Add something", the lighter options (board B3's hard-day choices with
 * the wellbeing flag) and what's done. The day model is the web's own (src/screens/train/
 * trainModel.ts), so every row, version, swap and note is computed by the same code.
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { Pressable, ScrollView, Text, View, type ScrollViewInstance } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useStore, TRAIN_LOG_WALK } from '@/store/store'
import { quietNumbers } from '@/data/consent'
import { fmtDate, shiftDay } from '@/core/domain/date'
import { easyUntil } from '@/core/domain/training'
import { showLoadNote } from '@/core/domain/load'
import { plannedKeys } from '@/core/domain/plans'
import { keyTitle, templateFor, type WorkoutKey } from '@/core/domain/routines'
import { WELLBEING_ENABLED } from '@/data/wellbeingFlag'
import { HARD_DAY_COPY } from '@/screens/train/hardDay'
import { CHOICES, type Choice } from '@/copy/train'
import { NO_TRAIN_UI, sessSub, trainDay, type TrainUi } from '@/screens/train/trainModel'
import { Preview } from './Preview'
import { GuidedPlayer } from './GuidedPlayer'
import { ManualLog } from './ManualLog'
import { LibrarySheet } from './LibrarySheet'
import { AddSomethingSheet, LogSessionSheet, SupportSheet } from './sheets'
import { Thumb, usePhBg } from './media'
import { MoveStrip, TrainHeader } from './strip'
import { Button, Chevron, Chip, Chips, Foot, Icon, LinkBtn, Li, List, TrainNav, XBtn, font, num, useTokens } from './ui'

const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven']

export function TrainScreen({ onProfile }: { onProfile?: () => void } = {}) {
  return <TrainNav.Provider value={{ onProfile }}><Train /></TrainNav.Provider>
}

function Train() {
  const t = useTokens()
  const insets = useSafeAreaInsets()
  const scroll = useRef<ScrollViewInstance>(null)
  const cur = useStore((s) => s.cur)
  const data = useStore((s) => s.data)
  const setPrefs = useStore((s) => s.setPrefs)
  const showToast = useStore((s) => s.showToast)
  const removeSession = useStore((s) => s.removeSession)
  const trainOpen = useStore((s) => s.trainOpen)
  const openPlan = useStore((s) => s.openPlan)
  const clearOpen = useStore((s) => s.clearOpen)

  const [addOpen, setAddOpen] = useState(false)
  const [logOpen, setLogOpen] = useState(false)
  // Get outside's Start (B13) opens "Log a session" set to an Easy walk
  const [logWalk, setLogWalk] = useState(false)
  const [libOpen, setLibOpen] = useState(false)
  const [supportOpen, setSupportOpen] = useState(false)
  // two taps to remove, so a mis-tap never deletes logged sets
  const [confirmId, setConfirmId] = useState<string | null>(null)
  const [open, setOpen] = useState<WorkoutKey | null>(null)
  const [mode, setMode] = useState<'preview' | 'manual'>('preview')
  const [playing, setPlaying] = useState(false)
  const [ui, setUi] = useState<TrainUi>(NO_TRAIN_UI)
  const setPicked = (c: Choice | null, k: WorkoutKey | null = open) => setUi((u) => ({ ...u, pick0: c && k ? { c, k } : null }))
  const gentle = quietNumbers(data)
  const [lighterOpen, setLighterOpen] = useState(false)
  const phBg = usePhBg()

  const m = useMemo(() => trainDay(data, cur, ui), [data, cur, ui])
  const { sessions, routines, planned, restDay, planNow, planPos, isToday, dayName, offer, choiceFor, planShortKind } = m

  useEffect(() => { setOpen(null); setUi(NO_TRAIN_UI); setConfirmId(null); setLighterOpen(false); setPlaying(false) }, [cur])
  // Plan's "Do this today" hands a workout over; Get outside's Start (B13) hands over an Easy walk to log
  useEffect(() => {
    if (!trainOpen) return
    if (trainOpen === TRAIN_LOG_WALK) { setLogWalk(true); setLogOpen(true) } else openWorkout(trainOpen)
    clearOpen()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trainOpen])

  const top = () => scroll.current?.scrollTo({ y: 0, animated: false })
  function setSwap(k: WorkoutKey, i: number, id: string) {
    const n = m.withSwap(k, i, id)
    setUi((u) => ({ ...u, ...n }))
  }
  function openWorkout(k: WorkoutKey, c?: Choice) {
    if (!templateFor(k, routines)) return // an unknown workout (from a newer install or a bad hand-off): stay on the list
    if (c) setPicked(c, k)
    setMode('preview'); setOpen(k)
  }
  const closeWorkout = () => { setOpen(null); setPlaying(false); setMode('preview'); top() }

  // ---------- a workout is open: preview, the manual form, or the player ----------
  if (open) {
    const v = m.openView(open)
    const { choice, slots, swaps, option, kind } = v
    if (mode === 'manual') {
      return <ManualLog type={open} slots={slots} option={option} swaps={swaps} onSwap={(i, id) => setSwap(open, i, id)} onBack={() => setMode('preview')} easier={kind === 'easier'} />
    }
    return (
      <>
        <Preview type={open} choice={choice} onChoice={(c) => setPicked(c, open)} slots={slots} swaps={swaps} onSwap={(i, id) => setSwap(open, i, id)}
          session={v.session} note={v.shorterNote} dayName={dayName} isToday={isToday}
          onStart={() => setPlaying(true)} onManual={() => setMode('manual')} onBack={closeWorkout}
          onEditPlan={() => openPlan(open)} generated={v.generated}
          swapId={v.swapDay?.swap} shorterKind={kind} noShorter={v.noShorter} roughNote={v.roughNote} />
        {playing && <GuidedPlayer type={open} slots={slots} option={option} generated={v.generated} shorterKind={kind} onSwap={(i, id) => setSwap(open, i, id)} onClose={() => { setPlaying(false); setPicked(null) }} onFinished={closeWorkout} />}
      </>
    )
  }

  // ---------- the today list ----------
  const { rows, first, allDone, showPick, pick, pickUp, lighterShown, lighterUp, weekCount, back } = m
  const card = { backgroundColor: t.card, borderRadius: t.radius, paddingVertical: 14, paddingHorizontal: 16, marginBottom: 10 }
  const lighterCard = { ...card, borderRadius: 20, marginBottom: 18 }
  const foldRow = (s: string) => (
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: lighterOpen }} onPress={() => setLighterOpen(!lighterOpen)}
      style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
      <Text style={[font(500), { fontSize: 16, color: t.label }]}>Lighter options</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 }}>
        <Text numberOfLines={1} style={[font(400), { fontSize: 14, color: t.label2, flexShrink: 1 }]}>{s}</Text>
        <Chevron rotate={lighterOpen ? 270 : 90} />
      </View>
    </Pressable>
  )

  const lighter = WELLBEING_ENABLED ? hardDayCard() : (
    <View style={lighterCard}>
      {lighterUp
        ? <Text style={[font(600), { fontSize: 17, lineHeight: 22, color: t.label }]}>{m.lighterHeading}</Text>
        : foldRow('Shorter, mobility, walk')}
      {(lighterUp || lighterOpen) && (
        <Chips label="Today's session" style={{ marginTop: 10 }}>
          {CHOICES.map(([k, label]) => <Chip key={k} title={label} on={!!first && choiceFor(first) === k} onPress={() => { if (first) openWorkout(first, k) }} />)}
        </Chips>
      )}
    </View>
  )

  /** Board B3: three equal options for the day's first workout, nothing selected, each opening the preview. */
  function hardDayCard() {
    const hd = m.hardDay()
    const k = hd.k
    const up = lighterUp || lighterOpen
    const ft = { paddingTop: 12, paddingHorizontal: 0 }
    return (
      <View style={lighterCard}>
        {lighterUp
          ? <Text style={[font(400), { fontSize: 15, lineHeight: 21, color: t.label }]}>{hd.heading}</Text>
          : foldRow(HARD_DAY_COPY.collapsed)}
        {up && k && (
          <>
            <View accessibilityLabel="Today's session" style={{ gap: 8, marginTop: 12 }}>
              {hd.tiles.map((x) => (
                <Pressable key={x.c} accessibilityRole="button" onPress={() => openWorkout(k, x.c)}
                  style={({ pressed }) => ({ backgroundColor: t.bg, borderRadius: 18, paddingVertical: 12, paddingHorizontal: 14, minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12, opacity: pressed ? 0.7 : 1 })}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: t.move }} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[font(500), { fontSize: 12, color: t.label2 }]}>{x.k}</Text>
                    <Text style={[font(600), { fontSize: 16, lineHeight: 19, marginTop: 2, color: t.label }]}>{x.t}</Text>
                    <Text style={[font(400), num, { fontSize: 12, color: t.label2, marginTop: 4 }]}>{x.d}</Text>
                  </View>
                  <Chevron />
                </Pressable>
              ))}
            </View>
            <Foot style={ft}>{hd.effort}</Foot>
            {hd.roughNote && <Foot style={{ ...ft, paddingTop: 8 }}>{HARD_DAY_COPY.roughNote}</Foot>}
            {offer && <Foot style={{ ...ft, paddingTop: 8 }}>{HARD_DAY_COPY.rest}</Foot>}
          </>
        )}
      </View>
    )
  }

  const trow = { paddingVertical: 12, paddingHorizontal: 14, minHeight: 76 }
  const doneChk = (size: number) => (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: t.moveFill, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name="check" size={20} stroke={2.6} color={t.label} />
    </View>
  )
  const ph = (icon: 'leaf' | 'dumbbell') => (
    <View aria-hidden style={{ width: 52, height: 64, borderRadius: 12, backgroundColor: phBg, alignItems: 'center', justifyContent: 'center' }}><Icon name={icon} size={20} color={t.label2} /></View>
  )
  const tb = [font(600), { fontSize: 17, color: t.label }]
  const ts = [font(400), { fontSize: 13, color: t.label2, marginTop: 2 }]

  return (
    <ScrollView ref={scroll} style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}>
      <TrainHeader title="Train" top={insets.top} />
      <MoveStrip />

      {isToday && showLoadNote(data, cur) && (
        <View style={card}>
          <Text style={[font(600), { fontSize: 17, lineHeight: 22, marginBottom: 10, color: t.label }]}>You've trained a lot this week. Rest is when your body adapts, so a lighter day can help.</Text>
          <Chips>
            <Chip button title="Thanks" onPress={() => setPrefs({ loadNoteSeen: cur })} />
            {plannedKeys(data, shiftDay(cur, 1)).length > 0 && (
              <Chip button title="Make tomorrow lighter" onPress={() => {
                const tmr = shiftDay(cur, 1)
                const p = data.profile
                // an easier week already covering tomorrow stays as it is, not cut to one day
                if (p.easyUntil && p.easyUntil >= tmr && (p.easyFrom || p.welcomeAsked || '') <= tmr) setPrefs({ loadNoteSeen: cur })
                else setPrefs({ loadNoteSeen: cur, easyFrom: tmr, easyUntil: tmr })
                showToast('Tomorrow will start with the shorter version selected.')
              }} />
            )}
          </Chips>
          <View style={{ alignSelf: 'flex-start', marginTop: 6, marginLeft: -4 }}><LinkBtn muted title="Finding it hard to ease off?" onPress={() => setSupportOpen(true)} /></View>
        </View>
      )}

      {back && (
        <View style={card}>
          <Text style={[font(600), { fontSize: 17, lineHeight: 22, marginBottom: 10, color: t.label }]}>Welcome back. Want an easier first week?</Text>
          <Foot style={{ paddingTop: 0, paddingHorizontal: 0, paddingBottom: 10 }}>Breaks happen, and coming back is what counts. Shorter sessions for a week can make it easier to settle back in.</Foot>
          <Chips>
            <Chip button title="Yes, go easier" onPress={() => setPrefs({ welcomeAsked: cur, easyFrom: cur, easyUntil: easyUntil(cur) })} />
            <Chip button title="No thanks" onPress={() => setPrefs({ welcomeAsked: cur })} />
          </Chips>
        </View>
      )}

      {lighterUp && lighter}

      <View style={{ gap: 8, marginBottom: 18 }}>
        {planNow && planPos && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4, paddingBottom: 0 }}>
            {/* the plan's picture (web: planArt) arrives with N8, which owns the plan art; the dot is the web's own fallback */}
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: t.tint }} />
            <Text style={[font(400), { flex: 1, fontSize: 13, color: t.label2 }]}>
              <Text style={[font(600), { color: t.label }]}>{planNow.name}</Text> · {planPos.maintenanceWeek != null ? `${planPos.phase.full ? 'Carrying on' : 'Maintenance'}, week ${planPos.maintenanceWeek}` : planPos.ended ? `${planPos.total} weeks, done` : `Week ${planPos.week} of ${planPos.total} · ${planPos.phase.name}`}
            </Text>
          </View>
        )}
        <Text accessibilityRole="header" style={[font(600), { paddingHorizontal: 4, fontSize: 22, letterSpacing: -0.22, color: t.label }]}>{isToday ? 'Today' : dayName}</Text>
        <List radius={20} inset={0} style={{ marginBottom: 0 }}>
          {rows.filter((r) => r.show).map((r) => (
            <View key={r.k}>
              <Li onPress={() => openWorkout(r.k)} label={keyTitle(r.k, routines)} style={trow}>
                <Thumb video={r.video} big />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text numberOfLines={1} style={tb}>{keyTitle(r.k, routines)}</Text>
                  <Text numberOfLines={1} style={[...ts, num]}>{r.inProgress ? `In progress · ${r.done} of ${r.sets} sets` : r.sub}</Text>
                </View>
                <Button sm title={r.inProgress ? 'Resume' : 'Start'} onPress={() => openWorkout(r.k)} style={{ paddingHorizontal: 18, alignSelf: 'center' }} />
              </Li>
              {/* a lighter week or maintenance: a quiet way back to the full workout, never a nudge on a
                  low check-in day or in gentle mode, and after maintenance's first week only the link */}
              {r.planShort && !r.inProgress && (
                <View style={{ borderTopWidth: 1, borderTopColor: t.sep, paddingTop: 10, paddingBottom: 12, paddingHorizontal: 14 }}>
                  <Text style={[font(400), { fontSize: 13, lineHeight: 18, color: t.label2 }]}>
                    {planPos?.maintenanceWeek != null
                      ? <>{planPos.maintenanceWeek === 1 ? 'Maintenance: fewer sets, the same weights as before. ' : ''}{!offer && !gentle && <LinkBtn inl size={13} style={font(500)} title="Full workout" onPress={() => openWorkout(r.k, 'planned')} />}</>
                      : <>{planShortKind === 'ease' ? 'Easing in: shorter sessions while you find your weights.' : 'A lighter week, to recover before the next stretch.'}{!offer && !gentle && <> <LinkBtn inl size={13} style={font(500)} title="The full workout" onPress={() => openWorkout(r.k, 'planned')} /> is here if you'd like it.</>}</>}
                  </Text>
                </View>
              )}
            </View>
          ))}
          {restDay && (
            <Li style={trow}>
              {ph('leaf')}
              <View style={{ flex: 1 }}><Text style={tb}>Rest day</Text><Text style={ts}>Recovery counts too. A gentle walk is fine.</Text></View>
            </Li>
          )}
          {allDone && !showPick && (
            <Li style={trow}>
              {doneChk(30)}
              <View style={{ flex: 1 }}><Text style={tb}>All done for today</Text><Text style={ts}>{rows.length === 1 ? `${keyTitle(rows[0].k, routines)} is` : 'Your workouts are'} in Done today</Text></View>
            </Li>
          )}
          {showPick && pickUp && (
            <Li style={trow}>
              {ph('dumbbell')}
              <View style={{ flex: 1 }}>
                <Text style={[font(400), { fontSize: 16, color: t.label2 }]}>{keyTitle(pickUp, routines)}, from {fmtDate(pick!.d).dow}</Text>
                <Text style={ts}>If you'd like to pick it up</Text>
              </View>
              <LinkBtn title="Add" onPress={() => openWorkout(pickUp)} />
              <XBtn label="Not this time" onPress={() => setPrefs({ pickUpDismissed: pick!.d })} />
            </Li>
          )}
          <Li onPress={() => setAddOpen(true)} style={{ padding: 14, gap: 12 }}>
            <Icon name="plus" size={20} color={t.tint} />
            <Text style={[font(500), { fontSize: 16, color: t.tint }]}>Add something</Text>
          </Li>
        </List>
      </View>

      {lighterShown && !lighterUp && lighter}

      {weekCount > 0 && <Foot style={{ paddingTop: 0, paddingHorizontal: 4, paddingBottom: 10 }}>You moved on {gentle ? WORDS[weekCount] : weekCount} {weekCount === 1 ? 'day' : 'days'} this week</Foot>}

      <View style={{ gap: 8, marginBottom: 18 }}>
        <Text accessibilityRole="header" style={[font(500), { paddingHorizontal: 4, fontSize: 13, color: t.label2 }]}>{isToday ? 'Done today' : `Done on ${dayName}`}</Text>
        {sessions.length ? (
          <List style={{ marginBottom: 0 }}>
            {sessions.map((x) => {
              const r = m.routineOf(x)
              const body = (
                <>
                  {doneChk(26)}
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text numberOfLines={1} style={[font(400), { fontSize: 17, color: t.label }]}>{x.title.split(' · ')[0]}</Text>
                    <Text numberOfLines={1} style={ts}>{sessSub(x)}</Text>
                  </View>
                </>
              )
              return (
                <View key={x.id} style={{ flexDirection: 'row', alignItems: 'center', paddingRight: 16 }}>
                  {r
                    ? <Pressable accessibilityRole="button" accessibilityLabel={`Open ${x.title}`} onPress={() => openWorkout(r)} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingLeft: 16, minHeight: 44 }}>{body}</Pressable>
                    : <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10, paddingLeft: 16, minHeight: 44 }}>{body}</View>}
                  {confirmId === x.id
                    ? <LinkBtn title="Remove" color={t.red} label={`Remove ${x.title}`} onPress={() => { removeSession(x.id); setConfirmId(null) }} />
                    : <XBtn label={`Remove ${x.title}`} onPress={() => setConfirmId(x.id)} />}
                </View>
              )
            })}
          </List>
        ) : (
          <View style={{ borderWidth: 1, borderStyle: 'dashed', borderColor: t.dash, borderRadius: 20, padding: 16 }}>
            <Text style={[font(400), { fontSize: 14, color: t.label2 }]}>{isToday ? 'Nothing yet. Anything you do today shows here.' : `Nothing logged on ${dayName}.`}</Text>
          </View>
        )}
      </View>

      {addOpen && <AddSomethingSheet planned={planned} onClose={() => setAddOpen(false)}
        onLog={() => { setAddOpen(false); setLogOpen(true) }}
        onWorkout={(w) => { setAddOpen(false); openWorkout(w) }}
        onLibrary={() => { setAddOpen(false); setLibOpen(true) }} />}
      {logOpen && <LogSessionSheet preset={logWalk ? { modality: 'cardio', cardioKey: 'Easy walk' } : undefined} onClose={() => { setLogOpen(false); setLogWalk(false) }} />}
      {libOpen && <LibrarySheet onClose={() => setLibOpen(false)} />}
      {supportOpen && <SupportSheet onClose={() => setSupportOpen(false)} />}
    </ScrollView>
  )
}
