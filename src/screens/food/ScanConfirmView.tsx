/**
 * Check a scanned product before it's saved. Open Food Facts is crowdsourced, so the numbers are
 * laid out like the pack's own nutrition panel (per 100 g, editable and what's saved, beside a
 * live per-serving column), fields that don't hang together are marked (neutrally: the user has
 * the pack, we don't), and nothing is saved or logged until the user taps Save.
 *
 * A label photo (draft.label) opens here too: the per-serving column then shows the label's own
 * per-serving figures, the misread checks (core/domain/label.ts) re-run as the user edits, and a
 * suspected misread offers its one suggested fix to accept with a tap.
 *
 * Tali's shared product list (boards sp-1 to sp-6): a product found there opens here with where
 * it came from (sp-2, sp-3, sp-3b), its margin and Report this product (sp-6). A label read that
 * may join the list (core/domain/sharedProduct.ts shareEligible) asks the one-time opt-in at its
 * first save (sp-1); either answer saves the food. A yes queues the signed read, sent later.
 *
 * Share this product (`shareFor`, sp-9): a saved food's label read opens here with Share instead
 * of Save. Share asks the sp-1 opt-in first when sharing isn't agreed yet; then the signed read is
 * queued and the saved food takes these figures, keeping its name (usuals match by name).
 */
import { useRef, useState } from 'react'
import { useStore } from '@/store/store'
import { latestConsent } from '@/data/consent'
import { SHARED_PRODUCTS_ENABLED } from '@/data/sharedProducts'
import { sameAsFound, shareDecision, shareEligible, TIER_SOURCE } from '@/core/domain/sharedProduct'
import { ReportProductSheet, SHARE_CHECK, ShareOptInSheet, SharedServing, SharedSourceCard } from './SharedProduct'
import type { Food, MealSlot } from '@/core/types'
import { checkLabel, foodFromConfirmed, type FoodKind, type LabelField, type LabelValues, type ScanDraft } from '@/core/domain/barcode'
import { cellId, kjFromKcal, labelIssues, parseCell, parseServing, servingRef, SERVING_NEEDED, type LabelIssue, type LabelTexts } from '@/core/domain/label'
import { Sheet, Seg, BackButton, focusOnMount } from '@/ui/primitives'
import { Icon } from '@/ui/icons'
import { LabelPhotoButton } from './common'
import { useDuplicateSave } from './DuplicateViews'

/** UK label order. `sub` rows are the "of which" lines; `unit` is shown beside the name. */
const ROWS: { f: LabelField; label: string; unit?: string; sub?: boolean; dp: number }[] = [
  { f: 'kj', label: 'Energy', unit: 'kJ', dp: 0 },
  { f: 'k', label: 'Energy', unit: 'kcal', dp: 0 },
  { f: 'f', label: 'Fat', dp: 1 },
  { f: 'sat', label: 'of which saturates', sub: true, dp: 1 },
  { f: 'c', label: 'Carbohydrate', dp: 1 },
  { f: 'sugars', label: 'of which sugars', sub: true, dp: 1 },
  { f: 'fibre', label: 'Fibre', dp: 1 },
  { f: 'p', label: 'Protein', dp: 1 },
  { f: 'salt', label: 'Salt', dp: 2 },
  { f: 'alcohol', label: 'Alcohol', unit: '% vol', dp: 1 },
]
const REQUIRED: LabelField[] = ['k', 'p', 'c', 'f']

export const NAME_HINT = 'Brand, product and flavour, e.g. Walkers Sensations Roasted Chicken & Thyme'

const toText = (v: number | undefined) => (v === undefined ? '' : String(Math.round(v * 100) / 100))
const round = (v: number, dp: number) => String(Math.round(v * 10 ** dp) / 10 ** dp)
/** Issues that belong to one row (its two columns, its RI, its own text) are explained on that row. */
const oneRow = (i: LabelIssue) => new Set(i.cells.map((c) => c.split(':')[0])).size === 1

