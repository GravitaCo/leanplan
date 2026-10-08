/**
 * The weekly review (boards ml-a1 to ml-a4, approved by Benn on 8 Oct 2026) and its sheets:
 * "Change one thing" (ml-a5), the 4-week check (ml-b1 to ml-b3), "Your range, from your logs"
 * (ml-b4), "Keeping it steady" (ml-c3) and the one-time weight ask (ml-c4). The decisions are
 * core's (maintenanceLoop.ts) and so are the words (loopCopy.ts); this file only shows and asks.
 */
import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useStore } from '@/store/store'
import { healthLoggingAllowed } from '@/data/consent'
import { fmt, shiftDay, todayStr } from '@/core/domain/date'
import {
  adaptiveMaintenance, careWeek, learnedTarget, loopSafety, maintenanceDrift, suggestRateAdjustment, weeklyReview,
  type AdaptiveMaintenance, type DriftSuggestion, type LoopOption, type RangeChange, type RateSuggestion, type ReviewChoice,
} from '@/core/domain/maintenanceLoop'
import {
  CHECK_LEAD, CHECK_ROWS, CHECK_TITLE, CHOICE_TEXT, ENCOURAGE, GENTLE_FOOT, PATTERN_FOOT, changeOneLead, hungerWords, moodWords,
  optionText, patternText, reviewRows, sleepWords, stressWords, weightSub,
} from '@/core/domain/loopCopy'
import { latestWeight } from '@/core/domain/insights'
import { weekPicture, type MindContext, type WeekPicture } from '@/core/domain/weekPicture'
import type { IfThenPlan } from '@/core/types'
import { BareSheet } from '@/ui/primitives'
import { Icon, type IconName } from '@/ui/icons'
import { PlanEditSheet } from '../plan/PlanSheets'

/** "28 Sept to 4 Oct", or "5 to 11 Oct" within a month. */
export function spanText(a: string, b: string): string {
  const d = (x: string, o: Intl.DateTimeFormatOptions) => new Date(x + 'T12:00').toLocaleDateString('en-GB', o)
  return d(a, { month: 'short' }) === d(b, { month: 'short' })
    ? `${d(a, { day: 'numeric' })} to ${d(b, { day: 'numeric', month: 'short' })}`
    : `${d(a, { day: 'numeric', month: 'short' })} to ${d(b, { day: 'numeric', month: 'short' })}`
}

const ICON: Record<'mind' | 'move' | 'food' | 'weight', IconName> = { mind: 'heart', move: 'dumbbell', food: 'fork', weight: 'weight' }

/** Which sheet follows the review's Done: the 4-week check, the learned range or the drift sheet. */
type After = { k: 'rate'; r: Extract<RateSuggestion, { kind: 'options' | 'on-pace' }> } | { k: 'drift'; r: Extract<DriftSuggestion, { kind: 'drift' }> } | { k: 'learned'; r: Extract<AdaptiveMaintenance, { kind: 'estimate' }> } | null

