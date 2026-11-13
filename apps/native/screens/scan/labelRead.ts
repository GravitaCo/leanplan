/**
 * Reading a label photo, with no UI: the web's LabelCaptureView `read()` and what follows it.
 * Gates first (no photo leaves the phone before the health answer, or with an under-18 age on
 * screen), the label-photo consent sent ahead of the photo (the server checks it), then the shared
 * `readLabel` (src/data/labelReader.ts, unchanged: the same request body), then the draft for the
 * confirm view or the typed-in fallback with the web's note.
 *
 * Proposal to the lead: move this into src/data/ so the web's view calls the same function.
 */
import type { ScanDraft } from '@/core/domain/barcode'
import { draftFromLabel, emptyLabelDraft } from '@/core/domain/label'
import type { readLabel, LabelReadResult } from '@/data/labelReader'

export type FailStatus = Exclude<LabelReadResult['status'], 'ok'>

/** What the screen does next: open the confirm view with `draft` (and `notice` when the read
 *  failed and the label is to be typed in), or, sharing a saved food, go back with `note`. */
export type ReadOutcome =
  | { kind: 'confirm'; draft: ScanDraft; notice?: string }
  | { kind: 'share-failed'; status: FailStatus }

export interface ReadDeps {
  /** consentLetsSync(state.data): the health answer is in, so a consent record can sync */
  consentLetsSync: () => boolean
  underAge: () => boolean
  flushConsents: () => Promise<unknown>
  readLabel: typeof readLabel
  signal?: AbortSignal
}

export interface ReadInput {
  panel: string
  front?: string
  barcode?: string
  /** the Open Food Facts draft this photo replaces the numbers of */
  base?: ScanDraft
  /** names already taken (built-in and saved foods), for a unique name */
  taken: string[]
  forShare?: boolean
}

/** The request body, exactly as the web builds it. */
export const readBody = (i: Pick<ReadInput, 'panel' | 'front' | 'barcode'>) => ({ panel: i.panel, ...(i.front ? { front: i.front } : {}), ...(i.barcode ? { barcode: i.barcode } : {}) })

/** The confirm view's starting point when the label is typed in instead. */
export const typedDraft = (i: Pick<ReadInput, 'barcode' | 'base' | 'taken'>): ScanDraft =>
  i.base ? { ...i.base } : emptyLabelDraft({ barcode: i.barcode, base: i.base, taken: i.taken })

/** The web's fallback note: why, then what to do (its `then`). Copy keys, worded by the screen. */
export const thenKey = (status: FailStatus, base: boolean): 'off' | 'unavailable' | 'type' =>
  base ? 'off' : status === 'unavailable' ? 'unavailable' : 'type'

export async function readPhotos(i: ReadInput, d: ReadDeps, note: (status: FailStatus, then: ReturnType<typeof thenKey>) => string): Promise<ReadOutcome> {
  let res: LabelReadResult
  try {
    // a photo goes to the server: not before the health answer (its consent record can't sync yet)
    if (!d.consentLetsSync()) throw new Error('no consent answer yet')
    // an under-18 age is on screen (Tilo is 18+): no photo leaves the phone
    if (d.underAge()) throw new Error('under age')
    // the server checks the label-photo consent itself: send a yes given moments ago first
    await d.flushConsents()
    res = await d.readLabel(readBody(i), { signal: d.signal })
  } catch {
    res = { status: 'error' }
  }
  if (res.status === 'ok') {
    const draft = draftFromLabel(res.read, { barcode: i.barcode, base: i.base, taken: i.taken })
    return { kind: 'confirm', draft: res.share ? { ...draft, share: res.share } : draft }
  }
  if (i.forShare) return { kind: 'share-failed', status: res.status }
  return { kind: 'confirm', draft: typedDraft(i), notice: note(res.status, thenKey(res.status, !!i.base)) }
}
