/**
 * Food (Studio): the day against its range (with an honest ± margin), then meals as grouped
 * lists, then the quicker ways to log.
 */
import { useState } from 'react'
import { useStore } from '@/store/store'
import type { LoggedFood, MealSlot, RecipeItem } from '@/core/types'
import { fmt, shiftDay } from '@/core/domain/date'
import { dayTotals } from '@/core/domain/nutrition'
import { dayMargin, frac, isEstimate, portionText } from '@/core/domain/estimate'
import { MEALS, MEAL_LABEL, dayOf, energyStatus, mealEntries, mealNow, rangeFor, recipeItemsFrom, recipeServing, recipesByUse } from '@/core/domain/insights'
import { PageHeader, Sheet } from '@/ui/primitives'
import { Icon, Chevron } from '@/ui/icons'
import { KcalBar, MacroTrio } from '@/ui/charts'
import { DayNav } from '@/ui/WeekStrip'
import { AddFoodSheet } from './food/AddFoodSheet'
import { MealsSheet } from './food/MealsSheet'
import { EditEntrySheet } from './food/EditEntrySheet'
import { MarginSheet } from './food/MarginSheet'
import { SuggestSheet } from './food/SuggestSheet'
import { RecipeLogView } from './food/RecipeLogView'

type SheetKind =
  | { k: 'add'; meal?: MealSlot; view?: 'quick' | 'create' }
  | { k: 'recipes'; draft?: { name: string; items: RecipeItem[] } } | { k: 'edit'; i: number } | { k: 'margin' } | { k: 'suggest' } | { k: 'logRecipe'; ri: number }
  | { k: 'pickYesterday' } | { k: 'pickRecipe' } | null

