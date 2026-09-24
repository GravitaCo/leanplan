/** "What can I make?": tap what you have, see which of your recipes fit, with diet swaps. */
import { useMemo, useState } from 'react'
import { useStore } from '@/store/store'
import { FOODS } from '@/core/data/foods'
import { r0 } from '@/core/domain/date'
import { recipesByUse, recentFoods, queryWords } from '@/core/domain/insights'
import { rankByName } from '@/core/domain/search'
import { kitchenCandidates, suggestRecipes } from '@/core/domain/suggest'
import { DIETS } from '@/core/domain/diet'
import { Sheet } from '@/ui/primitives'
import { Icon } from '@/ui/icons'

export function SuggestSheet({ onClose, onLog, onRecipes }: { onClose: () => void; onLog: (recipeIndex: number) => void; onRecipes: () => void }) {
  const data = useStore((s) => s.data)
  const setPrefs = useStore((s) => s.setPrefs)
  const [q, setQ] = useState('')
  const all = useMemo(() => FOODS.concat(data.customFoods || []), [data.customFoods])
  const have = data.profile.kitchen?.have ?? []
  const diet = data.profile.diet
  const dietLabel = DIETS.find(([d]) => d === diet)?.[1]

  const candidates = useMemo(
    () => kitchenCandidates(data.recipes, recentFoods(data, all, 20).map((f) => f.n), all),
    [data, all],
  )
  const chips = [...new Set([...have, ...candidates])].slice(0, 30)
  const toggle = (n: string) => {
    const next = have.includes(n) ? have.filter((x) => x !== n) : [...have, n]
    setPrefs({ kitchen: { have: next, updated: new Date().toISOString() } })
  }
  const words = queryWords(q.trim().toLowerCase())
  const adds = q.trim() ? rankByName(all, (f) => f.n, words.length ? words : [q.trim().toLowerCase()]).filter((f) => !chips.includes(f.n)).slice(0, 6) : []
  const results = suggestRecipes(data.recipes, recipesByUse(data), have, diet, all)

  return (
    <Sheet title="What can I make?" tall onClose={onClose} right={<button className="navbtn b" onClick={onClose}>Done</button>}>
      {data.recipes.length === 0 ? (
        <div className="card empty">
          Suggestions come from your recipes. Save a meal you've logged as a recipe, or build one from its ingredients.
          <div className="stack"><button className="btn tinted" onClick={onRecipes}>Recipes</button></div>
        </div>
      ) : (
        <>
          <div className="lbl">I have…</div>
          <div className="chips">
            {chips.map((n) => (
              <button key={n} className={'chip' + (have.includes(n) ? ' on' : '')} onClick={() => toggle(n)} aria-pressed={have.includes(n)}>{n}</button>
            ))}
          </div>
          <div className="searchbar" style={{ marginTop: 10 }}><Icon name="search" size={17} />
            <input value={q} placeholder="Add something else" aria-label="Add an ingredient you have" onChange={(e) => setQ(e.target.value)} /></div>
          {adds.length > 0 && (
            <div className="chips" style={{ marginTop: 8 }}>
              {adds.map((f) => <button key={f.n} className="chip" onClick={() => { toggle(f.n); setQ('') }}>+ {f.n}</button>)}
            </div>
          )}
          <div className="foot">Salt, pepper, oil, stock and dried herbs and spices are assumed. No amounts needed.</div>

          <div className="lbl">Your recipes{dietLabel && diet !== 'none' ? ` · ${dietLabel}` : ''}</div>
          <div className="list">
            {results.map((s) => (
              <button className="li" key={s.recipe.id} onClick={() => onLog(s.recipeIndex)}>
                <div className="m">
                  <div className="t">{s.recipe.name}</div>
                  <div className="s">
                    {s.missing.length === 0 ? 'You have everything' : `Missing: ${s.missing.slice(0, 3).join(', ')}${s.missing.length > 3 ? ` +${s.missing.length - 3}` : ''}`}
                    {` · ${r0(s.perServing.p)} g protein`}
                  </div>
                  {s.swaps.length > 0 && (
                    <div className="s">
                      {s.swaps.map((w) => (w.to ? `Swap ${w.from} → ${w.to.n}` : `Contains ${w.reason}: ${w.from}`)).join(' · ')}
                    </div>
                  )}
                </div>
                <span className="addc"><Icon name="plus" size={16} stroke={2.8} /></span>
              </button>
            ))}
          </div>
          <div className="foot">Ranked by what you have. Swaps keep the same weight; edit the recipe to use one.</div>
        </>
      )}
    </Sheet>
  )
}