export function WeeklyReviewScreen({ onBack }: { onBack: () => void }) {
  const data = useStore((s) => s.data)
  const markOpened = useStore((s) => s.markReviewOpened)
  const choose = useStore((s) => s.chooseNextWeek)
  const notePattern = useStore((s) => s.notePatternShown)
  const reviewPlans = useStore((s) => s.reviewPlans)
  const setPrefs = useStore((s) => s.setPrefs)
  const applyRange = useStore((s) => s.applyRangeChange)
  const showToast = useStore((s) => s.showToast)
  const today = todayStr()
  const consent = healthLoggingAllowed(data)
  const p = data.profile
  // read before this opening is recorded, so a missed review still reads as welcome back
  const [lastAt] = useState(p.lastReviewAt)
  const rv = useMemo(() => weeklyReview(data, today, { healthConsent: consent, lastReviewAt: lastAt, reviewDay: p.reviewDay ?? 0, patternShown: p.patternShown }), [data, today, consent, lastAt, p.reviewDay, p.patternShown])
  const safety = loopSafety(data, latestWeight(data, today), consent)
  // ml-c4: asked once, at the first review someone could see weight in; skipped = left out
  const [askWeight, setAskWeight] = useState(() => p.reviewWeight === undefined && !safety.quiet && !rv.welcomeBack)
  const [pick, setPick] = useState<ReviewChoice>(rv.welcomeBack ? 'pick-up' : 'keep')
  const [option, setOption] = useState<LoopOption | null>(null)
  const [sheet, setSheet] = useState<'change' | { plan: string } | null>(null)
  const [after, setAfter] = useState<After>(null)
  // the reminder is offered at the end of the first review, never switched on for anyone (ml-d1)
  const [offer, setOffer] = useState(false)
  // the pattern line is read once per opening: noting it as shown must not hide it mid-review (ship-critic, 8 Oct)
  const [patternLine] = useState(() => rv.pattern?.line ?? null)
  const pattern = patternLine?.code ?? null

  useEffect(() => { markOpened() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (pattern) notePattern(pattern) }, [pattern]) // eslint-disable-line react-hooks/exhaustive-deps

  const done = () => {
    const chosen = pick === 'change-one' && option ? option : undefined
    choose(pick, chosen)
    if ((chosen === 'range-less' || chosen === 'range-more') && rv.changeOne.range) applyRange(rv.changeOne.range)
    // the one next step that exists today: an if-then plan for hungry days (ml-a5); the rest are noted
    if (chosen === 'hungry-days-plan' || chosen === 'hungry-evenings-plan') { setSheet({ plan: '' }); return }
    if (chosen) showToast('Noted for next week.')
    // then whichever weight-based sheet is new this week (opt-in only; never after welcome back).
    // Each shows in the first week it applies, not every week after: compared with a week ago.
    // none in a care week or with wellbeing routed, nor on a second opening the same day; a week
    // that held them back lets them show the next week
    const held = (m: MindContext) => careWeek(m) || m.wellbeing === 'flagged' || m.wellbeing === 'sometimes'
    if (!rv.welcomeBack && !held(rv.mind) && lastAt !== today) {
      const o = { healthConsent: consent }
      const weekAgo = shiftDay(today, -7)
      const lastHeld = held(weeklyReview(data, weekAgo, { healthConsent: consent }).mind)
      const rate = suggestRateAdjustment(data, today, o), rate0 = suggestRateAdjustment(data, weekAgo, o)
      if (rate.kind === 'options' && (lastHeld || !(rate0.kind === 'options' && rate0.pace === rate.pace))) return setAfter({ k: 'rate', r: rate })
      if (rate.kind === 'on-pace' && (lastHeld || rate0.kind === 'none')) return setAfter({ k: 'rate', r: rate })
      const drift = maintenanceDrift(data, today, o)
      if (drift.kind === 'drift' && (lastHeld || maintenanceDrift(data, weekAgo, o).kind !== 'drift')) return setAfter({ k: 'drift', r: drift })
      const learned = adaptiveMaintenance(data, today, o)
      if (learned.kind === 'estimate' && (lastHeld || adaptiveMaintenance(data, weekAgo, o).kind !== 'estimate') && Math.abs(learned.maint - data.target.kcal) >= 100) return setAfter({ k: 'learned', r: learned })
    }
    if (p.reviewPush === undefined) return setOffer(true)
    onBack()
  }

  const rows = reviewRows(rv)
  const plans = rv.welcomeBack ? [] : rv.mind.plansDue
  const hard = rv.encouragement === 'hard'
  const choices: { k: ReviewChoice; title: string; sub: string }[] = rv.choices.map((k) => {
    const c = k === 'ease-off' && rv.gentle ? CHOICE_TEXT['ease-off-gentle'] : k === 'change-one' && hard ? CHOICE_TEXT['change-one-hard'] : k === 'keep' && rv.encouragement === 'lighter' ? CHOICE_TEXT['keep-lighter'] : CHOICE_TEXT[k]
    return { k, title: c.title, sub: c.sub }
  })

  return (
    <div className="rv" data-testid="weekly-review">
      <header>
        <div className="rv-top">
          <button className="rv-back" aria-label="Back" onClick={onBack}><Icon name="chevL" size={18} stroke={2.4} /></button>
          <span className="rv-span">{rv.welcomeBack ? 'This week so far' : spanText(rv.week.from, rv.week.to)}</span>
        </div>
        <h1 className="rv-h1">{rv.welcomeBack ? 'Welcome back' : 'Your week'}</h1>
        {rv.welcomeBack
          ? <div className="rv-lead big">Nothing to catch up on. Here’s where things are now.</div>
          : <div className="rv-lead">A two-minute look back</div>}
      </header>
      <main className="rv-main">
        {(rows.length > 0 || !rv.welcomeBack) && (
          <section className="rv-card rv-did" aria-labelledby="rv-did-h">
            <h2 id="rv-did-h">{rv.welcomeBack && rv.since ? `What you did since ${new Date(rv.since + 'T12:00').toLocaleDateString('en-GB', { weekday: 'long' })}` : 'What you did'}</h2>
            <div className="enc">{ENCOURAGE[rv.encouragement]}</div>
            {rows.map((r) => (
              <div className="rv-row" key={r.pillar}>
                <span className={'rv-sq ' + r.pillar} aria-hidden="true"><Icon name={ICON[r.pillar]} size={18} /></span>
                <div className="m"><div className="t num">{r.title}</div>{r.sub && <div className="s num">{r.sub}</div>}</div>
              </div>
            ))}
            {rv.gentle && <div className="rv-gfoot">{GENTLE_FOOT}</div>}
          </section>
        )}

        {patternLine && (
          <section className="rv-card rv-pat" aria-labelledby="rv-pat-h">
            <span className="rv-sq mind" aria-hidden="true"><Icon name="trend" size={18} /></span>
            <div style={{ flex: 1 }}>
              <h2 id="rv-pat-h">Something in your data</h2>
              <div className="p">{patternText(patternLine.code, rv.gentle)}</div>
              <div className="f">{PATTERN_FOOT}</div>
            </div>
          </section>
        )}

        {/* ml-a3: a harder week keeps to what you did and next week */}
        {rv.why.length > 0 && !rv.welcomeBack && !hard && (
          <section className="rv-card rv-why" aria-labelledby="rv-why-h">
            <h2 id="rv-why-h">Why this matters to you</h2>
            {rv.why.map((w) => <div className="q" key={w}>“{w}”</div>)}
          </section>
        )}

        {plans.map((pl) => <PlanCard key={pl.id} plan={pl} onAnswer={(r) => reviewPlans({ [pl.id]: r })} onChange={() => setSheet({ plan: pl.id })} />)}

        <section className="rv-next" aria-labelledby="rv-next-h">
          <h2 id="rv-next-h">For next week</h2>
          <div role="radiogroup" aria-labelledby="rv-next-h" className="rv-radios">
            {choices.map((c) => (
              <div key={c.k} role="radio" aria-checked={pick === c.k} tabIndex={0} className="rv-radio"
                onClick={() => setPick(c.k)} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPick(c.k) } }}>
                <span className="r">
                  <span className="tx"><span className="tl">{c.title}</span><span className="sb">{c.sub}</span></span>
                  <Dot on={pick === c.k} />
                </span>
                {pick === 'change-one' && c.k === 'change-one' && (rv.changeOne.ctx === 'gentle'
                  // ml-a2: in gentle mode the options sit inline
                  ? <div className="rv-chips" onClick={(e) => e.stopPropagation()}>
                      {rv.changeOne.options.map((o) => (
                        <button key={o} type="button" className={'rv-chip' + (option === o ? ' on' : '')} aria-pressed={option === o} onClick={() => setOption(o)}>{optionText(o, null).title}</button>
                      ))}
                    </div>
                  : <button type="button" className="rv-link" onClick={(e) => { e.stopPropagation(); setSheet('change') }}>{option ? optionText(option, rv.changeOne.range).title : 'See the options'}</button>)}
              </div>
            ))}
          </div>
          <button type="button" className="rv-done" onClick={done}>Done</button>
        </section>
      </main>

      {askWeight && <WeightAskSheet onAnswer={(on) => { setPrefs({ reviewWeight: on }); setAskWeight(false) }} />}
      {sheet === 'change' && (
        <ChangeOneSheet mind={rv.mind} ctx={rv.changeOne.ctx} options={rv.changeOne.options} range={rv.changeOne.range} value={option}
          onClose={() => setSheet(null)} onPick={(o) => { setOption(o); setSheet(null) }} />
      )}
      {sheet && typeof sheet === 'object' && <PlanEditSheet id={sheet.plan || undefined} onClose={() => { const fromDone = !sheet.plan; setSheet(null); if (fromDone) onBack() }} />}
      {after?.k === 'rate' && <CheckSheet r={after.r} onClose={onBack} />}
      {after?.k === 'drift' && <DriftSheet r={after.r} onClose={onBack} />}
      {after?.k === 'learned' && <LearnedSheet r={after.r} onClose={onBack} />}
      {offer && <ReviewDaySheet onClose={() => { if (useStore.getState().data.profile.reviewPush === undefined) setPrefs({ reviewPush: false }); onBack() }} />}
    </div>
  )
}

