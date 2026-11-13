/** Recipes (src/screens/food/MealsSheet.tsx): build once from ingredients, log a serving in a tap. */
import { useMemo, useState } from 'react'
import { Text, View } from 'react-native'
import { useStore } from '@/store/store'
import { kcalHidden } from '@/data/consent'
import type { MealSlot, RecipeItem } from '@/core/types'
import { fmt, r0, r1 } from '@/core/domain/date'
import { basisOf, headline, recipePerServing } from '@/core/domain/nutrition'
import { checkRecipe, isCookedState } from '@/core/domain/checks'
import { CAPTURE_ERR } from '@/core/domain/estimate'
import { mealNow } from '@/core/domain/insights'
import { allFoods, asIngredient, draftProblem, draftTotals, ingredientMatches, numIn, type RecipeDraft } from '@/screens/food/foodModel'
import { RECIPES } from '@/copy/food'
import { Btn, Card, List } from '../../lib/ui/kit'
import { AddC, BackButton, NavBtn, Row, Sheet, XBtn } from '../../lib/ui/primitives'
import { FRow, Input, SearchBar } from '../../lib/ui/fields'
import { Empty, Lbl, Sub } from '../../lib/ui/text'
import { num, tx, useTokens } from '../../lib/theme'
import { Checks } from './common'
import { RecipeLogView } from './RecipeLogView'

