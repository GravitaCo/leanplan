/**
 * Unload's notes (board B8), without React or DOM: the one module the Unload screens (web
 * UnloadSheet.tsx and the native one) use to read, add and delete notes. It is the only screen-side
 * importer of the device-only notes accessors (deviceOnly.ts NOTE_ACCESSORS;
 * scripts/wellbeing/data-device.ts checks the import graph). Notes never leave this phone: no sync,
 * no AI, no push, and no console call here.
 */
import { useStore } from '@/store/store'
import { addUnloadNote, deleteUnloadNote, unloadNotes, UNLOAD_MAX_NOTES, UNLOAD_MAX_PAIRS, UNLOAD_NOTE_MAX_CHARS, type AddNoteResult, type NotesContext, type UnloadNote, type UnloadPair } from '@/data/deviceOnly'
import type { PersistedState } from '@/data/persistence'
import { DAY_NAME } from '@/core/domain/date'
import { UNLOAD } from './copy'

export type Refusal = Extract<AddNoteResult, { ok: false }>['reason']
export type { NotesContext, UnloadNote, UnloadPair }
export { UNLOAD_MAX_PAIRS }

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const chars = (x: string | undefined) => [...(x ?? '').trim()].length

/** This device's notes for the session (none while signed out, with an owner question, or for another owner). */
export const notesFor = (data: PersistedState, ctx: NotesContext): UnloadNote[] => unloadNotes(data, ctx)

/**
 * Why Done is off, before the device is asked (deviceOnly.addUnloadNote gives the same answers):
 * 'empty' with nothing written, 'not-now' signed out, an owner question pending, no owner recorded
 * or health consent withdrawn, 'too-long' past UNLOAD_NOTE_MAX_CHARS, 'full' with
 * UNLOAD_MAX_NOTES kept, 'too-many-pairs' past UNLOAD_MAX_PAIRS ("Add another" stops before it).
 * Only 'empty' has a reason anyone can see on the board; the others have no approved words yet
 * (needs copy from Benn), so Done stays off with no message.
 */
export function unloadBlocked(input: { pairs: UnloadPair[]; ok?: string }, ctx: NotesContext & { owner: boolean }, kept: number): Refusal | null {
  if (!input.pairs.some((p) => chars(p.mind) || chars(p.next)) && !chars(input.ok)) return 'empty'
  if (!ctx.signedIn || ctx.ownerAsk || !ctx.owner || !ctx.healthAllowed) return 'not-now'
  if (input.pairs.length > UNLOAD_MAX_PAIRS) return 'too-many-pairs'
  if (input.pairs.reduce((t, p) => t + chars(p.mind) + chars(p.next), 0) + chars(input.ok) > UNLOAD_NOTE_MAX_CHARS) return 'too-long'
  if (kept >= UNLOAD_MAX_NOTES) return 'full'
  return null
}

/**
 * Done: the note goes into this device's store only (the store's writeNotes, with the session facts
 * from selectNotesContext: signedIn, never authed, so it works offline), then the skill use is
 * logged (logSkill: the id and the time, never the text) and the toast says where it went. No
 * "Saved" toast when the device couldn't store it (the store has already said so).
 */
export function saveUnload(input: { pairs: UnloadPair[]; ok?: string }): { ok: true; stored: boolean } | { ok: false; reason: Refusal } {
  const st = useStore.getState()
  const { result, stored } = st.writeNotes((s, ctx) => addUnloadNote(s, input, ctx))
  if (!result.ok) return result
  st.logSkill('unload')
  if (stored) st.showToast(UNLOAD.saved)
  return { ok: true, stored }
}

/** B8.16: delete one earlier note, on this device only. */
export function deleteUnload(id: string): boolean {
  return useStore.getState().writeNotes((s, ctx) => deleteUnloadNote(s, id, ctx)).result
}

/** "Tuesday 6 October" (board wp-b8-more), in the device's own time. */
export function noteDay(at: string): string {
  const d = new Date(at)
  return `${DAY_NAME[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`
}

/** An earlier note's lines: each thought with its next step ("… Next step: …"), a next step on its
 *  own when the thought was left empty, then the "went OK" line. */
export function noteLines(n: Pick<UnloadNote, 'pairs' | 'ok'>): string[] {
  const lines = n.pairs.map((p) => {
    if (!p.next) return p.mind
    if (!p.mind) return UNLOAD.nextPrefix + p.next
    return p.mind + (/[.!?…]$/.test(p.mind) ? ' ' : '. ') + UNLOAD.nextPrefix + p.next
  })
  return n.ok ? [...lines, n.ok] : lines
}
