import { useStore } from '@/store/store'
import { CAPTURE_LABEL, biggestMarginSource, dayMargin } from '@/core/domain/estimate'
import { Sheet } from '@/ui/primitives'

/** Explains the ± on the day total: honest about what the log knows. */
export function MarginSheet({ onClose }: { onClose: () => void }) {
  const foods = useStore((s) => s.data.days[s.cur]?.foods) ?? []
  const margin = dayMargin(foods)
  const top = biggestMarginSource(foods)
  return (
    <Sheet title="About this estimate" left={null} onClose={onClose} right={<button className="navbtn b" onClick={onClose}>Done</button>}>
      <div className="card" style={{ textAlign: 'center' }}>
        <div className="big num">± {margin}<small>kcal</small></div>
        <div className="sub">today's margin</div>
      </div>
      <div className="prose" style={{ padding: '0 4px' }}>
        <p>No food log is exact. Portions are guessed, labels round, and cooking changes things. Instead of pretending, Tali shows how sure it is.</p>
        <p>Weighed food is very close. Servings and your usual portions are close. Hand estimates and quick estimates are rougher. The margin combines them all.</p>
        {top && <p><b>Biggest source today:</b> {CAPTURE_LABEL[top].toLowerCase()} entries.</p>}
        <p className="muted">For context, careful manual logging typically misses 20% or more. Roughly right every day beats precise now and then.</p>
      </div>
    </Sheet>
  )
}
