/**
 * Food (src/screens/FoodScreen.tsx): the day against its range with its honest ± margin, the meals
 * as grouped lists, then the quicker ways to log. What it shows comes from the shared view model
 * (src/screens/food/foodModel.ts), its words from src/copy/food.ts, its pieces from lib/ui.
 * Checklist: PARITY.md; check: scripts/e2e-food-parity.cjs.
 */
import { useState, type ReactNode } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { useStore } from '@/store/store'
import type { MealSlot, RecipeItem } from '@/core/types'
import { fmt } from '@/core/domain/date'
import { frac, isEstimate, portionText } from '@/core/domain/estimate'
import { MEALS, MEAL_LABEL, mealNow, recipeItemsFrom, recipeServing, recipesByUse } from '@/core/domain/insights'
import { foodDay, mealKcal, mealNames, type LoggedRow } from '@/screens/food/foodModel'
import { FOOD } from '@/copy/food'
import { FOOD9 } from '@/copy/onboardingApp'
import { KcalBar, MacroTrio } from '../../lib/ui/charts'
import { Card, DashAdd, LinkBtn, List, RoundBtn } from '../../lib/ui/kit'
import { AddC, PageHeader, Row, Sheet } from '../../lib/ui/primitives'
import { DayNav } from '../../lib/ui/WeekStrip'
import { Foot, GrpH, Lbl } from '../../lib/ui/text'
import { num, tx, useTokens } from '../../lib/theme'
import { MarginSheet } from './MarginSheet'
import { AddFoodSheet } from './AddFoodSheet'
import { MealsSheet } from './MealsSheet'
import { SuggestSheet } from './SuggestSheet'
import { EditEntrySheet } from './EditEntrySheet'
import { RecipeLogView } from './RecipeLogView'

type SheetKind =
  | { k: 'add'; meal?: MealSlot; view?: 'quick' | 'create' }
  | { k: 'recipes'; draft?: { name: string; items: RecipeItem[] } } | { k: 'edit'; i: number } | { k: 'margin' } | { k: 'suggest' } | { k: 'logRecipe'; ri: number }
  | { k: 'pickYesterday' } | { k: 'pickRecipe' } | null

