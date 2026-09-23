/** Recipes: build once from ingredients (you know exactly what went in), log a serving in a tap. */
import { useMemo, useState } from 'react'
import { useStore } from '@/store/store'
import type { MealSlot, RecipeItem } from '@/core/types'
import { FOODS } from '@/core/data/foods'
import { fmt, r0, r1 } from '@/core/domain/date'
import { basisOf, headline, recipePerServing, recipeTotals } from '@/core/domain/nutrition'
import { mealNow, queryWords } from '@/core/domain/insights'
import { rankByName } from '@/core/domain/search'
import { checkRecipe, isCookedState } from '@/core/domain/checks'
import { CAPTURE_ERR } from '@/core/domain/estimate'
import { Sheet, BackButton } from '@/ui/primitives'
import { Icon } from '@/ui/icons'
import { RecipeLogView } from './RecipeLogView'
import { Checks } from './common'

interface Draft { id?: string; name: string; servings: string; items: RecipeItem[] }

/** `initialDraft` opens straight into the builder, e.g. "Save as recipe" from a logged meal. */
export function MealsSheet({ onClose, initialDraft }: { onClose: () => void; initialDraft?: { name: string; items: RecipeItem[] } }) {
  const recipes = useStore((s) => s.data.recipes)
  const customFoods = useStore((s) => s.data.customFoods)
  const saveRecipe = useStore((s) => s.saveRecipe)
  const deleteRecipe = useStore((s) => s.deleteRecipe)
  const showToast = useStore((s) => s.showToast)
  const gentle = useStore((s) => !!s.data.profile.gentle)
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
    const matches = query ? rankByName(all, (f) => f.n, words.length ? words : [query]).slice(0, 30) : []
    const idx = draft.id ? recipes.findIndex((r) => r.id === draft.id) : -1
    const save = () => {
      if (!draft.name.trim()) { showToast('Give the recipe a name'); return }
      if (!draft.items.length) { showToast('Add at least one ingredient'); return }
      saveRecipe({ id: draft.id, name: draft.name.trim(), servings: s, items: draft.items })
      if (initialDraft) onClose()
      else setDraft(null)
    }
    return (
      <Sheet title={draft.id ? 'Edit recipe' : 'New recipe'} tall animate={false} onClose={onClose}
        left={initialDraft ? undefined : <BackButton onClick={() => setDraft(null)} label="Recipes" />}
        right={<button className="navbtn b" onClick={save}>Save</button>}>
        {initialDraft && (
          <div className="sub" style={{ padding: '0 4px 12px' }}>
            Everything you logged, cooking fat included. Name it once and next time it's one tap.
          </div>
        )}
        <div className="list">
          <div className="frow"><label htmlFor="rc_n">Name</label>
            <input id="rc_n" value={draft.name} placeholder="Chicken curry" onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></div>
          <div className="frow"><label htmlFor="rc_s">Servings</label>
            <input id="rc_s" type="number" inputMode="decimal" value={draft.servings} onChange={(e) => setDraft({ ...draft, servings: e.target.value })} /></div>
        </div>
        <div className="lbl">Ingredients</div>
        <div className="list">
          {draft.items.length ? draft.items.map((it, ii) => (
            <div className="li" key={ii}>
              <div className="m"><div className="t">{it.n}</div>
                <div className="s">{[isCookedState(it.n) && 'Cooked weight', !gentle && `${Math.round((it.k * it.grams) / basisOf(it))} kcal`].filter(Boolean).join(' · ')}</div></div>
              <input className="num" type="number" inputMode="decimal" value={Math.round(it.grams * 100) / 100} aria-label={`${it.n} amount`}
                style={{ width: 72, textAlign: 'right', padding: '7px 8px' }}
                onChange={(e) => setDraft({ ...draft, items: draft.items.map((x, j) => (j === ii ? { ...x, grams: parseFloat(e.target.value) || 0 } : x)) })} />
              <span className="muted">{it.each ? 'item' : it.ml ? 'ml' : 'g'}</span>
              <button className="navbtn" style={{ color: 'var(--red)' }} aria-label={`Remove ${it.n}`}
                onClick={() => setDraft({ ...draft, items: draft.items.filter((_, j) => j !== ii) })}><Icon name="x" size={17} /></button>
            </div>
          )) : <div className="empty">Add what went in. Don't forget the oil. It's the part photos never see.</div>}
        </div>
        <div className="card" style={{ fontSize: 15, lineHeight: 1.5 }}>
          {gentle ? (
            <>Per serving <b className="num">{r0(totals.p / s)} g protein</b></>
          ) : (
            <>Whole recipe <b className="num">{fmt(totals.k)} kcal</b> · {r0(totals.p)} P {r0(totals.c)} C {r0(totals.f)} F<br />
              Per serving <b className="num">{fmt(totals.k / s)} kcal</b>{totals.k > 0 && <span className="muted num"> ± {fmt((totals.k / s) * CAPTURE_ERR.recipe)}</span>} · {r0(totals.p / s)} P {r0(totals.c / s)} C {r0(totals.f / s)} F</>
          )}
        </div>
        {draft.items.length > 0 && <Checks checks={checkRecipe(draft.items)} ok="Every ingredient has an amount and its values add up." />}
        <div className="lbl">Add ingredients</div>
        <div className="searchbar"><Icon name="search" size={17} />
          <input value={q} placeholder="Search foods" aria-label="Search ingredients" onChange={(e) => setQ(e.target.value)} /></div>
        {matches.length > 0 && (
          <div className="list" style={{ marginTop: 8 }}>
            {matches.map((f, i) => (
              <button className="li" key={f.n + i} onClick={() => setDraft({ ...draft, items: [...draft.items, { n: f.n, k: f.k, p: f.p, c: f.c, f: f.f, grams: f.g, ml: f.ml, each: f.each }] })}>
                <div className="m"><div className="t">{f.n}</div><div className="s">{gentle ? `${r1(headline(f).p)} g protein` : `${Math.round(headline(f).k)} kcal`} {headline(f).per}</div></div>
                <span className="addc"><Icon name="plus" size={16} stroke={2.8} /></span>
              </button>
            ))}
          </div>
        )}
        {idx >= 0 && (
          <div className="stack"><button className="btn danger" onClick={() => { deleteRecipe(idx); setDraft(null) }}>Delete recipe</button></div>
        )}
      </Sheet>
    )
  }

  return (
    <Sheet title="Recipes" tall onClose={onClose} left={null} animate={!moved}
      right={<button className="navbtn b" onClick={onClose}>Done</button>}>
      <div className="sub" style={{ padding: '0 4px 12px' }}>
        Cooked it yourself? You know exactly what went in. Build it once, then log a bowl in one tap.
      </div>
      {recipes.length ? (
        <div className="list">
          {recipes.map((r, ri) => {
            const per = recipePerServing(r)
            return (
              <div className="li" key={r.id}>
                <div className="m"><div className="t">{r.name}</div>
                  <div className="s num">{+r.servings > 1 ? r.servings + ' servings · ' : ''}{gentle ? '' : `${fmt(per.k)} kcal · `}{r0(per.p)} g protein per serving</div></div>
                <button className="btn sm tinted" onClick={() => { setMoved(true); setLogging(ri) }}>Log</button>
                <button className="navbtn" style={{ marginLeft: 6 }}
                  onClick={() => { setMoved(true); setDraft({ id: r.id, name: r.name, servings: String(r.servings), items: r.items.map((i) => ({ ...i })) }) }}>Edit</button>
              </div>
            )
          })}
        </div>
      ) : <div className="card empty">No recipes yet. Build one from its ingredients below.</div>}
      <div className="stack"><button className="btn" onClick={() => { setMoved(true); setDraft({ name: '', servings: '1', items: [] }) }}>New recipe</button></div>
    </Sheet>
  )
}
