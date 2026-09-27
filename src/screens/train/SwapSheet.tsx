import { useState } from 'react'
import type { Exercise } from '@/core/types'
import { exById } from '@/core/domain/library'
import { alternativesFor } from '@/core/domain/library'
import { EQUIPMENT_LABEL, careList, LEVEL_LABEL } from '@/core/data/libraryLabels'
import { Sheet } from '@/ui/primitives'

/** The shared part of the §4.0.4 disclaimer; each place adds its own first sentence (mental-performance). */
export const CARE_DISCLAIMER =
  'This is general fitness guidance, not medical advice. If you have pain, an injury or a health condition, check with your GP or a physiotherapist before starting or changing exercise. Stop any movement that causes pain.'

function Row({ x, tag, onPick }: { x: Exercise; tag?: string; onPick: () => void }) {
  const kit = x.equipment.length ? x.equipment.map((q) => EQUIPMENT_LABEL[q]).join(' or ') : 'No equipment'
  return (
    <button className="li" onClick={onPick}>
      <div className="m">
        <div className="t">{x.n}</div>
        <div className="s">{[tag, tag === 'Easier' || tag === 'Harder' ? '' : LEVEL_LABEL[x.difficulty], kit, x.defaultRx].filter(Boolean).join(' · ')}</div>
        {x.care?.length ? <div className="s">Asks quite a lot of {careList(x.care)}</div> : null}
      </div>
    </button>
  )
}

/**
 * Swap one exercise in today's card for another that fills the same slot: one step easier or
 * harder on its progression, or a similar move. It changes today only; the planned exercise is
 * one tap away.
 */
export function SwapSheet({ current, planned, shorter, loggedSets = 0, onPick, onClose }: {
  current: Exercise
  /** a shorter day: no "Harder" step (no progression prompts that day, plan §4.0.5) */
  shorter?: boolean
  /** the workout's own exercise for this slot, when something else is in it now */
  planned?: Exercise
  /** working sets already logged today for this slot: the swap asks first (they are kept, not wiped) */
  loggedSets?: number
  onPick: (id: string) => void
  onClose: () => void
}) {
  const [confirm, setConfirm] = useState<string | null>(null)
  const all = alternativesFor(planned ?? current)
  const alt = shorter ? { ...all, harder: undefined } : all
  const pick = (id: string) => { if (loggedSets > 0 && !confirm) { setConfirm(id); return } onPick(id); onClose() }
  const to = exById(confirm ?? undefined)
  if (confirm && to) {
    return (
      <Sheet title="Swap exercise" onClose={onClose} animate={false}>
        <div className="sub" style={{ padding: '0 4px 14px' }}>
          You've logged {loggedSets} {loggedSets === 1 ? 'set' : 'sets'} of {current.n} today. {loggedSets === 1 ? 'It stays' : 'They stay'} in today's log, and {to.n} starts fresh.
        </div>
        <div className="stack" style={{ marginTop: 0 }}>
          <button className="btn" onClick={() => { onPick(confirm); onClose() }}>Swap to {to.n}</button>
          <button className="btn gray" onClick={() => setConfirm(null)}>Keep {current.n}</button>
        </div>
      </Sheet>
    )
  }
  const shown = (x?: Exercise) => x && x.id !== current.id
  return (
    <Sheet title="Swap exercise" onClose={onClose} tall>
      <div className="foot" style={{ padding: '0 4px 12px' }}>
        Instead of <b>{current.n}</b>, today only. Your workout stays the same for next time.
      </div>
      {planned && planned.id !== current.id && (
        <div className="list"><Row x={planned} tag="Back to planned" onPick={() => pick(planned.id)} /></div>
      )}
      {(shown(alt.easier) || shown(alt.harder)) && (
        <>
          <div className="grp-h">Same move, different step</div>
          <div className="list">
            {shown(alt.easier) && <Row x={alt.easier!} tag="Easier" onPick={() => pick(alt.easier!.id)} />}
            {shown(alt.harder) && <Row x={alt.harder!} tag="Harder" onPick={() => pick(alt.harder!.id)} />}
          </div>
        </>
      )}
      {alt.similar.some(shown) ? (
        <>
          <div className="grp-h">Works the same area</div>
          <div className="list">
            {alt.similar.filter(shown).map((x) => (
              <Row key={x.id} x={x} tag={x.id === (planned ?? current).gentler ? 'Gentler' : undefined} onPick={() => pick(x.id)} />
            ))}
          </div>
        </>
      ) : (
        !planned && !alt.easier && !alt.harder && <div className="foot" style={{ padding: '0 4px' }}>There's nothing similar in the library yet.</div>
      )}
      <div className="foot" style={{ padding: '12px 4px 0' }}>Easier and gentler options are here for any day, for any reason. {CARE_DISCLAIMER}</div>
    </Sheet>
  )
}
