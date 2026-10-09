import type { BodyArea, Goal, Modality, MovementPattern, Why, WhyAbout, WhyCode, WhyData } from '@/core/types'
import { EXERCISE_BY_ID } from '@/core/data/exercises'
import { CARE_LABEL } from '@/core/data/libraryLabels'
import { DAY_NAME } from '../date'

/**
 * "Why this?" copy for the training engine (§3.6). A reason is stored as a code plus data; this
 * turns it into a sentence at display time, offline, with no AI. Copy follows the engine doc §5
 * and the mental-performance guardrails: second person, warm, offering rather than instructing, no
 * blame, never a percentage or a "x of y done", nothing from BANNED_COPY. AI may later reword a
 * reason online but never adds one; this text is always there.
 */

const GOAL_WORDS: Record<Goal, string> = {
  'build-muscle': 'building muscle',
  'increase-strength': 'getting stronger',
  'lose-fat': 'losing fat',
  'increase-endurance': 'building stamina',
  'feel-better': 'feeling better day to day',
}
const EXP_WORDS: Record<string, string> = { beginner: 'just starting', intermediate: 'getting comfortable', advanced: 'confident with exercise' }
const MOD_WORDS: Record<Modality, string> = { strength: 'weights', calisthenics: 'bodyweight moves', cardio: 'cardio', yoga: 'yoga', pilates: 'pilates', mobility: 'mobility work' }
const PATTERN_WORDS: Partial<Record<MovementPattern, string>> = {
  squat: 'squat', lunge: 'lunge', hinge: 'hip hinge', 'horizontal-push': 'pushing', 'vertical-push': 'overhead pushing',
  'horizontal-pull': 'rowing', 'vertical-pull': 'pulling-down', core: 'core', isolation: 'single-muscle', carry: 'carry',
}
export const SPLIT_WORDS: Record<string, string> = {
  'full-body': 'Full-body sessions',
  'upper-lower': 'An upper and lower split',
  ppl: 'Legs, push and pull days',
  hybrid: 'Legs, push and pull days plus an upper and a lower day',
  none: 'Sessions built around what you enjoy',
}

/** "Romanian deadlift (dumbbell or barbell)" → "Romanian deadlift" */
export function exName(id: string | undefined, other?: string): string {
  const n = (id && EXERCISE_BY_ID[id]?.n) || 'This one'
  const bare = n.replace(/\s*\([^)]*\)\s*$/, '')
  // two names that read the same once shortened keep their full names ("Pike push-up (incline)")
  if (other && other !== id && bare === ((EXERCISE_BY_ID[other]?.n || '').replace(/\s*\([^)]*\)\s*$/, ''))) return n
  return bare
}
const AMOUNT: Record<string, string> = { light: 'a light amount', moderate: 'a moderate amount' }
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1)
const list = (w: string[]) => (w.length > 1 ? `${w.slice(0, -1).join(', ')} and ${w[w.length - 1]}` : w.join(''))
const areas = (v?: string) => list((v || '').split(',').filter(Boolean).map((a) => CARE_LABEL[a as BodyArea] ?? a))
const days = (v?: string) => list((v || '').split(',').filter(Boolean).map((d) => DAY_NAME[+d]))
const restWords = (sec: number) => (sec >= 120 ? `${sec % 60 ? (sec / 60).toFixed(1).replace('.0', '') : sec / 60} minutes` : sec === 60 ? 'a minute' : `${sec} seconds`)

const DEFAULT_TEXT: Record<string, string> = {
  goal: "You haven't picked a goal yet, so the plan is set for feeling better day to day.",
  experience: "You haven't told us how confident you feel, so we've assumed you're just starting.",
  movingNow: "You haven't told us how much you move at the moment, so we've assumed not much yet.",
  daysPerWeek: "You haven't told us how many days suit you, so we've assumed 3.",
  minutes: "You haven't told us how long you have, so we've assumed 30 minutes.",
  place: "You haven't told us where you train, so we've assumed bodyweight moves plus any kit you mentioned.",
  equipment: "You haven't told us what kit you have, so we've assumed bodyweight moves.",
  enjoy: "You haven't told us what you enjoy, so the mix follows your goal.",
  bodyAreas: "You haven't told us about any areas to go easy on, so we've kept things low-impact.",
  readiness: "You haven't told us about your health, so we've started gently.",
  lately: "You skipped how things are lately, so we've started gently. You can update this by redoing setup.",
  ageBand: "You haven't told us your age, so there are no AI features for now and sets stay steady.",
}