export function FoodScreen() {
  const t = useTokens()
  const data = useStore((s) => s.data)
  const cur = useStore((s) => s.cur)
  const repeatYesterday = useStore((s) => s.repeatYesterday)
  const logRecipe = useStore((s) => s.logRecipe)
  const [sheet, setSheet] = useState<SheetKind>(null)
  const [logMeal, setLogMeal] = useState<MealSlot>(mealNow())

  const fd = foodDay(data, cur)
  const { gentle, fv, noKcal, totals: tot, target: tg, range: r, status: st, margin, words: mw, proteinRange: pRange, groups, sameAsYesterday, saveable } = fd
  const saveRecipe = (m: MealSlot) => setSheet({ k: 'recipes', draft: { name: '', items: recipeItemsFrom(groups[m]) } })

  // `.li` with its `.tr.kc` kcal (16 pt medium, --label): a logged entry opens its edit sheet
  const row = (x: LoggedRow) => (
    <Row key={x._i} title={x.n} sub={<Text style={num}>{portionText(x)}</Text>} chevron={false} onPress={() => setSheet({ k: 'edit', i: x._i })}
      strong value={noKcal ? undefined : `${isEstimate(x) ? '≈ ' : ''}${fmt(x.k)}`} />
  )
  // `.pline`: 13 pt --label2, a split row when it has two ends
  const pline = (a: ReactNode, b?: ReactNode) => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
      <Text style={[tx(13, 400, 1.4), num, { color: t.label2, flexShrink: 1 }]}>{a}</Text>
      {b != null && <Text style={[tx(13, 400, 1.4), num, { color: t.label2, flexShrink: 1 }]}>{b}</Text>}
    </View>
  )
  const kcalHead = <KcalHead kcal={tot.k} margin={margin} onMargin={() => setSheet({ k: 'margin' })} />

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView testID="food-screen" contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 12 }}>
        <PageHeader eyebrow={<DayNav />} title={FOOD.title}
          right={<RoundBtn label={FOOD.addFood} onPress={() => setSheet({ k: 'add' })} />} />

        <View accessibilityLabel={FOOD.daySoFar}>
          <Card>
            {fd.card === 'yes' ? (
              // Yes: totals in words; a range only after "Show a range" (ob9-4), never a target
              <View style={{ gap: 8 }}>
                <Text style={[tx(22, 600, 1.2, -0.01), { color: t.label }]}>{FOOD9.meals(mw.slots.length)}</Text>
                <Text style={[tx(15, 400, 1.5), { color: t.label2 }]}>{mw.slots.length ? FOOD9.withProtein(mw.withProtein, mw.slots.length) : FOOD9.empty}</Text>
                {fv.rangeOnFood && <>
                  {/* inside `.f9` the bar keeps `.kbar`'s 14 above it (only `.pcard > .kbar` drops it) */}
                  <View style={{ marginTop: 14 }}><KcalBar k={tot.k} lo={r.lo} hi={r.hi} /></View>
                  {pline(FOOD9.range(r.lo, r.hi))}
                  {pline(FOOD9.yesRangeS)}
                </>}
              </View>
            ) : fd.card === 'sometimes' ? (
              // Sometimes: the range, never a single number; protein as a range
              <>
                {kcalHead}
                <KcalBar k={tot.k} lo={r.lo} hi={r.hi} />
                {pline(FOOD9.range(r.lo, r.hi), st.gentle)}
                {pRange && pline(FOOD9.proteinRange(Math.round(tot.p), pRange.low, pRange.high))}
              </>
            ) : <>
              {gentle ? <Text style={[tx(24, 600, 1.2, -0.01), { color: t.label }]}>{st.gentle}</Text> : kcalHead}
              <KcalBar k={tot.k} lo={r.lo} hi={r.hi} />
              {!gentle && pline(FOOD.range(fmt(r.lo), fmt(r.hi)), st.word)}
              <MacroTrio p={tot.p} c={tot.c} f={tot.f} tp={tg.p} tc={tg.c} tf={tg.f} />
            </>}
          </Card>
        </View>

        {data.recipes.length > 0 && (
          <View style={{ marginTop: 10 }}>
            <GrpH link={{ title: FOOD.manage, onPress: () => setSheet({ k: 'recipes' }) }}>{FOOD.yourRecipes}</GrpH>
            <List style={{ marginBottom: 8 }}>
              {recipesByUse(data).slice(0, 4).map((ri) => {
                const rc = data.recipes[ri]
                const serv = recipeServing(data, rc.name)
                return (
                  <Row key={rc.id} title={rc.name} sub={`${FOOD.servings(frac(serv), serv)} · ${FOOD.addsTo(MEAL_LABEL[mealNow()])}`}
                    onPress={() => logRecipe(rc, serv, mealNow())} right={<AddC />} />
                )
              })}
            </List>
          </View>
        )}

        {MEALS.map((m, mi) => {
          const items = groups[m]
          // the web's list 8 below and a dashed add's 12 above collapse to 12: native leaves the 8 out there
          const nextEmpty = mi < MEALS.length - 1 && !groups[MEALS[mi + 1]].length
          if (!items.length) {
            return <DashAdd key={m} title={MEAL_LABEL[m]} stroke={2.6} onPress={() => setSheet({ k: 'add', meal: m })} />
          }
          return (
            <View key={m} accessibilityLabel={MEAL_LABEL[m]}>
              <GrpH small={noKcal ? undefined : `${fmt(mealKcal(items))} kcal`}>{MEAL_LABEL[m]}</GrpH>
              <List style={{ marginBottom: nextEmpty ? 0 : 8 }}>
                {items.map(row)}
                <Row act icon="plus" title={FOOD.addTo(MEAL_LABEL[m])} onPress={() => setSheet({ k: 'add', meal: m })} />
              </List>
            </View>
          )
        })}
        {groups.other.length > 0 && (
          <View>
            <GrpH>{FOOD.other}</GrpH>
            <List style={{ marginBottom: 8 }}>{groups.other.map(row)}</List>
          </View>
        )}

        <View style={{ paddingTop: 8 }}><Lbl>{FOOD.quicker}</Lbl></View>
        <List style={{ marginBottom: 8 }}>
          {sameAsYesterday.length > 0 && (
            <Row title={FOOD.sameAsYesterday}
              sub={sameAsYesterday.length === 1 ? `${MEAL_LABEL[sameAsYesterday[0].m]}: ${mealNames(sameAsYesterday[0].yd)}` : FOOD.copyAMeal}
              onPress={() => sameAsYesterday.length === 1 ? repeatYesterday(sameAsYesterday[0].m) : setSheet({ k: 'pickYesterday' })} />
          )}
          <Row title={FOOD.yourRecipes} value={data.recipes.length || ''} onPress={() => setSheet({ k: 'recipes' })} />
          <Row title={FOOD.whatCanIMake} sub={FOOD.whatCanIMakeS} onPress={() => setSheet({ k: 'suggest' })} />
          <Row title={FOOD.quickEstimate} sub={FOOD.quickEstimateS} onPress={() => setSheet({ k: 'add', view: 'quick' })} />
          <Row title={FOOD.createFood} onPress={() => setSheet({ k: 'add', view: 'create' })} />
          {saveable.length > 0 && (
            <Row title={FOOD.saveAsRecipe} sub={saveable.length === 1 ? FOOD.saveAsRecipeOne(MEAL_LABEL[saveable[0]]) : FOOD.saveAsRecipeMany}
              onPress={() => saveable.length === 1 ? saveRecipe(saveable[0]) : setSheet({ k: 'pickRecipe' })} />
          )}
        </List>
        <Foot>{FOOD.foot}</Foot>
      </ScrollView>

      {sheet?.k === 'pickYesterday' && (
        <Sheet title={FOOD.sameAsYesterday} onClose={() => setSheet(null)}>
          <List style={{ marginBottom: 8 }}>
            {sameAsYesterday.map(({ m, yd }) => (
              <Row key={m} title={MEAL_LABEL[m]} sub={mealNames(yd)} right={<AddC />} onPress={() => { repeatYesterday(m); setSheet(null) }} />
            ))}
          </List>
        </Sheet>
      )}
      {sheet?.k === 'pickRecipe' && (
        <Sheet title={FOOD.saveAsRecipe} onClose={() => setSheet(null)}>
          <List style={{ marginBottom: 8 }}>
            {saveable.map((m) => <Row key={m} title={MEAL_LABEL[m]} sub={mealNames(groups[m])} onPress={() => saveRecipe(m)} />)}
          </List>
        </Sheet>
      )}
      {sheet?.k === 'margin' && <MarginSheet onClose={() => setSheet(null)} />}
      {sheet?.k === 'add' && <AddFoodSheet initialMeal={sheet.meal} initialView={sheet.view} onClose={() => setSheet(null)} />}
      {sheet?.k === 'recipes' && <MealsSheet initialDraft={sheet.draft} onClose={() => setSheet(null)} />}
      {sheet?.k === 'suggest' && <SuggestSheet onClose={() => setSheet(null)} onLog={(ri) => { setLogMeal(mealNow()); setSheet({ k: 'logRecipe', ri }) }} onRecipes={() => setSheet({ k: 'recipes' })} />}
      {sheet?.k === 'logRecipe' && <RecipeLogView index={sheet.ri} meal={logMeal} setMeal={setLogMeal} onBack={() => setSheet({ k: 'suggest' })} onClose={() => setSheet(null)} animate={false} />}
      {sheet?.k === 'edit' && <EditEntrySheet index={sheet.i} onClose={() => setSheet(null)} />}
    </View>
  )
}

/** `.ph` with `.kbig` (Food-only): the 44 pt kcal eaten, and the ± that opens About this estimate. */
function KcalHead({ kcal, margin, onMargin }: { kcal: number; margin: number; onMargin: () => void }) {
  const t = useTokens()
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', flexShrink: 1 }}>
        <Text style={[tx(44, 600, 1, -0.03), num, { color: t.label }]}>{fmt(kcal)}</Text>
        <Text style={[tx(15), { color: t.label2 }]}>{FOOD.kcalEaten}</Text>
      </View>
      {kcal > 0 && <LinkBtn title={`± ${margin}`} label={FOOD.aboutEstimate} onPress={onMargin} style={num} />}
    </View>
  )
}
