/**
 * Duplicate saved foods (Design canvas boards dup-1 to dup-4, approved by Benn).
 *
 * - dup-1: saving a product whose barcode is already saved asks to update that food instead.
 * - dup-2: saving a food that looks like a saved one (name and figures, core/domain/duplicates)
 *   shows both side by side.
 * - dup-3: My foods carries one quiet row while two saved foods look the same.
 * - dup-4: that row opens "Same food?": pick the one to keep; the other's logs move to it.
 */
import { useState, type ReactNode } from 'react'
import { useStore } from '@/store/store'
import type { Food } from '@/core/types'
import { uniqueName } from '@/core/domain/barcode'
import { barcodeUpdate, duplicateSaveStep, likelySame, sameFood, type NewFrom } from './duplicateModel'
import { DUP } from '@/copy/food'
import { BareSheet, BackButton, Sheet, Toggle } from '@/ui/primitives'
import { Icon, Chevron } from '@/ui/icons'

export type { NewFrom }

/**
 * Save a food through the duplicate checks: the same barcode asks to update (dup-1), a likely
 * match shows both (dup-2), anything else saves. `sheet` renders the open question, if any.
 */
export function useDuplicateSave(onSaved: (f: Food) => void, from: NewFrom) {
  const customFoods = useStore((s) => s.data.customFoods)
  const saveCustomFood = useStore((s) => s.saveCustomFood)
  const [ask, setAsk] = useState<{ kind: 'barcode' | 'like'; saved: Food; next: Omit<Food, 'id'> } | null>(null)

  const save = (next: Omit<Food, 'id'>) => {
    const step = duplicateSaveStep(customFoods || [], next)
    // nothing would change: it's the saved food, opened as it is
    if (step.kind === 'open') onSaved(step.food)
    else if (step.kind === 'save') onSaved(saveCustomFood(next))
    else setAsk({ kind: step.kind, saved: step.saved, next })
  }
  const done = (f: Food | null) => { setAsk(null); if (f) onSaved(f) }

  let sheet: ReactNode = null
  if (ask?.kind === 'barcode') sheet = <BarcodeUpdateSheet saved={ask.saved} next={ask.next} onClose={() => setAsk(null)} onDone={done} />
  if (ask?.kind === 'like') sheet = <LikelySameSheet saved={ask.saved} next={ask.next} from={from} onClose={() => setAsk(null)} onDone={done} />
  return { save, sheet }
}

/** dup-1: same barcode = same food. Only what changes, old → new; the rest summed up in one row. */
function BarcodeUpdateSheet({ saved, next, onClose, onDone }: { saved: Food; next: Omit<Food, 'id'>; onClose: () => void; onDone: (f: Food | null) => void }) {
  const update = useStore((s) => s.updateCustomFood)
  const customFoods = useStore((s) => s.data.customFoods)
  const v = barcodeUpdate(customFoods || [], saved, next)
  const { title, name, same } = v
  return (
    <BareSheet label={title} onClose={onClose} className="dup">
      <div className="dup-hd">
        <span className="dup-ico"><Icon name="refresh" size={22} stroke={1.8} /></span>
        <h2 className="dup-t">{title}</h2>
        <p className="dup-lead">{DUP.barcodeLead}</p>
      </div>
      <div className="lbl">{DUP.changes(v.per)}</div>
      <div className="list">
        {name && (
          <div className="li dup-name">
            <div className="m">
              <div className="dup-k">{DUP.name}</div>
              <div className="dup-was"><small>{DUP.was}</small> {name[0]}</div>
              <div className="dup-now"><small>{DUP.now}</small> {name[1]}</div>
            </div>
          </div>
        )}
        {v.figures.map(({ field, label, was, now }) => (
          <div className="li" key={field}>
            <span className="m">{label}</span>
            <span className="num dup-old">{was}</span>
            <span className="dup-arrow" aria-label={DUP.changesTo}>→</span>
            <span className="num dup-new">{now}</span>
          </div>
        ))}
        {same && (
          <div className="li dup-same">
            <span className="m">{same}</span>
            <span>{DUP.noChange}</span>
          </div>
        )}
      </div>
      <div className="foot">{DUP.followFoot}</div>
      <div className="dup-acts">
        <button className="btn" onClick={() => onDone(update(saved.id!, next))}>{DUP.updateIt}</button>
        <button className="btn gray" onClick={() => onDone(saved)}>{DUP.keepMine}</button>
      </div>
    </BareSheet>
  )
}

