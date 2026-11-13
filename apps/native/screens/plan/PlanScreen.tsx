/**
 * Native port of src/screens/PlanScreen.tsx: the Plan tab. The week (a repeating schedule, or the
 * running plan's week), the training plan card and its flows (library, preview, builder, details,
 * end), the workouts and exercise library tiles, if–then plans (and Mind plans), and the guides.
 * Sub-views replace the tab's content as they do on the web, so Back returns to the same place.
 */
import { useEffect, useState } from 'react'
import { Image, Pressable, Text, View } from 'react-native'
import { useStore } from '@/store/store'
import type { IfThenPlan, WorkoutType } from '@/core/types'
import { SESSIONS, WORKOUTS, LIFTS, firstVideo } from '@/core/data/workouts'
import { EXERCISES } from '@/core/data/exercises'
import { WEEK_ORDER, plannedOn, shortTitle, weekWarnings } from '@/core/domain/week'
import { DAY_NAME, shiftDay, shortDateOf, todayStr } from '@/core/domain/date'
import { activePlan, bestFit, catalogue, fitOf, isEaseIn, endDate, phaseRows, phasesOf, planWeekNotes, positionOn, PLAN_TEMPLATES, templateById, timeline, totalWeeks, upcomingPlan, weekSource, type CatalogueEntry } from '@/core/domain/plans'
import { aboutLine, routineEstMins, builtinSlots, canBuild, isBuiltinKey, isTaliKey, keyVideo, routineFor, slotsOf as routineSlots, type WorkoutKey } from '@/core/domain/routines'
import { MODALITY_LABEL } from '@/core/data/modalities'
import { WELLBEING_ENABLED } from '@/data/wellbeingFlag'
import { ONBOARDING_ENABLED } from '@/data/onboardingFlag'
import { builtPhases, MIND_PLAN, PLAN_OUTCOME, planGroups, whenLine, workoutSub } from './planShared'
import { planArt, PlanTile, Timeline, WeekRow, WeekRows } from './PlanParts'
import { MaintenanceCard, PlanLibrary, PlanPreview } from './PlanLibrary'
import { PlanBuilder } from './PlanBuilder'
import { PlanDetails, PlanEnd } from './PlanDetails'
import { PlanDayView, PlanWeekView } from './PlanDayViews'
import { DayView, WorkoutView } from './PlanViews'
import { PlanEditSheet } from './PlanSheets'
import { LibrarySheet, RoutineBuilderSheet, Thumb, type BuilderStart } from './trainBridge'
import { ActRow, Card, Chevron, Chip, Foot, GrpH, Icon, Lbl, Li, List, M, NavBtn, PageHeader, PlanNote, Screen, Sheet, Sub, ToastHost, font, num, useTokens, type PIcon } from './ui'

type Guide = 'split' | 'basics'
const GUIDES: { id: Guide; title: string; icon: PIcon; color: 'activity' | 'mind' }[] = [
  { id: 'split', title: 'How the split works', icon: 'dumbbell', color: 'activity' },
  { id: 'basics', title: 'The honest basics', icon: 'info', color: 'mind' },
]

/** The Plan tab, for the lead to mount in app/(tabs)/plan.tsx. */
export function PlanTab() {
  return (
    <View style={{ flex: 1 }}>
      <PlanScreen />
      <ToastHost />
    </View>
  )
}

