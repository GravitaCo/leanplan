import { useId, useState } from 'react'
import { useStore, selectNotesContext } from '@/store/store'
import { addUnloadNote, deleteUnloadNote, unloadNotes, UNLOAD_MAX_NOTES, UNLOAD_MAX_PAIRS, UNLOAD_NOTE_MAX_CHARS, type AddNoteResult, type NotesContext, type UnloadNote, type UnloadPair } from '@/data/deviceOnly'
import { DAY_NAME } from '@/core/domain/date'
import { BackButton, Sheet, focusOnMount } from '@/ui/primitives'
import { Chevron, Icon } from '@/ui/icons'
import { SHARED, UNLOAD } from './copy'
import { SupportSheet } from './SupportSheet'

type Refusal = Extract<AddNoteResult, { ok: false }>['reason']

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const chars = (x: string | undefined) => [...(x ?? '').trim()].length

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

const blank = (): UnloadPair => ({ mind: '', next: '' })

/**
 * Unload (wellbeing board B8, canvas wp-b8-light/-dark/-more; approved for now by Benn, 8 Oct
 * 2026): a tall sheet with Cancel and Done. "On my mind" and "Next step" pairs, "Add another", the
 * optional "went OK" line, then Earlier notes, the device-only foot, the not-reading line (its
 * "support is here" opens Support), the crisis line and the support row. Reached only when
 * MIND_REVIEWED is on (the Mind page's Skills list).
 *
 * The only screen that imports the device-only notes accessors (deviceOnly.ts NOTE_ACCESSORS;
 * scripts/wellbeing/data-device.ts checks the import graph). Notes never leave this phone: no
 * sync, no AI, no push, and no console call here.
 */
export function UnloadSheet({ onClose }: { onClose: () => void }) {
  const data = useStore((s) => s.data)
  const signedIn = useStore((s) => s.signedIn)
  const ownerAsk = useStore((s) => s.ownerAsk)
  const ctx = selectNotesContext({ data, signedIn, ownerAsk })
  const notes = unloadNotes(data, ctx)
  const [pairs, setPairs] = useState<UnloadPair[]>([blank()])
  const [ok, setOk] = useState('')
  const [okOpen, setOkOpen] = useState(false)
  const [view, setView] = useState<'form' | 'earlier'>('form')
  const [support, setSupport] = useState(false)
  // back from Earlier notes: the sheet swaps its view in place rather than sliding up again
  const [moved, setMoved] = useState(false)
  const id = useId()

  const input = { pairs, ok }
  const blocked = unloadBlocked(input, { ...ctx, owner: !!data._meta?.owner }, notes.length)
  const setPair = (i: number, patch: Partial<UnloadPair>) => setPairs((ps) => ps.map((p, j) => (j === i ? { ...p, ...patch } : p)))
  const done = () => {
    if (blocked) return
    const r = saveUnload(input)
    if (r.ok) onClose()
  }

  const supportSheet = support && <SupportSheet onClose={() => setSupport(false)} />

  if (view === 'earlier' && notes.length) {
    return (
      <>
        <Sheet title={UNLOAD.earlier} onClose={onClose} tall animate={false} left={<BackButton label={UNLOAD.title} onClick={() => { setMoved(true); setView('form') }} />}>
          <div className="unload">
            <div className="list ul-notes">
              {notes.map((n) => {
                const day = noteDay(n.at)
                return (
                  <div className="li" key={n.id}>
                    <span className="m">
                      <span className="t">{day}</span>
                      {noteLines(n).map((l, i) => <span className="s" key={i}>{l}</span>)}
                    </span>
                    <button className="linkbtn" aria-label={`${UNLOAD.delete}, ${day}`} onClick={() => deleteUnload(n.id)}>{UNLOAD.delete}</button>
                  </div>
                )
              })}
            </div>
          </div>
        </Sheet>
        {supportSheet}
      </>
    )
  }

  return (
    <>
      <Sheet title={UNLOAD.title} onClose={onClose} tall animate={!moved}
        right={<button className="navbtn b" disabled={!!blocked} onClick={done}>Done</button>}>
        <div className="unload">
          <p className="ul-lead">{UNLOAD.lead}</p>
          {pairs.map((p, i) => (
            <div className="card ul-pair" key={i}>
              <label htmlFor={`${id}-m${i}`}>{UNLOAD.mind}</label>
              <textarea id={`${id}-m${i}`} rows={3} value={p.mind} placeholder={UNLOAD.mindHint} autoComplete="off" onChange={(e) => setPair(i, { mind: e.target.value })} />
              <label htmlFor={`${id}-n${i}`}>{UNLOAD.next}</label>
              <input id={`${id}-n${i}`} value={p.next ?? ''} placeholder={UNLOAD.nextHint} autoComplete="off" onChange={(e) => setPair(i, { next: e.target.value })} />
            </div>
          ))}
          <div className="list">
            {pairs.length < UNLOAD_MAX_PAIRS && (
              <button className="li act" onClick={() => setPairs((ps) => [...ps, blank()])}><Icon name="plus" size={17} stroke={2.4} /><span>{UNLOAD.addAnother}</span></button>
            )}
            <button className="li" aria-expanded={okOpen} onClick={() => setOkOpen((o) => !o)}>
              <span className="m"><span className="t">{UNLOAD.wentOk}</span></span>
              <Chevron rotate={okOpen ? 90 : 0} />
            </button>
            {okOpen && (
              <div className="li ul-ok">
                <input aria-label={UNLOAD.wentOk} value={ok} placeholder={UNLOAD.wentOkHint} autoComplete="off" ref={focusOnMount} onChange={(e) => setOk(e.target.value)} />
              </div>
            )}
            {notes.length > 0 && (
              <button className="li" onClick={() => { setMoved(true); setView('earlier') }}>
                <span className="m"><span className="t">{UNLOAD.earlier}</span></span>
                <Chevron />
              </button>
            )}
          </div>
          <div className="foot">{UNLOAD.local}</div>
          <div className="foot">{UNLOAD.notReadLead}<button className="linkbtn inl" onClick={() => setSupport(true)}>{UNLOAD.notReadLink}</button>.</div>
          <div className="foot">{UNLOAD.notCrisis}</div>
          <div className="list ul-support">
            <button className="li" onClick={() => setSupport(true)}>
              <span className="m"><span className="t">{SHARED.support}</span></span>
              <Chevron />
            </button>
          </div>
        </div>
      </Sheet>
      {supportSheet}
    </>
  )
}
