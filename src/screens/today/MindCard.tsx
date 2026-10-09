/**
 * Summary's Mind card with the wellbeing flag on (board B2; B9 for the one thing). Tapping the card
 * opens the Mind tab. Before the check-in a "Check in" button opens the sheet in one tap. On a hard
 * day a divider and "A lighter day is still a good day." Then the day's one thing, when the asks
 * budget gave it the slot: chips from thingOptions (Mind-led on a hard day, no food chip), then
 * "Today: {thing}" with Done and Change, then a quiet tick with "Make it a plan" (only for a thing
 * with an approved prefill, and not once today's Mind plan is saved). A chip whose thing
 * has a skill screen (Reset) also opens it on the Mind tab, only with MIND_REVIEWED (plan WP14).
 */
import type { CheckIn, IfThenPlan, Pillar } from '@/core/types'
import { skillById, thingByKey, thingText, type Thing } from '@/core/data/skills'
import { MIND_REVIEWED } from '@/data/wellbeingFlag'
import { MOODS } from '@/core/domain/insights'
import { useStore, type MindView } from '@/store/store'
import { pressable } from '@/ui/primitives'
import { Chevron, Icon } from '@/ui/icons'
import { SUMMARY_MIND } from './summaryCopy'
import { checkedIn, checkinTime, makePlanOffered } from './summary'

const DOT: Record<Pillar, string> = { mind: 'var(--mind)', food: 'var(--food)', move: 'var(--move)' }

/** The Mind view a picked chip opens: its skill, when that skill has a reviewed screen; else none. */
export function thingView(t: Thing, reviewed: boolean): MindView | null {
  const sk = t.skill ? skillById(t.skill) : undefined
  return reviewed && sk?.screen && (sk.id === 'reset' || sk.id === 'unload') ? sk.id : null
}

export interface MindCardProps {
  checkin: CheckIn | null | undefined
  isToday: boolean
  /** today is a hard day (mind.hardDay) */
  hard: boolean
  /** the asks budget gave the one thing the slot today */
  thingSlot: boolean
  /** thingOptions(...) for today */
  options: Thing[]
  windDownAt?: string
  onOpen: () => void
  onCheckIn: () => void
  /** "Make it a plan" (B9.8): opens the prefilled Mind plan sheet (today/ThingPlanSheet) */
  onMakePlan: (thing: Thing) => void
  /** the profile's plans, so "Make it a plan" hides once today's Mind plan is saved (makePlanOffered) */
  plans?: readonly IfThenPlan[]
  /** the day shown, "YYYY-MM-DD" */
  day: string
}

export function MindCard({ checkin: c, isToday, hard, thingSlot, options, windDownAt, onOpen, onCheckIn, onMakePlan, plans, day }: MindCardProps) {
  const pickThing = useStore((s) => s.pickThing)
  const doneThing = useStore((s) => s.doneThing)
  const clearThing = useStore((s) => s.clearThing)
  const openMind = useStore((s) => s.openMind)
  const pick = (t: Thing) => {
    if (!pickThing(t.key)) return
    const view = thingView(t, MIND_REVIEWED)
    if (view) openMind(view)
  }
  const done = checkedIn(c)
  const time = checkinTime(c?.t)
  const mood = c?.mood ? MOODS[c.mood - 1]?.toLowerCase() : undefined
  const title = !done ? (isToday ? SUMMARY_MIND.ask : SUMMARY_MIND.askPast) : mood ? SUMMARY_MIND.feeling(mood) : time ? SUMMARY_MIND.checkedInAt(time) : SUMMARY_MIND.checkedIn
  const sub = !done ? SUMMARY_MIND.askSub : mood && time ? SUMMARY_MIND.checkedInAt(time) : null

  // the one thing: picked (a known key), else the chips; only today, only after the check-in
  const picked = isToday && done ? thingByKey(c?.thing?.key) : undefined
  const txt = (s: string) => thingText(s, { windDownAt })
  const chips = isToday && done && thingSlot && !picked && options.length > 0
  const lighter = isToday && done && hard

  return (
    <section className="card pcard wb-mind" aria-label="Mind">
      <div className="wb-mind-row" {...pressable(onOpen)}>
        <span className="psq" style={{ background: 'var(--mind-fill)', color: 'var(--mind-ink)' }}><Icon name="mind" size={20} /></span>
        <span className="m">
          <span className="pk" style={{ color: 'var(--mind-ink)' }}>Mind</span>
          <span className="pt">{title}</span>
          {sub && <span className="ps">{sub}</span>}
        </span>
        {done
          ? <Chevron />
          : <button className="btn sm" onClick={(e) => { e.stopPropagation(); onCheckIn() }}>{SUMMARY_MIND.checkIn}</button>}
      </div>
      {(lighter || chips || picked) && <div className="wb-sep" />}
      {lighter && <div className="wb-lighter">{SUMMARY_MIND.lighter}</div>}
      {chips && (
        <>
          <div className="wb-lead">{SUMMARY_MIND.thingLead}</div>
          <div className="chips wb-things">
            {options.map((t) => (
              <button key={t.key} className="chip" aria-pressed="false" onClick={() => pick(t)}>
                <span className="dot" style={{ background: DOT[t.pillar] }} />{txt(t.label)}
              </button>
            ))}
          </div>
        </>
      )}
      {picked && !c?.thing?.done && (
        <>
          <div className="wb-today"><span className="dot" style={{ background: DOT[picked.pillar] }} />{SUMMARY_MIND.today(txt(picked.label))}</div>
          <div className="wb-acts">
            <button className="linkbtn" onClick={() => doneThing()}>{SUMMARY_MIND.done}</button>
            <button className="linkbtn" onClick={() => clearThing()}>{SUMMARY_MIND.change}</button>
          </div>
        </>
      )}
      {picked && c?.thing?.done && (
        <>
          <div className="wb-done"><span className="tick"><Icon name="check" size={16} stroke={2.6} /></span>{txt(picked.done)}</div>
          {makePlanOffered(picked, plans, day) && <button className="linkbtn wb-plan" onClick={() => onMakePlan(picked)}>{SUMMARY_MIND.makePlan}</button>}
        </>
      )}
    </section>
  )
}
