/**
 * Choice tiles (Design canvas "Refined direction", boards r1-goal and r5-enjoy): tall tiles, not
 * settings rows. The chosen tile fills with ink (--btn) and carries a check badge; a tile that
 * can be ticked shows an empty ring until it is.
 *
 * - ChoiceTiles: one answer (a radiogroup). Arrow keys move between tiles, Enter or Space picks.
 * - CheckTiles: any number (a group of checkboxes), stacked or as a two-column grid.
 */
import type { KeyboardEvent, ReactNode } from 'react'
import { Icon, type IconName } from './icons'

export interface TileOpt<T extends string> { k: T; t: string; s?: string; icon?: IconName }

const Badge = ({ on, ring }: { on: boolean; ring?: boolean }) =>
  on ? <span className="ctile-badge" aria-hidden="true"><Icon name="check" size={14} stroke={3} /></span>
    : ring ? <span className="ctile-badge ring" aria-hidden="true" /> : null

/** Arrow keys move focus through a group's tiles (roving focus); they never pick on their own. */
function arrows(e: KeyboardEvent<HTMLElement>) {
  const d = e.key === 'ArrowDown' || e.key === 'ArrowRight' ? 1 : e.key === 'ArrowUp' || e.key === 'ArrowLeft' ? -1 : 0
  if (!d) return
  const all = [...e.currentTarget.querySelectorAll<HTMLButtonElement>('button.ctile')]
  const i = all.indexOf(document.activeElement as HTMLButtonElement)
  const next = all[(i + d + all.length) % all.length]
  if (next) { e.preventDefault(); next.focus() }
}

export function ChoiceTiles<T extends string>({ label, opts, value, onPick, className, children }: {
  label: string; opts: readonly TileOpt<T>[]; value: T | undefined; onPick: (v: T) => void; className?: string; children?: ReactNode
}) {
  const focusable = value && opts.some((o) => o.k === value) ? value : opts[0]?.k
  return (
    <div className={'tiles' + (className ? ' ' + className : '')} role="radiogroup" aria-label={label} onKeyDown={arrows}>
      {opts.map((o) => {
        const on = value === o.k
        return (
          <button key={o.k} type="button" role="radio" aria-checked={on} tabIndex={o.k === focusable ? 0 : -1} className={'ctile' + (on ? ' on' : '') + (o.icon ? ' ic' : '')} onClick={() => onPick(o.k)}>
            {o.icon && <span className="ctile-ic" aria-hidden="true"><Icon name={o.icon} size={24} stroke={1.9} /></span>}
            <span className="m"><span className="t">{o.t}</span>{o.s && <span className="s">{o.s}</span>}</span>
            <Badge on={on} />
          </button>
        )
      })}
      {children}
    </div>
  )
}

export function CheckTiles<T extends string>({ label, opts, value, onToggle, grid, tall }: {
  label: string; opts: readonly TileOpt<T>[]; value: readonly T[]; onToggle: (v: T) => void
  /** two columns (your why, kit, enjoy); otherwise stacked (body areas, the medical question) */
  grid?: boolean
  /** the taller grid tile (enjoy, 92px) */
  tall?: boolean
}) {
  return (
    <div className={'tiles' + (grid ? ' grid' : '') + (tall ? ' tall' : '')} role="group" aria-label={label} onKeyDown={arrows}>
      {opts.map((o) => {
        const on = value.includes(o.k)
        return (
          <button key={o.k} type="button" role="checkbox" aria-checked={on} className={'ctile' + (on ? ' on' : '')} onClick={() => onToggle(o.k)}>
            <span className="m"><span className="t">{o.t}</span>{o.s && <span className="s">{o.s}</span>}</span>
            <Badge on={on} ring />
          </button>
        )
      })}
    </div>
  )
}
