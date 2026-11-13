/**
 * Session preview (web: screens/train/Preview.tsx, Flow 1 step 2): the version for today, the
 * exercise list with what to aim for (trainModel.previewRows, shared with the web), swaps for today
 * only, then Start. Cardio days and the gentle swaps save from here.
 */
import { useCallback, useMemo, useState } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useStore } from '@/store/store'
import { keyTitle, warmupForKey, type WorkoutKey } from '@/core/domain/routines'
import type { Routine, Session } from '@/core/types'
import { FIRST_SESSION } from '@/screens/onboarding/copyApp'
import { WORKOUTS, SWAPS, type SwapId } from '@/core/data/workouts'
import { CARDIO_OPTIONS } from '@/core/data/constants'
import { shorterPrescription, type ShorterKind } from '@/core/domain/dayOptions'
import { exById } from '@/core/domain/library'
import { setCount, warmupSlot, working, type Slot } from '@/core/domain/guided'
import { careList } from '@/core/data/libraryLabels'
import { ONBOARDING_ENABLED } from '@/data/onboardingFlag'
import { WELLBEING_ENABLED } from '@/data/wellbeingFlag'
import { HARD_DAY_COPY, swapTile } from '@/screens/train/hardDay'
import { CARE_DISCLAIMER, CHOICES, RED_FLAG, bareName, warmupCopy, type Choice } from '@/screens/train/trainCopy'
import { previewRows } from '@/screens/train/trainModel'
import { SwapSheet } from './SwapSheet'
import { DemoPlayer } from './DemoPlayer'
import { Thumb } from './media'
import { WarmupCard } from './WarmupCard'
import { BackButton, Button, Card, FInput, FRow, FSelect, Foot, Icon, LinkBtn, Li, List, Stack, Sub, TitleRow, font, num, useTokens } from './ui'

/** `.card.ex`: name, the prescription tag, the cue */
export function ExCard({ n, tg, cue, children }: { n: string; tg?: string; cue?: string; children?: React.ReactNode }) {
  const t = useTokens()
  return (
    <Card>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
        <Text style={[font(600), { flex: 1, fontSize: 17, color: t.label }]}>{n}</Text>
        {!!tg && <View style={{ borderRadius: 6, paddingVertical: 2, paddingHorizontal: 7, backgroundColor: tagBg(t.activity) }}><Text style={[font(600), { fontSize: 13, color: t.activityInk }]}>{tg}</Text></View>}
      </View>
      {!!cue && <Text style={[font(400), { fontSize: 15, lineHeight: 21, color: t.label2, marginTop: 6, marginBottom: 8 }]}>{cue}</Text>}
      {children}
    </Card>
  )
}
/** `color-mix(in srgb, var(--activity) 15%, transparent)` */
const tagBg = (hex: string) => {
  const m = hex.match(/^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i)
  return m ? `rgba(${parseInt(m[1], 16)},${parseInt(m[2], 16)},${parseInt(m[3], 16)},0.15)` : hex
}

