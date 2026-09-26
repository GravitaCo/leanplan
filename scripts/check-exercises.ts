/** `npm run check:exercises`: validates the exercise library (plan §5.2–5.4, P3). Fails on errors. */
import { EXERCISES } from '@/core/data/exercises'
import { WORKOUTS, SWAPS } from '@/core/data/workouts'
import { CARDIO_MET } from '@/core/data/constants'
import { MODALITIES } from '@/core/data/modalities'
import { CARE_LABEL, EQUIPMENT_LABEL, LEVEL_LABEL, SHAPE_LABEL, TARGET_LABEL } from '@/core/data/libraryLabels'
import committed from '../docs/data/exercise-ids.json'

const errors: string[] = []
// the allowed values come from the exhaustive label maps, so a new union member can't be missed here
const MODALITY: string[] = MODALITIES
const SHAPES = Object.keys(SHAPE_LABEL)
const EQUIP = Object.keys(EQUIPMENT_LABEL)
const AREAS = Object.keys(CARE_LABEL)
const LEVELS = Object.keys(LEVEL_LABEL)
const PATTERNS = ['horizontal-push', 'vertical-push', 'horizontal-pull', 'vertical-pull', 'squat', 'hinge', 'lunge', 'isolation', 'carry', 'core']
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
console.log(`${EXERCISES.length} exercises · ${MODALITY.map((m) => `${m} ${count(m)}`).join(' · ')} · ${chains.size} progression chains`)
if (errors.length) {
  console.error(`\n${errors.length} error(s):\n  ` + errors.join('\n  '))
  process.exit(1)
}
console.log('OK')
