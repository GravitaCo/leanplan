/**
 * The summary on native (Design canvas row Onboarding 3, r6-summary; ob4-7, ob9-1): the screen of
 * the web's src/screens/onboarding/Summary.tsx on N1's lib/ui. What it shows and what Start saves are
 * the shared summaryModel's (src/screens/onboarding/summaryModel.ts) over the core's summaryFor, so
 * every number is startingTargets'; the words are src/copy/onboarding.ts.
 */
import { useMemo, useState, type ReactNode } from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg'
import { useStore } from '@/store/store'
import { canSaveHealthAnswers } from '@/data/consent'
import { planFitLine, restLine, summaryFor, trainingFrom, warmupFor, whyRows, type SummaryModel, type WhyRow, type WizardDraft } from '@/core/domain/wizard'
import { PLAN_TEMPLATES, phasesOf, type PlanTemplate } from '@/core/domain/plans'
import { warmupForSlots } from '@/core/domain/routines'
import { PLAN_WARMUP_MINUTES, type WarmupBlock } from '@/core/domain/warmup'
import type { PlannedSession } from '@/core/domain/engine'
import { HELD_AT_MAINTENANCE_NOTE } from '@/core/domain/nutrition'
import { explainStart } from '@/core/domain/targets'
import { latestWeight } from '@/core/domain/insights'
import { todayStr, DAY_NAME } from '@/core/domain/date'
import type { Why } from '@/core/types'
import { MAINT_SHEET, OTHERS, REDO, SUMMARY, SUMMARY_UI } from '@/copy/onboarding'
import {
  chosenPlan, dayNote, exerciseName, foodCardKind, heroPlan as heroOf, mineLine, reasonChips, shapeLine, slotLine, startPayload, weekStrip, whyLines,
} from '@/screens/onboarding/summaryModel'
import { BTN, num, tx, useTokens, type Tokens } from '../../lib/theme'
import { Btn, LinkBtn } from '../../lib/ui/kit'
import { BareSheet } from '../../lib/ui/primitives'
import { Chevron, Icon } from '../../lib/ui/icons'
import { Foot, OB_BTN, ScreenH, SheetHead } from './frame'
import { CoverImage, planArt, posYOf } from './art'

const DAY_LETTER = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
/** `.btn.gray.bp-btn`: 48 high on --bg */
const BP = { minHeight: 48, borderRadius: 24 }

