/**
 * Food, rebuilt from src/screens/FoodScreen.tsx: the day against its range (with the honest ±
 * margin), the meals as grouped lists, then the quicker ways to log. Same store, same core
 * functions, same words, so a day reads the same on the phone as on the web.
 */
import { useState, type ReactNode } from 'react'
import { Pressable, ScrollView, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useStore } from '@/store/store'
import { quietNumbers } from '@/data/consent'
import type { LoggedFood, MealSlot, RecipeItem } from '@/core/types'
import { fmt, fmtDate, shiftDay, todayStr } from '@/core/domain/date'
import { dayTotals } from '@/core/domain/nutrition'
import { dayMargin, frac, isEstimate, portionText } from '@/core/domain/estimate'
import { foodView, mealWords, proteinRangeFor } from '@/core/domain/foodMode'
import { FOOD9 } from '@/screens/onboarding/copyApp'
import { WELLBEING_ENABLED } from '@/data/wellbeingFlag'
import { MEALS, MEAL_LABEL, dayOf, energyStatus, latestWeight, mealEntries, mealNow, rangeFor, recipeItemsFrom, recipeServing, recipesByUse } from '@/core/domain/insights'
import { KcalBar, MacroTrio } from '../../lib/ui/charts'
import { initials } from '../../lib/ui/kit'
import { font, useTokens } from '../../lib/theme'
import { AddC, Chevron, ConnPill, FIcon, Foot, Li, List, RowText, Sheet, Toast, Txt } from './ui'
import { AddFoodSheet, type ScanHooks } from './AddFoodSheet'
import { MealsSheet } from './MealsSheet'
import { EditEntrySheet } from './EditEntrySheet'
import { MarginSheet } from './MarginSheet'
import { SuggestSheet } from './SuggestSheet'
import { RecipeLogView } from './RecipeLogView'

type SheetKind =
  | { k: 'add'; meal?: MealSlot; view?: 'quick' | 'create' }
  | { k: 'recipes'; draft?: { name: string; items: RecipeItem[] } } | { k: 'edit'; i: number } | { k: 'margin' } | { k: 'suggest' } | { k: 'logRecipe'; ri: number }
  | { k: 'pickYesterday' } | { k: 'pickRecipe' } | null

/**
 * The Food tab. `onProfile` opens Profile from the avatar (the lead wires it); `scan` lets the
 * Scanning stream (N6) plug its views into Add food.
 */
