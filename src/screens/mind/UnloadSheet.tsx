import { useId, useState } from 'react'
import { useStore, selectNotesContext } from '@/store/store'
import { deleteUnload, noteDay, noteLines, notesFor, saveUnload, unloadBlocked, UNLOAD_MAX_PAIRS, type UnloadPair } from './unloadNotes'
import { BackButton, Sheet, focusOnMount } from '@/ui/primitives'
import { Chevron, Icon } from '@/ui/icons'
import { SHARED, UNLOAD } from './copy'
import { SupportSheet } from './SupportSheet'

export { noteDay, noteLines, unloadBlocked }

const blank = (): UnloadPair => ({ mind: '', next: '' })

/**
 * Unload (wellbeing board B8, canvas wp-b8-light/-dark/-more; approved for now by Benn, 8 Oct
 * 2026): a tall sheet with Cancel and Done. "On my mind" and "Next step" pairs, "Add another", the
 * optional "went OK" line, then Earlier notes, the device-only foot, the not-reading line (its
 * "support is here" opens Support), the crisis line and the support row. Reached only when
 * MIND_REVIEWED is on (the Mind page's Skills list).
 *
 * Its notes come only through unloadNotes.ts, the one screen-side importer of the device-only
 * notes accessors (scripts/wellbeing/data-device.ts checks the import graph). Notes never leave
 * this phone: no sync, no AI, no push, and no console call here.
 */
export function UnloadSheet({ onClose }: { onClose: () => void }) {
  const data = useStore((s) => s.data)
  const signedIn = useStore((s) => s.signedIn)
  const ownerAsk = useStore((s) => s.ownerAsk)
  const ctx = selectNotesContext({ data, signedIn, ownerAsk })
  const notes = notesFor(data, ctx)
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
              <textarea id={`${id}-n${i}`} className="ul-next" rows={2} value={p.next ?? ''} placeholder={UNLOAD.nextHint} autoComplete="off" onChange={(e) => setPair(i, { next: e.target.value })} />
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