/** dup-2: likely the same food, no barcode match. Both side by side. */
function LikelySameSheet({ saved, next, from, onClose, onDone }: { saved: Food; next: Omit<Food, 'id'>; from: NewFrom; onClose: () => void; onDone: (f: Food | null) => void }) {
  const update = useStore((s) => s.updateCustomFood)
  const saveCustomFood = useStore((s) => s.saveCustomFood)
  const customFoods = useStore((s) => s.data.customFoods)
  // a scan (barcode or label photo) reads as "Scanned"; a typed food as "New"
  const { theirs, title, lead, per, rows } = likelySame(saved, next, from)
  const asNew = () => {
    const n = uniqueName(next.n.trim(), (customFoods || []).map((f) => f.n))
    onDone(saveCustomFood({ ...next, n }))
  }
  return (
    <BareSheet label={title} onClose={onClose} className="dup">
      <div className="dup-hd">
        <span className="dup-ico"><Icon name="copy" size={22} stroke={1.8} /></span>
        <h2 className="dup-t">{title}</h2>
        <p className="dup-lead">{lead}</p>
      </div>
      <div className="list dup-names">
        <div className="li"><div className="m"><div className="dup-k">{DUP.yours}</div><div className="dup-nm">{saved.n}</div></div></div>
        <div className="li"><div className="m"><div className="dup-k">{theirs}</div><div className="dup-nm">{next.n}</div></div></div>
      </div>
      <div className="list dup-tab" role="table" aria-label={DUP.tableLabel(theirs, per)}>
        <div className="dup-row dup-th" role="row"><span role="columnheader">{per.replace(/^per/, 'Per')}</span><span role="columnheader">{DUP.yours}</span><span role="columnheader">{theirs}</span></div>
        {rows.map(({ label, yours: a, theirs: b, differs: diff }) => (
          <div className="dup-row" role="row" key={label}>
            <span role="rowheader">{label}</span>
            <span className="num dup-old" role="cell">{a}</span>
            <span className={'num' + (diff ? ' dup-new' : '')} role="cell">{b}</span>
          </div>
        ))}
      </div>
      <div className="dup-acts">
        <button className="btn" onClick={() => onDone(saved)}>{DUP.keepYours}</button>
        <button className="btn gray" onClick={() => onDone(update(saved.id!, next, true))}>{DUP.useTheirs(theirs)}</button>
        <button className="btn dup-link" onClick={asNew}>{DUP.saveAsNew}</button>
      </div>
      <div className="foot dup-foot">{DUP.keepsName(theirs)}</div>
    </BareSheet>
  )
}

/** dup-3: the quiet row in My foods, shown only while a likely pair exists. */
export function SameFoodsRow({ pair, onOpen }: { pair: [Food, Food]; onOpen: () => void }) {
  return (
    <button className="li dup-hint" onClick={onOpen}>
      <span className="ico dup-hint-ico"><Icon name="copy" size={18} stroke={1.8} /></span>
      <span className="m"><span className="t">{DUP.looksSame}</span><span className="s">{pair[0].n}</span></span>
      <Chevron />
    </button>
  )
}

/** dup-4: pick the one to keep. A pushed view in the Add food sheet. */
export function SameFoodView({ pair, onBack, onClose, animate, cur }: { pair: [Food, Food]; onBack: () => void; onClose: () => void; animate: boolean; cur: string }) {
  const data = useStore((s) => s.data)
  const merge = useStore((s) => s.mergeCustomFoods)
  const different = useStore((s) => s.markFoodsDifferent)
  const sf = sameFood(data, cur, pair)
  // the one with more logs is kept by default (the first on a tie)
  const [keepIdx, setKeepIdx] = useState(sf.defaultKeep)
  // off by default (Benn, 11 Oct 2026): both barcodes may be real, e.g. a multipack
  const [takeBarcode, setTakeBarcode] = useState(false)
  const { keep, drop, what, switchable, offBarcode } = sf.outcome(keepIdx)
  const done = (fn: () => void) => { fn(); onBack() }
  return (
    <Sheet title={DUP.sameTitle} tall onClose={onClose} animate={animate} left={<BackButton onClick={onBack} />}>
      <div className="dup-merge">
        <h2 className="dup-t dup-pick">{DUP.pick}</h2>
        <p className="dup-lead dup-pad">{DUP.pickLead}</p>
        <fieldset className="dup-fs">
          <legend className="sr">{DUP.foodToKeep}</legend>
          <div className="list">
            {sf.rows.map(({ food: f, figures, origin, logged }, i) => {
              return (
                <label className="li dup-opt" key={f.id}>
                  <input type="radio" name="dup-keep" className="sr" checked={keepIdx === i} onChange={() => setKeepIdx(i)} />
                  <span className={'dup-radio' + (keepIdx === i ? ' on' : '')} aria-hidden="true">{keepIdx === i && <Icon name="check" size={13} stroke={3.2} />}</span>
                  <span className="m">
                    <span className="dup-nm">{f.n}</span>
                    <span className="num dup-sub">{figures}</span>
                    {origin && <span className="num dup-sub">{origin}</span>}
                    <span className="num dup-sub">{logged}</span>
                  </span>
                </label>
              )
            })}
          </div>
        </fieldset>
        <div className="lbl">{DUP.whatHappens}</div>
        <div className="card dup-what">{what}</div>
        {switchable && (
          <>
            <div className="list dup-switch">
              <div className="li">
                <span className="m">{DUP.otherBarcode}</span>
                <Toggle on={takeBarcode} onChange={() => setTakeBarcode(!takeBarcode)} label={DUP.otherBarcode} />
              </div>
            </div>
            {offBarcode && <div className="foot">{DUP.offBarcode}</div>}
          </>
        )}
        <div className="dup-grow" />
        <div className="dup-acts">
          <button className="btn" onClick={() => done(() => merge(keep.id!, drop.id!, switchable && takeBarcode))}>{DUP.keepThis}</button>
          <button className="btn gray" onClick={() => done(() => different(pair[0].id!, pair[1].id!))}>{DUP.different}</button>
        </div>
      </div>
    </Sheet>
  )
}