const GUARDRAIL_TEXT: Record<string, string> = {
  'rest-day': 'Every week keeps at least one rest day.',
  'days-cap': 'Up to 3 days to start, so there is room to recover. You can add more later.',
  'readiness': "You mentioned something about your health, so we've started gently and kept it low-impact. It's worth checking with your GP or a health professional before you start.",
  'hold-volume': 'Sets stay the same for the first 4 weeks while you settle in.',
  'no-volume-increase': "Sets stay steady. Tali won't suggest adding more.",
  'deficit': "While you're eating less, sets stay at the lower end and weights hold steady.",
  'no-stall-checks': "Holding steady while you're eating less is a good result.",
  'lose-fat-six': 'Six days is a lot while losing fat, so the sixth is a light, optional session.',
  'words-only': 'Progress shows in words, not numbers.',
  'no-ai': 'Under 18 there are no AI features, and sets stay steady.',
  // age missing (legacy and starter paths only: onboarding requires it); never the under-18 line
  'no-ai-age': "You haven't told us your age, so there are no AI features for now and sets stay steady.",
  'no-impact': 'No jumping to start.',
}

const EVIDENCE_TEXT: Record<string, string> = {
  'who-strength': 'The WHO recommends strength work on 2 or more days a week for health. Want to add a day?',
  'add-cardio': 'Cardio builds stamina most directly. Want to add a session?',
  'twice-a-week': 'Each main muscle gets worked at least twice a week, which suits most people well.',
  'recovery': 'A short, easy session helps you recover between harder days.',
  'compound-first': "Bigger lifts go first, while you're fresh.",
  'own-range': 'This move keeps its own range. Reach the top of it on every set and the next step up is ready.',
  'ease-in': 'Week 1 is easier on purpose, while you find your feet.',
  'own-pace': 'Take it at your own pace, with slow, easy breathing.',
}

/**
 * The sentence for a reason. `data.field` and `data.about` come from the Why itself (see
 * renderWhy). Pure and total: an unknown combination still returns plain, neutral copy.
 */
