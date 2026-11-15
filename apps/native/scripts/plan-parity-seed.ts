/**
 * The seeded accounts for scripts/e2e-plan-parity.cjs: one per Plan state (native-build-plan N8:
 * none, choosing, preview, active, maintenance, finished, plus starting later, a next plan waiting,
 * carrying on and an own plan). Built with the shared core (the templates and phasesOf), so a plan
 * here is the shape the store itself makes. Bundled by esbuild at run time; prints JSON.
 */
import { PLAN_TEMPLATES, phasesOf, withEasierStart, cleanPhases } from '@/core/domain/plans'
import type { PlanPhase, TrainingPlan } from '@/core/types'

const NOW = new Date(process.env.E2E_NOW || '2026-11-14T12:00:00')
const ymd = (t: Date) => `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`
const ago = (n: number) => { const t = new Date(NOW); t.setDate(t.getDate() - n); return ymd(t) }
const UID = '11111111-2222-4333-8444-555555555555'
const CONSENT = { id: 'aaaaaaaa-bbbb-4ccc-8ddd-0000000000aa', type: 'health', version: '2026-09-v1', granted: true, at: '2026-09-20T08:00:00.000Z' }
const u = '2026-11-14T08:00:00.000Z'
const tpl = (id: string) => PLAN_TEMPLATES.find((t) => t.id === id)!

let n = 0
const plan = (o: Partial<TrainingPlan> & { phases: PlanPhase[] }): TrainingPlan => ({
  id: `00000000-0000-4000-8000-00000000000${++n}`, name: 'Plan', source: 'recommended', state: 'active', _u: u, ...o, phases: cleanPhases(o.phases),
})
const fromTpl = (id: string, startedAt: string, extra: Partial<TrainingPlan> = {}) =>
  plan({ name: tpl(id).name, baseTemplateId: id, phases: phasesOf(tpl(id)), startedAt, ...extra })
const after = (p: TrainingPlan, name: string, since: string, full = false): TrainingPlan =>
  ({ ...p, phases: [...p.phases, { id: 'aft', name, weeks: 1, after: true, since, ...(full ? { full: true } : {}), week: full ? {} : p.phases[p.phases.length - 1].week }] })

function base(trainingPlans: TrainingPlan[], extra: Record<string, unknown> = {}) {
  return {
    target: { kcal: 2250, p: 125, c: 260, f: 75 },
    schedule: { 0: 'Rest', 1: 'Push', 2: 'Rest', 3: 'Pull', 4: 'Cardio', 5: 'Legs', 6: 'Rest' },
    profile: {
      name: 'Sam Taylor', sex: 'F', sexAnswer: 'female', age: 44, height: 168, activityLevel: 'light', activityMult: 1.45, supplements: [], notificationsEnabled: false,
      goal: 'build-muscle', burnSwitch: '2026-01-01', training: { experience: 'beginner' },
      plans: [
        { id: 'p1', when: 'I get home from work hungry', then: 'have a yoghurt before I start cooking', cope: 'keep protein bars in my bag', created: ago(20), lastReview: ago(6), reviews: [{ d: ago(6), r: 'worked' }] },
        { id: 'p2', when: 'after my morning coffee', then: 'do my workout', created: ago(3), reviews: [] },
        { id: 'p3', when: 'I feel wound up after work', then: 'take a ten-minute walk', created: ago(2), reviews: [], kind: 'mind' },
      ],
      ...extra,
    },
    days: {}, customFoods: [], recipes: [], routines: [], trainingPlans,
    consents: { records: [CONSENT] },
    _meta: { settings: { u, dirty: false }, days: {}, foodDeletes: [], recipeDeletes: [], lastPull: u, owner: UID },
  }
}

const mid = fromTpl('pure-muscle-growth', ago(16))
const ended = fromTpl('full-body-system', ago(7 * 8 + 3))
const states: Record<string, unknown> = {
  none: base([]),
  active: base([mid]),
  easing: base([plan({ name: 'Stronger with age', baseTemplateId: 'stronger-with-age', phases: withEasierStart(phasesOf(tpl('stronger-with-age'))), startedAt: ago(2) })]),
  later: base([fromTpl('stronger-with-age', ago(-5))]),
  next: base([fromTpl('pure-muscle-growth', ago(80)), fromTpl('full-body-system', ago(-2))]),
  finished: base([ended]),
  maintenance: base([after(ended, 'Maintenance', ago(20))]),
  carrying: base([after(ended, 'Carrying on', ago(10), true)]),
  own: base([plan({ name: 'My 6-week plan', source: 'custom', phases: [{ id: 'b', name: 'Build', weeks: 6, week: { 1: ['Push'], 3: ['Pull', 'Cardio'], 5: ['Legs'] } }], startedAt: ago(9) })]),
}
// the stand-in server holds the same plans (as training_plans rows), so a pull keeps them
const rows = Object.fromEntries(Object.entries(states).map(([k, st]) => [k, {
  training_plans: (st as { trainingPlans: TrainingPlan[] }).trainingPlans.map((p) => ({
    id: p.id, user_id: UID, name: p.name, source: p.source, state: p.state, phases: p.phases, started_at: p.startedAt ?? null, completed_at: null,
    reflection: null, base_template_id: p.baseTemplateId ?? null, cloned_from_id: null, updated_at: u,
  })),
}]))
process.stdout.write(JSON.stringify({ states, rows }))