function Dot({ on }: { on: boolean }) {
  return <span className="rv-dot" aria-hidden="true">{on && <Icon name="check" size={12} stroke={3.4} />}</span>
}

/** ml-a1 "Your plan": the if-then plan due a check-in, answered in one tap. */
function PlanCard({ plan, onAnswer, onChange }: { plan: IfThenPlan; onAnswer: (r: 'worked' | 'no') => void; onChange: () => void }) {
  const [said, setSaid] = useState<'worked' | 'no' | null>(null)
  const answer = (r: 'worked' | 'no') => { setSaid(r); onAnswer(r) }
  return (
    <section className="rv-card rv-plan" aria-label="Your plan">
      <h2 className="rv-k">Your plan</h2>
      <div className="p">If {plan.when.replace(/^when\s+/i, '')}, then I’ll {plan.then.replace(/\.$/, '')}.</div>
      <div className="ask">How did it go this week?</div>
      <div className="rv-pills">
        <button type="button" className={'rv-pill' + (said === 'worked' ? ' on' : '')} aria-pressed={said === 'worked'} onClick={() => answer('worked')}>It helped</button>
        <button type="button" className={'rv-pill' + (said === 'no' ? ' on' : '')} aria-pressed={said === 'no'} onClick={() => answer('no')}>Not really</button>
        <button type="button" className="rv-pill" onClick={onChange}>Change it</button>
      </div>
    </section>
  )
}