export function whyText(code: WhyCode, data: WhyData & { field?: string; about?: WhyAbout } = {}): string {
  const { exId, alt, value, n, was, range, field, about } = data
  const name = exName(exId, alt)
  switch (code) {
    case 'goal': {
      const g = GOAL_WORDS[(value as Goal) ?? 'feel-better'] ?? 'your goal'
      if (about === 'reps') return range ? `${range} reps suit ${g}.` : `Reps set for ${g}.`
      if (about === 'rest') return n ? `About ${restWords(n)} rest between sets suits your goal.` : 'Rest between sets suits your goal.'
      if (about === 'mix') return value === 'lose-fat' ? `The mix of sessions is set for ${g}. Cardio is here for fitness and how everyday effort feels.` : `The mix of sessions is set for ${g}.`
      if (about === 'dose') return 'Sets start at the lower end while you work on losing fat, which keeps recovery easy.'
      if (about === 'exercise') {
        if (n === 1) return `${name} again: repeating the main lift is how strength builds.`
        if (exId && EXERCISE_BY_ID[exId]?.modality === 'cardio') return `${name} suits ${g}.`
        return `${name}: easy to add a little weight to as you get stronger.`
      }
      return `Set for ${g}.`
    }
    case 'experience':
      // gentle mode: the weekly amount in words, never a number (Benn)
      if (about === 'sets') return /^\d/.test(value ?? '') ? `${n ?? 'These'} sets here, from about ${value} hard sets a week per muscle.` : `${n ?? 'These'} sets here, ${AMOUNT[value ?? ''] ?? 'a steady amount'} this week.`
      if (about === 'dose') return /^\d/.test(value ?? '') ? `About ${value} hard sets a week per muscle to start, a good dose for someone ${EXP_WORDS[alt ?? ''] ?? 'at your level'}.` : `${cap(AMOUNT[value ?? ''] ?? 'a steady amount')} this week, a good start for someone ${EXP_WORDS[alt ?? ''] ?? 'at your level'}.`
      if (about === 'exercise') return alt ? `${name}, not ${lower(exName(alt, exId))}: a good match for where you are now.` : `${name}: a good match for where you are now.`
      return 'Matched to how confident you feel.'
    case 'moving-now':
      if (about === 'ease-in') return value === 'not-at-all' ? "You're not moving much right now, so the first two weeks ease in." : 'Week 1 eases in while you find your feet.'
      if (about === 'dose') return value === 'regularly' ? "You're already moving regularly, so sets start nearer the middle of the range." : "Fewer sets to start, since you're building up from here."
      if (about === 'exercise') return `${name} to start: a comfortable first step.`
      return 'Matched to how much you move at the moment.'
    case 'days':
      if (about === 'offer' || (about === 'days' && n === 1)) return "One day is a good start. A second day adds more when you're ready, if you'd like."
      if (about === 'split') return n === 1 ? 'One full-body session covers every main muscle.' : `${SPLIT_WORDS[value ?? ''] ?? 'This split'} across ${n ?? 'your'} strength days, so each muscle has time to recover.`
      if (field === 'weekdays') return `On ${days(value)}, the days you picked.`
      return `${n ?? 'These'} days a week, as you chose.`
    case 'minutes':
      if (about === 'sets') return was != null ? `${n} ${n === 1 ? 'set' : 'sets'}, not ${was}: ${value}-minute sessions.` : `${n} ${n === 1 ? 'set' : 'sets'} to fit ${value}-minute sessions.`
      if (about === 'exercise') return n === 1 ? `${name}: a short cool-down, as ${value}-minute sessions leave room for one.` : `${name}: quick to set up in a ${value}-minute session.`
      return `Built to fit ${value}-minute sessions.`
    case 'kit':
      if (about === 'plan') return field === 'place' ? `Built around where you train: ${list((value || '').split(',').filter(Boolean))}.` : 'Built around the kit you have.'
      if (field === 'place' && value === 'home') return alt ? `${name}, not ${lower(exName(alt, exId))}: quiet and fine in a small space at home.` : `${name}: fine in a small space at home.`
      if (field === 'place' && value === 'outdoors') return `${name}: you said you like to move outdoors.`
      return alt ? `${name}, not ${lower(exName(alt, exId))}: it fits the kit you have.` : `${name}: it fits the kit you have.`
    case 'enjoy':
      if (about === 'mix') return `More ${MOD_WORDS[value as Modality] ?? value ?? 'of what you enjoy'} in the week, since you enjoy it.`
      return `${name}: you said you enjoy ${MOD_WORDS[value as Modality] ?? 'this kind of movement'}.`
    case 'body-area':
      // left out: no gentler option for that slot, so it's dropped (it only ever swaps or leaves out)
      if (!exId) return `No ${PATTERN_WORDS[alt as MovementPattern] ?? 'extra'} move here, to go easy on ${areas(value)}.`
      return alt ? `${name} instead of ${lower(exName(alt, exId))}: a gentler choice for ${areas(value)}.` : `${name}: a gentler choice for ${areas(value)}.`
    case 'baseline':
      if (value === 'skipped') return "You skipped how things are lately, so we've started gently. You can update this by redoing setup."
      if (about === 'ease-in') return "A gentle start for the first two weeks, as things have been a lot lately. You can switch it off."
      if (about === 'dose') return "Things have been a lot lately, so we've started gently: fewer sets to begin with. You can update this by redoing setup."
      if (about === 'days') return "Up to 3 days to start, as things have been a lot lately. You can add more later."
      if (about === 'exercise') return `${name}: easier on your energy while you settle in.`
      if (value === 'pre-selected') return 'A gentle start is switched on for you. You can switch it off any time.'
      return "We've started gently. You can change this."
    case 'age-edge':
      if (value === 'balance') return `${name}: balance work helps you stay steady on your feet.`
      if (about === 'exercise') return alt ? `${name}, not ${lower(exName(alt, exId))}: fewer trips down to the floor.` : `${name}: fewer trips down to the floor.`
      return 'A few changes to keep things steady and comfortable.'
    case 'guardrail':
      if (about === 'exercise' || about === 'reps') return alt ? `${name} instead of ${lower(exName(alt, exId))}: no jumping to start.` : `${name}: no jumping to start.`
      return GUARDRAIL_TEXT[value ?? ''] ?? 'Kept on the lighter side to start.'
    case 'time-limited':
      return 'Short sessions still count. Two hard sets per exercise is a good start.'
    case 'variety':
      return alt ? `${name} here and ${lower(exName(alt, exId))} on another day, for variety.` : `${name}: a change from the other days, for variety.`
    case 'liked':
      return `${name}: you gave it a thumbs up.`
    case 'disliked':
      return alt ? `Something else in place of ${lower(exName(alt, exId))}, as you asked.` : 'Something else, as you asked.'
    case 'perf-top-of-range':
      return value ? `Try ${value} next time: you hit the top of the range on every set last time.` : 'You hit the top of the range on every set last time.'
    case 'perf-below-range':
      return value ? `Try ${value} next time. Some days are like that.` : 'A little lighter next time. Some days are like that.'
    case 'perf-stalled':
      return alt ? `Fancy a change? ${exName(alt)} works the same muscles. Or keep ${lower(name)}.` : 'Fancy a change? Or keep it as it is.'
    case 'feel':
      return `Based on how ${lower(name)} felt last time.`
    case 'recovery':
      return 'Based on your recent check-ins.'
    case 'adherence':
      return 'Want a week that fits better? Same exercises, on the days that tend to work for you.'
    case 'evidence':
      if (about === 'reps') return EVIDENCE_TEXT[value ?? ''] ?? 'Based on what works for most people.'
      if (value === 'flow') return `${name}: part of an easy session that helps you recover.`
      if (value === 'cooldown') return `${name}: a gentle stretch to finish.`
      if (value === 'cardio') return `${name}: steady cardio at a pace you can talk through.`
      if (about === 'exercise' || about === 'sets') { const w = PATTERN_WORDS[value as MovementPattern] ?? 'main'; return `${name}: ${/^[aeiou]/.test(w) ? 'an' : 'a'} ${w} move, part of covering the main muscles each week.` }
      return EVIDENCE_TEXT[value ?? ''] ?? 'Based on what works for most people.'
    case 'default':
      if (field === 'weekdays') return `You haven't picked days, so we've spread them out: ${days(value)}.`
      return DEFAULT_TEXT[field ?? ''] ?? "You haven't told us this yet, so we've kept to the safe side."
    case 'calibration':
      return "No wrong answer. Pick a weight that feels comfortable, with a few reps to spare. We'll adjust from how it felt."
    case 'starter':
      return 'Starter week: tell us more to personalise it.'
  }
}