export function ScanConfirmView({ draft, onBack, onClose, animate, onSaved, notice, onLabelPhoto, shareFor }: {
  draft: ScanDraft; meal: MealSlot; setMeal: (m: MealSlot) => void; onBack?: () => void; onClose: () => void; animate: boolean; onSaved: (f: Food) => void
  /** why the view opened this way (a photo that couldn't be read) */
  notice?: string
  /** "Photo of the label": read the numbers from the user's own pack instead */
  onLabelPhoto?: () => void
  /** "Share this product" from this saved food (sp-9): Share in place of Save; onSaved gets the
   *  food with its new figures */
  shareFor?: Food
}) {
  const queueSharedProduct = useStore((s) => s.queueSharedProduct)
  const setShareProducts = useStore((s) => s.setShareProducts)
  // the same barcode, or a food that looks like a saved one, asks first (boards dup-1, dup-2). A
  // share agreed for this read is queued only once a food is really saved or chosen
  const pendingShare = useRef(false)
  const dup = useDuplicateSave((f) => {
    if (pendingShare.current && draft.share) queueSharedProduct(draft.share)
    pendingShare.current = false
    onSaved(f)
  }, 'scan')
  const info = draft.label
  const shared = draft.shared
  const shareSavedFood = useStore((s) => s.shareSavedFood)
  const [optIn, setOptIn] = useState<Omit<Food, 'id'> | null>(null)
  const [shareAsk, setShareAsk] = useState(false)
  const [reporting, setReporting] = useState(false)
  const [kind, setKind] = useState<FoodKind>(draft.kind)
  const [ml, setMl] = useState(draft.ml)
  const [showUnit, setShowUnit] = useState(draft.liquid || draft.ml)
  const [name, setName] = useState(draft.name)
  const [serving, setServing] = useState(draft.serving[draft.kind] != null ? String(draft.serving[draft.kind]) : '')
  const [servingTouched, setServingTouched] = useState(false)
  const [text, setText] = useState<Record<LabelField, string>>(() => {
    const t = {} as Record<LabelField, string>
    for (const { f } of ROWS) t[f] = toText(draft.values[f])
    return t
  })
  // the label's own per-serving column, as read (changed only by accepting a suggestion)
  const [servText, setServText] = useState<Partial<Record<LabelField, string>>>(() => ({ ...(info?.texts.serving || {}) }))
  const [sugg, setSugg] = useState(info?.suggestion ?? null)
  // alcohol only when the product lists it; everything else always, so a gap can be filled in
  const rows = ROWS.filter(({ f }) => f !== 'alcohol' || draft.values.alcohol !== undefined)

  const values: LabelValues = {}
  for (const f of Object.keys(text) as LabelField[]) {
    const n = parseFloat(text[f].replace(',', '.'))
    if (text[f].trim() !== '' && Number.isFinite(n)) values[f] = n
  }
  const unit = ml ? 'ml' : 'g'
  const g = parseFloat(serving.replace(',', '.')) || 0
  const untouched = (f: LabelField) => text[f] === toText(draft.values[f])
  // kJ worked out from kcal when it isn't there (a shared product keeps no kJ): shown, never saved
  const kjShown = values.kj === undefined && values.k !== undefined ? kjFromKcal(values.k) : undefined

  // label photo: the misread checks, re-run on the panel as it stands now (an untouched field
  // keeps the text as read, so "<0.5g" or a flagged unit stays visible until it's edited)
  let live: ReturnType<typeof labelIssues> | null = null
  if (info) {
    const per100: LabelTexts['per100'] = {}
    for (const { f } of ROWS) {
      const t = untouched(f) ? info.texts.per100[f] ?? text[f] : text[f]
      if (t) per100[f] = t
    }
    live = labelIssues({ ...info.texts, ml, servingG: g > 0 ? g : undefined, per100, serving: servText })
  }
  const labelHard = live ? live.issues.filter((i) => !i.soft) : []
  const lowConf = new Set((info?.lowConf || []).filter((c) => {
    const [f, col] = c.split(':') as [LabelField, string]
    return col === 'per100' ? untouched(f) : true
  }).map((c) => c.split(':')[0] as LabelField))
  const suggFor = (f: LabelField) => {
    if (!sugg) return null
    const [sf, col] = sugg.cell.split(':') as [LabelField, string]
    if (sf !== f) return null
    const still = col === 'per100' ? untouched(f) : col === 'serving' ? servText[f] === sugg.from : true
    return still ? sugg : null
  }

  // product-level notes mark calories until they're edited, the serving until it's typed
  const kUnchanged = values.k === draft.values.k
  const productNotes = draft.notes.filter((n) => (n.field === 'serving' ? !servingTouched : kUnchanged))
  const checked = checkLabel(values, { ml, name, usLabel: draft.usLabel, serving: g })
  // a label photo's own checks replace the general ones (they're stricter and name the cell)
  const problems = [...(info ? checked.filter((p) => p.kind === 'missing') : checked), ...productNotes]
  const missing = problems.some((p) => p.kind === 'missing')
  const odd = new Set<LabelField | 'name' | 'serving'>(problems.filter((p) => p.kind === 'odd').map((p) => p.field))
  const rowIssues = new Map<LabelField, LabelIssue[]>()
  for (const i of live?.issues || []) {
    for (const c of i.cells) {
      const f = c.split(':')[0] as LabelField
      odd.add(f)
      if (!rowIssues.get(f)?.includes(i)) rowIssues.set(f, [...(rowIssues.get(f) || []), i])
    }
  }
  for (const f of lowConf) odd.add(f)
  const notes = [...new Set([
    ...problems.filter((p) => p.kind === 'odd').map((p) => p.msg),
    ...(live?.issues || []).filter((i) => !oneRow(i)).map((i) => i.msg),
  ])]
  const vague = draft.vague && name === draft.name
  const allGood = !problems.length && !labelHard.length && !(live?.issues.length) && !lowConf.size

  const pickKind = (k: FoodKind) => {
    setKind(k)
    if (!servingTouched) setServing(draft.serving[k] != null ? String(draft.serving[k]) : '')
  }
  const commit = (def: Omit<Food, 'id'>, share: boolean) => {
    // queued on the device only, once saved; sent later, after a random delay (never on this save)
    pendingShare.current = share
    dup.save(def)
  }
  const confirmed = (): Omit<Food, 'id'> => {
    // the pack's per-serving line, when it agrees and the saved serving is the printed one (a
    // whole number, since saved servings are whole grams)
    const printed = info ? parseServing(info.texts.servingText) : undefined
    const ref = live && Number.isInteger(g) ? servingRef(live, printed, g) : undefined
    // a shared product saved with its figures unchanged keeps its tier's source and margin
    const sharedSrc = shared && sameAsFound(shared, values, ml) ? `${TIER_SOURCE[shared.tier]}:${draft.barcode}` : undefined
    return foodFromConfirmed({ barcode: draft.barcode, name, values, ml, kind, meal: draft.meal, cat: draft.cat, g, source: draft.source === 'shared' ? 'label' : draft.source, ref, sharedSrc })
  }
  // sp-9: only a read that may join the list (shareEligible: signed, not in Open Food Facts, unchanged)
  const canShare = !!shareFor && !missing && SHARED_PRODUCTS_ENABLED && shareEligible(draft, { name, values, ml })
  const doShare = () => {
    if (!shareFor?.id || !draft.share) return
    const food = shareSavedFood(shareFor.id, confirmed(), draft.share)
    if (food) onSaved(food)
  }
  const share = () => {
    if (!canShare) return
    // not agreed yet (never asked, or a no): the sp-1 opt-in first, unchanged
    if (latestConsent(useStore.getState().data, 'shared-products')?.granted) doShare()
    else setShareAsk(true)
  }
  const answerShareAsk = (yes: boolean) => {
    setShareAsk(false)
    // a no is recorded once (as at a first save); an earlier no isn't recorded again
    if (yes || !latestConsent(useStore.getState().data, 'shared-products')) setShareProducts(yes)
    if (yes) doShare()
  }
  const save = () => {
    if (missing) return
    const def = confirmed()
    const shareable = SHARED_PRODUCTS_ENABLED && shareEligible(draft, { name, values, ml })
    const decision = shareDecision(shareable, latestConsent(useStore.getState().data, 'shared-products'))
    // the first time a product could be shared: ask once (sp-1), then save either way
    if (decision === 'ask') { setOptIn(def); return }
    commit(def, decision === 'share')
  }
  const answerOptIn = (yes: boolean) => {
    const def = optIn
    setOptIn(null)
    setShareProducts(yes)
    if (def) commit(def, yes)
  }
  const accept = () => {
    if (!sugg) return
    const [f, col] = sugg.cell.split(':') as [LabelField, string]
    if (col === 'per100') setText({ ...text, [f]: String(sugg.value) })
    else if (col === 'serving') setServText({ ...servText, [f]: sugg.to })
    setSugg(null)
  }

  const servings = draft.pack && g > 0 ? Math.round((draft.pack / g) * 10) / 10 : null
  const gText = g > 0 ? `${round(g, 1)} ${unit}` : ''
  const fromLabel = draft.source === 'label'

  return (
    <>
    <Sheet title="Check the label" onClose={onClose} animate={animate} left={onBack ? <BackButton onClick={onBack} /> : undefined}
      right={shareFor
        ? <button className="navbtn b" onClick={share} disabled={!canShare}>{SHARE_CHECK.share}</button>
        : <button className="navbtn b" onClick={save} disabled={missing}>Save</button>}>
      {notice && <div className="note" role="status" style={{ marginTop: 0, marginBottom: 12 }}><Icon name="info" size={17} /><span>{notice}</span></div>}
      {shared ? (
        <SharedSourceCard info={shared} barcode={draft.barcode} onReport={() => setReporting(true)} />
      ) : (
        <div className="sub" style={{ padding: '0 4px 12px' }}>
          {fromLabel ? 'Your pack label (read from your photo).' : 'Pack label via Open Food Facts: check against your pack.'}
          {(draft.barcode || draft.kcalFromKj) && <div className="num" style={{ fontSize: 13, marginTop: 2 }}>{draft.barcode ? `Barcode ${draft.barcode}` : ''}{draft.kcalFromKj ? ' · calories worked out from kJ' : ''}</div>}
        </div>
      )}
      {onLabelPhoto && (
        <div className="stack" style={{ marginTop: shared ? 12 : 0, marginBottom: 12 }}>
          <LabelPhotoButton onPress={onLabelPhoto} />
          {!fromLabel && <div className="foot" style={{ padding: 0 }}>If these numbers don’t match your pack, read them from a photo instead.</div>}
        </div>
      )}
      <Seg<FoodKind> options={[['cook', 'For cooking'], ['eat', 'Eat as it is']]} value={kind} onChange={pickKind} />
      <div className="foot">{kind === 'eat'
        ? 'Eaten as it comes, like a ready meal, crisps or a drink. Logged by the serving.'
        : 'Something you cook or mix with, like pasta, milk or a sauce. Offered in recipes and What can I make?'}</div>

      <div className="list" style={{ marginTop: 12 }}>
        <div className={'frow' + (name.trim() ? '' : ' need') + (vague ? ' flag' : '')}>
          <label htmlFor="sc_n">Name</label>
          {vague && <span className="flagnote">Add the flavour or variety</span>}
          <input id="sc_n" ref={draft.vague ? focusOnMount : undefined} type="text" placeholder="Needed" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className={'frow' + (g > 0 ? '' : ' need') + (odd.has('serving') ? ' flag' : '')}>
          <label htmlFor="sc_g">Serving on the pack</label>
          {odd.has('serving') && <span className="flagnote">{productNotes.some((n) => n.msg === SERVING_NEEDED) ? 'Needed: the serving the per-serving column is for' : 'Check the serving size on the pack'}</span>}
          <input id="sc_g" type="number" inputMode="decimal" placeholder="e.g. 30" value={serving}
            aria-invalid={g > 0 ? undefined : true} onChange={(e) => { setServing(e.target.value); setServingTouched(true) }} />
          <span className="u">{unit}</span>
        </div>
      </div>
      {fromLabel && !name.trim() && <div className="foot">{NAME_HINT}</div>}
      {shared && <SharedServing info={shared} kcal={values.k !== undefined && g > 0 ? (values.k * g) / 100 : 0} />}
      {draft.pack && (
        <div className="foot num">Pack: {draft.pack} {unit}{servings ? ` · ${servings} serving${servings === 1 ? '' : 's'}` : ''}</div>
      )}

      {shareFor ? null : showUnit ? (
        <div style={{ marginTop: 12 }}>
          <Seg<'g' | 'ml'> options={[['g', 'Per 100 g'], ['ml', 'Per 100 ml']]} value={unit} onChange={(u) => setMl(u === 'ml')} />
        </div>
      ) : (
        <div className="foot"><button className="navbtn" style={{ fontSize: 13 }} onClick={() => setShowUnit(true)}>Label is per 100 ml?</button></div>
      )}

      {(draft.usLabel || draft.staleYear) && (
        <div className="foot">
          {draft.usLabel && 'US label: carbs include fibre. '}
          {draft.staleYear && `Last updated ${draft.staleYear}. Recipes change: check against your pack.`}
        </div>
      )}
      <div className="lbl">Nutrition</div>
      <div className="list ntab" role="table" aria-label="Nutrition per 100 and per serving">
        <div className="nrow nhead" role="row">
          <span role="columnheader" />
          <span role="columnheader">Per 100 {unit}</span>
          <span role="columnheader">Per serving{gText ? ` (${gText})` : ''}</span>
        </div>
        {rows.map(({ f, label, unit: u, sub, dp }) => {
          const need = REQUIRED.includes(f) && values[f] === undefined
          const v = values[f]
          // a label photo shows the label's own per-serving figure; otherwise it's worked out
          const read = info ? parseCell(servText[f], f, 'serving') : undefined
          const per = read?.value !== undefined
            ? (read.mark === 'lt' ? '<' + round(read.raw!, Math.max(read.dp - 1, 0)) : round(read.value, Math.max(read.dp, 0)))
            : f === 'alcohol' ? (v !== undefined ? round(v, 1) : '')
            : f === 'kj' && v === undefined && kjShown !== undefined && g > 0 ? round((kjShown * g) / 100, dp)
            : v !== undefined && g > 0 ? round((v * g) / 100, dp) : ''
          const s = suggFor(f)
          const own = (rowIssues.get(f) || []).find(oneRow)
          return (
            <div key={f} role="row" className={'nrow' + (odd.has(f) ? ' flag' : '') + (need ? ' need' : '')}>
              <label htmlFor={'sc_' + f} className={sub ? 'sub' : undefined} role="rowheader">{label}{u && <small>{u}</small>}</label>
              <input id={'sc_' + f} className="num" type="number" inputMode="decimal" placeholder={need ? 'Needed' : f === 'kj' && kjShown !== undefined ? String(kjShown) : ''} value={text[f]}
                aria-invalid={odd.has(f) || need || undefined} onChange={(e) => setText({ ...text, [f]: e.target.value })} />
              <span className="num nserv" role="cell" data-f={f} data-read={read?.value !== undefined || undefined}>{per}</span>
              {s ? (
                <span className="flagnote" role="status" data-suggest={f}>
                  Did you mean <b className="num">{s.display}</b>{s.cell === cellId(f, 'serving') ? ' per serving' : ''}? {s.because}
                  <button className="btn sm tinted" onClick={accept} aria-label={`Use ${s.display}`}>Accept</button>
                </span>
              ) : own ? (
                <span className="flagnote">{own.msg}</span>
              ) : odd.has(f) ? (
                <span className="flagnote">{lowConf.has(f) && !rowIssues.has(f) ? 'Hard to read in the photo. Check against your pack.' : 'Worth a second look. Compare with your pack.'}</span>
              ) : null}
            </div>
          )
        })}
      </div>
      <div className="foot">Grams unless shown. The per 100 {unit} column is what’s saved.</div>
      {info && info.marks.length > 0 && <div className="foot">{info.marks.join(' ')}</div>}

      {notes.length > 0 && (
        <div role="status">
          {notes.map((m) => <div key={m} className="note"><Icon name="info" size={17} /><span>{m}</span></div>)}
        </div>
      )}
      {allGood && !shareFor && <div className="note ok" role="status"><Icon name="checkc" size={17} /><span>These numbers are consistent with each other.</span></div>}
      {shareFor ? (
        <>
          <div className="stack">
            <button className="btn" onClick={share} disabled={!canShare}>{SHARE_CHECK.button}</button>
          </div>
          <div className="foot">{SHARE_CHECK.what}</div>
          <div className="foot">{SHARE_CHECK.saved(shareFor.n)}</div>
        </>
      ) : (
        <>
          <div className="stack">
            <button className="btn" onClick={save} disabled={missing}>{missing ? 'Fill in the marked fields' : 'Save food'}</button>
          </div>
          <div className="foot">Saved foods appear in search{draft.barcode ? ' and open straight away next time you scan them, even offline' : ''}.</div>
        </>
      )}
      {dup.sheet}
    </Sheet>
    {optIn && <ShareOptInSheet onAnswer={answerOptIn} />}
    {shareAsk && <ShareOptInSheet onAnswer={answerShareAsk} />}
    {reporting && shared && <ReportProductSheet name={shared ? draft.baseName : name} barcode={draft.barcode} version={shared.version} onClose={() => setReporting(false)} />}
    </>
  )
}
