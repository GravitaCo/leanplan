/** Recipes (src/screens/food/MealsSheet.tsx): build once from ingredients, log a serving in a tap. */
import { useMemo, useState } from 'react'
import { TextInput, View } from 'react-native'
import { useStore } from '@/store/store'
import { kcalHidden } from '@/data/consent'
import type { MealSlot, RecipeItem } from '@/core/types'
import { FOODS } from '@/core/data/foods'
import { fmt, r0, r1 } from '@/core/domain/date'
import { basisOf, headline, recipePerServing, recipeTotals } from '@/core/domain/nutrition'
import { mealNow, queryWords } from '@/core/domain/insights'
import { rankByName } from '@/core/domain/search'
import { ingredientsFirst } from '@/core/domain/suggest'
import { checkRecipe, isCookedState } from '@/core/domain/checks'
import { CAPTURE_ERR } from '@/core/domain/estimate'
import { font, num, useTokens } from '../../lib/theme'
import { AddC, BackButton, Button, Card, Checks, Empty, FormRow, IconBtn, Lbl, Li, List, NavBtn, RowText, SearchBar, Sheet, SheetHost, Stack, Sub, Txt } from './ui'
import { RecipeLogView } from './RecipeLogView'

interface Draft { id?: string; name: string; servings: string; items: RecipeItem[] }

/** `initialDraft` opens straight into the builder, e.g. "Save as recipe" from a logged meal. */
export function MealsSheet({ onClose, initialDraft }: { onClose: () => void; initialDraft?: { name: string; items: RecipeItem[] } }) {
  return <SheetHost onClose={onClose}><MealsViews onClose={onClose} initialDraft={initialDraft} /></SheetHost>
}