export function FoodScreen({ onProfile, scan }: { onProfile?: () => void; scan?: ScanHooks }) {
  const tk = useTokens()
  const insets = useSafeAreaInsets()
  const data = useStore((s) => s.data)
  const cur = useStore((s) => s.cur)
  const repeatYesterday = useStore((s) => s.repeatYesterday)
  const logRecipe = useStore((s) => s.logRecipe)
  const [sheet, setSheet] = useState<SheetKind>(null)
  const [logMeal, setLogMeal] = useState<MealSlot>(mealNow())

  const gentle = quietNumbers(data)
  // Onboarding 9: Sometimes has its range here from day one; Yes only after its own yes, and no target
  const fv = foodView(data.profile)
  const yes = fv.mode === 'yes'
  const some = fv.mode === 'sometimes' && !gentle
  // Yes: no kcal on rows or meal headings whatever the Display setting (ob9-2); portions still show
  const noKcal = gentle || yes
  const day = dayOf(data, cur)
  const t = dayTotals(day)
  const tg = data.target
  const r = rangeFor(data, cur)
  const st = energyStatus(t.k, r)
  const margin = dayMargin(day.foods)
  const mw = mealWords(day.foods)
  const pRange = some ? proteinRangeFor(data.profile, latestWeight(data, cur)) : null

  const groups: Record<MealSlot | 'other', (LoggedFood & { _i: number })[]> = { breakfast: [], lunch: [], dinner: [], snack: [], other: [] }
  day.foods.forEach((x, i) => { (x.meal ? groups[x.meal] : groups.other).push({ ...x, _i: i }) })
  const yesterday = shiftDay(cur, -1)

  // shortcuts that act on one meal: offered only when a meal qualifies, and when more than one
  // does, a small chooser asks which
  const sameAsYesterday = MEALS.filter((m) => !groups[m].length).map((m) => ({ m, yd: mealEntries(data, yesterday, m) })).filter((x) => x.yd.length)
  const saveable = MEALS.filter((m) => groups[m].length > 1)
  const saveRecipe = (m: MealSlot) => setSheet({ k: 'recipes', draft: { name: '', items: recipeItemsFrom(groups[m]) } })
  const names = (xs: { n: string }[]) => xs.slice(0, 3).map((x) => x.n).join(', ') + (xs.length > 3 ? '…' : '')

  const row = (x: LoggedFood & { _i: number }) => (
    <Li key={x._i} onPress={() => setSheet({ k: 'edit', i: x._i })} label={x.n}>
      <RowText title={x.n} sub={portionText(x)} n />
      {!noKcal && <Txt size={16} w={500} n>{isEstimate(x) ? '≈ ' : ''}{fmt(x.k)}</Txt>}
    </Li>
  )

  // `.ph`: the big figure and its ± button
  const kcalHead = (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', flexShrink: 1 }}>
        <Txt size={44} w={600} n style={{ lineHeight: 46, letterSpacing: -1.32 }}>{fmt(t.k)}</Txt>
        <Txt size={15} color={tk.label2}>kcal eaten</Txt>
      </View>
      {t.k > 0 && (
        <Pressable accessibilityRole="button" accessibilityLabel="About this estimate" onPress={() => setSheet({ k: 'margin' })} hitSlop={6} style={{ paddingVertical: 6, paddingHorizontal: 4 }}>
          <Txt size={15} color={tk.tint} n>± {margin}</Txt>
        </Pressable>
      )}
    </View>
  )
  const pline = (a: ReactNode, b?: ReactNode) => b === undefined
    ? <Txt size={13} n color={tk.label2} style={{ lineHeight: 18 }}>{a}</Txt>
    : (
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
        <Txt size={13} n color={tk.label2} style={{ lineHeight: 18, flexShrink: 1 }}>{a}</Txt>
        <Txt size={13} n color={tk.label2} style={{ lineHeight: 18, flexShrink: 1, textAlign: 'right' }}>{b}</Txt>
      </View>
    )
  const grpH = (label: string, right?: ReactNode) => (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingTop: 22, paddingHorizontal: 4, paddingBottom: 8 }}>
      <Txt size={20} w={600} style={{ letterSpacing: -0.2 }}>{label}</Txt>
      {right}
    </View>
  )

  return (
    <View style={{ flex: 1, backgroundColor: tk.bg }}>
      <ScrollView testID="food-screen" contentContainerStyle={{ paddingHorizontal: 16, paddingTop: insets.top, paddingBottom: 24 }}>
        <Header onAdd={() => setSheet({ k: 'add' })} onProfile={onProfile} name={data.profile.name} />

        <View accessibilityLabel="Day so far" style={{ backgroundColor: tk.card, borderRadius: tk.radius, padding: 16, gap: 14, marginBottom: 10 }}>
          {yes ? (
            // Yes: totals in words; a range only after "Show a range" (ob9-4), never a target
            <View style={{ gap: 8 }}>
              <Txt size={22} w={600} style={{ lineHeight: 26 }}>{FOOD9.meals(mw.slots.length)}</Txt>
              <Txt size={15} color={tk.label2} style={{ lineHeight: 22 }}>{mw.slots.length ? FOOD9.withProtein(mw.withProtein, mw.slots.length) : FOOD9.empty}</Txt>
              {fv.rangeOnFood && <>
                <KcalBar k={t.k} lo={r.lo} hi={r.hi} />
                {pline(FOOD9.range(r.lo, r.hi), '')}
                {pline(FOOD9.yesRangeS)}
              </>}
            </View>
          ) : some ? (
            // Sometimes: the range, never a single number; protein as a range
            <>
              {kcalHead}
              <KcalBar k={t.k} lo={r.lo} hi={r.hi} />
              {pline(FOOD9.range(r.lo, r.hi), st.gentle)}
              {pRange && pline(FOOD9.proteinRange(Math.round(t.p), pRange.low, pRange.high))}
            </>
          ) : <>
            {gentle ? <Txt size={24} w={600} style={{ lineHeight: 29, letterSpacing: -0.24 }}>{st.gentle}</Txt> : kcalHead}
            <KcalBar k={t.k} lo={r.lo} hi={r.hi} />
            {!gentle && pline(`Range ${fmt(r.lo)}–${fmt(r.hi)}`, st.word)}
            <MacroTrio p={t.p} c={t.c} f={t.f} tp={tg.p} tc={tg.c} tf={tg.f} />
          </>}
        </View>

        {data.recipes.length > 0 && (
          <View>
            {grpH('Your recipes', <Pressable accessibilityRole="button" onPress={() => setSheet({ k: 'recipes' })} hitSlop={6} style={{ paddingVertical: 6, paddingHorizontal: 4 }}><Txt size={15} color={tk.tint}>Manage</Txt></Pressable>)}
            <List>
              {recipesByUse(data).slice(0, 4).map((ri) => {
                const rc = data.recipes[ri]
                const serv = recipeServing(data, rc.name)
                return (
                  <Li key={rc.id} onPress={() => logRecipe(rc, serv, mealNow())} label={rc.name}>
                    <RowText title={rc.name} sub={`${frac(serv)} serving${serv !== 1 ? 's' : ''} · adds to ${MEAL_LABEL[mealNow()].toLowerCase()}`} />
                    <AddC />
                  </Li>
                )
              })}
            </List>
          </View>
        )}

        {MEALS.map((m) => {
          const items = groups[m]
          const kcal = items.reduce((s, x) => s + x.k, 0)
          if (!items.length) {
            return (
              <Pressable key={m} accessibilityRole="button" onPress={() => setSheet({ k: 'add', meal: m })}
                style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 56, marginTop: 12, borderWidth: 1.5, borderStyle: 'dashed', borderColor: tk.dash, borderRadius: tk.radiusSm, backgroundColor: pressed ? tk.fill : 'transparent' })}>
                <FIcon name="plus" size={18} stroke={2.6} color={tk.tint} />
                <Txt size={16} w={600} color={tk.tint}>{MEAL_LABEL[m]}</Txt>
              </Pressable>
            )
          }
          return (
            <View key={m} accessibilityLabel={MEAL_LABEL[m]}>
              {grpH(MEAL_LABEL[m], <Txt size={14} n color={tk.label2} style={{ letterSpacing: 0 }}>{noKcal ? '' : fmt(kcal) + ' kcal'}</Txt>)}
              <List>
                {items.map(row)}
                <Li onPress={() => setSheet({ k: 'add', meal: m })}>
                  <FIcon name="plus" size={17} stroke={2.4} color={tk.tint} />
                  <Txt size={16} w={500} color={tk.tint}>Add to {MEAL_LABEL[m].toLowerCase()}</Txt>
                </Li>
              </List>
            </View>
          )
        })}
        {groups.other.length > 0 && (
          <View>
            {grpH('Other')}
            <List>{groups.other.map(row)}</List>
          </View>
        )}

        <Txt size={13} w={500} color={tk.label2} style={{ paddingTop: 26, paddingHorizontal: 4, paddingBottom: 8, letterSpacing: -0.13 }}>Quicker ways to log</Txt>
        <List>
          {sameAsYesterday.length > 0 && (
            <Li onPress={() => sameAsYesterday.length === 1 ? repeatYesterday(sameAsYesterday[0].m) : setSheet({ k: 'pickYesterday' })}>
              <RowText title="Same as yesterday" sub={sameAsYesterday.length === 1
                ? `${MEAL_LABEL[sameAsYesterday[0].m]}: ${names(sameAsYesterday[0].yd)}`
                : 'Copy a meal in one tap'} />
              <Chevron />
            </Li>
          )}
          <Li onPress={() => setSheet({ k: 'recipes' })}>
            <RowText title="Your recipes" />
            <Txt n color={tk.label2}>{data.recipes.length || ''}</Txt>
            <Chevron />
          </Li>
          <Li onPress={() => setSheet({ k: 'suggest' })}>
            <RowText title="What can I make?" sub="Recipes that fit what you have" /><Chevron />
          </Li>
          <Li onPress={() => setSheet({ k: 'add', view: 'quick' })}>
            <RowText title="Quick estimate" sub="When you don't know the exact food" /><Chevron />
          </Li>
          <Li onPress={() => setSheet({ k: 'add', view: 'create' })}>
            <RowText title="Create a food" /><Chevron />
          </Li>
          {saveable.length > 0 && (
            <Li onPress={() => saveable.length === 1 ? saveRecipe(saveable[0]) : setSheet({ k: 'pickRecipe' })}>
              <RowText title="Save as recipe" sub={saveable.length === 1 ? `${MEAL_LABEL[saveable[0]]}: log all of this in one tap next time` : 'Log a whole meal in one tap next time'} />
              <Chevron />
            </Li>
          )}
        </List>
        <Foot>Numbers marked ≈ are estimates. Your day total shows a ± margin so it stays honest about what it knows.</Foot>
      </ScrollView>

      {sheet?.k === 'pickYesterday' && (
        <Sheet title="Same as yesterday" onClose={() => setSheet(null)}>
          <List>
            {sameAsYesterday.map(({ m, yd }) => (
              <Li key={m} onPress={() => { repeatYesterday(m); setSheet(null) }}>
                <RowText title={MEAL_LABEL[m]} sub={names(yd)} /><AddC />
              </Li>
            ))}
          </List>
        </Sheet>
      )}
      {sheet?.k === 'pickRecipe' && (
        <Sheet title="Save as recipe" onClose={() => setSheet(null)}>
          <List>
            {saveable.map((m) => (
              <Li key={m} onPress={() => saveRecipe(m)}>
                <RowText title={MEAL_LABEL[m]} sub={names(groups[m])} /><Chevron />
              </Li>
            ))}
          </List>
        </Sheet>
      )}
      {sheet?.k === 'suggest' && <SuggestSheet onClose={() => setSheet(null)} onLog={(ri) => { setLogMeal(mealNow()); setSheet({ k: 'logRecipe', ri }) }} onRecipes={() => setSheet({ k: 'recipes' })} />}
      {sheet?.k === 'logRecipe' && <RecipeLogView index={sheet.ri} meal={logMeal} setMeal={setLogMeal} onBack={() => setSheet({ k: 'suggest' })} onClose={() => setSheet(null)} animate={false} />}
      {sheet?.k === 'add' && <AddFoodSheet initialMeal={sheet.meal} initialView={sheet.view} onClose={() => setSheet(null)} scan={scan} />}
      {sheet?.k === 'recipes' && <MealsSheet initialDraft={sheet.draft} onClose={() => setSheet(null)} />}
      {sheet?.k === 'edit' && <EditEntrySheet index={sheet.i} onClose={() => setSheet(null)} />}
      {sheet?.k === 'margin' && <MarginSheet onClose={() => setSheet(null)} />}
      <Toast />
    </View>
  )
}

