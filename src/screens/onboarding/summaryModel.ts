/**
 * The onboarding summary's view logic (Design canvas row Onboarding 3, r6-summary; ob9-1), pure and
 * free of React and the DOM, so the web summary (./Summary.tsx) and the native one show the same
 * week, reasons, Food card and save the same thing on Start. The model itself is the core's
 * summaryFor; this only arranges it for the screen.
 */
import { finishedProfile, type SummaryModel, type WhyRow, type WizardDraft } from '@/core/domain/wizard'
import { phasesOf, phaseWeek, templateById, type PlanTemplate } from '@/core/domain/plans'
import { keyTitle } from '@/core/domain/routines'
import { renderWhy, type GeneratedPlan, type PlannedSession, type PlannedSlot } from '@/core/domain/engine'
import { WEEK_ORDER } from '@/core/domain/engine/inputs'
import { suggestedTargets } from '@/core/domain/nutrition'
import { explainStart } from '@/core/domain/targets'
import { EXERCISE_BY_ID } from '@/core/data/exercises'
import type { MacroTarget, Profile, Routine, Why } from '@/core/types'

const uniq = (xs: string[]) => [...new Set(xs)]

/** "Goblet squat: a gentler choice for the knees." → "A gentler choice for the knees." */
export const afterName = (t: string): string => { const i = t.indexOf(': '); const r = i > 0 && i < 48 ? t.slice(i + 2) : t; return r.charAt(0).toUpperCase() + r.slice(1) }

/** A Tilo plan chosen instead of the suggested week ("See other plans"), if any. */
export const chosenPlan = (d: WizardDraft): PlanTemplate | undefined => templateById(d.planChoice)

/**
 * The hero's photo: a chosen plan's own; otherwise Full body system for the suggested week and
 * Pure muscle growth for the starter week (ob3-1, ob3-4).
 */
export const heroPlan = (m: SummaryModel, chosen: PlanTemplate | undefined): PlanTemplate | undefined =>
  chosen ?? templateById(m.result.starter ? 'pure-muscle-growth' : 'full-body-system')

const CHIP_ORDER = ['days', 'areas', 'kit', 'ease', 'weekdays', 'minutes', 'enjoy', 'walks', 'time', 'impact']
const chipRank = (k: string) => { const i = CHIP_ORDER.indexOf(k); return i < 0 ? CHIP_ORDER.length : i }
/** Four reasons from the person's own answers first (r6-summary: days, sore spots, kit, a gentle start). */
export const reasonChips = (rows: readonly WhyRow[]): WhyRow[] =>
  rows.filter((x) => x.key !== 'warmup').sort((x, y) => chipRank(x.key) - chipRank(y.key)).slice(0, 4)

const sessionsOf = (m: SummaryModel) => m.result.plan.sessions
const dayCount = (m: SummaryModel) => sessionsOf(m).filter((s) => !s.optional).length

/** The week's shape under the hero's title (r6-summary): "3 days · about 30 min · at home". */
export function shapeLine(d: WizardDraft, m: SummaryModel): string {
  const sessions = sessionsOf(m)
  const n = dayCount(m)
  const mins = sessions.length ? Math.round(sessions.reduce((a, s) => a + s.mins, 0) / sessions.length / 5) * 5 : 30
  const where = d.where === 'mix' ? 'a mix' : d.where === 'outdoors' ? 'outdoors' : d.where === 'gym' ? 'at a gym' : m.result.starter && !d.where ? 'no equipment' : 'at home'
  return `${n} ${n === 1 ? 'day' : 'days'} · about ${mins} min · ${where}`
}

/** "See other plans" (ob3-6): the suggested week's line, and its day count for planFitLine. */
export function mineLine(d: WizardDraft, m: SummaryModel): { line: string; days: number } {
  const sessions = sessionsOf(m)
  const n = dayCount(m)
  const mins = sessions.length ? Math.round(sessions.reduce((a, s) => a + s.mins, 0) / sessions.length) : 30
  const where = d.where === 'mix' ? 'a mix' : d.where === 'outdoors' ? 'outdoors' : d.where ?? (m.result.starter ? 'no equipment' : 'home')
  return { line: `${n} ${n === 1 ? 'day' : 'days'} · about ${mins} min · ${where}`, days: n }
}

