/** Pieces the Food views share (src/screens/food/common.tsx). */
import type { MealSlot } from '@/core/types'
import type { Check } from '@/core/domain/checks'
import { MEALS, MEAL_LABEL } from '@/core/domain/insights'
import { mealOption } from '@/copy/food'
import { Note } from '../../lib/ui/kit'
import { Seg } from '../../lib/ui/primitives'

const MEAL_OPTIONS: [MealSlot, string][] = MEALS.map((m) => [m, mealOption(m, MEAL_LABEL[m])])

/** Meal picker. `value` may be undefined for legacy entries logged without a meal. */
export function MealSeg({ value, onChange }: { value: MealSlot | undefined; onChange: (m: MealSlot) => void }) {
  return <Seg options={MEAL_OPTIONS} value={value} onChange={onChange} />
}

/** Accuracy check results: `ok` shows only when there's nothing to flag and the numbers were checked. */
export function Checks({ checks, ok, onFix }: { checks: Check[]; ok?: string; onFix?: (k: number) => void }) {
  if (!checks.length) return ok ? <Note kind="ok" status>{ok}</Note> : null
  return (
    <>
      {checks.map((c, i) => (
        // TODO(N1-followup): the web's fix button is `.btn.sm.tinted`; Note's action is an ink small Btn
        <Note key={i} kind={c.level === 'warn' ? 'warn' : 'info'} status
          action={c.fix && onFix ? { title: c.fix.label, onPress: () => onFix(c.fix!.k) } : undefined}>{c.msg}</Note>
      ))}
    </>
  )
}