export function Preview({ type, choice, onChoice, slots, swaps, onSwap, session, note, dayName, isToday, onStart, onManual, onBack, onEditPlan, generated, swapId = 'mobility', shorterKind, noShorter, roughNote }: {
  type: WorkoutKey
  choice: Choice
  onChoice: (c: Choice) => void
  slots: Slot[]
  swaps: Record<number, string>
  onSwap: (i: number, id: string) => void
  session?: Session
  note?: string | null
  dayName: string
  isToday: boolean
  onStart: () => void
  onManual: () => void
  onBack: () => void
  onEditPlan: () => void
  generated?: Routine
  swapId?: SwapId
  shorterKind?: ShorterKind | null
  noShorter?: boolean
  roughNote?: boolean
}) {
  const t = useTokens()
  const insets = useSafeAreaInsets()
  const rate = useStore((s) => s.rateExercise)
  const prefs = useStore((s) => s.data.profile.training?.exPrefs)
  const routines = useStore((s) => s.data.routines)
  const cur = useStore((s) => s.cur)
  const days = useStore((s) => s.data.days)
  const saveCardio = useStore((s) => s.saveCardio)
  const [swapFor, setSwapFor] = useState<number | null>(null)
  const [demo, setDemo] = useState<number | null>(null)
  const closeDemo = useCallback(() => setDemo(null), [])
  const shorter = choice === 'shorter'
  const swapKey: SwapId | null = choice === 'swap' ? swapId : choice === 'mobility' || choice === 'walk' ? choice : null
  const swap = swapKey ? SWAPS[swapKey] : null
  const easier = shorter && shorterKind === 'easier'
  const title = swap ? swap.title.split(' · ')[0] : keyTitle(type, routines)
  const logged = session?.ex?.some((e) => working(e.sets).length > 0)
  const wSlot = warmupSlot(slots.map((s) => s.shape))
  const training = useStore((s) => s.data.profile.training)
  // every session opens with the warm-up block (ob3-5), the same one the player runs
  const warm = useMemo(() => (ONBOARDING_ENABLED ? warmupForKey(type, routines, training) : null), [type, routines, training])

  // cardio card state (a retired type from an older log still shows as saved)
  const cardioS = type === 'Cardio' ? session : undefined
  const [cardioType, setCardioType] = useState(cardioS?.cardio?.key || 'Brisk walk')
  const [mins, setMins] = useState(cardioS?.mins != null ? String(cardioS.mins) : '')
  const [walkMins, setWalkMins] = useState('')

  const rows = useMemo(() => previewRows(slots, days, cur, session, shorter, shorterKind), [slots, days, cur, session, shorter, shorterKind])

  const sub = swap
    ? `${dayName} · ${swap.ex.length} ${swap.ex.length === 1 ? 'move' : 'moves'}`
    : type === 'Cardio' ? `${dayName} · ${shorter ? shorterPrescription(WORKOUTS.Cardio.ex[0].t) : WORKOUTS.Cardio.ex[0].t}`
    : `${dayName} · ${warm || (WELLBEING_ENABLED && wSlot >= 0) ? 'warm-up and ' : ''}${slots.length} ${slots.length === 1 ? 'exercise' : 'exercises'} · ${setCount(slots.map((s) => s.shown), shorter)}`
  const fp = { paddingTop: 0, paddingHorizontal: 4, paddingBottom: 10 }
  const chips = CHOICES.filter(([k]) => !(logged && (k === 'mobility' || k === 'walk' || k === 'swap')) && !(noShorter && k === 'shorter' && choice !== 'shorter'))

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: insets.top + 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <View style={{ paddingBottom: 6, alignSelf: 'flex-start' }}><BackButton label={isToday ? 'Today' : dayName} onPress={onBack} /></View>
      <TitleRow flush title={title} />
      <Sub style={{ marginTop: 2 }}>{sub}</Sub>

      {/* .vchips: one scrolling row; with the wellbeing flag (.hd-wrap) they wrap onto lines, 44 px targets */}
      {(() => {
        const row = chips.map(([k, label]) => {
          const on = choice === k
          return (
            <Pressable key={k} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => onChoice(k)}
              style={WELLBEING_ENABLED
                ? { minHeight: 44, borderRadius: 22, paddingVertical: 6, paddingHorizontal: 14, justifyContent: 'center', backgroundColor: on ? t.btn : t.card, maxWidth: '100%' }
                : { height: 32, borderRadius: 16, paddingHorizontal: 14, justifyContent: 'center', backgroundColor: on ? t.btn : t.card }}>
              <Text style={[font(on ? (WELLBEING_ENABLED ? 600 : 500) : 400), { fontSize: 15, lineHeight: 19, color: on ? t.btnInk : t.label }]}>{k === 'swap' ? swapTile(swapId).title : label}</Text>
            </Pressable>
          )
        })
        return WELLBEING_ENABLED
          ? <View accessibilityRole="radiogroup" accessibilityLabel="Today's version" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 16, marginBottom: 12 }}>{row}</View>
          : <ScrollView horizontal showsHorizontalScrollIndicator={false} accessibilityRole="radiogroup" accessibilityLabel="Today's version" style={{ marginHorizontal: -16, marginTop: 16, marginBottom: 12, flexGrow: 0 }} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>{row}</ScrollView>
      })()}
      {!!note && <Foot style={fp}>{note}</Foot>}
      {roughNote && shorter && <Foot style={fp}>{HARD_DAY_COPY.roughNote}</Foot>}
      {swap && <Foot style={fp}>This counts as today's session. Your plan carries on as usual.</Foot>}

      {swap ? (
        <>
          {!!swap.note && <Foot style={fp}>{swap.note}</Foot>}
          {swap.ex.map((e) => <ExCard key={e.n} n={e.n} tg={e.t} cue={e.cue} />)}
          {swapKey === 'walk' && (
            <List>
              <FRow label="Minutes"><FInput numeric value={walkMins} placeholder={swap.mins} onChangeText={setWalkMins} accessibilityLabel="Minutes" /></FRow>
            </List>
          )}
          <Foot style={{ paddingTop: 4, paddingHorizontal: 4 }}>{RED_FLAG}</Foot>
          <Stack><Button title={`Save ${swapKey === 'walk' ? 'walk' : 'mobility'}`} onPress={() => { saveCardio(swap.cardioType, swapKey === 'walk' ? walkMins || swap.mins : swap.mins, 'swap'); onBack() }} /></Stack>
        </>
      ) : type === 'Cardio' ? (
        <>
          {warm && <WarmupCard block={warm} />}
          <ExCard n={WORKOUTS.Cardio.ex[0].n} tg={shorter ? shorterPrescription(WORKOUTS.Cardio.ex[0].t) : WORKOUTS.Cardio.ex[0].t} cue={WORKOUTS.Cardio.ex[0].cue} />
          <List>
            <FRow label="Type"><FSelect title="Type" value={cardioType} onChange={setCardioType} options={CARDIO_OPTIONS.includes(cardioType) ? CARDIO_OPTIONS : [...CARDIO_OPTIONS, cardioType]} /></FRow>
            <FRow label="Minutes"><FInput numeric value={mins} placeholder="25" onChangeText={setMins} accessibilityLabel="Minutes" /></FRow>
          </List>
          <Stack><Button title="Save cardio" onPress={() => { saveCardio(cardioType, mins, cardioS?.option === 'swap' ? 'swap' : shorter ? 'shorter' : undefined); onBack() }} /></Stack>
          <Foot style={{ paddingTop: 12, paddingHorizontal: 4 }}>{RED_FLAG}</Foot>
        </>
      ) : (
        <>
          {!warm && wSlot >= 0 && (
            <View style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start', backgroundColor: t.tintSoft, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 12 }}>
              <Text aria-hidden style={[font(400), { fontSize: 20, lineHeight: 22, color: t.label }]}>↻</Text>
              <View style={{ flex: 1 }}>
                <Text style={[font(500), { fontSize: 16, color: t.label }]}>Warm up first</Text>
                <Text style={[font(400), { fontSize: 13, lineHeight: 18, color: t.label2, marginTop: 2 }]}>{warmupCopy(bareName(slots[wSlot].shown.n))}</Text>
              </View>
            </View>
          )}
          {warm && <WarmupCard block={warm} extra={wSlot >= 0 ? `Then one or two lighter ${bareName(slots[wSlot].shown.n).toLowerCase()} sets, building up to your working weight.` : undefined} />}
          <List>
            {rows.map(({ s, detail }) => {
              const gentler = !s.swapped && s.x?.gentler && (s.x.equipment[0] === 'barbell' || s.x.equipment[0] === 'trap-bar') && s.x.difficulty !== 'beginner' ? exById(s.x.gentler) : undefined
              const liked = !!s.x && !!prefs?.liked?.includes(s.x.id)
              return (
                <Li key={s.i} style={{ paddingVertical: 10, paddingHorizontal: 14, minHeight: 72 }}>
                  {s.shown.video
                    ? <Pressable accessibilityRole="button" accessibilityLabel={`Watch example: ${s.shown.n}`} onPress={() => setDemo(s.i)}><Thumb video={s.shown.video} shape={s.shape} play /></Pressable>
                    : <Thumb shape={s.shape} />}
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={[font(400), { fontSize: 17, color: t.label }]}>{bareName(s.shown.n)}</Text>
                    <Text style={[font(400), num, { fontSize: 13, color: t.label2, marginTop: 2 }]}>{s.rx}{detail ? ' · ' + detail : ''}</Text>
                    {s.swapped && (
                      <Text style={[font(400), { fontSize: 13, lineHeight: 18, color: t.label2, marginTop: 3 }]}>
                        In place of {bareName(s.planned.n)}, today only. <LinkBtn inl size={13} title="Undo" onPress={() => onSwap(s.i, s.planned.id!)} />
                        {s.x?.care?.length ? <> Asks quite a lot of {careList(s.x.care)}.</> : null}
                      </Text>
                    )}
                    {gentler && <Text style={[font(400), { fontSize: 13, lineHeight: 18, color: t.label2, marginTop: 3 }]}>New to this? The {gentler.n.toLowerCase()} is a good place to start. Tap Swap.</Text>}
                  </View>
                  {generated && s.x && !s.swapped && (
                    <View style={{ flexDirection: 'row', gap: 6 }}>
                      <Pressable accessibilityRole="button" accessibilityLabel={`I like ${bareName(s.shown.n)}`} accessibilityState={{ selected: liked }} onPress={() => rate(generated.id, s.i, 'up')}
                        style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: liked ? t.label : t.fill }}>
                        <Icon name="thumbUp" size={17} color={liked ? t.card : t.label} />
                      </Pressable>
                      <Pressable accessibilityRole="button" accessibilityLabel={`Not for me: ${bareName(s.shown.n)}`} onPress={() => rate(generated.id, s.i, 'down')}
                        style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: t.fill }}>
                        <Icon name="thumbDown" size={17} color={t.label} />
                      </Pressable>
                    </View>
                  )}
                  {s.x && <LinkBtn title="Swap" label={`Swap ${s.shown.n}`} onPress={() => setSwapFor(s.i)} />}
                </Li>
              )
            })}
          </List>
          {generated && <Foot style={{ paddingTop: 4, paddingHorizontal: 4 }}>{FIRST_SESSION.thumbsNote}</Foot>}
          <Foot style={{ paddingTop: 4, paddingHorizontal: 4 }}>
            Swaps here only change today. {easier ? HARD_DAY_COPY.spareEasier : 'Stop each set with two or three reps to spare.'}{slots.some((s) => s.swapped && s.x?.care?.length) ? ' ' + CARE_DISCLAIMER : ''} {RED_FLAG}
          </Foot>
          <Stack style={{ alignItems: 'center', marginTop: 20 }}>
            <Button title={logged ? 'Continue' : 'Start'} onPress={onStart} style={{ height: 52, borderRadius: 26, alignSelf: 'stretch' }} />
            <LinkBtn title={logged ? 'Edit sets by hand' : 'Log sets by hand'} onPress={onManual} />
            <LinkBtn title={`Edit ${keyTitle(type, routines)} in Plan`} onPress={onEditPlan} />
          </Stack>
        </>
      )}

      {demo != null && (() => { const sh = slots.find((s) => s.i === demo)?.shown; return sh?.video ? <DemoPlayer ex={sh} onClose={closeDemo} /> : null })()}
      {swapFor != null && (() => {
        const sl = slots.find((s) => s.i === swapFor)
        return sl?.x ? <SwapSheet current={sl.x} planned={swaps[swapFor] ? exById(sl.planned.id) : undefined} shorter={shorter}
          loggedSets={rows.find((r) => r.s.i === swapFor)?.done ?? 0} onPick={(id) => onSwap(swapFor, id)} onClose={() => setSwapFor(null)} /> : null
      })()}
    </ScrollView>
  )
}
