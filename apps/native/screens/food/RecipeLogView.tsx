/** Log a serving (or several) of a saved recipe (src/screens/food/RecipeLogView.tsx). */
import { useState } from 'react'
import { useStore } from '@/store/store'
import { kcalHidden } from '@/data/consent'
import type { MealSlot } from '@/core/types'
import { fmt, r1 } from '@/core/domain/date'
import { recipePerServing } from '@/core/domain/nutrition'
import { CAPTURE_ERR, frac } from '@/core/domain/estimate'
import { MEAL_LABEL, recipeServing } from '@/core/domain/insights'
import { BackButton, Big, Button, Card, Foot, Lbl, NavBtn, Scale, Sheet, Sub } from './ui'
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
  const steps = [0.5, 1, 1.5, 2, 3].includes(q) ? [0.5, 1, 1.5, 2, 3] : [0.5, 1, 1.5, 2, q].sort((a, b) => a - b)
  return (
    <Sheet title={recipe.name} onClose={onClose} animate={animate} left={onBack ? <BackButton onPress={onBack} /> : undefined}
      right={<NavBtn bold title="Add" onPress={commit} />}>
      <MealSeg value={meal} onChange={setMeal} />
      <Lbl>Servings</Lbl>
      <Scale items={steps.map((v) => ({
        key: v, big: frac(v), on: q === v, onPress: () => setQ(v),
        small: gentle ? `${Math.round(per.p * v)} g protein` : `${fmt(per.k * v)} kcal`,
      }))} />
      <Foot>
        The recipe makes {recipe.servings} serving{recipe.servings !== 1 ? 's' : ''}. It's worked out from its ingredients, so it's more accurate than a photo of the plate.
      </Foot>
      <Card style={{ marginTop: 14 }}>
        {!gentle && <Big value={fmt(per.k * q)} unit="kcal" pm={`± ${fmt(per.k * q * CAPTURE_ERR.recipe)}`} />}
        <Sub n style={{ marginTop: 4 }}>{r1(per.p * q)} g protein · {r1(per.c * q)} g carbs · {r1(per.f * q)} g fat</Sub>
      </Card>
      <Button title={`Add to ${MEAL_LABEL[meal]}`} onPress={commit} />
    </Sheet>
  )
}