export function PlanScreen() {
  const t = useTokens()
  const schedule = useStore((s) => s.data.schedule)
  const plans = useStore((s) => s.data.profile.plans) ?? []
  const planOpen = useStore((s) => s.planOpen)
  const clearOpen = useStore((s) => s.clearOpen)
  const [editing, setEditing] = useState<{ id?: string } | null>(null)
  const groups = planGroups(plans, WELLBEING_ENABLED)
  const planRow = (pl: IfThenPlan) => {
    const lr = pl.reviews.length ? pl.reviews[pl.reviews.length - 1] : null
    return (
      <Li key={pl.id} onPress={() => setEditing({ id: pl.id })}>
        <M t={whenLine(pl.when)} s={`I'll ${pl.then}${lr ? ` · ${PLAN_OUTCOME[lr.r]}` : ''}`} s2={pl.cope ? `Backup: ${pl.cope}` : undefined} />
        <Chevron />
      </Li>
    )
  }
  const [guide, setGuide] = useState<Guide | null>(null)
  const [dayIdx, setDayIdx] = useState<number | null>(null)
  const [workout, setWorkout] = useState<WorkoutKey | null>(null)
  const [builder, setBuilder] = useState<BuilderStart | null>(null)
  const routines = useStore((s) => s.data.routines)
  const training = useStore((s) => s.data.profile.training)
  const profile = useStore((s) => s.data.profile)
  const mine = (routines || []).filter((r) => !r.archived)
  const build = canBuild(profile)
  const [sheet, setSheet] = useState<null | 'workouts' | 'library'>(null)
  type After = { id: string; reflection: { good?: string; change?: string } }
  const [flow, setFlow] = useState<
    | { v: 'library' } | { v: 'preview'; e: CatalogueEntry; after?: After } | { v: 'build'; after?: After }
    | { v: 'details'; planId: string } | { v: 'end'; planId: string; step?: 1 | 2 } | null>(null)
  const [mcard, setMcard] = useState(false)
  const startPlan = useStore((s) => s.startPlan)
  const finishPlan = useStore((s) => s.finishPlan)
  const notePlan = useStore((s) => s.notePlan)
  const setPrefs = useStore((s) => s.setPrefs)
  const [planWeekAt, setPlanWeekAt] = useState<{ planId: string; phase: number } | null>(null)
  const [planDay, setPlanDay] = useState<{ planId: string; phase: number; idx: number } | null>(null)
  const trainingPlans = useStore((s) => s.data.trainingPlans)
  const today = todayStr()
  const active = activePlan({ trainingPlans }, today)
  const pos = active ? positionOn(active, today) : null
  const next = upcomingPlan({ trainingPlans }, today)
  const todayIdx = new Date().getDay()

  // Train's "Edit <workout> in Plan" opens that workout here
  useEffect(() => {
    if (!planOpen) return
    setWorkout(planOpen); setDayIdx(null); clearOpen()
  }, [planOpen, clearOpen])
  // one of the user's own workouts removed (archived) while open: back to the plan
  const gone = !!workout && !isBuiltinKey(workout) && !isTaliKey(workout) && !mine.some((r) => r.id === workout)
  useEffect(() => { if (gone && !builder) setWorkout(null) }, [gone, builder])

  const builderSheet = builder && (
    <RoutineBuilderSheet start={builder} onClose={() => setBuilder(null)} onSaved={(id) => { setBuilder(null); setSheet(null); setWorkout(id) }} />
  )
  if (workout && !gone) {
    const r = routineFor(workout, routines)
    const own = r && r.source === 'custom' ? r : undefined
    return (
      <>
        <WorkoutView type={workout} onBack={() => setWorkout(null)}
          onEdit={own && build ? () => setBuilder({ routine: own }) : undefined}
          onCopy={!build ? undefined
            : r && !own ? () => setBuilder({ name: 'My ' + r.name, slots: routineSlots(r), baseId: r.id })
            : !r && LIFTS.includes(workout as WorkoutType) ? () => setBuilder({ name: 'My ' + shortTitle(workout), slots: builtinSlots(workout as WorkoutType), baseId: 'builtin-' + workout }) : undefined} />
        {builderSheet}
      </>
    )
  }
  const planOf = (id: string) => (trainingPlans || []).find((p) => p.id === id && p.phases.length)
  if (planDay && planOf(planDay.planId)) {
    const wk = planWeekAt ? planOf(planWeekAt.planId)?.phases[planWeekAt.phase]?.name : undefined
    return <PlanDayView planId={planDay.planId} phaseIndex={planDay.phase} idx={planDay.idx} backLabel={wk ?? 'My week'} onBack={() => setPlanDay(null)} onOpenWorkout={setWorkout} />
  }
  if (planWeekAt && planOf(planWeekAt.planId)) {
    return <PlanWeekView planId={planWeekAt.planId} phaseIndex={planWeekAt.phase} onBack={() => setPlanWeekAt(null)}
      onDay={(idx) => setPlanDay({ planId: planWeekAt.planId, phase: planWeekAt.phase, idx })} />
  }
  if (dayIdx != null && !pos) return <DayView idx={dayIdx} onBack={() => setDayIdx(null)} onOpenWorkout={setWorkout} />

  const warns = pos ? planWeekNotes(pos.planWeek, routines).map((text) => ({ text })) : weekWarnings(schedule)
  const editDay = (d: number) => {
    if (!active || !pos) { setDayIdx(d); return }
    const src = weekSource(active, pos.phaseIndex)
    if (src >= 0) setPlanDay({ planId: active.id, phase: src, idx: d })
  }
  const dayLabel = shortDateOf
  const suggested = bestFit(PLAN_TEMPLATES, fitOf(profile))
  const nextLighter = active && pos && !pos.ended ? phaseRows(active, today).find((r) => r.kind === 'lighter' && r.from > pos.week) : undefined
  const planLine = !active || !pos ? null
    : pos.maintenanceWeek != null
      ? pos.phase.full ? 'Your last week repeats at the full version. Choose a new plan in Plan details whenever you like.'
        : pos.maintenanceWeek >= 12 ? "About 12 weeks holding steady. When you'd like something new, choose a plan in Plan details."
        : pos.maintenanceWeek >= 8 ? 'About 8 weeks holding steady. Carry on as long as you like.'
        : 'Your workouts open on the shorter version. Lift the same weights as before.'
      : nextLighter && active.startedAt ? `Lighter week: week ${nextLighter.from}, from ${dayLabel(shiftDay(active.startedAt, (nextLighter.from - 1) * 7))}.`
      : pos.maintain ? (isEaseIn(active, pos.phaseIndex) ? 'Easing in: shorter sessions while you find your weights.' : 'A lighter week: workouts open on the shorter version.') : null
  const begin = (input: Parameters<typeof startPlan>[0], after?: After) => {
    if (after) { if ((input.startedAt ?? today) <= today) finishPlan(after.id, after.reflection); else notePlan(after.id, after.reflection) }
    startPlan(input)
    setFlow(null)
  }
  const overlay = mcard && <MaintenanceCard onClose={() => setMcard(false)} />
  const lastRef = (trainingPlans || []).filter((p) => p.reflection?.change).sort((a, b) => (b.reflection!.at > a.reflection!.at ? 1 : -1))[0]?.reflection
  const lastNote = lastRef && lastRef.at !== profile.planNoteHidden ? lastRef.change : undefined
  if (flow?.v === 'library') {
    return <>{<PlanLibrary onBack={() => setFlow(null)} onOpen={(e) => setFlow({ v: 'preview', e })} onNew={() => setFlow({ v: 'build' })} />}{overlay}</>
  }
  if (flow?.v === 'preview') {
    const { e, after } = flow
    return <>
      <PlanPreview entry={e} onBack={() => setFlow(after ? null : { v: 'library' })} onMaintenance={() => setMcard(true)} note={after ? after.reflection.change?.trim() || undefined : undefined}
        onStart={(startedAt) => begin(e.template
          ? { name: e.template.name, phases: phasesOf(e.template), source: 'recommended', baseTemplateId: e.template.id, startedAt }
          : { name: e.name, phases: phasesOf({ phases: (e.plan?.phases ?? []).filter((x) => !x.after) }), source: 'custom', clonedFromId: e.plan?.id, baseTemplateId: e.plan?.baseTemplateId, startedAt }, after)} />
      {overlay}
    </>
  }
  if (flow?.v === 'build') {
    const after = flow.after
    return <>
      <PlanBuilder note={after?.reflection.change?.trim() || lastNote} onHideNote={() => { if (lastRef && !after?.reflection.change?.trim()) setPrefs({ planNoteHidden: lastRef.at }) }} onCancel={() => setFlow(after ? null : { v: 'library' })} onMaintenance={() => setMcard(true)} onOpenWorkout={setWorkout}
        onStart={(b) => begin({ name: b.name, phases: builtPhases(b), source: 'custom', startedAt: b.startedAt }, after)} />
      {overlay}
    </>
  }
  const flowPlan = flow && (flow.v === 'details' || flow.v === 'end') ? (trainingPlans || []).find((p) => p.id === flow.planId) : undefined
  if (flow?.v === 'details' && flowPlan) {
    return <><PlanDetails plan={flowPlan} onBack={() => setFlow(null)} onMaintenance={() => setMcard(true)} onChoose={() => setFlow({ v: 'end', planId: flowPlan.id, step: 2 })} onEditWeek={(i) => { setFlow(null); setPlanWeekAt({ planId: flowPlan.id, phase: i }) }} />{overlay}</>
  }
  if (flow?.v === 'end' && flowPlan) {
    const end = endDate(flowPlan) ?? today
    return <>
      <PlanEnd plan={flowPlan} step0={flow.step} onClose={() => setFlow(null)} onMaintenance={() => setMcard(true)}
        onPreview={(id, reflection) => { const e = catalogue({ trainingPlans }, fitOf(profile)).find((x) => x.key === id); if (e) setFlow({ v: 'preview', e, after: { id: flowPlan.id, reflection } }) }}
        onAgain={(reflection) => begin({ name: flowPlan.name, phases: phasesOf({ phases: flowPlan.phases.filter((x) => !x.after) }), source: flowPlan.source, baseTemplateId: templateById(flowPlan.baseTemplateId)?.id, clonedFromId: flowPlan.id, startedAt: end > today ? end : today }, { id: flowPlan.id, reflection })}
        onBuild={(reflection) => setFlow({ v: 'build', after: { id: flowPlan.id, reflection } })} />
      {overlay}
    </>
  }

  const art = active ? planArt(active.baseTemplateId) : undefined
  const big = (b: string, s: string) => (
    <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
      {/* `.pl-big .b` is Geist 300 on the web; native bundles 400 to 700, so 400 until N1 adds the light face */}
      <Text style={[font(400), num, { fontSize: 40, lineHeight: 44, letterSpacing: -1.2, color: t.label }]}>{b}</Text>
      <Text style={[font(400), num, { fontSize: 15, color: t.label2 }]}>{s}</Text>
    </View>
  )
  return (
    <Screen>
      <PageHeader title="Plan" />
      {/* ob6-4's "Build my plan" card is behind ONBOARDING_ENABLED (off, as on the web); stream N11 brings it */}

      {!active && (
        <>
          <Sub style={{ marginTop: -4, marginBottom: 16 }}>No plan running. Your week below repeats until you choose one.</Sub>
          {suggested && (
            <>
              <GrpH sm>Suggested for your goal</GrpH>
              <View style={{ marginBottom: 12 }}>
                <PlanTile name={suggested.name} line={suggested.tagline} art={planArt(suggested.id)} fits big
                  onPress={() => setFlow({ v: 'preview', e: catalogue({ trainingPlans }, fitOf(profile)).find((x) => x.key === suggested.id)! })} />
              </View>
            </>
          )}
          <Pressable accessibilityRole="button" onPress={() => setFlow({ v: 'library' })}
            style={({ pressed }) => ({ height: 48, borderRadius: 24, backgroundColor: t.fill, alignItems: 'center', justifyContent: 'center', marginBottom: 8, opacity: pressed ? 0.7 : 1 })}>
            <Text style={[font(600), { fontSize: 16, color: t.label }]}>Browse all plans</Text>
          </Pressable>
        </>
      )}
      {active && (
        <Card onPress={() => setFlow(pos?.ended && !pos.maintenanceWeek && !next ? { v: 'end', planId: active.id } : { v: 'details', planId: active.id })}
          label={`Your plan, ${active.name}`} style={{ padding: 0, paddingVertical: 0, paddingHorizontal: 0, overflow: 'hidden', marginBottom: 12 }}>
          <View style={{ flexDirection: 'row', gap: 14, paddingTop: 16, paddingHorizontal: 16, alignItems: 'center' }}>
            {art != null
              ? <Image source={art} style={{ width: 56, height: 56, borderRadius: 14 }} resizeMode="cover" />
              : <View style={{ width: 56, height: 56, borderRadius: 14, backgroundColor: t.tintSoft, alignItems: 'center', justifyContent: 'center' }}><View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: t.tint }} /></View>}
            <View style={{ flex: 1 }}>
              <Text style={[font(600), { fontSize: 13, color: t.tint }]}>Your plan</Text>
              <Text style={[font(600), { fontSize: 20, color: t.label }]}>{active.name}</Text>
            </View>
            <Chevron />
          </View>
          <View style={{ paddingTop: 14, paddingHorizontal: 16, paddingBottom: 16, gap: 10 }}>
            {!pos ? big('Starts', `${shortDateOf(active.startedAt!)} · ${totalWeeks(active)} weeks`)
              : pos.maintenanceWeek != null ? big(pos.phase.full ? 'Carrying on' : 'Maintenance', `week ${pos.maintenanceWeek}`)
              : pos.ended ? big(`${pos.total} weeks`, 'done')
              : big(`Week ${pos.week}`, `of ${pos.total} · ${pos.phase.name}`)}
            <Timeline cells={timeline(active, today)} endLabel={`Week ${totalWeeks(active)}`} />
            {planLine && <Text style={[font(400), { fontSize: 13, color: t.label2 }]}>{planLine}</Text>}
          </View>
        </Card>
      )}
      {pos?.ended && !pos.maintenanceWeek && !next && active && (
        <Card>
          <Text style={[font(600), { fontSize: 17, lineHeight: 22, color: t.label, marginBottom: 10 }]}>You've reached the end of {active.name}.</Text>
          <Foot style={{ paddingTop: 0, paddingHorizontal: 0, paddingBottom: 10 }}>When you're ready, you can look back and choose what's next. Until then, your week carries on as it is.</Foot>
          <View style={{ flexDirection: 'row' }}><Chip title="See what's next" onPress={() => setFlow({ v: 'end', planId: active.id })} /></View>
        </Card>
      )}
      {next && (
        <List>
          <Li onPress={() => setFlow({ v: 'details', planId: next.id })}>
            <M t={`Next: ${next.name}`} s={`Starts ${shortDateOf(next.startedAt!)}. Until then, this week carries on.`} />
            <Chevron />
          </Li>
        </List>
      )}

      <GrpH>This week</GrpH>
      {pos ? (
        <WeekRows week={pos.planWeek} routines={routines} todayIdx={todayIdx} todayNote={pos.maintain ? 'Today · shorter' : 'Today'} onDay={editDay} />
      ) : (
        <List radius={20} inset={14}>
          {WEEK_ORDER.map((d) => {
            const v = plannedOn(schedule, d)
            const isToday = d === todayIdx
            const sub = v === 'Rest' || (v === 'Cardio' && !isToday) ? '' : [v !== 'Cardio' ? `${WORKOUTS[v].ex.length} exercises` : '', isToday ? 'Today' : ''].filter(Boolean).join(' · ')
            return (
              <WeekRow key={d} d={d} names={v === 'Rest' ? [] : [shortTitle(v)]} sub={sub} first={v === 'Rest' ? undefined : v} video={v === 'Rest' ? undefined : firstVideo(v)} today={isToday}
                onPress={() => editDay(d)} label={`${DAY_NAME[d]}: ${v === 'Rest' ? 'Rest' : shortTitle(v)}${isToday ? ', today' : ''}`} />
            )
          })}
        </List>
      )}
      {warns.map((w) => <PlanNote key={w.text}>{w.text}</PlanNote>)}
      <Foot>
        {pos ? "Tap a day to change this phase's week. Daily steps burn more across a week than the gym sessions do."
          : 'Tap a day to change it. Changes repeat every week. Aim for three lifts a week with a rest day between where you can. Legs, then Push, then Pull means back-to-back sessions train different muscles. Daily steps burn more across a week than the gym sessions do.'}
      </Foot>

      {/* `.tiles.plantiles` asks for two columns, but a later `.tiles` rule (theme.css:1162) stacks
          them on the web today; native matches what the web shows (flagged to the lead) */}
      <View style={{ gap: 10, marginTop: 16 }}>
        {([['workouts', SESSIONS.length - 1 + mine.length, 'Workouts'], ['library', EXERCISES.length, 'Exercise library']] as const).map(([k, n, label]) => (
          <Pressable key={k} accessibilityRole="button" accessibilityLabel={`${n} ${label}`} onPress={() => setSheet(k)}
            style={({ pressed }) => ({ backgroundColor: t.card, borderRadius: t.radius, padding: 16, gap: 2, opacity: pressed ? 0.7 : 1 })}>
            <Text style={[font(400), num, { fontSize: 26, lineHeight: 29, color: t.label }]}>{n}</Text>
            <Text style={[font(500), { fontSize: 15, color: t.label }]}>{label}</Text>
          </Pressable>
        ))}
      </View>

      <GrpH>If–then plans</GrpH>
      <List>
        {groups.ifThen.map(planRow)}
        <ActRow label="New plan" onPress={() => setEditing({})} />
      </List>
      <Foot>
        Pick a moment that trips you up and decide ahead of time what you'll do. For example: when I get home hungry, I'll have yoghurt before I cook. We'll check in weekly, because the follow-up is what makes plans stick.
      </Foot>

      {groups.mind.length > 0 && (
        <>
          <GrpH>{MIND_PLAN.group}</GrpH>
          <List>{groups.mind.map(planRow)}</List>
        </>
      )}

      <GrpH>Guides</GrpH>
      <List inset={58}>
        {GUIDES.map((g) => (
          <Li key={g.id} onPress={() => setGuide(g.id)} style={{ minHeight: 48 }}>
            <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: g.color === 'activity' ? t.activity : t.mind, alignItems: 'center', justifyContent: 'center' }}>
              <Icon name={g.icon} size={18} color={t.onCat} />
            </View>
            <M t={g.title} />
            <Chevron />
          </Li>
        ))}
      </List>

      {editing && <PlanEditSheet id={editing.id} onClose={() => setEditing(null)} />}
      {guide && (
        <Sheet title={GUIDES.find((g) => g.id === guide)!.title} tall left={null} onClose={() => setGuide(null)} right={<NavBtn bold title="Done" onPress={() => setGuide(null)} />}>
          <GuideBody id={guide} />
        </Sheet>
      )}
      {sheet === 'library' && <LibrarySheet onClose={() => setSheet(null)} />}
      {builderSheet}
      {sheet === 'workouts' && (
        <Sheet title="Workouts" onClose={() => setSheet(null)} left={null} right={<NavBtn bold title="Done" onPress={() => setSheet(null)} />}>
          <Lbl style={{ paddingTop: 0 }}>Ready-made</Lbl>
          <List>
            {SESSIONS.filter((x): x is WorkoutType => x !== 'Rest').map((w) => (
              <Li key={w} onPress={() => { setSheet(null); setWorkout(w) }} style={{ paddingVertical: 10, paddingHorizontal: 14, minHeight: 72 }}>
                <Thumb video={firstVideo(w)} shape={w === 'Cardio' ? 'duration' : 'weight-reps'} />
                <M wrap t={shortTitle(w)} s={workoutSub(w)} />
                <Chevron />
              </Li>
            ))}
          </List>
          <Lbl>Yours</Lbl>
          <List>
            {mine.map((r) => (
              <Li key={r.id} onPress={() => { setSheet(null); setWorkout(r.id) }} style={{ paddingVertical: 10, paddingHorizontal: 14, minHeight: 72 }}>
                <Thumb video={keyVideo(r.id, routines)} shape={r.modality === 'cardio' ? 'duration' : 'weight-reps'} />
                <M wrap t={r.name} s={[MODALITY_LABEL[r.modality], `${routineSlots(r).length} ${routineSlots(r).length === 1 ? 'exercise' : 'exercises'}`, aboutLine(routineEstMins(r, routines, training, ONBOARDING_ENABLED))].filter(Boolean).join(' · ')} />
                <Chevron />
              </Li>
            ))}
            {build && <ActRow label="Build a workout" onPress={() => setBuilder({})} />}
          </List>
          <Foot style={{ paddingTop: 4, paddingHorizontal: 4 }}>Build your own from the library, or copy a ready-made one and change it.</Foot>
        </Sheet>
      )}
    </Screen>
  )
}

