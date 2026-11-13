/**
 * Duplicate saved foods (boards dup-1 to dup-4) without any UI: what a save should ask, and what
 * each question shows. DuplicateViews.tsx (web) and the native duplicate sheets draw these; the
 * match rules themselves are core/domain/duplicates.
 */
import type { AppState, Food, MealSlot } from '@/core/types'
import { foodChanges, hasChanges, likelySaved, nameAfterUpdate, savedWithBarcode, timesLogged, type ChangeField } from '@/core/domain/duplicates'
import { MEAL_LABEL, usuals } from '@/core/domain/insights'
import { r1 } from '@/core/domain/date'

/** Where the food being saved came from: a barcode or label scan, or typed in. */
export type NewFrom = 'scan' | 'typed'

export const perText = (f: Pick<Food, 'ml' | 'each'>): string => (f.each ? 'per item' : `per 100 ${f.ml ? 'ml' : 'g'}`)
export const unitSuffix = (f: Pick<Food, 'ml' | 'each'>): string => (f.each ? '' : f.ml ? ' ml' : ' g')
/** "…0960": a barcode's last four, or a dash without one */
export const barcodeEnd = (code?: string): string => (code ? '…' + code.slice(-4) : '—')
export const FIELD: Record<ChangeField, string> = { k: 'Energy (kcal)', g: 'Serving', p: 'Protein', f: 'Fat', c: 'Carbs' }

/**
 * What saving `next` should do: open the saved food as it is (same barcode, nothing changes), ask
 * to update it (same barcode, dup-1), show both (looks like a saved one, dup-2), or just save.
 */
export type SaveStep =
  | { kind: 'open'; food: Food }
  | { kind: 'barcode'; saved: Food }
  | { kind: 'like'; saved: Food }
  | { kind: 'save' }
export function duplicateSaveStep(foods: Food[], next: Omit<Food, 'id'>): SaveStep {
  const same = savedWithBarcode(foods, next.barcode)
  if (same) {
    if (!hasChanges(foodChanges(same, { ...next, n: nameAfterUpdate(foods, same, next) }))) return { kind: 'open', food: same }
    return { kind: 'barcode', saved: same }
  }
  const like = likelySaved(foods, next as Food)
  return like ? { kind: 'like', saved: like } : { kind: 'save' }
}

/** dup-1: only what changes, old → new; the rest summed up in one line. */
export function barcodeUpdate(foods: Food[], saved: Food, next: Omit<Food, 'id'>) {
  // the name it will really have: a name another saved food holds isn't taken
  const ch = foodChanges(saved, { ...next, n: nameAfterUpdate(foods, saved, next) })
  const val = (field: ChangeField, v: number) => (field === 'g' ? `${r1(v)}${unitSuffix(next)}` : field === 'k' ? String(Math.round(v)) : String(r1(v)))
  return {
    title: `Update your saved ${saved.n}?`,
    per: perText(next),
    name: ch.name,
    figures: ch.figures.map(({ field, was, now }) => ({ field, label: FIELD[field], was: val(field, was), now: val(field, now) })),
    /** "Serving, protein, fat": the fields that stay */
    same: ch.same.map((f, i) => (i === 0 ? FIELD[f].replace(' (kcal)', '') : FIELD[f].replace(' (kcal)', '').toLowerCase())).join(', '),
  }
}

/** dup-2: both side by side. A scan reads as "Scanned", a typed food as "New". */
export function likelySame(saved: Food, next: Omit<Food, 'id'>, from: NewFrom) {
  const theirs = from === 'scan' ? 'Scanned' : 'New'
  const cell = (a: string, b: string) => ({ yours: a, theirs: b, differs: a !== b })
  const rows = [
    { label: 'Energy (kcal)', ...cell(String(Math.round(saved.k)), String(Math.round(next.k))) },
    { label: 'Protein', ...cell(String(r1(saved.p)), String(r1(next.p))) },
    { label: 'Serving', ...cell(`${r1(saved.g)}${unitSuffix(saved)}`, `${r1(next.g)}${unitSuffix(next)}`) },
    ...(saved.barcode || next.barcode ? [{ label: 'Barcode ends', ...cell(barcodeEnd(saved.barcode), barcodeEnd(next.barcode)) }] : []),
  ]
  return {
    theirs,
    title: `Looks like your saved ${saved.n}.`,
    lead: `The name and figures are very close.${from === 'scan' && next.barcode ? ' If a barcode was misread, using the scanned one fixes it.' : ''}`,
    per: perText(saved),
    rows,
  }
}

/** A food's origin line on the dup-4 rows: label photo or Open Food Facts, and its barcode. */
export function originLine(f: Food): string {
  const from = f.src === 'label' ? 'From your label photo' : f.src?.startsWith('off:') ? 'From Open Food Facts' : ''
  if (!f.barcode) return from
  return from ? `${from} · barcode ${barcodeEnd(f.barcode)}` : `Barcode ${barcodeEnd(f.barcode)}`
}

/** dup-4: each food's logs, which usual it's in, and what keeping one does. */
export function sameFood(data: AppState, cur: string, pair: [Food, Food]) {
  const logs = pair.map((f) => timesLogged(data.days, f)) as [number, number]
  const usualMeal = (f: Food): MealSlot | undefined => (['breakfast', 'lunch', 'dinner', 'snack'] as MealSlot[]).find((m) => usuals(data, cur, m).some((u) => u.n === f.n))
  const usualText = (m: MealSlot) => `your usual ${MEAL_LABEL[m].toLowerCase()}`
  const rows = pair.map((f, i) => {
    const m = usualMeal(f)
    return {
      food: f,
      figures: `${Math.round(f.k)} kcal · ${r1(f.p)} g protein ${perText(f)}${f.each ? '' : ` · ${r1(f.g)}${unitSuffix(f)} serving`}`,
      origin: originLine(f),
      logged: `Logged ${logs[i]} time${logs[i] === 1 ? '' : 's'}${m ? ` · in ${usualText(m)}` : ''}`,
    }
  })
  /** the one with more logs is kept by default (the first on a tie) */
  const defaultKeep = logs[1] > logs[0] ? 1 : 0
  const outcome = (keepIdx: number) => {
    const keep = pair[keepIdx], drop = pair[1 - keepIdx]
    const n = logs[1 - keepIdx]
    const dropUsual = usualMeal(drop)
    return {
      keep, drop,
      what: n > 0
        ? `The ${n} log${n === 1 ? '' : 's'} of ${drop.n} move${n === 1 ? 's' : ''} to ${keep.n}. ${n === 1 ? 'Its calories stay' : 'Their calories stay'} as logged.${dropUsual ? ` ${usualText(dropUsual).replace(/^y/, 'Y')} keeps working.` : ''}`
        : `${drop.n} has no logs to move.`,
      /** "Use the other barcode" is offered only when the dropped food has a different one */
      switchable: !!drop.barcode && drop.barcode !== keep.barcode,
      /** its barcode came from Open Food Facts, so scanning the pack finds this food */
      offBarcode: !!drop.src?.startsWith('off:'),
    }
  }
  return { logs, rows, defaultKeep, outcome }
}
