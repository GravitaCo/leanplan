import type { MealSlot } from '@/core/types'
import { MEALS, MEAL_LABEL } from '@/core/domain/insights'
import { Seg } from '@/ui/primitives'

const MEAL_OPTIONS: [MealSlot, string][] = MEALS.map((m) => [m, m === 'snack' ? 'Snack' : MEAL_LABEL[m]])

/** Meal picker. `value` may be undefined for legacy entries logged without a meal. */
export function MealSeg({ value, onChange }: { value: MealSlot | undefined; onChange: (m: MealSlot) => void }) {
  return <Seg options={MEAL_OPTIONS} value={value} onChange={onChange} />
}
