/** "What can I make?" (src/screens/food/SuggestSheet.tsx): tap what you have, see which of your recipes fit, with diet swaps. */
import { useMemo, useState } from 'react'
import { View } from 'react-native'
import { useStore } from '@/store/store'
import { kcalHidden } from '@/data/consent'
import { FOODS } from '@/core/data/foods'
import { r0 } from '@/core/domain/date'
import { recipesByUse, recentFoods, queryWords } from '@/core/domain/insights'
import { rankByName } from '@/core/domain/search'
import { isMadeFood, kitchenCandidates, suggestRecipes } from '@/core/domain/suggest'
import { DIETS, dietFit, type Swap } from '@/core/domain/diet'
import { AddC, Button, Card, Chip, Chips, Empty, Foot, Lbl, Li, List, NavBtn, RowText, SearchBar, Sheet, Stack } from './ui'

export function SuggestSheet({ onClose, onLog, onRecipes }: { onClose: () => void; onLog: (recipeIndex: number) => void; onRecipes: () => void }) {
  const data = useStore((s) => s.data)
  const have = useStore((s) => s.kitchen)
  const setKitchen = useStore((s) => s.setKitchen)
  const [q, setQ] = useState('')
  const all = useMemo(() => FOODS.concat(data.customFoods || []), [data.customFoods])
  const diet = data.profile.diet
  const gentle = kcalHidden(data)
  const dietLabel = DIETS.find(([d]) => d === diet)?.[1]

  const candidates = useMemo(
    () => kitchenCandidates(data.recipes, recentFoods(data, all, 20).map((f) => f.n), all),
    [data, all],
  )
  // stable order: candidates as found, then anything added by search; nothing that conflicts
  // with the diet (a vegetarian isn't offered beef mince)
  const byName = useMemo(() => new Map(all.map((f) => [f.n, f])), [all])
  const fitsDiet = (n: string) => dietFit(byName.get(n) ?? { n }, diet) !== 'conflict'
  const chips = [...new Set([...candidates.filter(fitsDiet), ...have])].slice(0, 36)
  const toggle = (n: string) => setKitchen(have.includes(n) ? have.filter((x) => x !== n) : [...have, n])
  const words = queryWords(q.trim().toLowerCase())
  const adds = q.trim() ? rankByName(all, (f) => f.n, words.length ? words : [q.trim().toLowerCase()], (f) => f.aka).filter((f) => !chips.includes(f.n) && !isMadeFood(f)).slice(0, 6) : []
  const results = suggestRecipes(data.recipes, recipesByUse(data), have, diet, all)

  return (
    <Sheet title="What can I make?" tall onClose={onClose} right={<NavBtn bold title="Done" onPress={onClose} />}>
      {data.recipes.length === 0 ? (
        <Card style={{ paddingVertical: 22, paddingHorizontal: 16 }}>
          <Empty>Suggestions come from your recipes. Save a meal you've logged as a recipe, or build one from its ingredients.</Empty>
          <Stack style={{ marginTop: 0 }}><Button kind="tinted" title="Recipes" onPress={onRecipes} /></Stack>
        </Card>
      ) : (
        <>
          <Lbl>I have…</Lbl>
          <Chips>
            {chips.map((n) => <Chip key={n} on={have.includes(n)} onPress={() => toggle(n)} label={n} />)}
          </Chips>
          <SearchBar value={q} onChange={setQ} placeholder="Add something else" label="Add an ingredient you have" style={{ marginTop: 10 }} />
          {adds.length > 0 && (
            <Chips style={{ marginTop: 8 }}>
              {adds.map((f) => <Chip key={f.n} onPress={() => { toggle(f.n); setQ('') }} label={`+ ${f.n}`} />)}
            </Chips>
          )}
          <Foot>Salt, pepper, oil, stock and dried herbs and spices are assumed. No amounts needed.</Foot>

          <Lbl>Your recipes{dietLabel && diet !== 'none' ? ` · ${dietLabel}` : ''}</Lbl>
          <List>
            {results.map((s) => (
              <Li key={s.recipe.id} label={s.recipe.name} onPress={() => onLog(s.recipeIndex)}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <RowText title={s.recipe.name}
                    sub={`${s.missing.length === 0 ? 'You have everything' : `Missing: ${s.missing.slice(0, 3).join(', ')}${s.missing.length > 3 ? ` +${s.missing.length - 3}` : ''}`} · ${r0(s.perServing.p)} g protein`}
                    sub2={s.swaps.length > 0 ? s.swaps.map((w) => swapText(w, gentle, +s.recipe.servings || 1)).join(' · ') : undefined} />
                </View>
                <AddC />
              </Li>
            ))}
          </List>
          <Foot>Ranked by what you have. Swaps use the same weight (oil for butter a little less). Edit the recipe to use one.</Foot>
        </>
      )}
    </Sheet>
  )
}

/** "Swap Beef mince → Quorn pieces (−64 kcal, −9 g protein per serving)", or "Contains meat: …". */
function swapText(w: Swap, gentle: boolean, servings: number): string {
  if (!w.to) return `Contains ${w.reason}: ${w.from} (leave out or use a plant version)`
  const sign = (x: number) => (x >= 0 ? '+' : '−') + Math.abs(Math.round(x / servings))
  // per serving, like the protein figure beside it
  const d = w.delta ? ` (${gentle ? '' : `${sign(w.delta.k)} kcal, `}${sign(w.delta.p)} g protein per serving)` : ''
  return `Swap ${w.from} → ${w.to.n}${d}`
}
