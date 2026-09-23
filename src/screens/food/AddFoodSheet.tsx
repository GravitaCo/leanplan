/**
 * The add-food flow in one sheet: search → portion, plus quick estimate, create-a-food and
 * recipe logging. Views swap inside the open sheet without replaying the slide-up.
 */
import { useMemo, useState, type ReactNode } from 'react'
import { useStore } from '@/store/store'
import { rankByName } from '@/core/domain/search'
import type { Food, MealSlot } from '@/core/types'
import { FOODS } from '@/core/data/foods'
import { fmt, r1 } from '@/core/domain/date'
import { recipePerServing, perText } from '@/core/domain/nutrition'
import { frac, portionText } from '@/core/domain/estimate'
import { MEAL_LABEL, mealNow, queryWords, recentFoods, recipeServing, recipesByUse, usualEntries, usuals } from '@/core/domain/insights'
import { Sheet, pressable } from '@/ui/primitives'
import { Icon, Chevron } from '@/ui/icons'
import { MealSeg } from './common'
import { PortionView } from './PortionView'
import { RecipeLogView } from './RecipeLogView'
import { QuickEstimateView } from './QuickEstimateView'
import { CreateFoodView } from './CreateFoodView'

type View =
  | { kind: 'search' }
  | { kind: 'portion'; food: Food; custom: boolean }
  | { kind: 'recipe'; index: number }
  | { kind: 'quick' }
  | { kind: 'create' }

export function AddFoodSheet({ initialMeal, initialView, onClose }: { initialMeal?: MealSlot; initialView?: 'quick' | 'create'; onClose: () => void }) {
  const [meal, setMeal] = useState<MealSlot>(initialMeal ?? mealNow())
  const [view, setView] = useState<View>(initialView ? { kind: initialView } : { kind: 'search' })
  const [q, setQ] = useState('')
  const [moved, setMoved] = useState(false)
  const go = (v: View) => { setMoved(true); setView(v) }
  const back = initialView ? undefined : () => go({ kind: 'search' })
  const common = { meal, setMeal, onBack: back, onClose, animate: !moved }

  if (view.kind === 'portion') return <PortionView {...common} food={view.food} custom={view.custom} />
  if (view.kind === 'recipe') return <RecipeLogView {...common} index={view.index} />
  if (view.kind === 'quick') return <QuickEstimateView {...common} />
  if (view.kind === 'create') return <CreateFoodView {...common} onSaved={(food) => go({ kind: 'portion', food, custom: true })} />
  return <SearchView meal={meal} setMeal={setMeal} q={q} setQ={setQ} go={go} onClose={onClose} animate={!moved} />
}

