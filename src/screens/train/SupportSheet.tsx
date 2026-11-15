import { useStore } from '@/store/store'
import { quietNumbers } from '@/data/consent'
import { Sheet, Toggle } from '@/ui/primitives'
import { SUPPORT_LINES } from '@/copy/train'

/**
 * A quiet way to support from the load note (workout plan §0.5, ai-platform-plan §4.2 item 3).
 * The lines and their check date live in src/copy/train.ts (SUPPORT_LINES).
 */

export function SupportSheet({ onClose }: { onClose: () => void }) {
  const gentle = useStore((s) => quietNumbers(s.data))
  const setPrefs = useStore((s) => s.setPrefs)
  return (
    <Sheet title="Support" onClose={onClose} left={null} right={<button className="navbtn b" onClick={onClose}>Done</button>}>
      <p style={{ fontSize: 17, lineHeight: 1.4, margin: '4px 4px 14px' }}>
        Finding it hard to ease off is more common than you might think, and talking to someone can help.
      </p>
      <div className="list">
        {SUPPORT_LINES.map(([name, num, note]) => (
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
