/**
 * Tali's shared product list in the add-food flow (Design canvas, "Shared products", approved by
 * Benn 10 Oct 2026): the source card a found product opens with (sp-2, sp-3, sp-3b), its margin
 * (One serving), the one-time opt-in at the first save of a new label-read product (sp-1, copy
 * from compliance, word for word) and the report sheet (sp-6).
 *
 * Share this product (sp-7 to sp-9, approved by Benn 11 Oct 2026): the row on a saved food's sheet
 * and the sheet that says Open Food Facts already has the product.
 */
import { useState } from 'react'
import { useStore } from '@/store/store'
import { marginNote, sourceCard, tierErr, type SharedInfo } from '@/core/domain/sharedProduct'
import { reportShared, type ReportReason } from '@/data/sharedProducts'
import { BareSheet, Sheet } from '@/ui/primitives'
import { Chevron, Icon } from '@/ui/icons'
import { LegalLink } from '../legal/LegalDoc'

/** sp-2 / sp-3 / sp-3b: where the numbers came from, with Report this product under it. */
export function SharedSourceCard({ info, barcode, onReport }: { info: SharedInfo; barcode: string; onReport: () => void }) {
  const card = sourceCard(info)
  const icon = info.tier === 'verified' ? 'checkc' : info.tier === 'counted' ? 'pages' : 'people'
  return (
    <div className="sp-src" data-tier={info.tier}>
      <Icon name={icon} size={20} stroke={info.tier === 'verified' ? 2 : 1.8} />
      <div className="m">
        <div className="t">{card.title}</div>
        {card.sub && <div className="s">{card.sub}</div>}
        <div className="bc num">Barcode {barcode}</div>
        <button className="sp-report" onClick={onReport}><Icon name="flag" size={16} />Report this product</button>
      </div>
    </div>
  )
}

/** One serving, with the tier's margin and the line that explains it. Nothing until a serving is set. */
export function SharedServing({ info, kcal }: { info: SharedInfo; kcal: number }) {
  if (!(kcal > 0)) return null
  const k = Math.round(kcal)
  return (
    <>
      <div className="sp-serv" data-margin={info.tier}>
        <span>One serving</span>
        <b className="num">{k} kcal <span>±{'\u00a0'}{Math.round(k * tierErr(info.tier))}</span></b>
      </div>
      <div className="foot">{marginNote(info.tier)}</div>
    </>
  )
}

/** sp-1: compliance's copy, word for word, then a link to the terms (where the sharing licence
 *  lives). Either answer saves the food; no never blocks anything. */
export const OPT_IN = {
  title: 'Add new products you scan to Tali’s shared list?',
  body: 'We save the barcode, name and figures, never who added them. Because of that, we can’t remove one you added later. Turn this off any time in Profile, Privacy.',
  yes: 'Yes, share new products',
  no: 'Not now',
} as const

export function ShareOptInSheet({ onAnswer }: { onAnswer: (yes: boolean) => void }) {
  return (
    // closing it any other way counts as Not now: it's asked once
    <BareSheet label={OPT_IN.title} onClose={() => onAnswer(false)} className="sp-optin">
      <div className="sp-tile" aria-hidden="true"><Icon name="people" size={20} stroke={1.8} /></div>
      <h2>{OPT_IN.title}</h2>
      <p>{OPT_IN.body}</p>
      {/* the sharing licence lives in the terms (Compliance, Oct 2026); the copy above stays word for word */}
      <p className="sp-terms"><LegalLink id="terms" /></p>
      <button className="btn yes" onClick={() => onAnswer(true)}>{OPT_IN.yes}</button>
      <button className="btn gray" onClick={() => onAnswer(false)}>{OPT_IN.no}</button>
    </BareSheet>
  )
}

const REASONS: [ReportReason, string][] = [
  ['figures', 'Figures don’t match the pack'],
  ['wrong', 'Wrong product'],
  ['name', 'Offensive or personal details in the name'],
  ['other', 'Something else'],
]

/** Sent and failed lines (not on the boards: kept short and neutral). */
export const REPORT_TOAST = {
  sent: 'Report sent. Thank you.',
  offline: 'Reporting needs a connection. Try again when you’re online.',
  error: 'Couldn’t send the report. Try again in a moment.',
} as const