/* ---------------- sheets ---------------- */

function LoopSheet({ label, children, onClose }: { label: string; children: ReactNode; onClose: () => void }) {
  return <BareSheet label={label} onClose={onClose} className="lp-sheet"><div className="lp">{children}</div></BareSheet>
}

function SheetHead({ title, close, onClose }: { title: string; close: string; onClose: () => void }) {
  return <div className="lp-hd"><h2>{title}</h2><button type="button" onClick={onClose}>{close}</button></div>
}

/** One radio row with a pillar tag, as on the check sheets. */
function OptionRow({ o, range, on, onPick, long, drift }: { o: LoopOption; range: RangeChange | null; on: boolean; onPick: () => void; long?: boolean; drift?: boolean }) {
  const t = optionText(o, range, { long, drift })
  const tone = t.tag === 'Move' ? 'var(--move-ink)' : t.tag === 'Food' ? 'var(--food-ink)' : t.tag === 'Your range' ? 'var(--label2)' : 'var(--mind-ink)'
  return (
    <div role="radio" aria-checked={on} tabIndex={0} className="rv-radio" onClick={onPick} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick() } }}>
      <span className="tx"><span className="ptag" style={{ color: tone }}>{t.tag}</span><span className="tl">{t.title}</span>{t.sub && <span className="sb num">{t.sub}</span>}</span>
      <Dot on={on} />
    </div>
  )
}