export function FoodScreen() {
  const data = useStore((s) => s.data)
  const cur = useStore((s) => s.cur)
  const repeatYesterday = useStore((s) => s.repeatYesterday)
  const logRecipe = useStore((s) => s.logRecipe)
  const [sheet, setSheet] = useState<SheetKind>(null)
  const [logMeal, setLogMeal] = useState<MealSlot>(mealNow())

  const gentle = !!data.profile.gentle
  const day = dayOf(data, cur)
  const t = dayTotals(day)
  const tg = data.target
  const r = rangeFor(data, cur)
  const st = energyStatus(t.k, r)
  const margin = dayMargin(day.foods)

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
    <button className="li" key={x._i} onClick={() => setSheet({ k: 'edit', i: x._i })}>
      <div className="m"><div className="t">{x.n}</div><div className="s num">{portionText(x)}</div></div>
      {!gentle && <div className="tr num kc">{isEstimate(x) ? '≈ ' : ''}{fmt(x.k)}</div>}
    </button>
  )

  return (
    <div className="screen">
      <PageHeader eyebrow={<DayNav />} title="Food"
        right={<button className="roundbtn" aria-label="Add food" onClick={() => setSheet({ k: 'add' })}><Icon name="plus" size={22} stroke={2.4} /></button>} />

      <section className="card pcard" aria-label="Day so far">
        {gentle ? (
          <div className="kbig w">{st.gentle}</div>
        ) : (
          <div className="ph">
            <div className="kbig"><span className="num">{fmt(t.k)}</span><small>kcal eaten</small></div>
            {t.k > 0 && <button className="linkbtn num" aria-label="About this estimate" onClick={() => setSheet({ k: 'margin' })}>± {margin}</button>}
          </div>
        )}
        <KcalBar k={t.k} lo={r.lo} hi={r.hi} />
        {!gentle && (
          <div className="pline num split"><span>Range {fmt(r.lo)}–{fmt(r.hi)}</span><span>{st.word}</span></div>
        )}
        <MacroTrio p={t.p} c={t.c} f={t.f} tp={tg.p} tc={tg.c} tf={tg.f} />
      </section>

      {data.recipes.length > 0 && (
        <section className="meal">
          <div className="grp-h"><span>Your recipes</span>
            <button className="linkbtn" onClick={() => setSheet({ k: 'recipes' })}>Manage</button></div>
          <div className="list">
            {recipesByUse(data).slice(0, 4).map((ri) => {
              const r = data.recipes[ri]
              const serv = recipeServing(data, r.name)
              return (
                <button className="li" key={r.id} onClick={() => logRecipe(r, serv, mealNow())}>
                  <div className="m"><div className="t">{r.name}</div>
                    <div className="s">{frac(serv)} serving{serv !== 1 ? 's' : ''} · adds to {MEAL_LABEL[mealNow()].toLowerCase()}</div></div>
                  <span className="addc"><Icon name="plus" size={16} stroke={2.8} /></span>
                </button>
              )
            })}
          </div>
        </section>
      )}

      {MEALS.map((m) => {
        const items = groups[m]
        const kcal = items.reduce((s, x) => s + x.k, 0)
        if (!items.length) {
          return (
            <button key={m} className="dash-add" onClick={() => setSheet({ k: 'add', meal: m })}>
              <Icon name="plus" size={18} stroke={2.6} />{MEAL_LABEL[m]}
            </button>
          )
        }
        return (
          <section className="meal" key={m} aria-label={MEAL_LABEL[m]}>
            <div className="grp-h"><span>{MEAL_LABEL[m]}</span><small className="num">{gentle ? '' : fmt(kcal) + ' kcal'}</small></div>
            <div className="list">
              {items.map(row)}
              <button className="li act" onClick={() => setSheet({ k: 'add', meal: m })}><Icon name="plus" size={17} stroke={2.4} /><span>Add to {MEAL_LABEL[m].toLowerCase()}</span></button>
            </div>
          </section>
        )
      })}
      {groups.other.length > 0 && (
        <section className="meal">
          <div className="grp-h"><span>Other</span></div>
          <div className="list">{groups.other.map(row)}</div>
        </section>
      )}

      <div className="lbl" style={{ paddingTop: 26 }}>Quicker ways to log</div>
      <div className="list">
        {sameAsYesterday.length > 0 && (
          <button className="li" onClick={() => sameAsYesterday.length === 1 ? repeatYesterday(sameAsYesterday[0].m) : setSheet({ k: 'pickYesterday' })}>
            <div className="m"><div className="t">Same as yesterday</div>
              <div className="s">{sameAsYesterday.length === 1
                ? `${MEAL_LABEL[sameAsYesterday[0].m]}: ${names(sameAsYesterday[0].yd)}`
                : 'Copy a meal in one tap'}</div></div>
            <Chevron />
          </button>
        )}
        <button className="li" onClick={() => setSheet({ k: 'recipes' })}>
          <div className="m"><div className="t">Your recipes</div></div><span className="tr num">{data.recipes.length || ''}</span><Chevron />
        </button>
        <button className="li" onClick={() => setSheet({ k: 'suggest' })}>
          <div className="m"><div className="t">What can I make?</div><div className="s">Recipes that fit what you have</div></div><Chevron />
        </button>
        <button className="li" onClick={() => setSheet({ k: 'add', view: 'quick' })}>
          <div className="m"><div className="t">Quick estimate</div><div className="s">When you don't know the exact food</div></div><Chevron />
        </button>
        <button className="li" onClick={() => setSheet({ k: 'add', view: 'create' })}>
          <div className="m"><div className="t">Create a food</div></div><Chevron />
        </button>
        {saveable.length > 0 && (
          <button className="li" onClick={() => saveable.length === 1 ? saveRecipe(saveable[0]) : setSheet({ k: 'pickRecipe' })}>
            <div className="m"><div className="t">Save as recipe</div>
              <div className="s">{saveable.length === 1 ? `${MEAL_LABEL[saveable[0]]}: log all of this in one tap next time` : 'Log a whole meal in one tap next time'}</div></div>
            <Chevron />
          </button>
        )}
      </div>
      <div className="foot">Numbers marked ≈ are estimates. Your day total shows a ± margin so it stays honest about what it knows.</div>

      {sheet?.k === 'pickYesterday' && (
        <Sheet title="Same as yesterday" onClose={() => setSheet(null)}>
          <div className="list">
            {sameAsYesterday.map(({ m, yd }) => (
              <button className="li" key={m} onClick={() => { repeatYesterday(m); setSheet(null) }}>
                <div className="m"><div className="t">{MEAL_LABEL[m]}</div><div className="s">{names(yd)}</div></div>
                <span className="addc"><Icon name="plus" size={16} stroke={2.8} /></span>
              </button>
            ))}
          </div>
        </Sheet>
      )}
      {sheet?.k === 'pickRecipe' && (
        <Sheet title="Save as recipe" onClose={() => setSheet(null)}>
          <div className="list">
            {saveable.map((m) => (
              <button className="li" key={m} onClick={() => saveRecipe(m)}>
                <div className="m"><div className="t">{MEAL_LABEL[m]}</div><div className="s">{names(groups[m])}</div></div>
                <Chevron />
              </button>
            ))}
          </div>
        </Sheet>
      )}
      {sheet?.k === 'suggest' && <SuggestSheet onClose={() => setSheet(null)} onLog={(ri) => { setLogMeal(mealNow()); setSheet({ k: 'logRecipe', ri }) }} onRecipes={() => setSheet({ k: 'recipes' })} />}
      {sheet?.k === 'logRecipe' && <RecipeLogView index={sheet.ri} meal={logMeal} setMeal={setLogMeal} onBack={() => setSheet({ k: 'suggest' })} onClose={() => setSheet(null)} animate={false} />}
      {sheet?.k === 'add' && <AddFoodSheet initialMeal={sheet.meal} initialView={sheet.view} onClose={() => setSheet(null)} />}
      {sheet?.k === 'recipes' && <MealsSheet initialDraft={sheet.draft} onClose={() => setSheet(null)} />}
      {sheet?.k === 'edit' && <EditEntrySheet index={sheet.i} onClose={() => setSheet(null)} />}
      {sheet?.k === 'margin' && <MarginSheet onClose={() => setSheet(null)} />}
    </div>
  )
}
