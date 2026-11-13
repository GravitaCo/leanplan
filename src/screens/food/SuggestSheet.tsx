/** "What can I make?": tap what you have, see which of your recipes fit, with diet swaps. */
import { useMemo, useState } from 'react'
import { useStore } from '@/store/store'
import { kcalHidden } from '@/data/consent'
import { r0 } from '@/core/domain/date'
import { recipesByUse } from '@/core/domain/insights'
import { suggestRecipes } from '@/core/domain/suggest'
import { DIETS } from '@/core/domain/diet'
import { allFoods, kitchenAdds, kitchenChips, swapText } from './foodModel'
import { Sheet } from '@/ui/primitives'
import { Icon } from '@/ui/icons'

export function SuggestSheet({ onClose, onLog, onRecipes }: { onClose: () => void; onLog: (recipeIndex: number) => void; onRecipes: () => void }) {
  const data = useStore((s) => s.data)
  const have = useStore((s) => s.kitchen)
  const setKitchen = useStore((s) => s.setKitchen)
  const [q, setQ] = useState('')
  const all = useMemo(() => allFoods(data.customFoods), [data.customFoods])
  const diet = data.profile.diet
  const gentle = kcalHidden(data)
  const dietLabel = DIETS.find(([d]) => d === diet)?.[1]

  // stable order: candidates as found, then anything added by search; nothing that conflicts
  // with the diet (a vegetarian isn't offered beef mince)
  const chips = useMemo(() => kitchenChips(data, all, have), [data, all, have])
  const toggle = (n: string) => setKitchen(have.includes(n) ? have.filter((x) => x !== n) : [...have, n])
  const adds = kitchenAdds(all, chips, q)
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
                      {s.swaps.map((w) => swapText(w, gentle, +s.recipe.servings || 1)).join(' · ')}
                    </div>
                  )}
                </div>
                <span className="addc"><Icon name="plus" size={16} stroke={2.8} /></span>
              </button>
            ))}
          </div>
          <div className="foot">Ranked by what you have. Swaps use the same weight (oil for butter a little less). Edit the recipe to use one.</div>
        </>
      )}
    </Sheet>
  )
}
