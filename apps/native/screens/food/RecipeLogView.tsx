/** Log a serving, or several, of a saved recipe (src/screens/food/RecipeLogView.tsx). */
import { useState } from 'react'
import { useStore } from '@/store/store'
import { kcalHidden } from '@/data/consent'
import type { MealSlot } from '@/core/types'
import { fmt, r1 } from '@/core/domain/date'
import { recipePerServing } from '@/core/domain/nutrition'
import { CAPTURE_ERR, frac } from '@/core/domain/estimate'
import { MEAL_LABEL, recipeServing } from '@/core/domain/insights'
import { recipeSteps } from '@/screens/food/foodModel'
import { RECIPES } from '@/copy/food'
import { Big, Btn, Card } from '../../lib/ui/kit'
import { BackButton, NavBtn, Sheet } from '../../lib/ui/primitives'
import { Scale } from '../../lib/ui/controls'
import { Foot, Lbl, Sub } from '../../lib/ui/text'
import { num } from '../../lib/theme'
import { MealSeg } from './common'

export function RecipeLogView({ index, meal, setMeal, onBack, onClose, animate }: {
  index: number; meal: MealSlot; setMeal: (m: MealSlot) => void; onBack?: () => void; onClose: () => void; animate: boolean
}) {
  const recipe = useStore((s) => s.data.recipes[index])
  const logRecipe = useStore((s) => s.logRecipe)
  const gentle = useStore((s) => kcalHidden(s.data))
  // start from the servings the user had last time
  const [q, setQ] = useState(() => (recipe ? recipeServing(useStore.getState().data, recipe.name) : 1))
  if (!recipe) return null
  const per = recipePerServing(recipe)
  const commit = () => { logRecipe(recipe, q, meal); onClose() }
  return (
    <Sheet title={recipe.name} onClose={onClose} animate={animate} left={onBack ? <BackButton onPress={onBack} /> : undefined}
      right={<NavBtn bold title={RECIPES.add} onPress={commit} />}>
      <MealSeg value={meal} onChange={setMeal} />
      <Lbl>{RECIPES.servings}</Lbl>
      <Scale items={recipeSteps(q).map((v) => ({ key: v, big: frac(v), text: gentle ? `${Math.round(per.p * v)} g protein` : `${fmt(per.k * v)} kcal` }))} value={q} onPick={setQ} />
      <Foot>{RECIPES.makes(recipe.servings)}</Foot>
      <Card plain style={{ marginTop: 14, marginBottom: 10 }}>
        {!gentle && <Big value={fmt(per.k * q)} unit="kcal" pm={`± ${fmt(per.k * q * CAPTURE_ERR.recipe)}`} />}
        <Sub style={[num, { marginTop: 4 }]}>{r1(per.p * q)} g protein · {r1(per.c * q)} g carbs · {r1(per.f * q)} g fat</Sub>
      </Card>
      <Btn title={RECIPES.addTo(MEAL_LABEL[meal])} onPress={commit} />
    </Sheet>
  )
}
