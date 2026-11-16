/**
 * Saving a food through the duplicate checks on native (boards dup-1, dup-2), with the web's
 * `useDuplicateSave(onSaved, from)` signature. The decision is src/screens/food/duplicateModel's
 * `duplicateSaveStep`, shared with the web. `ask` is the open question; the Food screens draw it
 * with N1's sheets (BarcodeUpdateSheet, LikelySameSheet) and call `answer` with the user's choice.
 * The Scanning stream (N6) passes this hook into its confirm view, as the web passes its own.
 */
import { useState } from 'react'
import type { Food } from '@/core/types'
import { useStore } from '@/store/store'
import { uniqueName } from '@/core/domain/barcode'
import { duplicateSaveStep, type NewFrom } from '@/screens/food/duplicateModel'

export type DuplicateAsk = { kind: 'barcode' | 'like'; saved: Food; next: Omit<Food, 'id'>; from: NewFrom }
/** dup-1: "Update it" / "Keep mine"; dup-2: "Keep yours" / "Use the new (scanned) one" / "Save as new" */
export type DuplicateAnswer = 'update' | 'keep' | 'use-theirs' | 'save-new'

export function useDuplicateSave(onSaved: (f: Food) => void, from: NewFrom) {
  const customFoods = useStore((s) => s.data.customFoods)
  const saveCustomFood = useStore((s) => s.saveCustomFood)
  const updateCustomFood = useStore((s) => s.updateCustomFood)
  const [ask, setAsk] = useState<DuplicateAsk | null>(null)

  const save = (next: Omit<Food, 'id'>) => {
    const step = duplicateSaveStep(customFoods || [], next)
    // nothing would change: it's the saved food, opened as it is
    if (step.kind === 'open') onSaved(step.food)
    else if (step.kind === 'save') onSaved(saveCustomFood(next))
    else setAsk({ kind: step.kind, saved: step.saved, next, from })
  }

  /** the user's choice on the open question; the food it leads to opens */
  const answer = (a: DuplicateAnswer) => {
    if (!ask) return
    const { saved, next } = ask
    const food =
      a === 'update' ? updateCustomFood(saved.id!, next)
      : a === 'use-theirs' ? updateCustomFood(saved.id!, next, true)
      : a === 'save-new' ? saveCustomFood({ ...next, n: uniqueName(next.n.trim(), (customFoods || []).map((f) => f.n)) })
      : saved
    setAsk(null)
    if (food) onSaved(food)
  }

  return { save, ask, answer, dismiss: () => setAsk(null) }
}
