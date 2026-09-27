/** `npm run check:exercises`: validates the exercise library (plan §5.2–5.4, P3). Fails on errors. */
import { EXERCISES } from '@/core/data/exercises'
import { WORKOUTS, SWAPS } from '@/core/data/workouts'
import { CARDIO_MET } from '@/core/data/constants'
import { MODALITIES } from '@/core/data/modalities'
import { CARE_LABEL, EQUIPMENT_LABEL, LEVEL_LABEL, SHAPE_LABEL, TARGET_LABEL } from '@/core/data/libraryLabels'
import { COVERAGE_MIN, cellKey, coverage, coverageGate } from '@/core/domain/libraryCoverage'
import committed from '../docs/data/exercise-ids.json'
import knownGaps from '../docs/data/exercise-coverage-gaps.json'

const errors: string[] = []
// the allowed values come from the exhaustive label maps, so a new union member can't be missed here
const MODALITY: string[] = MODALITIES
const SHAPES = Object.keys(SHAPE_LABEL)
const EQUIP = Object.keys(EQUIPMENT_LABEL)
const AREAS = Object.keys(CARE_LABEL)
const LEVELS = Object.keys(LEVEL_LABEL)
const RESIST_PATTERNS = ['horizontal-push', 'vertical-push', 'horizontal-pull', 'vertical-pull', 'squat', 'hinge', 'lunge', 'isolation', 'carry', 'core']
const PATTERNS = [...RESIST_PATTERNS, 'mobility', 'cardio']
// engine attributes (personalised-training-engine.md §4.2)
const POSITIONS = ['standing', 'seated', 'bench', 'floor', 'hanging', 'water']
const PROPS = ['chair', 'sofa', 'step', 'wall', 'doorway', 'table', 'towel']
const STEPS = ['plate-2.5', 'next-weight', 'next-stack', 'next-band', 'chain', 'reps', 'time']
const LEVEL_N = { beginner: 0, intermediate: 1, advanced: 2 } as const
const MUSCLES = ['chest', 'back', 'quads', 'hamstrings', 'glutes', 'shoulders', 'biceps', 'triceps', 'calves', 'core', 'forearms']
const TARGETS = Object.keys(TARGET_LABEL)
// §5.4: left out on purpose (safety over novelty)
const EXCLUDED = /kipping|bench dip|headstand|shoulder stand|plough|plow|lotus|wheel pose|rollover|jackknife|neck pull|weighted sit|russian twist|behind[- ]the[- ]neck|box jump|depth jump|pistol/i
// cardio pieces logged without a burn estimate until nutrition-accuracy confirms a code (§2.9)
const NO_BURN_YET = new Set(['cardio-swim', 'cardio-jump-rope', 'cardio-intervals'])