function MealsViews({ onClose, initialDraft }: { onClose: () => void; initialDraft?: { name: string; items: RecipeItem[] } }) {
  const t = useTokens()
  const recipes = useStore((s) => s.data.recipes)
  const customFoods = useStore((s) => s.data.customFoods)
  const saveRecipe = useStore((s) => s.saveRecipe)
  const deleteRecipe = useStore((s) => s.deleteRecipe)
  const showToast = useStore((s) => s.showToast)
  const gentle = useStore((s) => kcalHidden(s.data))
  const all = useMemo(() => FOODS.concat(customFoods || []), [customFoods])

  const [draft, setDraft] = useState<Draft | null>(initialDraft ? { name: initialDraft.name, servings: '1', items: initialDraft.items } : null)
  const [logging, setLogging] = useState<number | null>(null)
  const [meal, setMeal] = useState<MealSlot>(mealNow())
  const [q, setQ] = useState('')
  const [moved, setMoved] = useState(false)

  if (logging != null) return <RecipeLogView index={logging} meal={meal} setMeal={setMeal} onBack={() => setLogging(null)} onClose={onClose} animate={false} />

  if (draft) {
    const s = parseFloat(draft.servings) || 1
    const totals = recipeTotals({ id: '', name: draft.name, servings: s, items: draft.items })
    const query = q.trim().toLowerCase()
    const words = queryWords(query)
    // ready meals and menu items stay addable, but after the ingredients that match
    const matches = query ? ingredientsFirst(rankByName(all, (f) => f.n, words.length ? words : [query], (f) => f.aka), (f) => f).slice(0, 30) : []
    const idx = draft.id ? recipes.findIndex((r) => r.id === draft.id) : -1
    const save = () => {
      if (!draft.name.trim()) { showToast('Give the recipe a name'); return }
      if (!draft.items.length) { showToast('Add at least one ingredient'); return }
      if (draft.id && recipes.some((r) => r.id !== draft.id && r.name.toLowerCase() === draft.name.trim().toLowerCase())) { showToast('You already have a recipe with that name'); return }
      saveRecipe({ id: draft.id, name: draft.name.trim(), servings: s, items: draft.items })
      if (initialDraft) onClose()
      else setDraft(null)
    }
    return (
      <Sheet title={draft.id ? 'Edit recipe' : 'New recipe'} tall animate={false} onClose={onClose}
        left={initialDraft ? undefined : <BackButton onPress={() => setDraft(null)} label="Recipes" />}
        right={<NavBtn bold title="Save" onPress={save} />}>
        {initialDraft && (
          <Sub style={{ paddingHorizontal: 4, paddingBottom: 12 }}>
            Everything you logged, cooking fat included. Name it once and next time it's one tap.
          </Sub>
        )}
        <List>
          <FormRow label="Name" value={draft.name} placeholder="Chicken curry" onChange={(v) => setDraft({ ...draft, name: v })} />
          <FormRow label="Servings" numeric value={draft.servings} onChange={(v) => setDraft({ ...draft, servings: v })} />
        </List>
        <Lbl>Ingredients</Lbl>
        <List>
          {draft.items.length ? draft.items.map((it, ii) => (
            <Li key={ii}>
              <RowText title={it.n} sub={[isCookedState(it.n) && 'Cooked weight', !gentle && `${Math.round((it.k * it.grams) / basisOf(it))} kcal`].filter(Boolean).join(' · ')} />
              <AmountField value={Math.round(it.grams * 100) / 100} label={`${it.n} amount`}
                onChange={(g) => setDraft({ ...draft, items: draft.items.map((x, j) => (j === ii ? { ...x, grams: g } : x)) })} />
              <Txt color={t.label2}>{it.each ? 'item' : it.ml ? 'ml' : 'g'}</Txt>
              <IconBtn name="x" label={`Remove ${it.n}`} color={t.red} onPress={() => setDraft({ ...draft, items: draft.items.filter((_, j) => j !== ii) })} />
            </Li>
          )) : <Empty>Add what went in. Don't forget the oil. It's the part photos never see.</Empty>}
        </List>
        <Card>
          {gentle ? (
            <Txt size={15} style={{ lineHeight: 22 }}>Per serving <Txt size={15} w={700} n>{r0(totals.p / s)} g protein</Txt></Txt>
          ) : (
            <>
              <Txt size={15} style={{ lineHeight: 22 }}>Whole recipe <Txt size={15} w={700} n>{fmt(totals.k)} kcal</Txt> · {r0(totals.p)} P {r0(totals.c)} C {r0(totals.f)} F</Txt>
              <Txt size={15} style={{ lineHeight: 22 }}>Per serving <Txt size={15} w={700} n>{fmt(totals.k / s)} kcal</Txt>{totals.k > 0 && <Txt size={15} n color={t.label2}> ± {fmt((totals.k / s) * CAPTURE_ERR.recipe)}</Txt>} · {r0(totals.p / s)} P {r0(totals.c / s)} C {r0(totals.f / s)} F</Txt>
            </>
          )}
        </Card>
        {draft.items.length > 0 && <Checks checks={checkRecipe(draft.items)} ok="Every ingredient has an amount and its values add up." />}
        <Lbl>Add ingredients</Lbl>
        <SearchBar value={q} onChange={setQ} placeholder="Search foods" label="Search ingredients" />
        {matches.length > 0 && (
          <List style={{ marginTop: 8 }}>
            {matches.map((f, i) => (
              <Li key={f.n + i} label={f.n} onPress={() => setDraft({ ...draft, items: [...draft.items, { n: f.n, k: f.k, p: f.p, c: f.c, f: f.f, grams: f.g, ml: f.ml, each: f.each }] })}>
                <RowText title={f.n} sub={`${gentle ? `${r1(headline(f).p)} g protein` : `${Math.round(headline(f).k)} kcal`} ${headline(f).per}`} />
                <AddC />
              </Li>
            ))}
          </List>
        )}
        {idx >= 0 && (
          <Stack><Button kind="danger" title="Delete recipe" onPress={() => { deleteRecipe(idx); setDraft(null) }} /></Stack>
        )}
      </Sheet>
    )
  }

  return (
    <Sheet title="Recipes" tall onClose={onClose} left={null} animate={!moved}
      right={<NavBtn bold title="Done" onPress={onClose} />}>
      <Sub style={{ paddingHorizontal: 4, paddingBottom: 12 }}>
        Cooked it yourself? You know exactly what went in. Build it once, then log a bowl in one tap.
      </Sub>
      {recipes.length ? (
        <List>
          {recipes.map((r, ri) => {
            const per = recipePerServing(r)
            return (
              <Li key={r.id}>
                <RowText title={r.name} n sub={`${+r.servings > 1 ? r.servings + ' servings · ' : ''}${gentle ? '' : `${fmt(per.k)} kcal · `}${r0(per.p)} g protein per serving`} />
                <Button small kind="tinted" title="Log" onPress={() => { setMoved(true); setLogging(ri) }} />
                <View style={{ marginLeft: 6 }}>
                  <NavBtn title="Edit" onPress={() => { setMoved(true); setDraft({ id: r.id, name: r.name, servings: String(r.servings), items: r.items.map((i) => ({ ...i })) }) }} />
                </View>
              </Li>
            )
          })}
        </List>
      ) : <Card style={{ padding: 0, paddingHorizontal: 0, paddingVertical: 0 }}><Empty>No recipes yet. Build one from its ingredients below.</Empty></Card>}
      <Stack><Button title="New recipe" onPress={() => { setMoved(true); setDraft({ name: '', servings: '1', items: [] }) }} /></Stack>
    </Sheet>
  )
}

/** The ingredient amount box: 72 wide, right-aligned, on the field fill. */
function AmountField({ value, onChange, label }: { value: number; onChange: (g: number) => void; label: string }) {
  const t = useTokens()
  const [text, setText] = useState<string | null>(null)
  return (
    <TextInput accessibilityLabel={label} keyboardType="decimal-pad" selectTextOnFocus
      value={text ?? String(value)} onChangeText={(v) => { setText(v); onChange(parseFloat(v.replace(',', '.')) || 0) }} onBlur={() => setText(null)}
      style={[font(400), num, { width: 72, textAlign: 'right', paddingVertical: 7, paddingHorizontal: 8, fontSize: 17, color: t.label, backgroundColor: t.fill, borderRadius: 10 }]} />
  )
}
