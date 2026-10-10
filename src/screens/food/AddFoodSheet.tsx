/**
 * The add-food flow in one sheet: search → portion, plus quick estimate, create-a-food and
 * recipe logging. Views swap inside the open sheet without replaying the slide-up.
 */
import { lazy, Suspense, useMemo, useState, type ReactNode } from 'react'
import { useStore } from '@/store/store'
import { kcalHidden } from '@/data/consent'
import { rankByName } from '@/core/domain/search'
import type { Food, MealSlot } from '@/core/types'
import { FOODS } from '@/core/data/foods'
import { fmt, r1 } from '@/core/domain/date'
import { recipePerServing, headline } from '@/core/domain/nutrition'
import { frac, portionText } from '@/core/domain/estimate'
import { MEAL_LABEL, mealNow, queryWords, recentFoods, recipeServing, recipesByUse, usualEntries, usuals } from '@/core/domain/insights'
import { Sheet, BackButton, focusOnMount, pressable } from '@/ui/primitives'
import { Icon, Chevron } from '@/ui/icons'
import { MealSeg } from './common'
import { ConnectionPill, NEEDS_NET } from '@/ui/ConnectionPill'
import { PortionView } from './PortionView'
import { RecipeLogView } from './RecipeLogView'
import { QuickEstimateView } from './QuickEstimateView'
import { CreateFoodView } from './CreateFoodView'
import { ScanView } from './ScanView'
import { ScanConfirmView } from './ScanConfirmView'
import type { ScanDraft } from '@/core/domain/barcode'
import { emptyLabelDraft } from '@/core/domain/label'
import { LABEL_SCAN_ENABLED } from '@/data/labelReader'

type LabelProps = { onBack?: () => void; onClose: () => void; animate: boolean; barcode?: string; base?: ScanDraft; onDone: (d: ScanDraft, notice?: string) => void }

/** Shown if the label camera's code can't load (offline before it was ever opened). */
function LabelOffline({ onBack, onClose, animate, barcode, base, onDone }: LabelProps) {
  return (
    <Sheet title="Scan the label" onClose={onClose} animate={animate} left={onBack ? <BackButton onClick={onBack} /> : undefined}>
      <div className="note" role="status"><Icon name="info" size={17} /><span>Label photos need a connection the first time they open.</span></div>
      <div className="stack"><button className="btn tinted" onClick={() => onDone(base ?? emptyLabelDraft({ barcode, taken: [] }))}>Type it in instead</button></div>
    </Sheet>
  )
}

// the capture view (camera, quality checks) loads only when opened, like the barcode decoder
const LabelCaptureView = lazy(() => import('./LabelCaptureView').catch(() => ({ default: LabelOffline })))

const MISSING_NOTE = {
  'not-found': 'Not found. Enter it from the label: per 100 g column.',
  offline: 'Couldn’t look it up without a connection. Enter it from the label: per 100 g column.',
  error: 'Couldn’t look it up right now. Enter it from the label: per 100 g column.',
} as const

type View =
  | { kind: 'search' }
  | { kind: 'portion'; food: Food; custom: boolean }
  | { kind: 'recipe'; index: number }
  | { kind: 'quick' }
  | { kind: 'create'; barcode?: string; note?: string }
  | { kind: 'scan' }
  | { kind: 'confirm'; draft: ScanDraft; notice?: string; back?: View; id?: number }
  /** a photo of the label: after a barcode scan it keeps the barcode (and OFF's name) */
  | { kind: 'label'; barcode?: string; base?: ScanDraft; back: View }

