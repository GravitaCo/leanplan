import { useMemo, useState } from 'react'
import { useStore } from '@/store/store'
import type { Food, MealSlot } from '@/core/types'
import { FOODS } from '@/core/data/foods'
import { r0, r1 } from '@/core/domain/date'
import { unitOf } from '@/core/domain/nutrition'
import { Sheet } from '@/ui/primitives'

const MEALS: { id: MealSlot; label: string }[] = [
  { id: 'breakfast', label: 'Breakfast' },
  { id: 'lunch', label: 'Lunch' },
  { id: 'dinner', label: 'Dinner' },
  { id: 'snack', label: 'Snack' },
]

function defaultMeal(): MealSlot {
  const h = new Date().getHours()
  if (h < 11) return 'breakfast'
  if (h < 15) return 'lunch'
  if (h < 20) return 'dinner'
  return 'snack'
}

export function AddFoodSheet({ initialMeal, onClose }: { initialMeal?: MealSlot; onClose: () => void }) {
  const customFoods = useStore((s) => s.data.customFoods)
  const days = useStore((s) => s.data.days)
  const logFood = useStore((s) => s.logFood)
  const addCustomFood = useStore((s) => s.addCustomFood)

  const allFoods = useMemo(() => FOODS.concat(customFoods || []), [customFoods])

  const [q, setQ] = useState('')
  const [selected, setSelected] = useState<Food | null>(null)
  const [grams, setGrams] = useState(0)
  const [meal, setMeal] = useState<MealSlot>(initialMeal || defaultMeal())
  const [creating, setCreating] = useState(false)
  const [cf, setCf] = useState({ n: '', g: '100', k: '', p: '', c: '', f: '' })
  const [cfUnit, setCfUnit] = useState<'g' | 'ml'>('g')

  // recently logged foods for the empty state
  const recent = useMemo(() => {
    const seen = new Set<string>()
    const out: Food[] = []
    const dates = Object.keys(days).sort().reverse().slice(0, 14)
    for (const d of dates) {
      for (const fEntry of days[d].foods || []) {
        if (!seen.has(fEntry.n)) {
          seen.add(fEntry.n)
          const m = allFoods.find((x) => x.n === fEntry.n)
          if (m) out.push(m)
          if (out.length >= 8) return out
        }
      }
    }
    return out
  }, [days, allFoods])

  const query = q.trim().toLowerCase()
  const results = query ? allFoods.filter((f) => f.n.toLowerCase().includes(query)).slice(0, 60) : []

  // ---- portion view ----
  if (selected) {
    const f = selected
    const unit = unitOf(f)
    const m = grams / 100
    const half = Math.round(f.g * 0.5)
    const dbl = Math.round(f.g * 2)
    const portionBtn = (label: string, g: number, primary = false) => (
      <button
        className={'btn' + (primary ? '' : ' ghost')}
        style={{ padding: '9px 4px', fontSize: 13, flexDirection: 'column', gap: 2 }}
        onClick={() => setGrams(g)}
      >
        {label}
        <span style={{ fontSize: 11, fontWeight: 400, opacity: 0.8 }}>
          {g}
          {unit}
        </span>
      </button>
    )
    return (
      <Sheet onClose={onClose}>
        <div className="row" style={{ borderBottom: 0, paddingTop: 0 }}>
          <div className="grow">
            <div className="name">{f.n}</div>
            <div className="meta">
              per 100{unit} · <b style={{ color: 'var(--ink)' }}>{f.k}</b> kcal · {f.p}p {f.c}c {f.f}f
            </div>
          </div>
          <button className="x-btn" onClick={() => setSelected(null)}>
            ←
          </button>
        </div>

        <div style={{ display: 'flex', gap: 5, margin: '8px 0 14px' }}>
          {MEALS.map((mm) => (
            <button
              key={mm.id}
              className={'btn' + (mm.id === meal ? '' : ' ghost')}
              style={{ flex: 1, padding: '8px 2px', fontSize: 11 }}
              onClick={() => setMeal(mm.id)}
            >
              {mm.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 12 }}>
          {portionBtn('½ serve', half)}
          {portionBtn('1 serve', f.g, grams === f.g)}
          {portionBtn('2 serves', dbl)}
        </div>

        <div className="field">
          <label>Or enter {unit}</label>
          <input
            type="number"
            inputMode="decimal"
            value={grams || ''}
            onChange={(e) => setGrams(parseFloat(e.target.value) || 0)}
          />
        </div>

        <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>
          = <b style={{ color: 'var(--ink)' }}>{r0(f.k * m)} kcal</b> · {r1(f.p * m)}p {r1(f.c * m)}c {r1(f.f * m)}f
        </div>

        <button
          className="btn"
          disabled={grams <= 0}
          onClick={() => {
            logFood(f, grams, meal)
            onClose()
          }}
        >
          Add to {MEALS.find((mm) => mm.id === meal)?.label.toLowerCase()}
        </button>
      </Sheet>
    )
  }

  // ---- create custom view ----
  if (creating) {
    return (
      <Sheet onClose={onClose}>
        <div className="row" style={{ borderBottom: 0, paddingTop: 0 }}>
          <div className="grow">
            <div className="name">Create a custom food</div>
            <div className="meta">Copy the “per 100{cfUnit}” numbers off the packet.</div>
          </div>
          <button className="x-btn" onClick={() => setCreating(false)}>
            ←
          </button>
        </div>
        <div className="field">
          <label>Name</label>
          <input value={cf.n} onChange={(e) => setCf({ ...cf, n: e.target.value })} placeholder="e.g. Mum's chilli" />
        </div>
        <div className="field">
          <label>Measured in</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {(['g', 'ml'] as const).map((u) => (
              <button
                key={u}
                className={'btn' + (u === cfUnit ? '' : ' ghost')}
                style={{ flex: 1, padding: '8px 2px' }}
                onClick={() => setCfUnit(u)}
              >
                {u === 'g' ? 'Grams (g)' : 'Millilitres (ml)'}
              </button>
            ))}
          </div>
        </div>
        <div className="grid2">
          <div className="field">
            <label>Amount ({cfUnit})</label>
            <input type="number" inputMode="decimal" value={cf.g} onChange={(e) => setCf({ ...cf, g: e.target.value })} />
          </div>
          <div className="field">
            <label>Kcal /100{cfUnit}</label>
            <input type="number" inputMode="decimal" value={cf.k} onChange={(e) => setCf({ ...cf, k: e.target.value })} />
          </div>
        </div>
        <div className="grid3">
          <div className="field">
            <label>Prot</label>
            <input type="number" inputMode="decimal" value={cf.p} onChange={(e) => setCf({ ...cf, p: e.target.value })} />
          </div>
          <div className="field">
            <label>Carb</label>
            <input type="number" inputMode="decimal" value={cf.c} onChange={(e) => setCf({ ...cf, c: e.target.value })} />
          </div>
          <div className="field">
            <label>Fat</label>
            <input type="number" inputMode="decimal" value={cf.f} onChange={(e) => setCf({ ...cf, f: e.target.value })} />
          </div>
        </div>
        <button
          className="btn"
          onClick={() => {
            const g = parseFloat(cf.g) || 0
            if (g <= 0) return
            addCustomFood(
              {
                n: cf.n || 'Custom food',
                k: parseFloat(cf.k) || 0,
                p: parseFloat(cf.p) || 0,
                c: parseFloat(cf.c) || 0,
                f: parseFloat(cf.f) || 0,
                g,
                ml: cfUnit === 'ml',
              },
              g,
            )
            onClose()
          }}
        >
          Add to today &amp; save
        </button>
      </Sheet>
    )
  }

  // ---- search view ----
  const list = query ? results : recent
  return (
    <Sheet onClose={onClose}>
      <div className="field" style={{ marginBottom: 10 }}>
        <input
          autoFocus
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={`Search ${allFoods.length} foods…`}
        />
      </div>

      {!query && recent.length > 0 && <div className="mono" style={{ margin: '4px 2px 6px' }}>Recent</div>}

      {list.length ? (
        list.map((f, i) => {
          const isCustom = !!f.id
          return (
            <div
              className="row"
              key={f.n + i}
              onClick={() => {
                setSelected(f)
                setGrams(f.g)
              }}
              style={{ cursor: 'pointer' }}
            >
              <div className="grow">
                <div className="name">
                  {f.n}
                  {isCustom && (
                    <span
                      className="mono"
                      style={{ marginLeft: 6, color: 'var(--accent)', fontSize: 9 }}
                    >
                      saved
                    </span>
                  )}
                </div>
                <div className="meta">
                  per 100{f.ml ? 'ml' : 'g'} · <b>{f.k}</b> kcal · {f.p}p {f.c}c {f.f}f
                </div>
              </div>
              <span className="pill accent">+ add</span>
            </div>
          )
        })
      ) : (
        <div className="empty">
          {query ? 'No match — create a custom food below.' : 'Search to find a food, or create your own.'}
        </div>
      )}

      <button className="btn ghost" style={{ marginTop: 14 }} onClick={() => setCreating(true)}>
        + Create custom food
      </button>
    </Sheet>
  )
}