/** A stored reason as its sentence. */
export const renderWhy = (w: Why): string => whyText(w.code, { ...w.data, field: w.field, about: w.about })

/**
 * Copy lint (engine §3.7 test 7, onboarding §4): none of these in anything the engine says.
 * "just for you" is allowed only with a data reason behind it, which day 1 never has.
 */
export const BANNED_COPY: RegExp[] = [
  /\bAI[- ]powered\b/i, /\blearns your body\b/i, /\boptimal\b/i, /\bperfect for you\b/i, /\bjust for you\b/i,
  /\bearn(s|ed|ing)?\b/i, /\bstreaks?\b/i, /\bmissed\b/i, /\bfail(s|ed|ing)?\b/i, /\bstalled\b/i, /\bbehind\b/i,
  /\bfell off\b/i, /\bonly\b/i, /\bshould\b/i, /%\s*adherence/i, /\b\d+\s+of\s+\d+\s+done\b/i, /\d+\s*%/,
  /\bideal\b/i, /\bproblem areas?\b/i, /\bburn(ing)? off\b/i, /\bcheat\b/i, /\bclean eating\b/i, /—/,
]
export const copyIssues = (text: string): string[] => BANNED_COPY.filter((r) => r.test(text)).map((r) => r.source)

/**
 * Wellbeing Phase 1's additions (build plan WP3): no skipping days, no readiness or recovery
 * scores. Kept apart from BANNED_COPY because approved engine and setup copy uses "skip" for
 * skipping a question ("Skip any question you like") and the engine's field name "readiness";
 * these apply to every Mind string and to Train's hard-day strings (mindCopyIssues).
 */
