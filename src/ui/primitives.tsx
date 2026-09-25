/** Presentational primitives shared across screens (iOS grouped-list idiom). */
import { useEffect, type ReactNode, type KeyboardEvent } from 'react'
import { Icon, Chevron, type IconName } from './icons'

/** Category colour keys — each maps to --{key} and --{key}-ink tokens. */
export type Category = 'energy' | 'activity' | 'protein' | 'carbs' | 'fat' | 'body' | 'supps' | 'mind'

export function PageHeader({ eyebrow, title, right }: { eyebrow?: ReactNode; title: string; right?: ReactNode }) {
  return (
    <header className="hdr">
      <div>
        <div className="eyebrow">{eyebrow}</div>
        <h1 className="ltitle">{title}</h1>
      </div>
      {right}
    </header>
  )
}

/** Health-style card heading: category icon + label in the category colour. */
export function CatHead({ color, icon, label }: { color: Category; icon: IconName; label: string }) {
  return (
    <div className="hk-h">
      <div className="hk-c" style={{ color: `var(--${color}-ink)` }}>
        <Icon name={icon} size={17} />
        {label}
      </div>
    </div>
  )
}

/** Enter/Space activate a div acting as a button, matching native button behaviour. */
export function pressable(onPress: () => void) {
  return {
    role: 'button' as const,
    tabIndex: 0,
    onClick: onPress,
    onKeyDown: (e: KeyboardEvent) => {
      // only when the row itself has focus, not a nested button
      if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); onPress() }
    },
  }
}

export function Seg<T extends string>({ options, value, onChange }: { options: [T, string][]; value: T | undefined; onChange: (v: T) => void }) {
  return (
    <div className="seg" role="radiogroup">
      {options.map(([v, label]) => (
        <button key={v} role="radio" aria-checked={v === value} className={v === value ? 'on' : ''} onClick={() => onChange(v)}>
          {label}
        </button>
      ))}
    </div>
  )
}

export function Toggle({ on, onChange, disabled, label }: { on: boolean; onChange: () => void; disabled?: boolean; label: string }) {
  return <button className={'toggle' + (on ? ' on' : '')} role="switch" aria-checked={on} aria-label={label} disabled={disabled} onClick={onChange} />
}

/** Settings-row icon: a soft pillar square (Profile) or a solid category square. */
function RowIcon({ icon, color, soft }: { icon: IconName; color: string; soft?: boolean }) {
  return <span className={'ico' + (soft ? ' soft' : '')} style={{ background: color }}><Icon name={icon} size={18} /></span>
}

/** Grouped-list row that navigates or opens something (icon · label · value · chevron). */
export function SettingRow({ icon, color, soft, label, sub, value, onPress, right }: {
  icon: IconName; color: string; soft?: boolean; label: string; sub?: ReactNode; value?: ReactNode; onPress?: () => void; right?: ReactNode
}) {
  const body = (
    <>
      <RowIcon icon={icon} color={color} soft={soft} />
      <div className="m"><div className="t">{label}</div>{sub != null && <div className="s">{sub}</div>}</div>
      {value != null && <span className="tr num">{value}</span>}
      {right ?? (onPress && <Chevron />)}
    </>
  )
  return onPress ? <button className="li" onClick={onPress}>{body}</button> : <div className="li">{body}</div>
}

/** Grouped-list row that expands in place (settings sections). */
export function Disclosure({ icon, color, soft, label, value, open, onToggle, children }: {
  icon: IconName; color: string; soft?: boolean; label: string; value?: ReactNode; open: boolean; onToggle: () => void; children: ReactNode
}) {
  return (
    <>
      <button className="li" onClick={onToggle} aria-expanded={open}>
        <RowIcon icon={icon} color={color} soft={soft} />
        <div className="m"><div className="t">{label}</div></div>
        {value != null && !open && <span className="tr num">{value}</span>}
        <Chevron rotate={open ? 90 : 0} />
      </button>
      {open && <div className="acc-bd">{children}</div>}
    </>
  )
}

/**
 * Bottom sheet with an iOS navigation header (left action · title · right action).
 * `left` defaults to Cancel; pass null for nothing. Locks page scroll while open.
 */
export function Sheet({ title, onClose, left, right, tall, animate = true, children }: {
  title: string; onClose: () => void; left?: ReactNode | null; right?: ReactNode; tall?: boolean
  /** false when swapping views inside an already-open sheet, so it doesn't slide up again */
  animate?: boolean
  children: ReactNode
}) {
  useScrollLock()
  useEscape(onClose)
  return (
    <div className="sheet-root">
      <div className="sheet-bg" onClick={onClose} style={animate ? undefined : { animation: 'none' }} />
      <div className={'sheet' + (tall ? ' tall' : '')} role="dialog" aria-modal="true" aria-label={title} style={animate ? undefined : { animation: 'none' }}>
        <div className="grabber" />
        <div className="sheet-hd">
          <div>{left === undefined ? <button className="navbtn" onClick={onClose}>Cancel</button> : left}</div>
          <div className="sh-t">{title}</div>
          <div className="sh-r">{right}</div>
        </div>
        <div className="sheet-bd">{children}</div>
      </div>
    </div>
  )
}

