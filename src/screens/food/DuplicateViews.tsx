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
import type { Food, MealSlot } from '@/core/types'
import { foodChanges, hasChanges, likelySaved, nameAfterUpdate, savedWithBarcode, timesLogged, type ChangeField } from '@/core/domain/duplicates'
import { uniqueName } from '@/core/domain/barcode'
import { MEAL_LABEL, usuals } from '@/core/domain/insights'
import { r1 } from '@/core/domain/date'
import { BareSheet, BackButton, Sheet, Toggle } from '@/ui/primitives'
import { Icon, Chevron } from '@/ui/icons'

/** Where the food being saved came from: a barcode or label scan, or typed in. */
export type NewFrom = 'scan' | 'typed'

const per = (f: Pick<Food, 'ml' | 'each'>) => (f.each ? 'per item' : `per 100 ${f.ml ? 'ml' : 'g'}`)
const unitOf = (f: Pick<Food, 'ml' | 'each'>) => (f.each ? '' : f.ml ? ' ml' : ' g')
const ends = (code?: string) => (code ? '…' + code.slice(-4) : '—')
const FIELD: Record<ChangeField, string> = { k: 'Energy (kcal)', g: 'Serving', p: 'Protein', f: 'Fat', c: 'Carbs' }

/**
 * Save a food through the duplicate checks: the same barcode asks to update (dup-1), a likely
 * match shows both (dup-2), anything else saves. `sheet` renders the open question, if any.
 */
