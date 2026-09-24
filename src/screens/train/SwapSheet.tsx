import type { Exercise } from '@/core/types'
import { alternativesFor } from '@/core/domain/library'
import { EQUIPMENT_LABEL, CARE_LABEL, LEVEL_LABEL } from '@/core/data/libraryLabels'
import { Sheet } from '@/ui/primitives'

/** Shown with every swap (plan §4.0.4, wording from mental-performance). */
export const CARE_DISCLAIMER =
  'Tali will suggest gentler alternatives for these areas. This is general fitness guidance, not medical advice. If you have pain, an injury or a health condition, check with your GP or a physiotherapist before starting or changing exercise. Stop any movement that causes pain.'

function Row({ x, tag, onPick }: { x: Exercise; tag?: string; onPick: () => void }) {
  const kit = x.equipment.length ? x.equipment.map((q) => EQUIPMENT_LABEL[q]).join(' or ') : 'No equipment'
  return (
    <button className="li" onClick={onPick}>
      <div className="m">
        <div className="t">{x.n}</div>
        <div className="s">{[tag, LEVEL_LABEL[x.difficulty], kit, x.defaultRx].filter(Boolean).join(' · ')}</div>
        {x.care?.length ? <div className="s">Works {x.care.map((a) => CARE_LABEL[a]).join(', ')} quite a lot</div> : null}
      </div>
    </button>
  )
}

/**
 * Swap one exercise in today's card for another that fills the same slot: one step easier or
 * harder on its progression, or a similar move. It changes today only; the planned exercise is
 * one tap away.
 */
export function SwapSheet({ current, planned, onPick, onClose }: {
  current: Exercise
  /** the workout's own exercise for this slot, when something else is in it now */
  planned?: Exercise
  onPick: (id: string) => void
  onClose: () => void
}) {
  const alt = alternativesFor(planned ?? current)
  const pick = (id: string) => { onPick(id); onClose() }
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
      <div className="foot" style={{ padding: '12px 4px 0' }}>{CARE_DISCLAIMER}</div>
    </Sheet>
  )
}