export function AddFoodSheet({ initialMeal, initialView, onClose }: { initialMeal?: MealSlot; initialView?: 'quick' | 'create' | 'scan'; onClose: () => void }) {
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
  if (view.kind === 'create') {
    return <CreateFoodView {...common} barcode={view.barcode} note={view.note} onSaved={(food) => go({ kind: 'portion', food, custom: true })}
      onLabelPhoto={LABEL_SCAN_ENABLED && view.barcode ? () => go({ kind: 'label', barcode: view.barcode, back: view }) : undefined} />
  }
  if (view.kind === 'label') {
    const toConfirm = (draft: ScanDraft, notice?: string) => go({ kind: 'confirm', draft, notice, back: view.back, id: Date.now() })
    const lp: LabelProps = { onBack: () => go(view.back), onClose, animate: !moved, barcode: view.barcode, base: view.base, onDone: toConfirm }
    return (
      <Suspense fallback={<Sheet title="Scan the label" onClose={onClose} animate={!moved}><div className="empty" role="status">Opening the camera…</div></Sheet>}>
        <LabelCaptureView {...lp} />
      </Suspense>
    )
  }
  if (view.kind === 'confirm') {
    const d = view.draft
    // OFF's figures, or a label that couldn't be read: offer reading the user's own pack
    const photo = LABEL_SCAN_ENABLED && (d.source !== 'label' || view.notice) ? () => go({ kind: 'label', barcode: d.barcode || undefined, base: d.source !== 'label' ? d : undefined, back: view }) : undefined
    return <ScanConfirmView key={view.id ?? 0} {...common} onBack={() => go(view.back ?? { kind: 'scan' })} draft={d} notice={view.notice} onLabelPhoto={photo}
      onSaved={(food) => go({ kind: 'portion', food, custom: true })} />
  }
  if (view.kind === 'scan') {
    return <ScanView {...common} onResult={(r) => {
      if (r.kind === 'local') go({ kind: 'portion', food: r.food, custom: r.custom })
      else if (r.kind === 'found') go({ kind: 'confirm', draft: r.draft })
      else go({ kind: 'create', barcode: r.barcode, note: MISSING_NOTE[r.why] })
    }} />
  }
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
  const gentle = kcalHidden(data)
  const online = useStore((s) => s.online)

  const foodRow = (f: Food, idx: number, trailing?: ReactNode) => (
    <div className="li" key={f.n + idx} {...pressable(() => go({ kind: 'portion', food: f, custom: idx >= FOODS.length }))}>
      <div className="m">
        <div className="t">{f.n}</div>
        <div className="s num">{gentle ? '' : `${Math.round(headline(f).k)} kcal · `}{r1(headline(f).p)} g protein {headline(f).per}{idx >= FOODS.length && <span className="tag">Mine</span>}</div>
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
    const foods = rankByName(all.map((f, i) => ({ f, i })), (o) => o.f.n, words, (o) => o.f.aka).slice(0, 50)
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
    <Sheet title="Add food" tall onClose={onClose} animate={animate} right={online ? undefined : <ConnectionPill />}>
      <div className="searchbar">
        <Icon name="search" size={17} />
        <input ref={focusOnMount} value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Search ${fmt(all.length)} foods and your recipes`}
          autoComplete="off" enterKeyHint="search" aria-label="Search foods" />
        <button className="navbtn scanbtn" onClick={() => go({ kind: 'scan' })} aria-label="Scan barcode"><Icon name="barcode" size={20} /></button>
      </div>
      <div style={{ margin: '10px 0 2px' }}><MealSeg value={meal} onChange={setMeal} /></div>
      {body}
      <div className="list icons" style={{ marginTop: 18 }}>
        <button className="li" onClick={() => go({ kind: 'quick' })}>
          <span className="ico" style={{ background: 'var(--mind)' }}><Icon name="bolt" size={18} /></span>
          <div className="m"><div className="t">Quick estimate</div><div className="s">Restaurant or unknown food</div></div><Chevron />
        </button>
        <button className="li" onClick={() => go({ kind: 'scan' })}>
          <span className="ico" style={{ background: 'var(--tint)' }}><Icon name="barcode" size={18} /></span>
          <div className="m"><div className="t">Scan barcode</div><div className="s">{online ? 'Packaged food, from the pack' : 'Works for products you’ve scanned before'}</div></div><Chevron />
        </button>
        {LABEL_SCAN_ENABLED && (
          online ? (
            <button className="li" onClick={() => go({ kind: 'label', back: { kind: 'search' } })}>
              <span className="ico" style={{ background: 'var(--tint)' }}><Icon name="camera" size={18} /></span>
              <div className="m"><div className="t">Scan the label</div><div className="s">A photo of the nutrition table</div></div><Chevron />
            </button>
          ) : (
            // online only (ob6-8): shown, off, with the note
            <div className="li needsnet" aria-disabled="true">
              <span className="ico" style={{ background: 'var(--fill2)' }}><Icon name="camera" size={18} /></span>
              <div className="m"><div className="t">Scan the label</div><div className="s">{NEEDS_NET}</div></div>
            </div>
          )
        )}
        <button className="li" onClick={() => go({ kind: 'create' })}>
          <span className="ico" style={{ background: 'var(--energy)', color: 'var(--on-food)' }}><Icon name="plus" size={18} /></span>
          <div className="m"><div className="t">Create a food</div><div className="s">From the label on the packet</div></div><Chevron />
        </button>
      </div>
    </Sheet>
  )
}