/** ml-a5: one small thing for next week, an option from every pillar, mind first after a hard week. */
function ChangeOneSheet({ mind, ctx, options, range, value, onClose, onPick }: {
  mind: MindContext; ctx: 'calm' | 'hard' | 'gentle' | 'drift'; options: LoopOption[]; range: RangeChange | null; value: LoopOption | null
  onClose: () => void; onPick: (o: LoopOption) => void
}) {
  const [o, setO] = useState<LoopOption | null>(value ?? options[0] ?? null)
  // nothing changes here: a range change applies on the review's Done, if "Change one thing" is still the pick
  const tryIt = () => { if (o) onPick(o) }
  return (
    <LoopSheet label="Change one thing" onClose={onClose}>
      <SheetHead title="Change one thing" close="Cancel" onClose={onClose} />
      <div className="lp-lead">{changeOneLead(ctx, mind)}</div>
      <div role="radiogroup" aria-label="Change one thing" className="rv-radios">
        {options.map((x) => <OptionRow key={x} o={x} range={range} on={o === x} onPick={() => setO(x)} long />)}
      </div>
      <button type="button" className="rv-done" onClick={tryIt} disabled={!o}>Try this next week</button>
    </LoopSheet>
  )
}

/** The mind, move and food rows for the check sheets (ml-b1 to ml-b4, ml-c3). */
/** `span`: move and food over a longer window (the 4-week check, the learned range); the mind rows then read the last week, and a count says so (ml-b2). */
function SideBySide({ week, span, cap, weight, food, sleepHunger }: { week: WeekPicture; span?: WeekPicture; cap: string; weight?: ReactNode; food?: ReactNode; sleepHunger?: boolean }) {
  const m = week.mind
  const quietOk = useStore((s) => !loopSafety(s.data, null, healthLoggingAllowed(s.data)).quiet)
  const rows: [string, 'mind' | 'move' | 'food', ReactNode][] = []
  const add = (l: string, k: 'mind' | 'move' | 'food', v: ReactNode | null) => { if (v) rows.push([l, k, v]) }
  const lw = (x: string | null) => (x && span && /\d+ days$/.test(x) ? x + ' last week' : x)
  add('Sleep', 'mind', lw(sleepWords(m)))
  add('Stress', 'mind', lw(stressWords(m)))
  add('Mood', 'mind', moodWords(m))
  add('Hunger', 'mind', hungerWords(m, !!sleepHunger))
  const mv = (span ?? week).move, fd = (span ?? week).food
  const sess = mv.sessions - mv.walks
  add('Move', 'move', sess ? <><b>{sess} {sess === 1 ? 'session' : 'sessions'}</b> done{mv.walks ? ', plus walks' : ''}</> : mv.walks ? <><b>{mv.walks} {mv.walks === 1 ? 'walk' : 'walks'}</b></> : null)
 // the check sheets only open with numbers allowed; the guard keeps it that way
  // never "0 days in your range": the clause only when there were some (design, 8 Oct)
  add('Food', 'food', food ?? (fd.loggedDays && quietOk ? <>Averaged <b>{fmt(Math.round((fd.avgKcal ?? 0) / 10) * 10)} kcal</b>{fd.inRangeDays ? <>, with {fd.inRangeDays} {fd.inRangeDays === 1 ? 'day' : 'days'} in your range</> : null}</> : null))
  return (
    <section className="lp-card" aria-label={`${cap}, all together`}>
      <div className="cap">{cap}</div>
      {rows.map(([l, k, v]) => <div className="lp-r num" key={l}><span className={'l ' + k}>{l}</span><span>{v}</span></div>)}
      {weight && <div className="lp-r num"><span className="l food">Weight</span><span>{weight}</span></div>}
    </section>
  )
}