/** One day of the week strip, Monday first: its sessions (tappable) or a chosen plan's workouts, and their names. */
export interface StripDay { wd: number; sessions: PlannedSession[]; on: boolean; name: string }
export function weekStrip(m: SummaryModel, chosen: PlanTemplate | undefined, routines: readonly Routine[] | undefined): StripDay[] {
  const byDay = new Map<number, PlannedSession[]>()
  for (const s of sessionsOf(m)) byDay.set(s.weekday, [...(byDay.get(s.weekday) ?? []), s])
  const tWeek = chosen ? phaseWeek({ phases: phasesOf(chosen) }, 0) : null
  return WEEK_ORDER.map((wd) => {
    const sessions = tWeek ? [] : byDay.get(wd) ?? []
    const keys = tWeek?.[wd] ?? []
    const name = sessions.map((x) => x.name).join(', ') || keys.map((k) => keyTitle(k, routines as Routine[])).join(', ')
    return { wd, sessions, on: sessions.length > 0 || keys.length > 0, name }
  })
}

/** The day sheet: an exercise's name without its bracketed variant, and its first reason (sets and reps are in the note). */
export const exerciseName = (exId: string): string => EXERCISE_BY_ID[exId]?.n.replace(/\s*\([^)]*\)\s*$/, '') ?? exId
export function slotLine(x: PlannedSlot): string {
  const main = [...x.why.filter((w) => w.about === 'exercise' && w.code !== 'calibration' && w.code !== 'starter'), ...x.why.filter((w) => w.about !== 'exercise' && w.code !== 'calibration')]
  return main.length ? afterName(renderWhy(main[0])) : renderWhy(x.why[0] ?? { code: 'starter', about: 'exercise' })
}
/** The day sheet's note: the session's reasons and the plan's ease-in and dose, at most three. */
export const dayNote = (s: PlannedSession, whys: readonly Why[]): string[] =>
  uniq([...s.why, ...whys.filter((w) => w.about === 'ease-in' || w.about === 'dose')].map(renderWhy)).slice(0, 3)
/** A reason's sheet: its own lines, then its rendered reasons, each once. */
export const whyLines = (row: WhyRow): string[] => [...(row.lines ?? []), ...uniq(row.whys.map(renderWhy))]

/** Which Food card the summary shows (ob4-7, ob4-9, ob9-1), in the web's order. */
export type FoodCardKind = 'pregnancy' | 'no-consent' | 'no-age' | 'no-weight' | 'no-height' | 'yes' | 'sometimes' | 'maintenance' | 'start'
export function foodCardKind(m: SummaryModel): FoodCardKind {
  const t = m.targets
  if (t.hidden === 'pregnancy' || t.hidden === 'no-consent' || t.hidden === 'no-age' || t.hidden === 'no-weight' || t.hidden === 'no-height') return t.hidden
  // Yes has no number; Sometimes a range on Food, no number on the summary
  if (m.routing.foodMode === 'yes' && t.hidden === 'gentle') return 'yes'
  if (m.routing.foodMode === 'sometimes' && !t.hidden) return 'sometimes'
  if (t.hidden || t.kcal == null || !t.maintenance || !explainStart(t)) return 'maintenance'
  return 'start'
}

/**
 * What Start saves (the only thing that changes the person's plan and targets, §10, §12): the
 * finished profile; targets on a first run only; the generated week unless a Tilo plan was chosen
 * or a redo keeps its week; today's weigh-in, except a redo's weight left as it was.
 */
export function startPayload(m: SummaryModel, d: WizardDraft, x: { at: string; today: string; base: Profile; rebuild: boolean }): { profile: Profile; plan: GeneratedPlan | null; target: MacroTarget | null; weightKg: number | null } {
  const first = d.mode === 'first'
  const profile = finishedProfile(m, d, x.at, x.today, x.base)
  const sug = first && m.targets.kcal != null ? suggestedTargets(profile, m.kg, m.routing) : null
  const target = sug && 'kcal' in sug ? { kcal: sug.kcal, p: sug.p, c: sug.c, f: sug.f } : null
  const weightKg = !first || (d.redo && d.weight === d.redo.weight) ? null : m.kg
  return { profile, plan: x.rebuild && !chosenPlan(d) ? m.result.plan : null, target, weightKg }
}