const ids = new Set<string>()
for (const e of EXERCISES) {
  const at = `${e.id || '(no id)'}`
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(e.id)) errors.push(`${at}: id must be a lower-case slug`)
  if (ids.has(e.id)) errors.push(`${at}: duplicate id`)
  ids.add(e.id)
  if (!e.n?.trim()) errors.push(`${at}: no name`)
  if (!MODALITY.includes(e.modality)) errors.push(`${at}: bad modality ${e.modality}`)
  for (const m of e.also ?? []) if (!MODALITY.includes(m) || m === e.modality) errors.push(`${at}: bad also ${m}`)
  if (!SHAPES.includes(e.log)) errors.push(`${at}: bad log shape ${e.log}`)
  if (!LEVELS.includes(e.difficulty)) errors.push(`${at}: bad difficulty ${e.difficulty}`)
  for (const q of e.equipment ?? ['?']) if (!EQUIP.includes(q)) errors.push(`${at}: bad equipment ${q}`)
  if (!e.cue || e.cue.trim().length < 40) errors.push(`${at}: cue missing or too short`)
  if (/\u2014/.test(e.cue + e.n + (e.defaultRx ?? ''))) errors.push(`${at}: no em dashes in copy`)
  if (!e.defaultRx) errors.push(`${at}: no defaultRx`)
  else if (/\d\s*x\s*\d|\d-\d/.test(e.defaultRx)) errors.push(`${at}: defaultRx "${e.defaultRx}" must use × and en-dash ranges`)
  for (const t of [e.cue, e.n]) if (/\d-\d/.test(t)) errors.push(`${at}: use an en-dash for ranges in "${t.slice(0, 40)}…"`)
  if (e.pattern && !PATTERNS.includes(e.pattern)) errors.push(`${at}: bad pattern ${e.pattern}`)
  if ((e.modality === 'strength' || e.modality === 'calisthenics') && (!e.pattern || !e.primary)) errors.push(`${at}: resistance entries need a pattern and a primary muscle`)
  for (const m of [e.primary, ...(e.secondary ?? [])]) if (m && !MUSCLES.includes(m)) errors.push(`${at}: bad muscle ${m}`)
  for (const t of e.targets ?? []) if (!TARGETS.includes(t)) errors.push(`${at}: bad target ${t}`)
  for (const a of e.care ?? []) if (!AREAS.includes(a)) errors.push(`${at}: care "${a}" is not a BodyArea`)
  if (EXCLUDED.test(e.n) || EXCLUDED.test(e.id.replace(/-/g, ' '))) errors.push(`${at}: on the §5.4 left-out list`)
  if (e.modality === 'cardio' && e.log === 'duration' && !NO_BURN_YET.has(e.id) && e.cardioKey && !(e.cardioKey in CARDIO_MET)) errors.push(`${at}: cardioKey ${e.cardioKey} is not in CARDIO_MET`)

  // engine attributes: every entry has pattern, muscle (or targets), equipment, difficulty and time cost
  const resist = e.modality === 'strength' || e.modality === 'calisthenics'
  if (!e.pattern) errors.push(`${at}: no pattern`)
  else if (RESIST_PATTERNS.includes(e.pattern)) {
    if (!e.primary) errors.push(`${at}: pattern ${e.pattern} needs a primary muscle`)
  } else {
    // mobility and cardio never count toward muscle volume: they say what they work through targets or a cardio type
    if (e.primary) errors.push(`${at}: ${e.pattern} entries don't carry a primary muscle (it would count as volume)`)
    if (!e.targets?.length && !e.cardioVariation) errors.push(`${at}: ${e.pattern} entries need targets or a cardioVariation`)
  }
  if (resist && (e.pattern === 'mobility' || e.pattern === 'cardio')) errors.push(`${at}: resistance entries need a resistance pattern`)
  // guided.ts times rest from the pattern; outside strength and calisthenics only core keeps today's 60 s
  if (!resist && e.pattern && RESIST_PATTERNS.includes(e.pattern) && e.pattern !== 'core') errors.push(`${at}: ${e.modality} entries can't use pattern ${e.pattern} (it would change their rest)`)
  if (!e.equipment) errors.push(`${at}: no equipment list`)
  const tc = e.timeCost
  if (!tc || !(tc.setupSec >= 0) || !(tc.setSec > 0) || tc.setupSec > 600 || tc.setSec > 600) errors.push(`${at}: timeCost missing or out of range`)
  if (![1, 2, 3].includes(e.skill as number)) errors.push(`${at}: skill must be 1, 2 or 3`)
  if (!['none', 'low', 'high'].includes(e.impact as string)) errors.push(`${at}: impact must be none, low or high`)
  if (!POSITIONS.includes(e.position as string)) errors.push(`${at}: bad position ${e.position}`)
  if (!['low', 'medium', 'high'].includes(e.systemicCost as string)) errors.push(`${at}: systemicCost must be low, medium or high`)
  if (typeof e.homeFriendly !== 'boolean') errors.push(`${at}: homeFriendly must be set`)
  if (!e.increment?.length) errors.push(`${at}: no increment`)
  for (const s of e.increment ?? []) if (!STEPS.includes(s)) errors.push(`${at}: bad increment ${s}`)
  for (const p of e.props ?? []) if (!PROPS.includes(p)) errors.push(`${at}: bad prop ${p}`)
  // a load step has to match the kit the entry lists
  const kit = (...q: string[]) => e.equipment.some((x) => q.includes(x))
  if (e.increment?.includes('plate-2.5') && !kit('barbell')) errors.push(`${at}: plate-2.5 without a barbell`)
  if (e.increment?.includes('next-weight') && !kit('dumbbell', 'kettlebell')) errors.push(`${at}: next-weight without dumbbells or a kettlebell`)
  if (e.increment?.includes('next-stack') && !kit('machine', 'cable')) errors.push(`${at}: next-stack without a machine or cable`)
  // (the band-assisted pull-up's band is part of the move, so its kit is just the bar)
  if (e.increment?.includes('next-band') && !kit('band') && !e.id.startsWith('band-')) errors.push(`${at}: next-band without a band`)
  if (e.increment?.includes('chain') && !e.ladders?.length) errors.push(`${at}: increment "chain" but on no ladder`)
  if (e.homeFriendly && kit('barbell', 'machine', 'cable', 'cardio-machine') && !kit('dumbbell', 'kettlebell', 'band', 'bodyweight')) errors.push(`${at}: gym-only kit can't be homeFriendly`)
  if (e.impact === 'high' && !e.care?.includes('knees')) errors.push(`${at}: high-impact entries should flag the knees`)
}
const byId = new Map(EXERCISES.map((e) => [e.id, e]))
for (const e of EXERCISES) if (e.gentler && (!byId.has(e.gentler) || e.gentler === e.id)) errors.push(`${e.id}: gentler "${e.gentler}" is not another library id`)