/** ml-b1 to ml-b3: the 4-week check. Nothing changes unless the person chooses it. */
function CheckSheet({ r, onClose }: { r: Extract<RateSuggestion, { kind: 'options' | 'on-pace' }>; onClose: () => void }) {
  const [o, setO] = useState<LoopOption | null>(null)
  const applyRange = useStore((s) => s.applyRangeChange)
  const choose = useStore((s) => s.chooseNextWeek)
  const n = r.trend.n
  const pace = r.kind === 'on-pace' ? 'in-line' : r.pace
  const weight = <>Weighed in {n} times. {weightSub({ weighIns: n, words: { kind: 'pace', pace }, weeks: Math.round(r.trend.windowDays / 7) }, false)}</>
  const pickIt = (x: LoopOption) => {
    setO(x)
    if (r.kind === 'options' && (x === 'range-less' || x === 'range-more') && r.range) applyRange(r.range)
    choose('change-one', x)
    onClose()
  }
  return (
    <LoopSheet label={CHECK_TITLE} onClose={onClose}>
      <SheetHead title={CHECK_TITLE} close="Close" onClose={onClose} />
      {r.kind === 'on-pace' ? (
        <div className="lp-ok"><span className="ic" aria-hidden="true"><Icon name="check" size={16} stroke={3} /></span><div>No change needed. Four weeks in line with your pace, so we’ll keep things as they are.</div></div>
      ) : <div className="lp-lead">{CHECK_LEAD}</div>}
      <SideBySide week={r.week} span={r.span} cap={CHECK_ROWS} weight={weight} />
      {r.kind === 'options' && r.ctx === 'hard' && <div className="lp-say">After a week like this one, the sleep and stress options come first.</div>}
      {r.kind === 'options' ? (
        <>
          <div role="radiogroup" aria-label="Options" className="rv-radios">
            {r.options.map((x) => <OptionRow key={x} o={x} range={r.range} on={o === x} onPick={() => pickIt(x)} />)}
          </div>
          <button type="button" className="rv-keep" onClick={() => { choose('keep'); onClose() }}>Keep things as they are</button>
          <div className="rv-note">Nothing changes unless you choose it.</div>
        </>
      ) : <button type="button" className="rv-done" onClick={onClose}>Good, carry on</button>}
    </LoopSheet>
  )
}

/** ml-c3: keeping it steady, a drift in words, options from every pillar. */
function DriftSheet({ r, onClose }: { r: Extract<DriftSuggestion, { kind: 'drift' }>; onClose: () => void }) {
  const [o, setO] = useState<LoopOption | null>(null)
  const applyRange = useStore((s) => s.applyRangeChange)
  const setStart = useStore((s) => s.setSteadyStart)
  const choose = useStore((s) => s.chooseNextWeek)
  const pickIt = (x: LoopOption) => {
    setO(x)
    if ((x === 'range-less' || x === 'range-more') && r.range) applyRange(r.range)
    if (x === 'new-start') setStart(r.check.trend.level)
    choose('change-one', x)
    onClose()
  }
  return (
    <LoopSheet label="Keeping it steady" onClose={onClose}>
      <SheetHead title="Keeping it steady" close="Close" onClose={onClose} />
      <div className="lp-lead">Your weigh-ins have sat a little {r.side} your steady range for 2 weeks. That’s common, and there are a few ways to steer it.</div>
      <section className="lp-card" aria-label="Weight">
        <div className="lp-r"><span className="l food">Weight</span><span>Weighed in {r.weighIns} times over 2 weeks.</span></div>
      </section>
      <SideBySide week={r.week} cap="The last 2 weeks" />
      <div role="radiogroup" aria-label="Options" className="rv-radios">
        {r.options.map((x) => <OptionRow key={x} o={x} range={r.range} on={o === x} onPick={() => pickIt(x)} drift />)}
      </div>
      <button type="button" className="rv-keep" onClick={() => { choose('keep'); onClose() }}>Keep things as they are</button>
      <div className="rv-note">Nothing changes unless you choose it.</div>
    </LoopSheet>
  )
}

