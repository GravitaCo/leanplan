import { useState } from 'react'
import { useStore } from '@/store/store'
import type { MealSlot } from '@/core/types'
import { r0 } from '@/core/domain/date'
import { dayTotals } from '@/core/domain/nutrition'
import { workoutBurn } from '@/core/domain/workout'
import { AddFoodSheet } from './food/AddFoodSheet'

const MEAL_ORDER: { id: MealSlot; label: string }[] = [
  { id: 'breakfast', label: 'Breakfast' },
  { id: 'lunch', label: 'Lunch' },
  { id: 'dinner', label: 'Dinner' },
  { id: 'snack', label: 'Snacks' },
]

export function FoodScreen() {
  const cur = useStore((s) => s.cur)
  const data = useStore((s) => s.data)
  const removeFood = useStore((s) => s.removeFood)

  const [sheetMeal, setSheetMeal] = useState<MealSlot | undefined>()
  const [sheetOpen, setSheetOpen] = useState(false)

  const day = data.days[cur] || { foods: [], supps: {}, weight: null, workout: null }
  const t = dayTotals(day)
  const tg = data.target
  const burn = workoutBurn(day.workout, data.profile.weight ?? null)
  const budget = tg.kcal + burn
  const left = budget - t.k
  const pct = budget ? (t.k / budget) * 100 : 0
  const variant = pct > 100 ? 'over' : pct >= 90 ? 'warn' : ''

  const openSheet = (meal?: MealSlot) => {
    setSheetMeal(meal)
    setSheetOpen(true)
  }

  // group foods by meal, preserving original index for deletion
  const grouped: Record<string, { entry: (typeof day.foods)[number]; i: number }[]> = {
    breakfast: [],
    lunch: [],
    dinner: [],
    snack: [],
    _other: [],
  }
  day.foods.forEach((entry, i) => {
    const key = entry.meal && grouped[entry.meal] ? entry.meal : '_other'
    grouped[key].push({ entry, i })
  })

  return (
    <div className="screen">
      <div className="page-hdr" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <h1 className="page-title">Food</h1>
        <button
          onClick={() => openSheet()}
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: 'var(--accent)',
            border: 0,
            color: '#fff',
            fontSize: 26,
            lineHeight: 1,
            cursor: 'pointer',
          }}
        >
          +
        </button>
      </div>

      {/* summary */}
      <div className="card" style={{ marginTop: 8 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-1px' }}>
            {r0(t.k)}
            <span style={{ fontSize: 16, fontWeight: 500, color: 'var(--muted)' }}> / {budget}</span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>
            {left < 0 ? <b style={{ color: 'var(--over)' }}>{r0(-left)} over</b> : <b style={{ color: 'var(--ink)' }}>{r0(left)} left</b>}
          </div>
        </div>
        <div style={{ height: 11, background: 'rgba(255,255,255,.1)', borderRadius: 8, overflow: 'hidden', marginBottom: 12 }}>
          <div
            style={{
              height: '100%',
              width: Math.min(100, pct) + '%',
              background: variant === 'over' ? 'var(--over)' : variant === 'warn' ? 'var(--warn)' : 'var(--accent)',
              borderRadius: 8,
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <span className="pill" style={{ background: 'rgba(107,159,232,.15)', color: 'var(--protein)' }}>
            {r0(t.p)}g protein
          </span>
          <span className="pill" style={{ background: 'rgba(232,131,94,.15)', color: 'var(--accent)' }}>
            {r0(t.c)}g carbs
          </span>
          <span className="pill" style={{ background: 'rgba(232,163,77,.15)', color: 'var(--carbs)' }}>
            {r0(t.f)}g fat
          </span>
        </div>
      </div>

      {/* meal groups */}
      {MEAL_ORDER.map(({ id, label }) => {
        const items = grouped[id]
        const mkcal = r0(items.reduce((s, x) => s + x.entry.k, 0))
        return (
          <div key={id} style={{ marginBottom: 4 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 2px 6px' }}>
              <span className="mono">{label}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {items.length > 0 && <span style={{ fontSize: 12, color: 'var(--muted)' }}>{mkcal} kcal</span>}
                <button
                  onClick={() => openSheet(id)}
                  style={{ background: 'none', border: 0, color: 'var(--accent)', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}
                >
                  + Add
                </button>
              </span>
            </div>
            {items.length > 0 ? (
              <div className="card" style={{ padding: '0 16px', marginBottom: 4 }}>
                {items.map(({ entry, i }) => (
                  <div className="row" key={i}>
                    <div className="grow">
                      <div className="name">{entry.n}</div>
                      <div className="meta">
                        {entry.grams}
                        {entry.unit || 'g'} · {r0(entry.p)}p {r0(entry.c)}c {r0(entry.f)}f
                      </div>
                    </div>
                    <span className="pill" style={{ color: 'var(--ink)' }}>
                      {r0(entry.k)} kcal
                    </span>
                    <button className="x-btn" onClick={() => removeFood(i)}>
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ padding: '0 2px 8px', fontSize: 13, color: 'var(--muted)' }}>Nothing here yet</div>
            )}
          </div>
        )
      })}

      {grouped._other.length > 0 && (
        <div style={{ marginBottom: 4 }}>
          <div className="mono" style={{ padding: '14px 2px 6px' }}>
            Other
          </div>
          <div className="card" style={{ padding: '0 16px' }}>
            {grouped._other.map(({ entry, i }) => (
              <div className="row" key={i}>
                <div className="grow">
                  <div className="name">{entry.n}</div>
                  <div className="meta">
                    {entry.grams}
                    {entry.unit || 'g'} · {r0(entry.p)}p {r0(entry.c)}c {r0(entry.f)}f
                  </div>
                </div>
                <span className="pill" style={{ color: 'var(--ink)' }}>
                  {r0(entry.k)} kcal
                </span>
                <button className="x-btn" onClick={() => removeFood(i)}>
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {sheetOpen && <AddFoodSheet initialMeal={sheetMeal} onClose={() => setSheetOpen(false)} />}
    </div>
  )
}