export const WELLBEING_BANNED: RegExp[] = [/\bskip(s|ped|ping)?\b/i, /\breadiness\b/i, /\brecovery debt\b/i, /\byou should rest\b/i]

/**
 * Exact strings that may use a banned word in an approved sense. Whole strings only, so the word
 * stays banned everywhere else. Empty for now (mental-performance, WP3 review): the accepted B3.17
 * says "jump rope" and passes on its own. Add an entry only when a final approved string needs one,
 * as the exact whole string.
 */
export const COPY_ALLOWED: ReadonlySet<string> = new Set<string>()

/**
 * Words kept off every Mind screen (copy deck §0, plan §3 and §8.1: no clinical, therapy or
 * scoring language), on top of BANNED_COPY and WELLBEING_BANNED. "treat" doesn't match "treatment", so the approved
 * S.2 line ("Not a treatment for any condition.") passes; "screen" is banned as screening only,
 * so "lock screen" passes.
 */
export const MIND_BANNED: RegExp[] = [
  /\bmeditat(e|es|ed|ing|ion|ions)\b/i, /\bmindful(ness)?\b/i, /\bjourney\b/i, /\bzen\b/i, /\btherap(y|ies|ist|eutic)\b/i,
  /\btreat(s|ed|ing)?\b/i, /\bcure(s|d)?\b/i, /\bclinical(ly)?\b/i, /\bdiagnos(e|es|ed|is|ing)\b/i,
  /\bscreening\b/i, /\bscreen(s|ed)? (for|you)\b/i, /\bdetect(s|ed|ing|ion)?\b/i, /\bsymptoms?\b/i,
  /\b(depression|depressed|anxiety disorder|insomnia|burnout|PTSD|ADHD)\b/i,
  /\bscores?\b/i, /\bstreaks?\b/i, /\breadiness\b/i, /\brecovery score\b/i, /\byou missed\b/i, /\byou haven'?t logged\b/i,
  // claim words under MHRA intended-purpose rules (mental-performance, WP3 review). "disorder" and
  // "mental health" stay allowed: B6 names "Eating disorder support" and "Mental health crisis line".
  /\banxi(ety|ous)\b/i, /\bpanic\b/i, /\bnervous system\b/i, /\bvag(us|al)\b/i, /\bcortisol\b/i,
  /\bHRV\b/i, /\bheart rate variability\b/i, /\bproven\b/i, /\bheal(s|ed|ing)?\b/i, /\bcalm(s)? your\b/i,
]
/** Copy lint for Mind and Train hard-day strings: BANNED_COPY, WELLBEING_BANNED and MIND_BANNED, less COPY_ALLOWED. */
export const mindCopyIssues = (text: string): string[] =>
  COPY_ALLOWED.has(text) ? [] : [...BANNED_COPY, ...WELLBEING_BANNED, ...MIND_BANNED].filter((r) => r.test(text)).map((r) => r.source)