// progression chains: steps 1..n with no gaps (two entries may share a step, like band-assisted
// and negative pull-ups)
const chains = new Map<string, number[]>()
for (const e of EXERCISES) if (e.progression) chains.set(e.progression.chain, [...(chains.get(e.progression.chain) ?? []), e.progression.step])
for (const [c, steps] of chains) {
  const top = Math.max(...steps)
  for (let s = 1; s <= top; s++) if (!steps.includes(s)) errors.push(`chain ${c}: step ${s} is missing`)
  if (top < 2) errors.push(`chain ${c}: a chain needs at least two steps`)
}

// engine ladders: steps 1..n with no gaps, at least two steps, never getting easier as they go up;
// fewer than three steps is a known gap (§4.2), reported below
const ladders = new Map<string, { id: string; step: number }[]>()
for (const e of EXERCISES) for (const l of e.ladders ?? []) ladders.set(l.chain, [...(ladders.get(l.chain) ?? []), { id: e.id, step: l.step }])
const shortLadders: string[] = []
for (const [c, rungs] of ladders) {
  const top = Math.max(...rungs.map((r) => r.step))
  for (let s = 1; s <= top; s++) if (!rungs.some((r) => r.step === s)) errors.push(`ladder ${c}: step ${s} is missing`)
  if (top < 2) errors.push(`ladder ${c}: a ladder needs at least two steps`)
  if (top < 3) shortLadders.push(`${c} (${top} steps)`)
  for (const a of rungs) for (const b of rungs) {
    if (a.step < b.step && LEVEL_N[byId.get(a.id)!.difficulty] > LEVEL_N[byId.get(b.id)!.difficulty]) errors.push(`ladder ${c}: ${a.id} (step ${a.step}) is harder than ${b.id} (step ${b.step})`)
  }
}

// §4.2 coverage (§3.7 test 0 gate): every slot pattern × kit profile × difficulty has COVERAGE_MIN
// candidates. The threshold stays as the engine doc sets it. Known gaps live in
// docs/data/exercise-coverage-gaps.json and may only shrink: a new gap fails, and a filled one
// must be taken off the list.
const gate = coverageGate(EXERCISES)
const known = new Set(knownGaps as string[])
const gapKeys = gate.gaps.map(cellKey)
for (const c of gate.gaps) if (!known.has(cellKey(c))) errors.push(`coverage: new gap ${cellKey(c)} (${c.ids.length} of ${COVERAGE_MIN}: ${c.ids.join(', ') || 'none'})`)
for (const k of known) if (!gapKeys.includes(k)) errors.push(`coverage: ${k} is covered now; take it off docs/data/exercise-coverage-gaps.json`)
const cells = coverage(EXERCISES)

// ids are never removed or renamed: every committed id must still exist; new ids are added to
// docs/data/exercise-ids.json on purpose
for (const id of committed as string[]) if (!ids.has(id)) errors.push(`${id}: committed id was removed or renamed`)
const fresh = [...ids].filter((id) => !(committed as string[]).includes(id))
if (fresh.length) errors.push(`new ids not yet in docs/data/exercise-ids.json: ${fresh.join(', ')}`)

// every shipped workout exercise maps to a library id, so "last time" survives the move
for (const [k, w] of Object.entries({ ...WORKOUTS, ...Object.fromEntries(Object.entries(SWAPS).map(([k, v]) => ['swap:' + k, v])) })) {
  for (const x of w.ex) {
    if (!x.id) errors.push(`${k} / ${x.n}: no library id`)
    else if (!byId.has(x.id)) errors.push(`${k} / ${x.n}: id ${x.id} is not in the library`)
    // one source of truth for the words: the card and the library say the same thing
    else if (byId.get(x.id)!.cue !== x.cue) errors.push(`${k} / ${x.n}: cue differs from library ${x.id}`)
  }
}

const count = (m: string) => EXERCISES.filter((e) => e.modality === m).length
console.log(`${EXERCISES.length} exercises · ${MODALITY.map((m) => `${m} ${count(m)}`).join(' · ')} · ${chains.size} progression chains · ${ladders.size} engine ladders`)
console.log(`coverage (≥${COVERAGE_MIN} per pattern × kit × difficulty): ${cells.length - gate.gaps.length} of ${cells.length} cells · gate ${gate.ok ? 'green' : 'red (engine tests 1 and 3 stay skipped)'}`)
if (gate.gaps.length) console.log('  gaps:\n    ' + gate.gaps.map((c) => `${cellKey(c)}: ${c.ids.length ? c.ids.join(', ') : 'none'}`).join('\n    '))
if (shortLadders.length) console.log(`  ladders under 3 steps: ${shortLadders.join(', ')}`)
if (errors.length) {
  console.error(`\n${errors.length} error(s):\n  ` + errors.join('\n  '))
  process.exit(1)
}
console.log('OK')