export function BackButton({ onClick, label = 'Back' }: { onClick: () => void; label?: string }) {
  return (
    <button className="navbtn" onClick={onClick}>
      <Icon name="chevL" size={20} stroke={2.6} />
      {label}
    </button>
  )
}

/**
 * A bottom sheet without the navigation header, for sheets whose first line is their own large
 * title (the player's Adjust and Finish sheets). Escape and the backdrop close it.
 */
export function BareSheet({ label, onClose, className, children }: { label: string; onClose: () => void; className?: string; children: ReactNode }) {
  useScrollLock()
  useEscape(onClose)
  return (
    <div className="sheet-root">
      <div className="sheet-bg" onClick={onClose} />
      <div className={'sheet bare' + (className ? ' ' + className : '')} role="dialog" aria-modal="true" aria-label={label}>
        <div className="grabber" />
        <div className="sheet-bd">{children}</div>
      </div>
    </div>
  )
}

/**
 * Lock page scroll while an overlay is open. Counted, so closing a sheet over the player (or a
 * sheet over a sheet) doesn't unlock the page while something else is still open.
 *
 * While locked it also tracks the visual viewport. iOS doesn't resize the page for the on-screen
 * keyboard, it covers the bottom and pans the view, so a bottom sheet would sit behind the keyboard
 * with its top (the search bar) panned out of sight. `--vv-top` / `--vv-h` let `.sheet-root` follow
 * the visible area instead, and `kb` on <html> marks the keyboard as open. Once the sheet has
 * shrunk to fit, the focused field is scrolled back into view inside it (clear of a sticky CTA),
 * only when it shrinks, so scrolling a list with the keyboard up doesn't jump back to the field.
 * Pinch-zoom also shrinks the visual viewport; while zoomed the sheet is left at full size.
 */
let locks = 0
let lastH = 0
function clearViewport() {
  const r = document.documentElement
  r.style.removeProperty('--vv-top'); r.style.removeProperty('--vv-h'); r.classList.remove('kb')
  lastH = 0
}
function fitViewport() {
  const vv = window.visualViewport
  if (!vv) return
  if (vv.scale > 1.01) return clearViewport()
  const s = document.documentElement.style
  s.setProperty('--vv-top', vv.offsetTop + 'px')
  s.setProperty('--vv-h', vv.height + 'px')
  document.documentElement.classList.toggle('kb', window.innerHeight - vv.height > 120)
  if (lastH && vv.height < lastH - 1) requestAnimationFrame(revealFocused)
  lastH = vv.height
}
function revealFocused() {
  const el = document.activeElement
  if (!(el instanceof HTMLElement) || !el.matches('input, textarea, select')) return
  const bd = el.closest('.sheet-bd')
  if (!bd) return
  const f = el.getBoundingClientRect(), b = bd.getBoundingClientRect()
  const bottom = b.bottom - (bd.querySelector('.sheet-cta')?.getBoundingClientRect().height ?? 0) - 12
  if (f.bottom > bottom) bd.scrollTop += f.bottom - bottom
  else if (f.top < b.top + 12) bd.scrollTop -= b.top + 12 - f.top
}
const onFocusIn = () => requestAnimationFrame(revealFocused)
export function useScrollLock() {
  useEffect(() => {
    if (!locks++) {
      document.body.classList.add('noscroll')
      fitViewport()
      window.visualViewport?.addEventListener('resize', fitViewport)
      window.visualViewport?.addEventListener('scroll', fitViewport)
      document.addEventListener('focusin', onFocusIn)
    }
    return () => {
      locks = Math.max(0, locks - 1)
      if (locks) return
      document.body.classList.remove('noscroll')
      window.visualViewport?.removeEventListener('resize', fitViewport)
      window.visualViewport?.removeEventListener('scroll', fitViewport)
      document.removeEventListener('focusin', onFocusIn)
      clearViewport()
    }
  }, [])
}

function useEscape(onClose: () => void) {
  useEffect(() => {
    const onKey = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
}

/**
 * Ref for a field that should take focus when its sheet opens. Use instead of `autoFocus`:
 * `preventScroll` stops iOS scrolling the page to where the field sits mid slide-up animation
 * (below the screen), which left the sheet's top out of view once the keyboard was up.
 * Stable identity, so React calls it once on mount.
 */
export const focusOnMount = (el: HTMLInputElement | null) => { el?.focus({ preventScroll: true }) }
