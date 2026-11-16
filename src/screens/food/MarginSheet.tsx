import { useStore } from '@/store/store'
import { CAPTURE_LABEL, biggestMarginSource, dayMargin } from '@/core/domain/estimate'
import { Sheet } from '@/ui/primitives'
import { MARGIN } from '@/copy/food'

/** Explains the ± on the day total: honest about what the log knows. */
export function MarginSheet({ onClose }: { onClose: () => void }) {
  const foods = useStore((s) => s.data.days[s.cur]?.foods) ?? []
  const margin = dayMargin(foods)
  const top = biggestMarginSource(foods)
  return (
    <Sheet title={MARGIN.title} left={null} onClose={onClose} right={<button className="navbtn b" onClick={onClose}>{MARGIN.done}</button>}>
      <div className="card" style={{ textAlign: 'center' }}>
        <div className="big num">± {margin}<small>kcal</small></div>
        <div className="sub">{MARGIN.todaysMargin}</div>
      </div>
      <div className="prose" style={{ padding: '0 4px' }}>
        <p>{MARGIN.p1}</p>
        <p>{MARGIN.p2}</p>
        {top && <p><b>{MARGIN.biggest}</b> {MARGIN.biggestWhat(CAPTURE_LABEL[top])}</p>}
        <p className="muted">{MARGIN.context}</p>
      </div>
    </Sheet>
  )
}