/** sp-6: anonymous. Send stays off until an option is picked (canvas note s-sp). */
export function ReportProductSheet({ name, barcode, version, onClose }: { name: string; barcode: string; version: number; onClose: () => void }) {
  const showToast = useStore((s) => s.showToast)
  const [why, setWhy] = useState<ReportReason | null>(null)
  const [busy, setBusy] = useState(false)
  const send = async () => {
    if (!why || busy) return
    setBusy(true)
    const r = await reportShared(barcode, version, why)
    setBusy(false)
    showToast(REPORT_TOAST[r])
    if (r === 'sent') onClose()
  }
  return (
    <Sheet title="Report this product" onClose={onClose}>
      <div className="sp-rep-hd">
        <div className="t">{name}</div>
        <div className="bc num">Barcode {barcode}</div>
      </div>
      <fieldset className="sp-why">
        <legend>What’s wrong?</legend>
        <div className="list">
          {REASONS.map(([k, label]) => (
            <label key={k}>
              <input type="radio" name="sp-why" value={k} checked={why === k} onChange={() => setWhy(k)} />
              <span className="dot" aria-hidden="true">{why === k && <Icon name="check" size={13} stroke={3.2} />}</span>
              <span className="w">{label}</span>
            </label>
          ))}
        </div>
      </fieldset>
      <button className="btn sp-why-send" disabled={!why || busy} onClick={() => void send()}>Send</button>
    </Sheet>
  )
}

/** sp-7 / sp-7b: copy from the boards, word for word. */
export const SHARE_ROW = {
  title: 'Share this product',
  sub: 'Helps others who scan this barcode',
  offline: 'Needs a connection.',
} as const

/** sp-7: at the foot of a saved food's sheet, under Add. Offline it stays in view, off (sp-7b). */
export function ShareProductRow({ state, busy, onShare }: { state: 'on' | 'offline'; busy?: boolean; onShare: () => void }) {
  return (
    <>
      <div className="list icons sp-share">
        {state === 'on' ? (
          <button className="li" onClick={onShare} disabled={busy} aria-busy={busy || undefined}>
            <span className="ico" style={{ background: 'var(--tint)' }}><Icon name="people" size={18} stroke={1.8} /></span>
            <div className="m"><div className="t">{SHARE_ROW.title}</div><div className="s">{SHARE_ROW.sub}</div></div><Chevron />
          </button>
        ) : (
          <div className="li needsnet" aria-disabled="true">
            <span className="ico" style={{ background: 'var(--fill2)' }}><Icon name="people" size={18} stroke={1.8} /></span>
            <div className="m"><div className="t">{SHARE_ROW.title}</div><div className="s">{SHARE_ROW.sub}</div></div>
          </div>
        )}
      </div>
      {state === 'offline' && <div className="foot">{SHARE_ROW.offline}</div>}
    </>
  )
}

/** sp-8a: copy from the board, word for word. */
export const IN_OFF = {
  title: 'Open Food Facts already has this product',
  body: 'Anyone who scans it gets it, so there’s nothing to share.',
  ok: 'OK',
} as const

/** sp-8a: Open Food Facts has the product, so nothing is shared. OK (or closing it) and the row goes. */
export function InOffSheet({ onOk }: { onOk: () => void }) {
  return (
    <BareSheet label={IN_OFF.title} onClose={onOk} className="sp-optin sp-inoff">
      <div className="sp-tile" aria-hidden="true"><Icon name="bars" size={22} stroke={1.8} /></div>
      <h2>{IN_OFF.title}</h2>
      <p>{IN_OFF.body}</p>
      <button className="btn yes" onClick={onOk}>{IN_OFF.ok}</button>
    </BareSheet>
  )
}

/** sp-8b: the one line above the label camera, saying why it opened. */
export const SHARE_LABEL_NOTE = 'Open Food Facts doesn’t have this product. To share it, take a photo of the label.'

/** sp-9: under Share this product. */
export const SHARE_CHECK = {
  share: 'Share',
  button: 'Share this product',
  what: 'Barcode, name and figures only, never who added them.',
  saved: (name: string) => `Your saved ${name} takes these figures too.`,
} as const
