import { useStore } from '@/store/store'
import { Sheet, Toggle } from '@/ui/primitives'

/**
 * A quiet way to support from the load note (workout plan §0.5, ai-platform-plan §4.2 item 3).
 * General wellness only: no diagnosis words. Numbers checked on 24 Sep 2026 against
 * samaritans.org and beateatingdisorders.org.uk; re-check them whenever this copy is touched.
 */
const LINES: [string, string, string][] = [
  ['Samaritans', '116 123', 'Free, any time, day or night (UK and Ireland)'],
  ['Beat (England)', '0808 801 0677', 'Eating disorder support, 3pm to 8pm, Monday to Friday'],
  ['Beat (Scotland)', '0808 801 0432', '3pm to 8pm, Monday to Friday'],
  ['Beat (Wales)', '0808 801 0433', '3pm to 8pm, Monday to Friday'],
  ['Beat (Northern Ireland)', '0808 801 0434', '3pm to 8pm, Monday to Friday'],
  ['NHS 111', '111', 'For health advice when it isn\'t an emergency'],
]

export function SupportSheet({ onClose }: { onClose: () => void }) {
  const gentle = useStore((s) => !!s.data.profile.gentle)
  const setPrefs = useStore((s) => s.setPrefs)
  return (
    <Sheet title="Support" onClose={onClose} left={null} right={<button className="navbtn b" onClick={onClose}>Done</button>}>
      <p style={{ fontSize: 17, lineHeight: 1.4, margin: '4px 4px 14px' }}>
        Finding it hard to ease off is more common than you might think, and talking to someone can help.
      </p>
      <div className="list">
        {LINES.map(([name, num, note]) => (
          <a className="li" key={name} href={'tel:' + num.replace(/\s/g, '')} style={{ textDecoration: 'none' }}>
            <div className="m"><div className="t">{name}</div><div className="s">{note}</div></div>
            <span className="num" style={{ color: 'var(--tint)' }}>{num}</span>
          </a>
        ))}
      </div>
      <div className="foot" style={{ padding: '0 4px 14px' }}>In an emergency, call 999.</div>
      <div className="list">
        <div className="li">
          <div className="m"><div className="t">Gentle mode</div><div className="s">Hides calorie numbers and body weight</div></div>
          <Toggle on={gentle} label="Gentle mode" onChange={() => setPrefs({ gentle: !gentle })} />
        </div>
      </div>
    </Sheet>
  )
}
