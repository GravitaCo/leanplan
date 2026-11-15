/**
 * Tilo's shared product list in the add-food flow (Design canvas, "Shared products", approved by
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
import { IN_OFF, ONE_SERVING, OPT_IN, REPORT, REPORT_TOAST, SHARE_CHECK, SHARE_LABEL_NOTE, SHARE_ROW } from '@/copy/scan'

/** Words in src/copy/scan.ts; re-exported for the screens and tests that import them from here. */
export { IN_OFF, OPT_IN, REPORT_TOAST, SHARE_CHECK, SHARE_LABEL_NOTE, SHARE_ROW }

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
        <button className="sp-report" onClick={onReport}><Icon name="flag" size={16} />{REPORT.title}</button>
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
        <span>{ONE_SERVING}</span>
        <b className="num">{k} kcal <span>±{'\u00a0'}{Math.round(k * tierErr(info.tier))}</span></b>
      </div>
      <div className="foot">{marginNote(info.tier)}</div>
    </>
  )
}

/** sp-1: compliance's copy, word for word, then a link to the terms (where the sharing licence
 *  lives). Either answer saves the food; no never blocks anything. */
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

const REASONS: readonly (readonly [ReportReason, string])[] = REPORT.reasons

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
    <Sheet title={REPORT.title} onClose={onClose}>
      <div className="sp-rep-hd">
        <div className="t">{name}</div>
        <div className="bc num">Barcode {barcode}</div>
      </div>
      <fieldset className="sp-why">
        <legend>{REPORT.what}</legend>
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
      <button className="btn sp-why-send" disabled={!why || busy} onClick={() => void send()}>{REPORT.send}</button>
    </Sheet>
  )
}

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