/** ml-b4: what keeps the person steady, going by what they log, as a range. "Use this range" is for maintain only. */
function LearnedSheet({ r, onClose }: { r: Extract<AdaptiveMaintenance, { kind: 'estimate' }>; onClose: () => void }) {
  const data = useStore((s) => s.data)
  const save = useStore((s) => s.saveTargets)
  const today = todayStr()
  const lo = Math.min(r.lo, r.start.lo), hi = Math.max(r.hi, r.start.hi)
  const pct = (x: number) => ((x - lo) / (hi - lo)) * 100
  const at = (x: number) => `${pct(x)}%`
  const span = weekPicture(data, r.from, shiftDay(today, -1), today)
  const week = weekPicture(data, shiftDay(today, -7), shiftDay(today, -1), today)
  const next = learnedTarget(data, r, latestWeight(data, today) ?? 0)
  const use = () => {
    if (!next) return
    // the person's own range width stays (nutrition-accuracy: the ± is the estimate's uncertainty, not a day's)
    save(next.target)
    onClose()
  }
  const ticks = [...new Set([r.start.lo, r.lo, r.hi, r.start.hi])].sort((a, b) => a - b)
  return (
    <LoopSheet label="Your range, from your logs" onClose={onClose}>
      <SheetHead title="Your range, from your logs" close="Close" onClose={onClose} />
      <section className="rv-card lp-learn">
        <div className="k">What your logs say keeps you steady</div>
        <div className="big num">{fmt(r.lo)} to {fmt(r.hi)} <small>kcal a day</small></div>
        <div className="bar" aria-hidden="true">
          <div className="wide" style={{ left: at(r.start.lo), width: `calc(${at(r.start.hi)} - ${at(r.start.lo)})` }} />
          <div className="narrow" style={{ left: at(r.lo), width: `calc(${at(r.hi)} - ${at(r.lo)})` }} />
          {/* the end labels sit inside the card: the first left-aligned, the last right-aligned */}
          {ticks.map((x, i) => <span key={x} className={'tk num' + (i === 0 ? ' first' : i === ticks.length - 1 ? ' last' : '')} style={{ left: at(x) }}>{fmt(x)}</span>)}
        </div>
        <div className="d num">Narrower than the starting estimate of {fmt(r.start.lo)} to {fmt(r.start.hi)}, which came from your answers. It’s what keeps you steady going by what you log, so it works as a target even if some things go unlogged.</div>
        {next?.floored && <div className="d">Tali keeps your target at a safe minimum, so it starts a little higher than this.</div>}
      </section>
      <SideBySide week={week} span={span} cap={`Based on the last ${Math.round(r.days / 7)} weeks`}
        food={<><b>{r.loggedDays} complete days</b> logged, averaging {fmt(r.avgKcal)} kcal</>}
        weight={<><b>{r.weighIns} weigh-ins</b></>} />
      {next ? (
        <>
          <button type="button" className="rv-done" onClick={use}>Use this range</button>
          <button type="button" className="rv-keep" onClick={onClose}>Keep my current range</button>
        </>
      ) : <button type="button" className="rv-done" onClick={onClose}>Good to know</button>}
    </LoopSheet>
  )
}