export function useDuplicateSave(onSaved: (f: Food) => void, from: NewFrom) {
  const customFoods = useStore((s) => s.data.customFoods)
  const saveCustomFood = useStore((s) => s.saveCustomFood)
  const [ask, setAsk] = useState<{ kind: 'barcode' | 'like'; saved: Food; next: Omit<Food, 'id'> } | null>(null)

  const save = (next: Omit<Food, 'id'>) => {
    const foods = customFoods || []
    const same = savedWithBarcode(foods, next.barcode)
    if (same) {
      // nothing would change: it's the saved food, opened as it is
      if (!hasChanges(foodChanges(same, { ...next, n: nameAfterUpdate(foods, same, next) }))) { onSaved(same); return }
      setAsk({ kind: 'barcode', saved: same, next }); return
    }
    const like = likelySaved(foods, next as Food)
    if (like) { setAsk({ kind: 'like', saved: like, next }); return }
    onSaved(saveCustomFood(next))
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
  // the name it will really have: a name another saved food holds isn't taken
  const ch = foodChanges(saved, { ...next, n: nameAfterUpdate(customFoods || [], saved, next) })
  const title = `Update your saved ${saved.n}?`
  const val = (field: ChangeField, v: number) => (field === 'g' ? `${r1(v)}${unitOf(next)}` : field === 'k' ? String(Math.round(v)) : String(r1(v)))
  const same = ch.same.map((f, i) => (i === 0 ? FIELD[f].replace(' (kcal)', '') : FIELD[f].replace(' (kcal)', '').toLowerCase())).join(', ')
  return (
    <BareSheet label={title} onClose={onClose} className="dup">
      <div className="dup-hd">
        <span className="dup-ico"><Icon name="refresh" size={22} stroke={1.8} /></span>
        <h2 className="dup-t">{title}</h2>
        <p className="dup-lead">You’ve saved this barcode before. This is what would change.</p>
      </div>
      <div className="lbl">Changes, {per(next)}</div>
      <div className="list">
        {ch.name && (
          <div className="li dup-name">
            <div className="m">
              <div className="dup-k">Name</div>
              <div className="dup-was"><small>Was</small> {ch.name[0]}</div>
              <div className="dup-now"><small>Now</small> {ch.name[1]}</div>
            </div>
          </div>
        )}
        {ch.figures.map(({ field, was, now }) => (
          <div className="li" key={field}>
            <span className="m">{FIELD[field]}</span>
            <span className="num dup-old">{val(field, was)}</span>
            <span className="dup-arrow" aria-label="changes to">→</span>
            <span className="num dup-new">{val(field, now)}</span>
          </div>
        ))}
        {same && (
          <div className="li dup-same">
            <span className="m">{same}</span>
            <span>No change</span>
          </div>
        )}
      </div>
      <div className="foot">Your logs and usuals follow the food. Days you’ve already logged keep their numbers.</div>
      <div className="dup-acts">
        <button className="btn" onClick={() => onDone(update(saved.id!, next))}>Update it</button>
        <button className="btn gray" onClick={() => onDone(saved)}>Keep mine</button>
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
  const theirs = from === 'scan' ? 'Scanned' : 'New'
  const title = `Looks like your saved ${saved.n}.`
  const barcodes = !!(saved.barcode || next.barcode)
  const cell = (a: string, b: string) => [a, b, a !== b] as const
  const rows: [string, readonly [string, string, boolean]][] = [
    ['Energy (kcal)', cell(String(Math.round(saved.k)), String(Math.round(next.k)))],
    ['Protein', cell(String(r1(saved.p)), String(r1(next.p)))],
    ['Serving', cell(`${r1(saved.g)}${unitOf(saved)}`, `${r1(next.g)}${unitOf(next)}`)],
    ...(barcodes ? [['Barcode ends', cell(ends(saved.barcode), ends(next.barcode))] as [string, readonly [string, string, boolean]]] : []),
  ]
  const asNew = () => {
    const n = uniqueName(next.n.trim(), (customFoods || []).map((f) => f.n))
    onDone(saveCustomFood({ ...next, n }))
  }
  return (
    <BareSheet label={title} onClose={onClose} className="dup">
      <div className="dup-hd">
        <span className="dup-ico"><Icon name="copy" size={22} stroke={1.8} /></span>
        <h2 className="dup-t">{title}</h2>
        <p className="dup-lead">The name and figures are very close.{from === 'scan' && next.barcode ? ' If a barcode was misread, using the scanned one fixes it.' : ''}</p>
      </div>
      <div className="list dup-names">
        <div className="li"><div className="m"><div className="dup-k">Yours</div><div className="dup-nm">{saved.n}</div></div></div>
        <div className="li"><div className="m"><div className="dup-k">{theirs}</div><div className="dup-nm">{next.n}</div></div></div>
      </div>
      <div className="list dup-tab" role="table" aria-label={`Yours and the ${theirs.toLowerCase()} one, ${per(saved)}`}>
        <div className="dup-row dup-th" role="row"><span role="columnheader">{per(saved).replace(/^per/, 'Per')}</span><span role="columnheader">Yours</span><span role="columnheader">{theirs}</span></div>
        {rows.map(([label, [a, b, diff]]) => (
          <div className="dup-row" role="row" key={label}>
            <span role="rowheader">{label}</span>
            <span className="num dup-old" role="cell">{a}</span>
            <span className={'num' + (diff ? ' dup-new' : '')} role="cell">{b}</span>
          </div>
        ))}
      </div>
      <div className="dup-acts">
        <button className="btn" onClick={() => onDone(saved)}>Keep yours</button>
        <button className="btn gray" onClick={() => onDone(update(saved.id!, next, true))}>Use the {theirs.toLowerCase()} one</button>
        <button className="btn dup-link" onClick={asNew}>Save as new</button>
      </div>
      <div className="foot dup-foot">Using the {theirs.toLowerCase()} one keeps your name, so usuals and Same as yesterday still find it.</div>
    </BareSheet>
  )
}

/** dup-3: the quiet row in My foods, shown only while a likely pair exists. */
export function SameFoodsRow({ pair, onOpen }: { pair: [Food, Food]; onOpen: () => void }) {
  return (
    <button className="li dup-hint" onClick={onOpen}>
      <span className="ico dup-hint-ico"><Icon name="copy" size={18} stroke={1.8} /></span>
      <span className="m"><span className="t">2 foods look the same</span><span className="s">{pair[0].n}</span></span>
      <Chevron />
    </button>
  )
}

/** A food's origin line on the dup-4 rows: label photo or Open Food Facts, and its barcode. */
function originLine(f: Food): string {
  const from = f.src === 'label' ? 'From your label photo' : f.src?.startsWith('off:') ? 'From Open Food Facts' : ''
  if (!f.barcode) return from
  return from ? `${from} · barcode ${ends(f.barcode)}` : `Barcode ${ends(f.barcode)}`
}

/** dup-4: pick the one to keep. A pushed view in the Add food sheet. */
export function SameFoodView({ pair, onBack, onClose, animate, cur }: { pair: [Food, Food]; onBack: () => void; onClose: () => void; animate: boolean; cur: string }) {
  const data = useStore((s) => s.data)
  const merge = useStore((s) => s.mergeCustomFoods)
  const different = useStore((s) => s.markFoodsDifferent)
  const logs = pair.map((f) => timesLogged(data.days, f))
  // the one with more logs is kept by default (the first on a tie)
  const [keepIdx, setKeepIdx] = useState(logs[1] > logs[0] ? 1 : 0)
  // off by default (Benn, 11 Oct 2026): both barcodes may be real, e.g. a multipack
  const [takeBarcode, setTakeBarcode] = useState(false)
  const keep = pair[keepIdx], drop = pair[1 - keepIdx]
  const usualMeal = (f: Food): MealSlot | undefined => (['breakfast', 'lunch', 'dinner', 'snack'] as MealSlot[]).find((m) => usuals(data, cur, m).some((u) => u.n === f.n))
  const usualText = (m: MealSlot) => `your usual ${MEAL_LABEL[m].toLowerCase()}`
  const n = logs[1 - keepIdx]
  const dropUsual = usualMeal(drop)
  const what = n > 0
    ? `The ${n} log${n === 1 ? '' : 's'} of ${drop.n} move${n === 1 ? 's' : ''} to ${keep.n}. ${n === 1 ? 'Its calories stay' : 'Their calories stay'} as logged.${dropUsual ? ` ${usualText(dropUsual).replace(/^y/, 'Y')} keeps working.` : ''}`
    : `${drop.n} has no logs to move.`
  const switchable = !!drop.barcode && drop.barcode !== keep.barcode
  const done = (fn: () => void) => { fn(); onBack() }
  return (
    <Sheet title="Same food?" tall onClose={onClose} animate={animate} left={<BackButton onClick={onBack} />}>
      <div className="dup-merge">
        <h2 className="dup-t dup-pick">Pick the one to keep</h2>
        <p className="dup-lead dup-pad">Anything you’ve logged with the other one moves to the one you keep.</p>
        <fieldset className="dup-fs">
          <legend className="sr">Food to keep</legend>
          <div className="list">
            {pair.map((f, i) => {
              const m = usualMeal(f)
              const origin = originLine(f)
              return (
                <label className="li dup-opt" key={f.id}>
                  <input type="radio" name="dup-keep" className="sr" checked={keepIdx === i} onChange={() => setKeepIdx(i)} />
                  <span className={'dup-radio' + (keepIdx === i ? ' on' : '')} aria-hidden="true">{keepIdx === i && <Icon name="check" size={13} stroke={3.2} />}</span>
                  <span className="m">
                    <span className="dup-nm">{f.n}</span>
                    <span className="num dup-sub">{Math.round(f.k)} kcal · {r1(f.p)} g protein {per(f)}{f.each ? '' : ` · ${r1(f.g)}${unitOf(f)} serving`}</span>
                    {origin && <span className="num dup-sub">{origin}</span>}
                    <span className="num dup-sub">Logged {logs[i]} time{logs[i] === 1 ? '' : 's'}{m ? ` · in ${usualText(m)}` : ''}</span>
                  </span>
                </label>
              )
            })}
          </div>
        </fieldset>
        <div className="lbl">What happens</div>
        <div className="card dup-what">{what}</div>
        {switchable && (
          <>
            <div className="list dup-switch">
              <div className="li">
                <span className="m">Use the other barcode</span>
                <Toggle on={takeBarcode} onChange={() => setTakeBarcode(!takeBarcode)} label="Use the other barcode" />
              </div>
            </div>
            {drop.src?.startsWith('off:') && <div className="foot">Its barcode came from Open Food Facts, so scanning the pack finds this food.</div>}
          </>
        )}
        <div className="dup-grow" />
        <div className="dup-acts">
          <button className="btn" onClick={() => done(() => merge(keep.id!, drop.id!, switchable && takeBarcode))}>Keep this one</button>
          <button className="btn gray" onClick={() => done(() => different(pair[0].id!, pair[1].id!))}>They’re different</button>
        </div>
      </div>
    </Sheet>
  )
}