/** `initialDraft` opens straight into the builder, e.g. "Save as recipe" from a logged meal. */
export function MealsSheet({ onClose, initialDraft }: { onClose: () => void; initialDraft?: { name: string; items: RecipeItem[] } }) {
  const t = useTokens()
  const recipes = useStore((s) => s.data.recipes)
  const customFoods = useStore((s) => s.data.customFoods)
  const saveRecipe = useStore((s) => s.saveRecipe)
  const deleteRecipe = useStore((s) => s.deleteRecipe)
  const showToast = useStore((s) => s.showToast)
  const gentle = useStore((s) => kcalHidden(s.data))
  const all = useMemo(() => allFoods(customFoods), [customFoods])

  const [draft, setDraft] = useState<RecipeDraft | null>(initialDraft ? { name: initialDraft.name, servings: '1', items: initialDraft.items } : null)
  const [logging, setLogging] = useState<number | null>(null)
  const [meal, setMeal] = useState<MealSlot>(mealNow())
  const [q, setQ] = useState('')
  const [moved, setMoved] = useState(false)
  // what's typed in an ingredient's amount box, so "0." or an empty box can be on the way to a number
  const [aText, setAText] = useState<{ i: number; v: string } | null>(null)

  if (logging != null) return <RecipeLogView index={logging} meal={meal} setMeal={setMeal} onBack={() => setLogging(null)} onClose={onClose} animate={false} />

  if (draft) {
    const { servings: s, totals } = draftTotals(draft)
    // ready meals and menu items stay addable, but after the ingredients that match
    const matches = ingredientMatches(all, q)
    const idx = draft.id ? recipes.findIndex((r) => r.id === draft.id) : -1
    const save = () => {
      const problem = draftProblem(draft, recipes)
      if (problem === 'name') { showToast(RECIPES.needName); return }
      if (problem === 'items') { showToast(RECIPES.needItems); return }
      if (problem === 'taken') { showToast(RECIPES.nameTaken); return }
      saveRecipe({ id: draft.id, name: draft.name.trim(), servings: s, items: draft.items })
      if (initialDraft) onClose()
      else setDraft(null)
    }
    const line = (children: React.ReactNode) => <Text style={[tx(15, 400, 1.5), { color: t.label }]}>{children}</Text>
    const b = (s0: string) => <Text style={[tx(15, 700, 1.5), num]}>{s0}</Text>
    return (
      <Sheet title={draft.id ? RECIPES.editTitle : RECIPES.new} tall animate={false} onClose={onClose}
        left={initialDraft ? undefined : <BackButton onPress={() => setDraft(null)} label={RECIPES.back} />}
        right={<NavBtn bold title={RECIPES.save} onPress={save} />}>
        {initialDraft && <Sub style={{ paddingHorizontal: 4, paddingBottom: 12 }}>{RECIPES.fromMeal}</Sub>}
        <List style={{ marginBottom: 8 }}>
          <FRow label={RECIPES.name} value={draft.name} placeholder={RECIPES.namePh} onChangeText={(v) => setDraft({ ...draft, name: v })} />
          <FRow label={RECIPES.servings} value={draft.servings} keyboardType="decimal-pad" onChangeText={(v) => setDraft({ ...draft, servings: v })} />
        </List>
        <Lbl>{RECIPES.ingredients}</Lbl>
        <List style={{ marginBottom: 8 }}>
          {draft.items.length ? draft.items.map((it, ii) => (
            <Row key={ii} title={it.n} sub={[isCookedState(it.n) && RECIPES.cooked, !gentle && `${Math.round((it.k * it.grams) / basisOf(it))} kcal`].filter(Boolean).join(' · ') || undefined}
              right={
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  {/* the amount box: 72 wide, right-aligned, padding 7 8 */}
                  <Input label={RECIPES.amountOf(it.n)} keyboardType="decimal-pad" value={aText?.i === ii ? aText.v : String(Math.round(it.grams * 100) / 100)}
                    onChangeText={(v) => { setAText({ i: ii, v }); setDraft({ ...draft, items: draft.items.map((x, j) => (j === ii ? { ...x, grams: numIn(v) } : x)) }) }}
                    onBlur={() => setAText(null)}
                    style={[num, { width: 72, textAlign: 'right', paddingVertical: 7, paddingHorizontal: 8 }]} />
                  <Text style={[tx(17), { color: t.label2 }]}>{it.each ? 'item' : it.ml ? 'ml' : 'g'}</Text>
                  {/* TODO(N1-followup): the web's remove is a `.navbtn` ✕ in --red, not the round `.x-btn` */}
                  <XBtn label={RECIPES.remove(it.n)} onPress={() => { setAText(null); setDraft({ ...draft, items: draft.items.filter((_, j) => j !== ii) }) }} />
                </View>
              } />
          )) : <Empty>{RECIPES.empty}</Empty>}
        </List>
        {/* the card's 10 below and a note's 10 above collapse to 10 on the web */}
        <Card plain style={{ marginTop: 8, marginBottom: draft.items.length > 0 ? 0 : 10 }}>
          {gentle ? line(<>{RECIPES.perServingLabel} {b(`${r0(totals.p / s)} g protein`)}</>) : <>
            {line(<>{RECIPES.wholeRecipe} {b(`${fmt(totals.k)} kcal`)} · {r0(totals.p)} P {r0(totals.c)} C {r0(totals.f)} F</>)}
            {line(<>{RECIPES.perServingLabel} {b(`${fmt(totals.k / s)} kcal`)}{totals.k > 0 && <Text style={[num, { color: t.label2 }]}> ± {fmt((totals.k / s) * CAPTURE_ERR.recipe)}</Text>} · {r0(totals.p / s)} P {r0(totals.c / s)} C {r0(totals.f / s)} F</>)}
          </>}
        </Card>
        {draft.items.length > 0 && <Checks checks={checkRecipe(draft.items)} ok={RECIPES.allGood} />}
        <Lbl>{RECIPES.addIngredients}</Lbl>
        <SearchBar label={RECIPES.searchLabel} placeholder={RECIPES.searchPh} value={q} onChangeText={setQ} autoCorrect={false} autoCapitalize="none" />
        {matches.length > 0 && (
          <List style={{ marginTop: 8, marginBottom: 8 }}>
            {matches.map((f, i) => (
              <Row key={f.n + i} title={f.n} right={<AddC />} onPress={() => setDraft({ ...draft, items: [...draft.items, asIngredient(f)] })}
                sub={`${gentle ? `${r1(headline(f).p)} g protein` : `${Math.round(headline(f).k)} kcal`} ${headline(f).per}`} />
            ))}
          </List>
        )}
        {idx >= 0 && <View style={{ marginTop: 16 }}><Btn kind="danger" title={RECIPES.delete} onPress={() => { deleteRecipe(idx); setDraft(null) }} /></View>}
      </Sheet>
    )
  }

  return (
    <Sheet title={RECIPES.title} tall onClose={onClose} left={null} animate={!moved} right={<NavBtn bold title={RECIPES.done} onPress={onClose} />}>
      <Sub style={{ paddingHorizontal: 4, paddingBottom: 12 }}>{RECIPES.intro}</Sub>
      {recipes.length ? (
        <List style={{ marginBottom: 8 }}>
          {recipes.map((r, ri) => {
            const per = recipePerServing(r)
            return (
              <Row key={r.id} title={r.name} sub={<Text style={num}>{+r.servings > 1 ? RECIPES.servingsLine(r.servings) : ''}{gentle ? '' : `${fmt(per.k)} kcal · `}{RECIPES.perServing(r0(per.p))}</Text>}
                right={
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18 }}>
                    <Btn small kind="tinted" title={RECIPES.log} onPress={() => { setMoved(true); setLogging(ri) }} />
                    <NavBtn title={RECIPES.edit} onPress={() => { setMoved(true); setDraft({ id: r.id, name: r.name, servings: String(r.servings), items: r.items.map((i) => ({ ...i })) }) }} />
                  </View>
                } />
            )
          })}
        </List>
      ) : <Card plain style={{ paddingVertical: 0, paddingHorizontal: 0 }}><Empty>{RECIPES.none}</Empty></Card>}
      <View style={{ marginTop: 16 }}><Btn title={RECIPES.new} onPress={() => { setMoved(true); setDraft({ name: '', servings: '1', items: [] }) }} /></View>
    </Sheet>
  )
}
