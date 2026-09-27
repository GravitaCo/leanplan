/** Tester feedback: the areas asked about, and the email the answers become. */

export const FEEDBACK_TO = 'benn@gravita.co'

export const FEEDBACK_AREAS = [
  { id: 'food', label: 'Logging food', hint: 'Searching, scanning barcodes, portions, meals' },
  { id: 'train', label: 'Workouts', hint: 'Train, following a workout, logging sets' },
  { id: 'plan', label: 'Planning your week', hint: 'Plan and your weekly schedule' },
  { id: 'summary', label: 'Summary and check-ins', hint: 'Your day at a glance, how you’re feeling' },
  { id: 'feel', label: 'Look and feel', hint: 'Speed, layout, how easy it is to use' },
] as const

export type FeedbackAreaId = (typeof FEEDBACK_AREAS)[number]['id']
export const FEEDBACK_RATINGS = ['Works well', 'It’s OK', 'Needs work', 'Haven’t tried'] as const
export type FeedbackRating = (typeof FEEDBACK_RATINGS)[number]

export interface FeedbackAnswers {
  areas: Partial<Record<FeedbackAreaId, { rating?: FeedbackRating; note?: string }>>
  wishes: string
  other: string
}

/** Whether anything has been answered (sending an empty email helps no one). */
export function hasFeedback(a: FeedbackAnswers): boolean {
  return !!(a.wishes.trim() || a.other.trim() || Object.values(a.areas).some((x) => x?.rating || x?.note?.trim()))
}

/** The email: one block per area answered, then the open questions, then app and device (for bugs). */
export function feedbackEmail(a: FeedbackAnswers, meta: { version?: string; device?: string }): { subject: string; body: string } {
  const out: string[] = []
  for (const area of FEEDBACK_AREAS) {
    const x = a.areas[area.id]
    const note = x?.note?.trim()
    if (!x?.rating && !note) continue
    out.push(`${area.label}: ${x?.rating ?? 'no rating'}`)
    if (note) out.push(note)
    out.push('')
  }
  if (a.wishes.trim()) out.push('What I’d like to see in Tali:', a.wishes.trim(), '')
  if (a.other.trim()) out.push('Anything else:', a.other.trim(), '')
  out.push('---', `App: ${meta.version || 'unknown'}`, `Device: ${meta.device || 'unknown'}`)
  return { subject: 'Tali tester feedback', body: out.join('\n') }
}

export function feedbackMailto(e: { subject: string; body: string }): string {
  return `mailto:${FEEDBACK_TO}?subject=${encodeURIComponent(e.subject)}&body=${encodeURIComponent(e.body)}`
}
