/** What can I make? (src/screens/food/SuggestSheet.tsx): tap what you have, see which of your recipes fit, with diet swaps. */
import { useMemo, useState } from 'react'
import { View } from 'react-native'
import { useStore } from '@/store/store'
import { kcalHidden } from '@/data/consent'
import { r0 } from '@/core/domain/date'
import { recipesByUse } from '@/core/domain/insights'
import { suggestRecipes } from '@/core/domain/suggest'
import { DIETS } from '@/core/domain/diet'
import { allFoods, kitchenAdds, kitchenChips, swapText } from '@/screens/food/foodModel'
import { SUGGEST } from '@/copy/food'
import { Btn, Card, Chip, Chips, List } from '../../lib/ui/kit'
import { AddC, NavBtn, Row, Sheet } from '../../lib/ui/primitives'
import { SearchBar } from '../../lib/ui/fields'
import { Empty, Foot, Lbl } from '../../lib/ui/text'

export function SuggestSheet({ onClose, onLog, onRecipes }: { onClose: () => void; onLog: (recipeIndex: number) => void; onRecipes: () => void }) {
  const data = useStore((s) => s.data)
  const have = useStore((s) => s.kitchen)
  const setKitchen = useStore((s) => s.setKitchen)
  const [q, setQ] = useState('')
  const all = useMemo(() => allFoods(data.customFoods), [data.customFoods])
  const diet = data.profile.diet
  const gentle = kcalHidden(data)
  const dietLabel = DIETS.find(([d]) => d === diet)?.[1]
  // stable order: candidates as found, then anything added by search; nothing that conflicts with the diet
  const chips = useMemo(() => kitchenChips(data, all, have), [data, all, have])
  const toggle = (n: string) => setKitchen(have.includes(n) ? have.filter((x) => x !== n) : [...have, n])
  const adds = kitchenAdds(all, chips, q)
  const results = suggestRecipes(data.recipes, recipesByUse(data), have, diet, all)

  return (
    <Sheet title={SUGGEST.title} tall onClose={onClose} right={<NavBtn bold title={SUGGEST.done} onPress={onClose} />}>
      {data.recipes.length === 0 ? (
        <Card plain style={{ paddingVertical: 22, paddingHorizontal: 16 }}>
          <Empty>{SUGGEST.noRecipes}</Empty>
          <Btn kind="tinted" title={SUGGEST.recipes} onPress={onRecipes} />
        </Card>
      ) : (
        <>
          <Lbl>{SUGGEST.iHave}</Lbl>
          <Chips>{chips.map((n) => <Chip key={n} title={n} on={have.includes(n)} onPress={() => toggle(n)} />)}</Chips>
          <SearchBar label={SUGGEST.addLabel} placeholder={SUGGEST.addPh} value={q} onChangeText={setQ} autoCorrect={false} autoCapitalize="none" style={{ marginTop: 10 }} />
          {adds.length > 0 && (
            <View style={{ marginTop: 8 }}>
              <Chips>{adds.map((f) => <Chip key={f.n} title={`+ ${f.n}`} onPress={() => { toggle(f.n); setQ('') }} />)}</Chips>
            </View>
          )}
          <Foot>{SUGGEST.assumed}</Foot>

          <Lbl>{SUGGEST.yourRecipes(dietLabel && diet !== 'none' ? dietLabel : undefined)}</Lbl>
          <List style={{ marginBottom: 8 }}>
            {results.map((s) => (
              <Row key={s.recipe.id} title={s.recipe.name} right={<AddC />} onPress={() => onLog(s.recipeIndex)}
                sub={`${s.missing.length === 0 ? SUGGEST.haveAll : SUGGEST.missing(s.missing)} · ${r0(s.perServing.p)} g protein`}
                sub2={s.swaps.length > 0 ? s.swaps.map((w) => swapText(w, gentle, +s.recipe.servings || 1)).join(' · ') : undefined} />
            ))}
          </List>
          <Foot>{SUGGEST.ranked}</Foot>
        </>
      )}
    </Sheet>
  )
}