export function Summary({ d, onEdit, onPersonalise, onAddWeight, onAddHeight, onAddAge, onAnswers, onChoosePlan, onClose }: {
  d: WizardDraft; onEdit: () => void; onPersonalise: () => void; onAddWeight: () => void; onAddHeight: () => void; onAddAge: () => void
  onAnswers: () => void; onChoosePlan: (templateId: string | undefined) => void; onClose?: () => void
}) {
  const t = useTokens()
  const data = useStore((s) => s.data)
  const finish = useStore((s) => s.finishOnboarding)
  const setTab = useStore((s) => s.setTab)
  const startPlan = useStore((s) => s.startPlan)
  const openProfile = useStore((s) => s.openProfile)
  const routines = useStore((s) => s.data.routines)
  const health = canSaveHealthAnswers(data)
  const today = todayStr()
  const m: SummaryModel = useMemo(() => summaryFor(data.profile, d, { healthConsent: health, days: data.days, currentWeight: latestWeight(data, today), today }), [data, d, health, today])
  const [day, setDay] = useState<PlannedSession | null>(null)
  const [row, setRow] = useState<WhyRow | null>(null)
  const [how, setHow] = useState(false)
  const [maint, setMaint] = useState(false)
  const [others, setOthers] = useState(false)
  const [all, setAll] = useState(false)
  // Redo setup: Start saves the answers, then asks before touching the week (never automatic)
  const [offer, setOffer] = useState(false)
  const r = m.result
  const rows = whyRows(m, d)
  const first = d.mode === 'first'
  const chosen = chosenPlan(d)

  const start = (rebuild = true, then?: () => void) => {
    finish(startPayload(m, d, { at: new Date().toISOString(), today, base: data.profile, rebuild }))
    // the same way the Plan tab starts one (PlanScreen's begin)
    if (chosen) startPlan({ name: chosen.name, phases: phasesOf(chosen), source: 'recommended', baseTemplateId: chosen.id, startedAt: today })
    setTab('today')
    onClose?.()
    then?.()
  }

  const chips = reasonChips(rows)
  const hero = heroOf(m, chosen)
  const art = planArt(hero?.id)
  const card = { backgroundColor: t.card, borderRadius: 22, padding: 16 }

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={{ width: '100%', maxWidth: 520, alignSelf: 'center' }}>
        {/* r6-summary: a result, not a report */}
        <View style={{ height: 360, overflow: 'hidden', backgroundColor: t.tintSoft }}>
          {art != null && <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}><CoverImage source={art} posY={posYOf(hero?.artAt, 0.35)} /></View>}
          <Shade />
          <View style={{ position: 'absolute', left: 20, right: 20, bottom: 44 }}>
            <Text style={[tx(13, 600), { color: '#fff', opacity: 0.9 }]}>{chosen ? chosen.name : r.starter ? SUMMARY.starter : SUMMARY.built}</Text>
            <ScreenH style={{ marginTop: 4, lineHeight: 38, color: '#fff' }}>{r.starter && !chosen ? SUMMARY.starterHeroT : SUMMARY.heroT}</ScreenH>
            <Text style={[tx(15), num, { color: '#fff', opacity: 0.9, marginTop: 4 }]}>{chosen ? chosen.tagline : shapeLine(d, m)}</Text>
          </View>
        </View>
        <View style={{ marginTop: -24, backgroundColor: t.bg, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingTop: 22, paddingHorizontal: 16, paddingBottom: 30, gap: 14 }}>
          {r.starter && !chosen && (
            <View style={[card, { gap: 8 }]}>
              <Text style={[tx(17, 600), { color: t.label }]}>{SUMMARY.starterCardT}</Text>
              <Text style={[tx(14, 400, 1.45), { color: t.label2 }]}>{SUMMARY.starterCardS}</Text>
              <Btn title={SUMMARY_UI.personalise} kind="gray" onPress={onPersonalise} style={[BP, { backgroundColor: t.bg }]} textStyle={{ fontSize: 16 }} />
            </View>
          )}

          <View accessibilityLabel={SUMMARY_UI.week} style={[card, { gap: 14 }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              {weekStrip(m, chosen, routines).map(({ wd, sessions: ss, on, name }) => {
                const circle = { width: 36, height: 36, borderRadius: 18, alignItems: 'center' as const, justifyContent: 'center' as const, backgroundColor: on ? t.btn : t.bg }
                return (
                  <View key={wd} style={{ alignItems: 'center', gap: 6 }}>
                    <Text accessibilityElementsHidden importantForAccessibility="no" style={[tx(12, 600), { color: t.label2 }]}>{DAY_LETTER[wd]}</Text>
                    {ss.length
                      ? <Pressable accessibilityRole="button" accessibilityLabel={SUMMARY_UI.dayOpen(DAY_NAME[wd], name)} onPress={() => setDay(ss[0])} style={circle}><Icon name="dumbbell" size={20} stroke={2} color={t.btnInk} /></Pressable>
                      : <View accessibilityRole="image" accessibilityLabel={SUMMARY_UI.day(DAY_NAME[wd], on ? name : restLine(d))} style={circle}>{on && <Icon name="dumbbell" size={20} stroke={2} color={t.btnInk} />}</View>}
                  </View>
                )
              })}
            </View>
            <Text style={[tx(14), { color: t.label2, textAlign: 'center' }]}>{SUMMARY.warmLine(chosen ? PLAN_WARMUP_MINUTES : warmupFor(d))}</Text>
          </View>

          {/* the reasons are the generated week's: a chosen Tilo plan has its own (Plan tab) */}
          {!chosen && chips.length > 0 && (
            <View style={[card, { gap: 12 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <Text style={[tx(17, 600), { color: t.label }]}>{SUMMARY.whyH}</Text>
                <LinkBtn title={SUMMARY.allReasons} onPress={() => setAll(true)} style={{ fontSize: 14, paddingVertical: 0, paddingHorizontal: 0 }} />
              </View>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                {chips.map((x) => (
                  <Pressable key={x.key} accessibilityRole="button" onPress={() => setRow(x)} style={{ paddingVertical: 9, paddingHorizontal: 12, borderRadius: 16, backgroundColor: t.bg }}>
                    <Text style={[tx(14, 500, 1.3, BTN), { color: t.label }]}>{x.title}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          )}

          {first && <FoodCard m={m} onHow={() => setHow(true)} onAddWeight={onAddWeight} onAddHeight={onAddHeight} onAddAge={onAddAge}
            onMaint={() => setMaint(true)} onHealth={() => start(true, () => openProfile('health'))} onAnswers={onAnswers} />}

          <Btn title={SUMMARY.others} kind="gray" onPress={() => setOthers(true)} style={[BP, { backgroundColor: t.card }]} textStyle={{ fontSize: 16 }} />
          <View style={{ marginTop: -4 }}><LinkBtn title={SUMMARY.edit} onPress={onEdit} style={{ fontSize: 16, textAlign: 'center', paddingVertical: 4 }} /></View>
        </View>
      </ScrollView>
      <Foot><Btn title={SUMMARY.start} onPress={() => (d.redo ? setOffer(true) : start())} style={OB_BTN} /></Foot>

      {day && <DaySheet s={day} whys={r.why} warm={warmupForSlots(day.slots.map((x) => x.exId), warmupFor(d), trainingFrom(d))} onClose={() => setDay(null)} />}
      {row && <WhySheet row={row} onClose={() => setRow(null)} />}
      {all && (
        <BareSheet label={SUMMARY.whyH} onClose={() => setAll(false)}>
          <SheetHead title={SUMMARY.whyH} onDone={() => setAll(false)} />
          <Rows style={{ marginTop: 12 }}>
            {rows.map((x, i) => (
              <Pressable key={x.key} accessibilityRole="button" onPress={() => { setAll(false); setRow(x) }} style={[rowStyle(t, i < rows.length - 1), { flexDirection: 'row', alignItems: 'center', gap: 12 }]}>
                <View style={{ flex: 1, minWidth: 0 }}><RowT t={t}>{x.title}</RowT><RowS t={t}>{x.sub}</RowS></View>
                <Chevron color={t.label3} />
              </Pressable>
            ))}
          </Rows>
        </BareSheet>
      )}
      {how && (
        <BareSheet label={SUMMARY.howT} onClose={() => setHow(false)}>
          <SheetHead title={SUMMARY.howT} onDone={() => setHow(false)} />
          <HowRows m={m} />
        </BareSheet>
      )}
      {maint && <MaintSheet onClose={() => setMaint(false)} onAnswers={() => { setMaint(false); onAnswers() }} />}
      {others && <OthersSheet d={d} m={m} chosen={chosen} onPick={(id) => { onChoosePlan(id); setOthers(false) }} onClose={() => setOthers(false)} />}
      {offer && (
        <BareSheet label={REDO.offerT} onClose={() => setOffer(false)}>
          <View style={{ gap: 14 }}>
            <Text accessibilityRole="header" style={[tx(24, 600, 30), { color: t.label, marginTop: 4 }]}>{REDO.offerT}</Text>
            <Text style={[tx(16, 400, 1.5), { color: t.label2 }]}>{REDO.offer}</Text>
            <Btn title={REDO.rebuild} onPress={() => start(true)} style={OB_BTN} />
            <LinkBtn title={REDO.keep} onPress={() => start(false)} style={{ fontSize: 16, textAlign: 'center', paddingVertical: 4 }} />
          </View>
        </BareSheet>
      )}
    </View>
  )
}

/** `.sm-hero .shade`: dark at the top edge, clear in the middle, 70% black at the foot. */
function Shade() {
  return (
    <Svg accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ position: 'absolute', left: 0, top: 0 }} width="100%" height="100%" preserveAspectRatio="none">
      <Defs>
        <LinearGradient id="shade" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#000" stopOpacity={0.25} />
          <Stop offset="0.3" stopColor="#000" stopOpacity={0} />
          <Stop offset="0.45" stopColor="#000" stopOpacity={0} />
          <Stop offset="1" stopColor="#000" stopOpacity={0.7} />
        </LinearGradient>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#shade)" />
    </Svg>
  )
}

/* ---------------- the web's .sm-rows, .sm-food, .sm-maint ---------------- */

const rowStyle = (t: Tokens, sep: boolean) => [{ paddingVertical: 11, paddingHorizontal: 16 }, sep && { borderBottomWidth: 1, borderBottomColor: t.sep }]
const RowT = ({ t, children }: { t: Tokens; children: ReactNode }) => <Text style={[tx(16), { color: t.label }]}>{children}</Text>
const RowS = ({ t, children, numeric }: { t: Tokens; children: ReactNode; numeric?: boolean }) => <Text style={[tx(13, 400, 1.35), numeric ? num : null, { color: t.label2 }]}>{children}</Text>
/** `.sm-rows`: on --card even inside a sheet, as the web (onboarding.css has no sheet rule for it). */
function Rows({ children, style, elev }: { children: ReactNode; style?: object; elev?: boolean }) {
  const t = useTokens()
  return <View style={[{ backgroundColor: elev ? t.elev : t.card, borderRadius: t.radius, overflow: 'hidden' }, style]}>{children}</View>
}

function FoodBox({ label, children }: { label?: string; children: ReactNode }) {
  const t = useTokens()
  return (
    <View accessibilityLabel={label} style={{ backgroundColor: t.card, borderRadius: 22, padding: 16, gap: 8 }}>
      <Text style={[tx(13, 600), { color: t.foodInk }]}>{SUMMARY_UI.food}</Text>
      {children}
    </View>
  )
}
function Big({ children, size = 22, kcal }: { children: ReactNode; size?: 18 | 20 | 22; kcal?: number }) {
  const t = useTokens()
  return <Text {...(kcal != null ? { dataSet: { kcal: String(kcal) } } : {})}
    style={[tx(size, 600, size === 22 ? 1.25 : 1.3, size === 18 ? 0 : -0.01), size === 22 ? null : num, { color: t.label }]}>{children}</Text>
}
function S({ children, ink, data, numeric }: { children: ReactNode; ink?: boolean; data?: Record<string, string>; numeric?: boolean }) {
  const t = useTokens()
  return <Text {...(data ? { dataSet: data } : {})} style={[tx(15, 400, 1.5), numeric ? num : null, { color: ink ? t.label : t.label2 }]}>{children}</Text>
}
/** `.linkbtn.wz-link.start.sm`: 15 pt, flush left, no padding. */
const FoodLink = ({ title, onPress }: { title: string; onPress: () => void }) =>
  <View style={{ alignSelf: 'flex-start' }}><LinkBtn title={title} onPress={onPress} style={{ paddingVertical: 0, paddingHorizontal: 0 }} /></View>

function FoodCard({ m, onHow, onAddWeight, onAddHeight, onAddAge, onMaint, onHealth, onAnswers }: {
  m: SummaryModel; onHow: () => void; onAddWeight: () => void; onAddHeight: () => void; onAddAge: () => void; onMaint: () => void; onHealth: () => void; onAnswers: () => void
}) {
  const t = useTokens()
  const tg = m.targets
  const kind = foodCardKind(m)
  const go = (title: string, onPress: () => void) => <Btn title={title} kind="gray" onPress={onPress} style={[BP, { backgroundColor: t.bg, marginTop: 6 }]} textStyle={{ fontSize: 16 }} />
  // ob4-7 and ob4-9: no number, and the card says logging works in full, why, and how to change it
  if (kind === 'pregnancy') {
    return <FoodBox><Big size={18}>{SUMMARY.maint}</Big><S ink>{SUMMARY.maintP}</S>
      <S><Text style={[tx(15, 600, 1.5), { color: t.label }]}>{SUMMARY.maintLongK}</Text> {SUMMARY.maintLong}</S>
      <FoodLink title={SUMMARY.maintMore} onPress={onMaint} /></FoodBox>
  }
  if (kind === 'no-consent') return <FoodBox><Big size={18}>{SUMMARY.noConsentT}</Big><S>{SUMMARY.noConsentS}</S>{go(SUMMARY.noConsentGo, onHealth)}</FoodBox>
  if (kind === 'no-age') return <FoodBox><Big size={18}>{SUMMARY.noAgeT}</Big><S>{SUMMARY.noAgeS}</S>{go(SUMMARY.noAgeGo, onAddAge)}</FoodBox>
  if (kind === 'no-weight') return <FoodBox><Big>{SUMMARY.noWeight}</Big><S>{SUMMARY.noWeightS}</S>{go(SUMMARY_UI.addWeight, onAddWeight)}</FoodBox>
  if (kind === 'no-height') return <FoodBox><Big>{SUMMARY.noHeight}</Big><S>{SUMMARY.noWeightS}</S>{go(SUMMARY_UI.addHeight, onAddHeight)}</FoodBox>
  // ob9-1 (and ob4-9): Yes has no number; Sometimes a range on Food, no number on the summary
  if (kind === 'yes') return <FoodBox label={SUMMARY_UI.food}><Big size={20}>{SUMMARY.yesT}</Big><S>{SUMMARY.yesS}</S><FoodLink title={SUMMARY.changeLink} onPress={onAnswers} /></FoodBox>
  if (kind === 'sometimes') return <FoodBox label={SUMMARY_UI.food}><Big size={20}>{SUMMARY.sometimesT}</Big><S>{SUMMARY.sometimesS}</S><FoodLink title={SUMMARY.changeLink} onPress={onAnswers} /></FoodBox>
  const e = explainStart(tg)
  if (kind === 'maintenance' || tg.kcal == null || !e) return <FoodBox><Big>{SUMMARY.maint}</Big><S>{SUMMARY.maintS}</S></FoodBox>
  return (
    <FoodBox label={SUMMARY_UI.food}>
      <Big size={20} kcal={tg.kcal}>{SUMMARY.startT(tg.kcal)}</Big>
      <S numeric data={{ estimate: String(e.estimate), diff: String(e.diff) }}>{SUMMARY.startS(e, tg.reviewAfter, tg.marginPct ?? 15)}</S>
      {tg.heldAtMaintenance && <S>{HELD_AT_MAINTENANCE_NOTE}</S>}
      <FoodLink title={SUMMARY_UI.how} onPress={onHow} />
    </FoodBox>
  )
}

/** `.sm-maint` (on --elev inside a sheet: onboarding.css's sheet rule). */
function MaintRows({ rows }: { rows: [string, string][] }) {
  const t = useTokens()
  return (
    <View style={{ backgroundColor: t.elev, borderRadius: t.radius, padding: 16, gap: 16, marginTop: 12 }}>
      {rows.map(([h, x]) => (
        <View key={h}>
          <Text style={[tx(17, 600), { color: t.label }]}>{h}</Text>
          <Text style={[tx(15, 400, 1.5), num, { color: t.label2, marginTop: 4 }]}>{x}</Text>
        </View>
      ))}
    </View>
  )
}

/** ob9-5: the estimate, how sure it is, the start and its pace, and the 3–4 week check. */
function HowRows({ m }: { m: SummaryModel }) {
  const tg = m.targets
  const e = explainStart(tg)
  if (!e || !tg.maintenance) return null
  const H = SUMMARY.how
  return <MaintRows rows={[
    [H.burnT, H.burn(e.estimate)],
    [H.sureT, H.sure(tg.maintenance.low, tg.maintenance.high, tg.marginPct ?? 15)],
    [H.startT, H.start(e) + (tg.heldAtMaintenance ? ` ${HELD_AT_MAINTENANCE_NOTE}` : '')],
    [H.nextT, H.next(tg.reviewAfter)],
  ]} />
}

/** `.sm-sheet-sub`: 14 pt label2, 6 up by default. */
function Sub({ children, top = -6 }: { children: ReactNode; top?: number }) {
  const t = useTokens()
  return <Text style={[tx(14), { color: t.label2, paddingHorizontal: 4, paddingBottom: 12, marginTop: top }]}>{children}</Text>
}

function DaySheet({ s, whys, warm, onClose }: { s: PlannedSession; whys: Why[]; warm: WarmupBlock; onClose: () => void }) {
  const t = useTokens()
  const title = `${DAY_NAME[s.weekday]} · ${s.name}`
  const note = dayNote(s, whys)
  return (
    <BareSheet label={title} onClose={onClose}>
      <SheetHead title={title} onDone={onClose} />
      <Sub>{SUMMARY.daySub}</Sub>
      <Rows>
        <View style={rowStyle(t, s.slots.length > 0)}><RowT t={t}>{SUMMARY.warmRow(warm.mins)}</RowT><RowS t={t}>{SUMMARY.warmRowS(warm.moves.map((x) => x.n))}</RowS></View>
        {s.slots.map((x, i) => (
          <View key={x.exId + i} style={rowStyle(t, i < s.slots.length - 1)}>
            <RowT t={t}>{exerciseName(x.exId)}</RowT>
            {/* the reason for the exercise itself first; sets and reps are in the note below */}
            <RowS t={t}>{slotLine(x)}</RowS>
            <View style={{ marginTop: 2 }}><RowS t={t} numeric>{x.rx}</RowS></View>
          </View>
        ))}
      </Rows>
      {note.length > 0 && (
        <View style={{ backgroundColor: t.card, borderRadius: t.radius, paddingVertical: 14, paddingHorizontal: 16, marginTop: 14 }}>
          <Text style={[tx(15, 400, 1.45), { color: t.label2 }]}>{note.join(' ')}</Text>
        </View>
      )}
    </BareSheet>
  )
}

function WhySheet({ row, onClose }: { row: WhyRow; onClose: () => void }) {
  const t = useTokens()
  return (
    <BareSheet label={row.title} onClose={onClose}>
      <SheetHead title={row.title} onDone={onClose} />
      <Sub top={2}>{row.sub}</Sub>
      <View>{whyLines(row).map((l) => <Text key={l} style={[tx(16, 400, 1.45), { color: t.label, marginBottom: 10 }]}>{l}</Text>)}</View>
    </BareSheet>
  )
}

/** ob4-8: what eating at maintenance means, for the person's own reason only. */
function MaintSheet({ onClose, onAnswers }: { onClose: () => void; onAnswers: () => void }) {
  return (
    <BareSheet label={MAINT_SHEET.title} onClose={onClose}>
      <SheetHead title={MAINT_SHEET.title} onDone={onClose} />
      <MaintRows rows={MAINT_SHEET.rows} />
      <View style={{ marginTop: 14, paddingHorizontal: 4, alignSelf: 'flex-start' }}><LinkBtn title={MAINT_SHEET.answers} onPress={onAnswers} style={{ paddingVertical: 0, paddingHorizontal: 0 }} /></View>
    </BareSheet>
  )
}

/** ob3-6: the suggested week at the top, then Tilo's ready-made plans with how each fits. */
function OthersSheet({ d, m, chosen, onPick, onClose }: { d: WizardDraft; m: SummaryModel; chosen?: PlanTemplate; onPick: (id: string | undefined) => void; onClose: () => void }) {
  const t = useTokens()
  const { line: mine, days: n } = mineLine(d, m)
  return (
    <BareSheet label={OTHERS.title} onClose={onClose}>
      <SheetHead title={OTHERS.title} done={OTHERS.close} onDone={onClose} />
      <Sub top={0}>{OTHERS.lead}</Sub>
      <Pressable accessibilityRole="button" aria-pressed={!chosen} onPress={() => onPick(undefined)}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: t.elev, borderRadius: t.radius, paddingVertical: 14, paddingHorizontal: 16 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[tx(13, 600, 1.3, BTN), { color: t.tint }]}>{chosen ? OTHERS.mineOff : OTHERS.mineK}</Text>
          <Text style={[tx(16, 600, 1.3, BTN), { color: t.label }]}>{OTHERS.mine}</Text>
          <Text style={[tx(13, 400, 1.3, BTN), num, { color: t.label2 }]}>{mine}</Text>
        </View>
        {!chosen && <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: t.label, alignItems: 'center', justifyContent: 'center' }}><Icon name="check" size={14} stroke={2.6} color={t.card} /></View>}
        {/* `.sm-mine.on`: an inset 2 pt ring that doesn't move the layout */}
        {!chosen && <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, borderRadius: t.radius, borderWidth: 2, borderColor: t.tint }} />}
      </Pressable>
      <Text style={[tx(13), { color: t.label2, marginTop: 16, marginHorizontal: 4, marginBottom: 6 }]}>{OTHERS.h}</Text>
      <Rows elev>
        {PLAN_TEMPLATES.map((p, i) => {
          const on = chosen?.id === p.id
          const img = planArt(p.id)
          return (
            <Pressable key={p.id} accessibilityRole="button" aria-pressed={on} onPress={() => onPick(p.id)}
              style={[{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 14 }, i < PLAN_TEMPLATES.length - 1 && { borderBottomWidth: 1, borderBottomColor: t.sep }]}>
              <View style={{ width: 72, height: 88, borderRadius: 12, overflow: 'hidden', backgroundColor: t.fill2 }}>{img != null && <CoverImage source={img} height={88} posY={posYOf(p.artAt)} />}</View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[tx(16, 600, 1.3, BTN), { color: t.label }]}>{p.name}</Text>
                <Text style={[tx(13, 400, 1.3, BTN), num, { color: t.label2 }]}>{p.tagline}</Text>
                <Text style={[tx(13, on ? 500 : 400, 1.3, BTN), { color: on ? t.tint : t.label2, marginTop: 2 }]}>{on ? OTHERS.inUse + ' · ' : ''}{planFitLine(p, d, n)}</Text>
              </View>
              <Chevron color={t.label3} />
            </Pressable>
          )
        })}
      </Rows>
      <View style={{ borderWidth: 1.5, borderStyle: 'dashed', borderColor: t.sep, borderRadius: 18, paddingVertical: 14, paddingHorizontal: 16, marginTop: 14 }}>
        <Text style={[tx(14, 400, 1.45), { color: t.label2 }]}>{OTHERS.more}</Text>
      </View>
    </BareSheet>
  )
}
