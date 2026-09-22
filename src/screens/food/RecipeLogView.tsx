import { useState } from 'react'
import { useStore } from '@/store/store'
import type { MealSlot } from '@/core/types'
import { fmt, r1 } from '@/core/domain/date'
import { recipePerServing } from '@/core/domain/nutrition'
import { CAPTURE_ERR, frac } from '@/core/domain/estimate'
import { MEAL_LABEL, recipeServing } from '@/core/domain/insights'
import { Sheet, BackButton } from '@/ui/primitives'
import { MealSeg } from './common'

/** Log a serving (or several) of a saved recipe. */
export function RecipeLogView({ index, meal, setMeal, onBack, onClose, animate }: {
  index: number; meal: MealSlot; setMeal: (m: MealSlot) => void; onBack?: () => void; onClose: () => void; animate: boolean
}) {
  const recipe = useStore((s) => s.data.recipes[index])
  const logRecipe = useStore((s) => s.logRecipe)
  const gentle = useStore((s) => !!s.data.profile.gentle)
  // start from the servings the user had last time
  const [q, setQ] = useState(() => (recipe ? recipeServing(useStore.getState().data, recipe.name) : 1))
  if (!recipe) return null
  const per = recipePerServing(recipe)
  const commit = () => { logRecipe(recipe, q, meal); onClose() }
  return (
    <Sheet title={recipe.name} onClose={onClose} animate={animate} left={onBack ? <BackButton onClick={onBack} /> : undefined}
      right={<button className="navbtn b" onClick={commit}>Add</button>}>
      <MealSeg value={meal} onChange={setMeal} />
      <div className="lbl">Servings</div>
      <div className="scale">
        {([0.5, 1, 1.5, 2, 3].includes(q) ? [0.5, 1, 1.5, 2, 3] : [0.5, 1, 1.5, 2, q].sort((a, b) => a - b)).map((v) => (
          <button key={v} className={q === v ? 'on' : ''} onClick={() => setQ(v)}>
            <b className="num">{frac(v)}</b>{gentle ? `${Math.round(per.p * v)} g protein` : `${fmt(per.k * v)} kcal`}
          </button>
        ))}
      </div>
      <div className="foot">
        The recipe makes {recipe.servings} serving{recipe.servings !== 1 ? 's' : ''}. It's worked out from its ingredients, so it's more accurate than a photo of the plate.
      </div>
      <div className="card" style={{ marginTop: 14 }}>
        {!gentle && <div className="big num">{fmt(per.k * q)}<small>kcal</small><span className="pm">± {fmt(per.k * q * CAPTURE_ERR.recipe)}</span></div>}
        <div className="sub num" style={{ marginTop: 4 }}>{r1(per.p * q)} g protein · {r1(per.c * q)} g carbs · {r1(per.f * q)} g fat</div>
      </div>
      <button className="btn" onClick={commit}>Add to {MEAL_LABEL[meal]}</button>
    </Sheet>
  )
}
