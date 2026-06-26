import { useMemo, useState } from 'react'
import { useStore } from '@/store/store'
import type { Recipe, RecipeItem } from '@/core/types'
import { FOODS } from '@/core/data/foods'
import { r0, r1 } from '@/core/domain/date'
import { recipeTotals, recipePerServing } from '@/core/domain/nutrition'
import { Sheet } from '@/ui/primitives'

interface Draft {
  id?: string
  name: string
  servings: string
  items: RecipeItem[]
}

export function MealsSheet({ onClose }: { onClose: () => void }) {
  const recipes = useStore((s) => s.data.recipes)
  const customFoods = useStore((s) => s.data.customFoods)
  const saveRecipe = useStore((s) => s.saveRecipe)
  const deleteRecipe = useStore((s) => s.deleteRecipe)
  const logRecipe = useStore((s) => s.logRecipe)

  const allFoods = useMemo(() => FOODS.concat(customFoods || []), [customFoods])
  const [draft, setDraft] = useState<Draft | null>(null)
  const [logging, setLogging] = useState<{ recipe: Recipe; servings: string } | null>(null)
  const [q, setQ] = useState('')

  // ---- log a saved meal ----
  if (logging) {
    const per = recipePerServing(logging.recipe)
    const n = parseFloat(logging.servings) || 0
    return (
      <Sheet onClose={onClose}>
        <div className="row" style={{ borderBottom: 0, paddingTop: 0 }}>
          <div className="grow">
            <div className="name">{logging.recipe.name}</div>
            <div className="meta">
              per serving: {r0(per.k)} kcal · {r0(per.p)}p {r0(per.c)}c {r0(per.f)}f
            </div>
          </div>
          <button className="x-btn" onClick={() => setLogging(null)}>
            ←
          </button>
        </div>
        <div className="field">
          <label>How many servings?</label>
          <input
            type="number"
            inputMode="decimal"
            value={logging.servings}
            onChange={(e) => setLogging({ ...logging, servings: e.target.value })}
          />
        </div>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 12 }}>
          = <b style={{ color: 'var(--ink)' }}>{r0(per.k * n)} kcal</b> · {r1(per.p * n)}p {r1(per.c * n)}c {r1(per.f * n)}f
        </div>
        <button
          className="btn"
          disabled={n <= 0}
          onClick={() => {
            logRecipe(logging.recipe, n)
            onClose()
          }}
        >
          Add to today
        </button>
      </Sheet>
    )
  }

  // ---- builder ----
  if (draft) {
    const totals = recipeTotals({ ...draft, servings: parseFloat(draft.servings) || 1 } as Recipe)
    const s = parseFloat(draft.servings) || 1
    const query = q.trim().toLowerCase()
    const matches = query ? allFoods.filter((f) => f.n.toLowerCase().includes(query)).slice(0, 30) : []
    return (
      <Sheet onClose={onClose}>
        <div className="row" style={{ borderBottom: 0, paddingTop: 0 }}>
          <div className="grow">
            <div className="name">{draft.id ? 'Edit meal' : 'New meal'}</div>
          </div>
          <button className="x-btn" onClick={() => setDraft(null)}>
            ←
          </button>
        </div>

        <div className="field">
          <label>Meal name</label>
          <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Chicken & rice bowl" />
        </div>
        <div className="field">
          <label>Servings this batch makes</label>
          <input type="number" inputMode="decimal" value={draft.servings} onChange={(e) => setDraft({ ...draft, servings: e.target.value })} />
        </div>

        <div className="mono" style={{ margin: '8px 0 6px' }}>
          Add ingredients
        </div>
        <div className="field">
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search foods to add" />
        </div>
        {query && (
          <div style={{ marginBottom: 8 }}>
            {matches.length ? (
              matches.map((f, i) => (
                <div
                  className="row"
                  key={f.n + i}
                  onClick={() => setDraft({ ...draft, items: [...draft.items, { n: f.n, k: f.k, p: f.p, c: f.c, f: f.f, grams: f.g, ml: f.ml }] })}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="grow">
                    <div className="name">{f.n}</div>
                    <div className="meta">
                      per 100{f.ml ? 'ml' : 'g'}: {f.k} kcal · {f.p}p {f.c}c {f.f}f
                    </div>
                  </div>
                  <span className="pill accent">+ add</span>
                </div>
              ))
            ) : (
              <div className="empty">No match.</div>
            )}
          </div>
        )}

        <div className="mono" style={{ margin: '8px 0 6px' }}>
          In this meal
        </div>
        {draft.items.length ? (
          draft.items.map((it, ii) => (
            <div className="row" key={ii}>
              <div className="grow">
                <div className="name">{it.n}</div>
                <div className="meta">per 100{it.ml ? 'ml' : 'g'}: {it.k} kcal</div>
              </div>
              <input
                type="number"
                inputMode="decimal"
                value={it.grams}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    items: draft.items.map((x, j) => (j === ii ? { ...x, grams: parseFloat(e.target.value) || 0 } : x)),
                  })
                }
                style={{ width: 70, textAlign: 'right', padding: 8 }}
              />
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>g</span>
              <button className="x-btn" onClick={() => setDraft({ ...draft, items: draft.items.filter((_, j) => j !== ii) })}>
                ×
              </button>
            </div>
          ))
        ) : (
          <div className="empty">No ingredients yet — search above to add.</div>
        )}

        <div style={{ background: 'var(--card-2)', borderRadius: 12, padding: '12px 14px', margin: '12px 0', fontSize: 13, lineHeight: 1.5 }}>
          Whole meal: <b>{r0(totals.k)} kcal</b> · {r0(totals.p)}p {r0(totals.c)}c {r0(totals.f)}f
          <br />
          Per serving (÷{s}): <b>{r0(totals.k / s)} kcal</b> · {r0(totals.p / s)}p {r0(totals.c / s)}c {r0(totals.f / s)}f
        </div>

        <button
          className="btn"
          onClick={() => {
            if (!draft.name) return
            if (!draft.items.length) return
            saveRecipe({ id: draft.id, name: draft.name, servings: parseFloat(draft.servings) || 1, items: draft.items })
            setDraft(null)
          }}
        >
          {draft.id ? 'Save changes' : 'Save meal'}
        </button>
      </Sheet>
    )
  }

  // ---- list ----
  return (
    <Sheet onClose={onClose}>
      <div className="row" style={{ borderBottom: 0, paddingTop: 0 }}>
        <div className="grow">
          <div className="name" style={{ fontSize: 20, fontWeight: 800 }}>
            Saved meals
          </div>
          <div className="meta">Build a meal once, log the whole thing in a tap.</div>
        </div>
        <button className="x-btn" onClick={onClose}>
          ×
        </button>
      </div>

      <button className="btn" style={{ margin: '6px 0 14px' }} onClick={() => setDraft({ name: '', servings: '1', items: [] })}>
        + New meal
      </button>

      {(recipes || []).length ? (
        (recipes || []).map((r, ri) => {
          const per = recipePerServing(r)
          return (
            <div className="row" key={r.id}>
              <div className="grow">
                <div className="name">{r.name}</div>
                <div className="meta">
                  {+r.servings > 1 ? r.servings + ' servings · ' : ''}per serving: {r0(per.k)} kcal · {r0(per.p)}p {r0(per.c)}c {r0(per.f)}f
                </div>
              </div>
              <button className="pill accent" onClick={() => setLogging({ recipe: r, servings: '1' })}>
                + log
              </button>
              <button
                className="pill"
                onClick={() => setDraft({ id: r.id, name: r.name, servings: String(r.servings), items: r.items.map((i) => ({ ...i })) })}
              >
                edit
              </button>
              <button className="x-btn" onClick={() => deleteRecipe(ri)}>
                ×
              </button>
            </div>
          )
        })
      ) : (
        <div className="empty">No meals yet. Tap “New meal” to build one from your foods.</div>
      )}
    </Sheet>
  )
}
