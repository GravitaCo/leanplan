/** Food: the day against its range (with an honest ± margin), then meals as grouped lists. */
import { useState } from 'react'
import { useStore } from '@/store/store'
import type { LoggedFood, MealSlot } from '@/core/types'
import { fmt, shiftDay } from '@/core/domain/date'
import { dayTotals } from '@/core/domain/nutrition'
import { dayMargin, isEstimate, portionText } from '@/core/domain/estimate'
import { MEALS, MEAL_LABEL, dayOf, energyStatus, mealEntries, rangeFor } from '@/core/domain/insights'
import { PageHeader } from '@/ui/primitives'
import { Icon, Chevron } from '@/ui/icons'
import { RangeBar, MacroCol } from '@/ui/charts'
import { DayNav } from '@/ui/WeekStrip'
import { AddFoodSheet } from './food/AddFoodSheet'
import { MealsSheet } from './food/MealsSheet'
import { EditEntrySheet } from './food/EditEntrySheet'
import { MarginSheet } from './food/MarginSheet'

type SheetKind =
  | { k: 'add'; meal?: MealSlot; view?: 'quick' | 'create' }
  | { k: 'recipes' } | { k: 'edit'; i: number } | { k: 'margin' } | null

export function FoodScreen() {
  const data = useStore((s) => s.data)
  const cur = useStore((s) => s.cur)
  const repeatYesterday = useStore((s) => s.repeatYesterday)
  const [sheet, setSheet] = useState<SheetKind>(null)

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

  const row = (x: LoggedFood & { _i: number }) => (
    <button className="li" key={x._i} onClick={() => setSheet({ k: 'edit', i: x._i })}>
      <div className="m"><div className="t">{x.n}</div><div className="s">{portionText(x)}</div></div>
      {!gentle && <div className="tr num">{isEstimate(x) ? '≈ ' : ''}{fmt(x.k)}</div>}
      <Chevron />
    </button>
  )

  return (
    <div className="screen">
      <PageHeader eyebrow={<DayNav />} title="Food"
        right={<button className="roundbtn" aria-label="Add food" onClick={() => setSheet({ k: 'add' })}><Icon name="plus" stroke={2.6} /></button>} />

      <div className="card">
        {gentle ? (
          <div className="big" style={{ fontSize: 24 }}>{st.gentle}</div>
        ) : (
          <>
            <div className="big num">{fmt(t.k)}<small>kcal</small>
              {t.k > 0 && <button className="pm num" aria-label="About this estimate" onClick={() => setSheet({ k: 'margin' })}>± {margin}</button>}
            </div>
            <div className="sub" style={{ marginTop: 2 }}>{st.word} · range <span className="num">{fmt(r.lo)}–{fmt(r.hi)}</span></div>
          </>
        )}
        <RangeBar k={t.k} lo={r.lo} hi={r.hi} />
        <div className="macro3">
          <MacroCol label="Protein" value={t.p} goal={tg.p} color="protein" />
          <MacroCol label="Carbs" value={t.c} goal={tg.c} color="carbs" />
          <MacroCol label="Fat" value={t.f} goal={tg.f} color="fat" />
        </div>
      </div>

      {MEALS.map((m) => {
        const items = groups[m]
        const kcal = items.reduce((s, x) => s + x.k, 0)
        const yd = items.length ? [] : mealEntries(data, yesterday, m)
        return (
          <div key={m}>
            <div className="grp-h"><span>{MEAL_LABEL[m]}</span><small className="num">{items.length && !gentle ? fmt(kcal) + ' kcal' : ''}</small></div>
            <div className="list">
              {items.map(row)}
              {yd.length > 0 && (
                <button className="li act" onClick={() => repeatYesterday(m)}>
                  <Icon name="book" size={17} />
                  <div className="m"><div className="t">Same as yesterday</div>
                    <div className="s">{yd.slice(0, 3).map((x) => x.n).join(', ')}{yd.length > 3 ? '…' : ''}</div></div>
                </button>
              )}
              <button className="li act" onClick={() => setSheet({ k: 'add', meal: m })}><Icon name="plus" size={17} /><span>Add food</span></button>
            </div>
          </div>
        )
      })}
      {groups.other.length > 0 && (
        <>
          <div className="grp-h"><span>Other</span></div>
          <div className="list">{groups.other.map(row)}</div>
        </>
      )}

      <div className="list icons" style={{ marginTop: 26 }}>
        <button className="li" onClick={() => setSheet({ k: 'recipes' })}>
          <span className="ico" style={{ background: 'var(--activity)' }}><Icon name="book" size={18} /></span>
          <div className="m"><div className="t">Recipes</div></div><span className="tr num">{data.recipes.length || ''}</span><Chevron />
        </button>
        <button className="li" onClick={() => setSheet({ k: 'add', view: 'quick' })}>
          <span className="ico" style={{ background: 'var(--mind)' }}><Icon name="bolt" size={18} /></span>
          <div className="m"><div className="t">Quick estimate</div></div><Chevron />
        </button>
        <button className="li" onClick={() => setSheet({ k: 'add', view: 'create' })}>
          <span className="ico" style={{ background: 'var(--energy)' }}><Icon name="plus" size={18} /></span>
          <div className="m"><div className="t">Create a food</div></div><Chevron />
        </button>
      </div>
      <div className="foot">Numbers marked ≈ are estimates. Your day total shows a ± margin so it stays honest about what it knows.</div>

      {sheet?.k === 'add' && <AddFoodSheet initialMeal={sheet.meal} initialView={sheet.view} onClose={() => setSheet(null)} />}
      {sheet?.k === 'recipes' && <MealsSheet onClose={() => setSheet(null)} />}
      {sheet?.k === 'edit' && <EditEntrySheet index={sheet.i} onClose={() => setSheet(null)} />}
      {sheet?.k === 'margin' && <MarginSheet onClose={() => setSheet(null)} />}
    </div>
  )
}