/** `.hdr`: the day switcher and connection pill, the 34 pt title, the add button (and the avatar). */
function Header({ onAdd, onProfile, name }: { onAdd: () => void; onProfile?: () => void; name: string }) {
  const t = useTokens()
  const av = WELLBEING_ENABLED
  return (
    <View style={{ paddingTop: 18, paddingBottom: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, minHeight: 20 }}>
        <DayNav />
        <ConnPill />
      </View>
      <View style={{ flexDirection: 'row', alignItems: av ? 'flex-start' : 'flex-end', justifyContent: 'space-between', gap: 12 }}>
        <Txt accessibilityRole="header" size={34} w={600} style={{ lineHeight: 40, letterSpacing: -0.85, marginTop: 2, flexShrink: 1 }}>Food</Txt>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
          <Pressable accessibilityRole="button" accessibilityLabel="Add food" onPress={onAdd}
            style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, backgroundColor: t.btn, alignItems: 'center', justifyContent: 'center', opacity: pressed ? 0.7 : 1 })}>
            <FIcon name="plus" size={22} stroke={2.4} color={t.btnInk} />
          </Pressable>
          {av && (
            <Pressable accessibilityRole="button" accessibilityLabel="Profile" onPress={onProfile} hitSlop={2}
              style={{ width: 44, height: 44, padding: 2, alignItems: 'center' }}>
              <View style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: t.tintSoft, alignItems: 'center', justifyContent: 'center' }}>
                <Txt size={16} w={600} color={t.tint} style={{ letterSpacing: 0 }}>{initials(name) || '·'}</Txt>
              </View>
            </Pressable>
          )}
        </View>
      </View>
    </View>
  )
}

/** "‹ Today · 22 Sep ›" (src/ui/WeekStrip `DayNav`) */
function DayNav() {
  const t = useTokens()
  const cur = useStore((s) => s.cur)
  const setDate = useStore((s) => s.setDate)
  const f = fmtDate(cur)
  const short = f.full.split(' ').slice(0, 2).join(' ')
  const b = (dir: -1 | 1) => (
    <Pressable accessibilityRole="button" accessibilityLabel={dir < 0 ? 'Previous day' : 'Next day'} onPress={() => setDate(shiftDay(cur, dir))} hitSlop={10} style={{ paddingHorizontal: 4 }}>
      <FIcon name={dir < 0 ? 'chevL' : 'chevR'} size={16} stroke={2.6} color={t.tint} />
    </Pressable>
  )
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2, flexShrink: 1 }}>
      {b(-1)}
      <Txt size={13} w={500} color={t.label2} style={[font(500), { letterSpacing: 0 }]}>{cur === todayStr() ? 'Today' : f.dow} · {short}</Txt>
      {b(1)}
    </View>
  )
}