/** ml-c4: the one-time ask. Two equal choices; closing it leaves weight out. */
function WeightAskSheet({ onAnswer }: { onAnswer: (on: boolean) => void }) {
  return (
    <LoopSheet label="Include your weight in reviews?" onClose={() => onAnswer(false)}>
      <div className="lp-hd"><h2>Include your weight in reviews?</h2></div>
      <div className="lp-lead">It’s up to you. If you turn it on, your review shows how often you weighed in and, after 4 weeks, how things are going in words. Never a chart or a week-to-week number. You can change this any time.</div>
      <div className="lp-chipsrow" aria-hidden="true">{['Sleep', 'Stress', 'Mood', 'Hunger', 'Movement', 'Food', 'Weight'].map((c) => <span key={c}>{c}</span>)}</div>
      <button type="button" className="rv-done" onClick={() => onAnswer(true)}>Include it</button>
      <button type="button" className="rv-keep" onClick={() => onAnswer(false)}>Leave it out</button>
    </LoopSheet>
  )
}

const DAYS: [number, string, string][] = [[1, 'M', 'Monday'], [2, 'T', 'Tuesday'], [3, 'W', 'Wednesday'], [4, 'T', 'Thursday'], [5, 'F', 'Friday'], [6, 'S', 'Saturday'], [0, 'S', 'Sunday']]
export const dayName = (d: number) => DAYS.find((x) => x[0] === d)![2]

/** ml-d1: the review day, and the opt-in reminder (off unless the person says "Remind me"). */
export function ReviewDaySheet({ onClose }: { onClose: () => void }) {
  const day = useStore((s) => s.data.profile.reviewDay ?? 0)
  const push = useStore((s) => s.data.profile.reviewPush)
  const time = useStore((s) => s.data.profile.reviewPushTime ?? '09:00')
  const setPrefs = useStore((s) => s.setPrefs)
  const setReviewPush = useStore((s) => s.setReviewPush)
  const showToast = useStore((s) => s.showToast)
  const remind = async () => {
    const ok = await setReviewPush(true)
    showToast(ok ? 'Weekly reminder on' : typeof Notification !== 'undefined' && Notification.permission === 'denied' ? 'Notifications are off for Tali in your settings' : 'Couldn’t turn the reminder on. Try again when you’re online')
  }
  return (
    <LoopSheet label="Your weekly review" onClose={onClose}>
      <SheetHead title="Your weekly review" close="Done" onClose={onClose} />
      <div className="lp-lead">A two-minute look back at your week, with everything side by side.</div>
      <div className="lp-chipsrow" aria-hidden="true">{['Sleep', 'Stress', 'Mood', 'Hunger', 'Movement', 'Food', 'Weight'].map((c) => <span key={c}>{c}</span>)}</div>
      <section className="lp-sec" aria-labelledby="lp-day-h">
        <h3 id="lp-day-h">Which day suits you?</h3>
        <div role="radiogroup" aria-labelledby="lp-day-h" className="lp-days">
          {DAYS.map(([n, s, full]) => <button key={n} type="button" role="radio" aria-checked={day === n} aria-label={full} className="lp-day" onClick={() => setPrefs({ reviewDay: n })}>{s}</button>)}
        </div>
        <div className="d">It’ll be waiting on Summary from {dayName(day)} morning. No pressure to open it that day.</div>
      </section>
      <section className="lp-sec" aria-labelledby="lp-rem-h">
        <h3 id="lp-rem-h">Want a reminder for your weekly review?</h3>
        <div className="d">One note on {dayName(day)}, nothing else.</div>
        {push
          ? <div className="rv-pills"><span className="rv-pill on" aria-live="polite">Reminder on</span><button type="button" className="rv-pill" onClick={() => setReviewPush(false)}>Turn it off</button></div>
          : <>
              <button type="button" className="rv-done sm" onClick={remind}>Remind me</button>
              <button type="button" className="rv-keep sm" onClick={() => { if (push === undefined) setPrefs({ reviewPush: false }); onClose() }}>No thanks</button>
            </>}
        {/* compliance, 8 Oct: what the note says and when, in the place it's switched on */}
        <div className="d">Once a week on {dayName(day)} at {time} UK time. It only says “Your week is ready”, nothing from your log. Turn it off any time in Profile.</div>
      </section>
    </LoopSheet>
  )
}