function SearchView({ meal, setMeal, q, setQ, go, onClose, animate }: {
  meal: MealSlot; setMeal: (m: MealSlot) => void; q: string; setQ: (q: string) => void
  go: (v: View) => void; onClose: () => void; animate: boolean
}) {
  const data = useStore((s) => s.data)
  const cur = useStore((s) => s.cur)
  const logEntries = useStore((s) => s.logEntries)
  const logRecipe = useStore((s) => s.logRecipe)
  const removeCustomFood = useStore((s) => s.removeCustomFood)
  const all = useMemo(() => FOODS.concat(data.customFoods || []), [data.customFoods])
  const query = q.trim().toLowerCase()
  const gentle = !!data.profile.gentle

  const foodRow = (f: Food, idx: number, trailing?: ReactNode) => (
    <div className="li" key={f.n + idx} {...pressable(() => go({ kind: 'portion', food: f, custom: idx >= FOODS.length }))}>
      <div className="m">
        <div className="t">{f.n}</div>
        <div className="s num">{gentle ? '' : `${Math.round(f.k)} kcal · `}{r1(f.p)} g protein {perText(f)}{idx >= FOODS.length && <span className="tag">Mine</span>}</div>
      </div>
      {trailing ?? <span className="addc"><Icon name="plus" size={16} stroke={2.8} /></span>}
    </div>
  )
  // Recipes: tap the row to choose servings, tap + to log your usual serving in one go.
  const recipeRow = (ri: number) => {
    const r = data.recipes[ri]
    const per = recipePerServing(r)
    const serv = recipeServing(data, r.name)
    return (
      <div className="li" key={r.id} {...pressable(() => go({ kind: 'recipe', index: ri }))}>
        <div className="m">
          <div className="t">{r.name}</div>
          <div className="s num">{frac(serv)} serving{serv !== 1 ? 's' : ''} · {gentle ? '' : `${fmt(per.k * serv)} kcal · `}{Math.round(per.p * serv)} g protein</div>
        </div>
        <button className="addc" aria-label={`Log ${frac(serv)} serving of ${r.name}`}
          onClick={(e) => { e.stopPropagation(); logRecipe(r, serv, meal); onClose() }}>
          <Icon name="plus" size={16} stroke={2.8} />
        </button>
      </div>
    )
  }

  let body: ReactNode
  if (!query) {
    const us = usuals(data, cur, meal)
    const rc = recentFoods(data, all)
    const cf = data.customFoods || []
    const byUse = recipesByUse(data)
    body = (
      <>
        {byUse.length > 0 && <><div className="lbl">Your recipes</div><div className="list">{byUse.map(recipeRow)}</div></>}
        {us.length > 0 && (
          <>
            <div className="lbl">Your usual {MEAL_LABEL[meal].toLowerCase()}</div>
            <div className="list">
              {us.map((u) => (
                <div className="li" key={u.n} {...pressable(() => { logEntries(usualEntries(data, u.n, meal)); onClose() })}>
                  <div className="m"><div className="t">{u.n}</div><div className="s">{portionText(u.last)} · one tap</div></div>
                  <span className="addc"><Icon name="plus" size={16} stroke={2.8} /></span>
                </div>
              ))}
            </div>
          </>
        )}
        {rc.length > 0 && <><div className="lbl">Recent</div><div className="list">{rc.map((f) => foodRow(f, all.indexOf(f)))}</div></>}
        {cf.length > 0 && (
          <>
            <div className="lbl">My foods</div>
            <div className="list">
              {cf.map((f, ci) => foodRow(f, FOODS.length + ci,
                <button className="navbtn" style={{ color: 'var(--label3)' }} aria-label={`Delete ${f.n}`}
                  onClick={(e) => { e.stopPropagation(); if (window.confirm(`Delete "${f.n}" from your foods?`)) removeCustomFood(ci) }}>
                  <Icon name="x" size={17} />
                </button>))}
            </div>
          </>
        )}
        {!rc.length && !cf.length && <><div className="lbl">Common</div><div className="list">{FOODS.slice(0, 8).map((f, i) => foodRow(f, i))}</div></>}
      </>
    )
  } else {
    const meaningful = queryWords(query)
    const words = meaningful.length ? meaningful : [query]
    const recipes = recipesByUse(data).map((ri) => ({ r: data.recipes[ri], ri }))
      .filter((o) => words.every((w) => o.r.name.toLowerCase().includes(w)))
    const foods = rankByName(all.map((f, i) => ({ f, i })), (o) => o.f.n, words).slice(0, 50)
    body = (
      <>
        {recipes.length > 0 && <><div className="lbl">Your recipes</div><div className="list">{recipes.map((o) => recipeRow(o.ri))}</div></>}
        {foods.length > 0 && <><div className="lbl">Foods</div><div className="list">{foods.map((o) => foodRow(o.f, o.i))}</div></>}
        {!recipes.length && !foods.length && (
          <div className="empty">Nothing matches “{q.trim()}”.<br />Eating out? A quick estimate is better than nothing.</div>
        )}
      </>
    )
  }

  return (
    <Sheet title="Add food" tall onClose={onClose} animate={animate}>
      <div className="searchbar">
        <Icon name="search" size={17} />
        <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${fmt(all.length)} foods and your recipes`}
          autoComplete="off" enterKeyHint="search" aria-label="Search foods" />
      </div>
      <div style={{ margin: '10px 0 2px' }}><MealSeg value={meal} onChange={setMeal} /></div>
      {body}
      <div className="list icons" style={{ marginTop: 18 }}>
        <button className="li" onClick={() => go({ kind: 'quick' })}>
          <span className="ico" style={{ background: 'var(--mind)' }}><Icon name="bolt" size={18} /></span>
          <div className="m"><div className="t">Quick estimate</div><div className="s">Restaurant or unknown food</div></div><Chevron />
        </button>
        <button className="li" onClick={() => go({ kind: 'create' })}>
          <span className="ico" style={{ background: 'var(--energy)' }}><Icon name="plus" size={18} /></span>
          <div className="m"><div className="t">Create a food</div><div className="s">From the label on the packet</div></div><Chevron />
        </button>
      </div>
    </Sheet>
  )
}