function GuideBody({ id }: { id: Guide }) {
  const t = useTokens()
  const P = ({ children, muted }: { children: React.ReactNode; muted?: boolean }) => (
    <Text style={[font(400), { fontSize: 15, lineHeight: 21.75, color: muted ? t.label2 : t.label, marginBottom: 10 }]}>{children}</Text>
  )
  const B = ({ children }: { children: React.ReactNode }) => <Text style={font(700)}>{children}</Text>
  if (id === 'split') return (
    <View>
      <P>Lifts work best in the order <B>Legs → Push → Pull</B> so back-to-back sessions hit different muscles.</P>
      <P><B>Legs &amp; Core:</B> squats, Romanian deadlifts, leg extensions, calves and core.</P>
      <P><B>Push:</B> chest, shoulders, triceps.</P>
      <P><B>Pull:</B> back, rear delts, biceps.</P>
    </View>
  )
  return (
    <View>
      <P><B>You can't spot-reduce.</B> Fat comes off the whole body when you eat a little less than you burn. The belly is often one of the last places to change.</P>
      <P><B>Food does most of the work.</B> Training helps and protects muscle, but a steady, modest deficit is what moves body fat.</P>
      <P><B>Averages beat single days.</B> One high day doesn't undo a good week. Look at the weekly view, not the daily number.</P>
      <P><B>Estimates are fine.</B> People logging carefully still miss 20% or more. Being consistently roughly right beats being occasionally precise.</P>
      <P><B>Feeling sick with exercise?</B> Keep effort moderate, stop two or three reps short of failure, and eat a small snack 30–45 minutes before. If nausea is severe, stop and see a GP. For chest pain or feeling faint, follow the stop signs on the workout screen.</P>
      <P muted>General information, not medical advice.</P>
    </View>
  )
}
