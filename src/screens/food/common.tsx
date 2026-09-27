import type { MealSlot } from '@/core/types'
import type { Check } from '@/core/domain/checks'
import { MEALS, MEAL_LABEL } from '@/core/domain/insights'
import { Seg } from '@/ui/primitives'
import { Icon } from '@/ui/icons'
import { useStore } from '@/store/store'
import { NEEDS_NET } from '@/ui/ConnectionPill'

/** "Photo of the label": online only, so offline it stays in view, off, with the note (ob6-8). */
export function LabelPhotoButton({ onPress }: { onPress: () => void }) {
  const online = useStore((s) => s.online)
  return (
    <>
      <button className="btn gray" disabled={!online} onClick={onPress}><Icon name="camera" size={17} /> Photo of the label</button>
      {!online && <div className="foot" style={{ padding: 0 }}>{NEEDS_NET}</div>}
    </>
  )
}

/** Accuracy check results. `ok` is shown only when there's nothing to flag and the numbers
 *  have been checked, so a confirmation always means something. */
export function Checks({ checks, ok, onFix }: { checks: Check[]; ok?: string; onFix?: (k: number) => void }) {
  if (!checks.length) {
    return ok ? <div className="note ok" role="status"><Icon name="checkc" size={17} /><span>{ok}</span></div> : null
  }
  return (
    <div role="status">
      {checks.map((c, i) => (
        <div key={i} className={'note ' + c.level}>
          <Icon name="info" size={17} />
          <span>{c.msg}</span>
          {c.fix && onFix && <button className="btn sm tinted" onClick={() => onFix(c.fix!.k)}>{c.fix.label}</button>}
        </div>
      ))}
    </div>
  )
}

const MEAL_OPTIONS: [MealSlot, string][] = MEALS.map((m) => [m, m === 'snack' ? 'Snack' : MEAL_LABEL[m]])

/** Meal picker. `value` may be undefined for legacy entries logged without a meal. */
export function MealSeg({ value, onChange }: { value: MealSlot | undefined; onChange: (m: MealSlot) => void }) {
  return <Seg options={MEAL_OPTIONS} value={value} onChange={onChange} />
}
