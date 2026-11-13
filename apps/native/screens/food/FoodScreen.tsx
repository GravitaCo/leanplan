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
import { Btn, Card, LinkBtn, List } from '../../lib/ui/kit'
import { Icon } from '../../lib/ui/icons'
import { PageHeader, Row, Sheet } from '../../lib/ui/primitives'
import { DayNav } from '../../lib/ui/WeekStrip'
import { Foot, GrpH, Lbl } from '../../lib/ui/text'
import { num, tx, useTokens } from '../../lib/theme'
import { MarginSheet } from './MarginSheet'

type SheetKind =
  | { k: 'add'; meal?: MealSlot; view?: 'quick' | 'create' }
  | { k: 'recipes'; draft?: { name: string; items: RecipeItem[] } } | { k: 'edit'; i: number } | { k: 'margin' } | { k: 'suggest' }
  | { k: 'pickYesterday' } | { k: 'pickRecipe' } | null

export function FoodScreen() {
  const t = useTokens()
  const data = useStore((s) => s.data)
  const cur = useStore((s) => s.cur)
  const repeatYesterday = useStore((s) => s.repeatYesterday)
  const logRecipe = useStore((s) => s.logRecipe)
  const [sheet, setSheet] = useState<SheetKind>(null)

  const fd = foodDay(data, cur)
  const { gentle, fv, noKcal, totals: tot, target: tg, range: r, status: st, margin, words: mw, proteinRange: pRange, groups, sameAsYesterday, saveable } = fd
  const saveRecipe = (m: MealSlot) => setSheet({ k: 'recipes', draft: { name: '', items: recipeItemsFrom(groups[m]) } })

  // `.li` with its `.tr.kc` kcal (16 pt medium, --label): a logged entry opens its edit sheet
  const row = (x: LoggedRow) => (
    <Row key={x._i} title={x.n} sub={<Text style={num}>{portionText(x)}</Text>} chevron={false} onPress={() => setSheet({ k: 'edit', i: x._i })}
      right={noKcal ? undefined : <Text style={[tx(16, 500, 1.3, 0), num, { color: t.label }]}>{isEstimate(x) ? '≈ ' : ''}{fmt(x.k)}</Text>} />
  )
  // `.pline`: 13 pt --label2, a split row when it has two ends
  const pline = (a: ReactNode, b?: ReactNode) => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
      <Text style={[tx(13, 400, 1.4), num, { color: t.label2, flexShrink: 1 }]}>{a}</Text>
      {b != null && <Text style={[tx(13, 400, 1.4), num, { color: t.label2, flexShrink: 1, textAlign: 'right' }]}>{b}</Text>}
    </View>
  )
  const kcalHead = <KcalHead kcal={tot.k} margin={margin} onMargin={() => setSheet({ k: 'margin' })} />

  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView testID="food-screen" contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 12 }}>
        <PageHeader eyebrow={<DayNav />} title={FOOD.title}
          // TODO(N1-followup): `.roundbtn` (44 pt ink circle, plus 22/2.4), label FOOD.addFood
          right={<Btn small kind="ink" title="" icon="plus" label={FOOD.addFood} onPress={() => setSheet({ k: 'add' })} />} />

        <View accessibilityLabel={FOOD.daySoFar}>
          <Card>
            {fd.card === 'yes' ? (
              // Yes: totals in words; a range only after "Show a range" (ob9-4), never a target
              <View style={{ gap: 8 }}>
                <Text style={[tx(22, 600, 1.2, -0.01), { color: t.label }]}>{FOOD9.meals(mw.slots.length)}</Text>
                <Text style={[tx(15, 400, 1.5), { color: t.label2 }]}>{mw.slots.length ? FOOD9.withProtein(mw.withProtein, mw.slots.length) : FOOD9.empty}</Text>
                {fv.rangeOnFood && <>
                  <KcalBar k={tot.k} lo={r.lo} hi={r.hi} />
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
            <GrpH small={<LinkBtn title={FOOD.manage} onPress={() => setSheet({ k: 'recipes' })} />}>{FOOD.yourRecipes}</GrpH>
            <List>
              {recipesByUse(data).slice(0, 4).map((ri) => {
                const rc = data.recipes[ri]
                const serv = recipeServing(data, rc.name)
                return (
                  // TODO(N1-followup): the `.addc` trailing slot
                  <Row key={rc.id} title={rc.name} sub={`${FOOD.servings(frac(serv), serv)} · ${FOOD.addsTo(MEAL_LABEL[mealNow()])}`} chevron={false}
                    onPress={() => logRecipe(rc, serv, mealNow())} right={<Icon name="plus" size={16} stroke={2.8} color={t.tint} />} />
                )
              })}
            </List>
          </View>
        )}

        {MEALS.map((m) => {
          const items = groups[m]
          if (!items.length) {
            // TODO(N1-followup): `.dash-add` (56 pt, 1.5 px dashed --dash, radius 18, tinted 16 pt semibold, plus 18/2.6)
            return <View key={m} style={{ marginTop: 12 }}><Btn kind="tinted" icon="plus" title={MEAL_LABEL[m]} onPress={() => setSheet({ k: 'add', meal: m })} /></View>
          }
          return (
            <View key={m} accessibilityLabel={MEAL_LABEL[m]}>
              <GrpH small={noKcal ? undefined : `${fmt(mealKcal(items))} kcal`}>{MEAL_LABEL[m]}</GrpH>
              <List>
                {items.map(row)}
                <Row act icon="plus" title={FOOD.addTo(MEAL_LABEL[m])} onPress={() => setSheet({ k: 'add', meal: m })} />
              </List>
            </View>
          )
        })}
        {groups.other.length > 0 && (
          <View>
            <GrpH>{FOOD.other}</GrpH>
            <List>{groups.other.map(row)}</List>
          </View>
        )}

        <View style={{ paddingTop: 8 }}><Lbl>{FOOD.quicker}</Lbl></View>
        <List>
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
          <List>
            {sameAsYesterday.map(({ m, yd }) => (
              // TODO(N1-followup): the `.addc` trailing slot
              <Row key={m} title={MEAL_LABEL[m]} sub={mealNames(yd)} chevron={false} right={<Icon name="plus" size={16} stroke={2.8} color={t.tint} />}
                onPress={() => { repeatYesterday(m); setSheet(null) }} />
            ))}
          </List>
        </Sheet>
      )}
      {sheet?.k === 'pickRecipe' && (
        <Sheet title={FOOD.saveAsRecipe} onClose={() => setSheet(null)}>
          <List>
            {saveable.map((m) => <Row key={m} title={MEAL_LABEL[m]} sub={mealNames(groups[m])} onPress={() => saveRecipe(m)} />)}
          </List>
        </Sheet>
      )}
      {sheet?.k === 'margin' && <MarginSheet onClose={() => setSheet(null)} />}
      {/* TODO(N5): Add food, Recipes, Edit entry and What can I make? sheets, as their N1 pieces land */}
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
      {/* TODO(N1-followup): LinkBtn `label` prop, so this reads FOOD.aboutEstimate as the web's aria-label */}
      {kcal > 0 && <LinkBtn title={`± ${margin}`} onPress={onMargin} style={num} />}
    </View>
  )
}
