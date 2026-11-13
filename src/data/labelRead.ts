/**
 * Reading a label photo, and what follows it, for both apps (the web's LabelCaptureView and the
 * native label screen call this one function). No React and no UI.
 *
 * Gates first: no photo leaves the phone before the health answer (its consent record can't sync
 * yet), or with an under-18 age on screen. Then the label-photo consent given moments ago is sent
 * (the server checks it), then `readLabel` (the same request body), then the draft for the confirm
 * view, or the typed-in fallback with its note. `discard` runs as soon as there's an answer, so a
 * photo kept anywhere on the device goes at once.
 */
import type { ScanDraft } from '@/core/domain/barcode'
import { draftFromLabel, emptyLabelDraft } from '@/core/domain/label'
import { FAIL_NOTE, LABEL } from '@/copy/scan'
import type { readLabel, LabelReadResult } from './labelReader'

export type FailStatus = Exclude<LabelReadResult['status'], 'ok'>

/** What the screen does next: open the confirm view with `draft` (and `notice` when the read
 *  failed and the label is to be typed in), or, sharing a saved food, go back with `note`. */
export type ReadOutcome =
  | { kind: 'confirm'; draft: ScanDraft; notice?: string }
  | { kind: 'share-failed'; status: FailStatus; note: string }

export interface ReadDeps {
  /** consentLetsSync(state.data): the health answer is in, so a consent record can sync */
  consentLetsSync: () => boolean
  underAge: () => boolean
  flushConsents: () => Promise<unknown>
  readLabel: typeof readLabel
  /** forgets the photos wherever the device holds them: run as soon as the read has an answer */
  discard: () => void
  signal?: AbortSignal
}

export interface ReadInput {
  /** the photos as base64 JPEGs (no data: prefix); made inside the read, so a failure there is
   *  an error like any other */
  photos: () => Promise<{ panel: string; front?: string }>
  barcode?: string
  /** the Open Food Facts draft this photo replaces the numbers of */
  base?: ScanDraft
  /** names already taken (built-in and saved foods), for a unique name */
  taken: string[]
  /** opened from a saved food's "Share this product": a failed read goes back, nothing typed */
  forShare?: boolean
}

/** The confirm view's starting point when the label is typed in instead. */
export const typedDraft = (i: Pick<ReadInput, 'barcode' | 'base' | 'taken'>): ScanDraft =>
  i.base ? { ...i.base } : emptyLabelDraft({ barcode: i.barcode, base: i.base, taken: i.taken })

/** Why the read failed, then what to do: back to Open Food Facts' figures, or type it in. */
export const failNotice = (status: FailStatus, base: boolean): string =>
  FAIL_NOTE[status] + (base ? LABEL.thenOff : status === 'unavailable' ? LABEL.thenUnavailable : LABEL.thenType)

export async function readPhotos(i: ReadInput, d: ReadDeps): Promise<ReadOutcome> {
  let res: LabelReadResult
  try {
    if (!d.consentLetsSync()) throw new Error('no consent answer yet')
    if (d.underAge()) throw new Error('under age')
    await d.flushConsents()
    const p = await i.photos()
    res = await d.readLabel({ panel: p.panel, ...(p.front ? { front: p.front } : {}), ...(i.barcode ? { barcode: i.barcode } : {}) }, { signal: d.signal })
  } catch {
    res = { status: 'error' }
  } finally {
    d.discard()
  }
  if (res.status === 'ok') {
    const draft = draftFromLabel(res.read, { barcode: i.barcode, base: i.base, taken: i.taken })
    return { kind: 'confirm', draft: res.share ? { ...draft, share: res.share } : draft }
  }
  if (i.forShare) return { kind: 'share-failed', status: res.status, note: FAIL_NOTE[res.status] }
  return { kind: 'confirm', draft: typedDraft(i), notice: failNotice(res.status, !!i.base) }
}
