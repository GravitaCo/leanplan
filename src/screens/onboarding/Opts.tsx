/**
 * The wizard's option list (radio or tick rows, board ob1), shared with Profile's Health check
 * answers and the 12-week check-in (ob7), so it lives outside the lazily loaded wizard.
 */
import { Icon } from '@/ui/icons'

export function Opts<T extends string>({ opts, value, onPick, label, multi }: { opts: readonly (readonly [T, string, string?])[]; value: T | T[] | undefined; onPick: (v: T) => void; label: string; multi?: boolean }) {
  const on = (k: T) => (Array.isArray(value) ? value.includes(k) : value === k)
  return (
    <div className="wz-opts" role={multi ? 'group' : 'radiogroup'} aria-label={label}>
      {opts.map(([k, t, s]) => (
        <button key={k} role={multi ? 'checkbox' : 'radio'} aria-checked={on(k)} className={'wz-opt' + (on(k) ? ' on' : '')} onClick={() => onPick(k)}>
          <span className="m"><span className="t">{t}</span>{s && <span className="s">{s}</span>}</span>
          <span className={'wz-dot' + (multi ? ' sq' : '')}>{on(k) && <Icon name="check" size={14} stroke={2.6} />}</span>
        </button>
      ))}
    </div>
  )
}
