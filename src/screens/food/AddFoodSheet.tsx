/**
 * The add-food flow in one sheet: search → portion, plus quick estimate, create-a-food and
 * recipe logging. Views swap inside the open sheet without replaying the slide-up.
 */
import { lazy, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useStore } from '@/store/store'
import { kcalHidden } from '@/data/consent'
import type { Food, MealSlot } from '@/core/types'
import { allFoods, browseFoods, isMine, mineIndex, searchFoods } from './foodModel'
import { ADD_FOOD, FOOD } from '@/copy/food'
import { fmt, r1 } from '@/core/domain/date'
import { recipePerServing, headline } from '@/core/domain/nutrition'
import { frac, portionText } from '@/core/domain/estimate'
import { MEAL_LABEL, mealNow, recipeServing, usualEntries } from '@/core/domain/insights'
import { Sheet, BackButton, focusOnMount, pressable } from '@/ui/primitives'
import { Icon, Chevron } from '@/ui/icons'
import { MealSeg } from './common'
import { ConnectionPill } from '@/ui/ConnectionPill'
import { NEEDS_NET } from '@/copy/connection'
import { PortionView } from './PortionView'
import { RecipeLogView } from './RecipeLogView'
import { QuickEstimateView } from './QuickEstimateView'
import { CreateFoodView } from './CreateFoodView'
import { ScanView } from './ScanView'
import { ScanConfirmView } from './ScanConfirmView'
import type { ScanDraft } from '@/core/domain/barcode'
import { emptyLabelDraft } from '@/core/domain/label'
import { LABEL_SCAN_ENABLED } from '@/data/labelReader'
import { offBeforeShare } from '@/data/sharedProducts'
import { draftForShare } from '@/core/domain/sharedProduct'
import { InOffSheet, SHARE_ROW } from './SharedProduct'
import { LABEL_OFFLINE, LABEL_TITLE, MISSING_NOTE, SCAN_ENTRY } from '@/copy/scan'
import { SameFoodView, SameFoodsRow } from './DuplicateViews'

type LabelProps = {
  onBack?: () => void; onClose: () => void; animate: boolean; barcode?: string; base?: ScanDraft; onDone: (d: ScanDraft, notice?: string) => void
  /** from a saved food's "Share this product" (sp-8b): no typing in, and a failed read goes back */
  forShare?: boolean; onFail?: (note: string) => void
}

/** Shown if the label camera's code can't load (offline before it was ever opened). */
function LabelOffline({ onBack, onClose, animate, barcode, base, onDone, forShare }: LabelProps) {
  return (
    <Sheet title={LABEL_TITLE} onClose={onClose} animate={animate} left={onBack ? <BackButton onClick={onBack} /> : undefined}>
      <div className="note" role="status"><Icon name="info" size={17} /><span>{LABEL_OFFLINE}</span></div>
      {!forShare && <div className="stack"><button className="btn tinted" onClick={() => onDone(base ?? emptyLabelDraft({ barcode, taken: [] }))}>Type it in instead</button></div>}
    </Sheet>
  )
}

// the capture view (camera, quality checks) loads only when opened, like the barcode decoder
const LabelCaptureView = lazy(() => import('./LabelCaptureView').catch(() => ({ default: LabelOffline })))

type View =
  | { kind: 'search' }
  | { kind: 'portion'; food: Food; custom: boolean }
  | { kind: 'recipe'; index: number }
  | { kind: 'quick' }
  /** `offMissing`: Open Food Facts answered "not found" for the barcode (a label read may then join the shared list) */
  | { kind: 'create'; barcode?: string; note?: string; offMissing?: boolean }
  | { kind: 'scan' }
  /** `share`: Check the label with Share, for this saved food (sp-9) */
  | { kind: 'confirm'; draft: ScanDraft; notice?: string; back?: View; id?: number; share?: Food }
  /** a photo of the label: after a barcode scan it keeps the barcode (and OFF's name). `share`:
   *  from this saved food's "Share this product" (sp-8b) */
  | { kind: 'label'; barcode?: string; base?: ScanDraft; back: View; offMissing?: boolean; share?: Food }

  /** two saved foods that look the same (board dup-4): pick the one to keep */
  | { kind: 'same'; ids: [string, string] }


export function AddFoodSheet({ initialMeal, initialView, onClose }: { initialMeal?: MealSlot; initialView?: 'quick' | 'create' | 'scan'; onClose: () => void }) {
  const [meal, setMeal] = useState<MealSlot>(initialMeal ?? mealNow())
  const [view, setView] = useState<View>(initialView ? { kind: initialView } : { kind: 'search' })
  const [q, setQ] = useState('')
  const [moved, setMoved] = useState(false)
  const showToast = useStore((s) => s.showToast)
  const markFoodInOff = useStore((s) => s.markFoodInOff)
  // "Share this product" (sp-7 to sp-9): the Open Food Facts lookup a tap starts, and its answer
  const [shareBusy, setShareBusy] = useState(false)
  const [inOff, setInOff] = useState<string | null>(null)
  const viewRef = useRef(view)
  viewRef.current = view
  const lookupRef = useRef<AbortController | null>(null)
  useEffect(() => () => lookupRef.current?.abort(), [])
  const go = (v: View) => { setMoved(true); setView(v) }
  const back = initialView ? undefined : () => go({ kind: 'search' })
  const common = { meal, setMeal, onBack: back, onClose, animate: !moved }
  const customFoods = useStore((s) => s.data.customFoods)
  const cur = useStore((s) => s.cur)

  if (view.kind === 'same') {
    const pair = view.ids.map((id) => (customFoods || []).find((f) => f.id === id))
    if (pair[0] && pair[1]) return <SameFoodView pair={[pair[0], pair[1]]} cur={cur} onBack={() => go({ kind: 'search' })} onClose={onClose} animate={!moved} />
  }
  if (view.kind === 'portion') {
    const from = view
    const food = view.food
    const startShare = async () => {
      if (!food.id || !food.barcode || shareBusy) return
      setShareBusy(true)
      const ctl = new AbortController()
      lookupRef.current = ctl
      const next = await offBeforeShare(food.barcode, { signal: ctl.signal })
      setShareBusy(false)
      // closed, or moved on, while it looked up
      if (ctl.signal.aborted || viewRef.current !== from) return
      if (next === 'in-off') setInOff(food.id)
      else if (next === 'label') go({ kind: 'label', barcode: food.barcode, back: from, offMissing: true, share: food })
      else showToast(SHARE_ROW.offline)
    }
    return (
      <>
        <PortionView {...common} food={food} custom={view.custom} onShare={() => void startShare()} shareBusy={shareBusy} />
        {inOff && inOff === food.id && <InOffSheet onOk={() => { markFoodInOff(inOff); setInOff(null) }} />}
      </>
    )
  }
  if (view.kind === 'recipe') return <RecipeLogView {...common} index={view.index} />
  if (view.kind === 'quick') return <QuickEstimateView {...common} />
  if (view.kind === 'create') {
    return <CreateFoodView {...common} barcode={view.barcode} note={view.note} onSaved={(food) => go({ kind: 'portion', food, custom: true })}
      onLabelPhoto={LABEL_SCAN_ENABLED && view.barcode ? () => go({ kind: 'label', barcode: view.barcode, back: view, offMissing: view.offMissing }) : undefined} />
  }
  if (view.kind === 'label') {
    const sf = view.share
    const toConfirm = sf
      ? (draft: ScanDraft) => go({ kind: 'confirm', draft: draftForShare(draft, sf), back: view.back, id: Date.now(), share: sf })
      : (draft: ScanDraft, notice?: string) => go({ kind: 'confirm', draft: view.offMissing ? { ...draft, offMissing: true } : draft, notice, back: view.back, id: Date.now() })
    const lp: LabelProps = {
      onBack: () => go(view.back), onClose, animate: !moved, barcode: view.barcode, base: view.base, onDone: toConfirm,
      // a failed read goes back to the food: nothing is shared (canvas note s-share)
      ...(sf ? { forShare: true, onFail: (note: string) => { go(view.back); showToast(note) } } : {}),
    }
    return (
      <Suspense fallback={<Sheet title={LABEL_TITLE} onClose={onClose} animate={!moved}><div className="empty" role="status">{SCAN_ENTRY.opening}</div></Sheet>}>
        <LabelCaptureView {...lp} />
      </Suspense>
    )
  }
  if (view.kind === 'confirm') {
    const d = view.draft
    // OFF's figures, or a label that couldn't be read: offer reading the user's own pack
    // offMissing carries over: from a shared product (never in Open Food Facts) or a typed label after a not-found
    const photo = LABEL_SCAN_ENABLED && !view.share && (d.source !== 'label' || view.notice) ? () => go({ kind: 'label', barcode: d.barcode || undefined, base: d.source !== 'label' ? d : undefined, back: view, offMissing: d.offMissing }) : undefined
    return <ScanConfirmView key={view.id ?? 0} {...common} onBack={() => go(view.back ?? { kind: 'scan' })} draft={d} notice={view.notice} onLabelPhoto={photo}
      shareFor={view.share} onSaved={(food) => go({ kind: 'portion', food, custom: true })} />
  }
  if (view.kind === 'scan') {
    return <ScanView {...common} onResult={(r) => {
      if (r.kind === 'local') go({ kind: 'portion', food: r.food, custom: r.custom })
      else if (r.kind === 'found' || r.kind === 'shared') go({ kind: 'confirm', draft: r.draft })
      else go({ kind: 'create', barcode: r.barcode, note: MISSING_NOTE[r.why], offMissing: r.why === 'not-found' })
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
  const all = useMemo(() => allFoods(data.customFoods), [data.customFoods])
  const query = q.trim().toLowerCase()
  const gentle = kcalHidden(data)
  const online = useStore((s) => s.online)

  const foodRow = (f: Food, idx: number, trailing?: ReactNode) => (
    <div className="li" key={f.n + idx} {...pressable(() => go({ kind: 'portion', food: f, custom: isMine(idx) }))}>
      <div className="m">
        <div className="t">{f.n}</div>
        <div className="s num">{gentle ? '' : `${Math.round(headline(f).k)} kcal · `}{r1(headline(f).p)} g protein {headline(f).per}{isMine(idx) && <span className="tag">{ADD_FOOD.mine}</span>}</div>
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
          <div className="s num">{FOOD.servings(frac(serv), serv)} · {gentle ? '' : `${fmt(per.k * serv)} kcal · `}{Math.round(per.p * serv)} g protein</div>
        </div>
        <button className="addc" aria-label={ADD_FOOD.logServing(frac(serv), r.name)}
          onClick={(e) => { e.stopPropagation(); logRecipe(r, serv, meal); onClose() }}>
          <Icon name="plus" size={16} stroke={2.8} />
        </button>
      </div>
    )
  }

  let body: ReactNode
  if (!query) {
    // your recipes, your usual, recent, my foods (one quiet row while two look the same, dup-3)
    const { recipes: byUse, usuals: us, recent: rc, mine: cf, pair, common } = browseFoods(data, all, cur, meal)
    body = (
      <>
        {byUse.length > 0 && <><div className="lbl">{ADD_FOOD.yourRecipes}</div><div className="list">{byUse.map(recipeRow)}</div></>}
        {us.length > 0 && (
          <>
            <div className="lbl">{ADD_FOOD.yourUsual(MEAL_LABEL[meal])}</div>
            <div className="list">
              {us.map((u) => (
                <div className="li" key={u.n} {...pressable(() => { logEntries(usualEntries(data, u.n, meal)); onClose() })}>
                  <div className="m"><div className="t">{u.n}</div><div className="s">{portionText(u.last)} · {ADD_FOOD.oneTap}</div></div>
                  <span className="addc"><Icon name="plus" size={16} stroke={2.8} /></span>
                </div>
              ))}
            </div>
          </>
        )}
        {rc.length > 0 && <><div className="lbl">{ADD_FOOD.recent}</div><div className="list">{rc.map(({ f, i }) => foodRow(f, i))}</div></>}
        {cf.length > 0 && (
          <>
            <div className="lbl">{ADD_FOOD.myFoods}</div>
            {pair && <div className="list"><SameFoodsRow pair={pair} onOpen={() => go({ kind: 'same', ids: [pair[0].id!, pair[1].id!] })} /></div>}
            <div className="list">
              {cf.map((f, ci) => foodRow(f, mineIndex(ci),
                <button className="navbtn" style={{ color: 'var(--label3)' }} aria-label={ADD_FOOD.deleteFood(f.n)}
                  onClick={(e) => { e.stopPropagation(); if (window.confirm(ADD_FOOD.deleteFoodAsk(f.n))) removeCustomFood(ci) }}>
                  <Icon name="x" size={17} />
                </button>))}
            </div>
            {pair && <div className="foot dup-listfoot">{ADD_FOOD.pairFoot}</div>}
          </>
        )}
        {common.length > 0 && <><div className="lbl">{ADD_FOOD.common}</div><div className="list">{common.map((f, i) => foodRow(f, i))}</div></>}
      </>
    )
  } else {
    const { recipes, foods } = searchFoods(data, all, query)
    body = (
      <>
        {recipes.length > 0 && <><div className="lbl">{ADD_FOOD.yourRecipes}</div><div className="list">{recipes.map((o) => recipeRow(o.ri))}</div></>}
        {foods.length > 0 && <><div className="lbl">{ADD_FOOD.foods}</div><div className="list">{foods.map((o) => foodRow(o.f, o.i))}</div></>}
        {!recipes.length && !foods.length && (
          <div className="empty">{ADD_FOOD.nothingMatches(q.trim())}<br />{ADD_FOOD.eatingOut}</div>
        )}
      </>
    )
  }

  return (
    <Sheet title={ADD_FOOD.title} tall onClose={onClose} animate={animate} right={online ? undefined : <ConnectionPill />}>
      <div className="searchbar">
        <Icon name="search" size={17} />
        <input ref={focusOnMount} value={q} onChange={(e) => setQ(e.target.value)} placeholder={ADD_FOOD.searchPlaceholder(fmt(all.length))}
          autoComplete="off" enterKeyHint="search" aria-label={ADD_FOOD.searchLabel} />
        <button className="navbtn scanbtn" onClick={() => go({ kind: 'scan' })} aria-label={SCAN_ENTRY.barcode}><Icon name="barcode" size={20} /></button>
      </div>
      <div style={{ margin: '10px 0 2px' }}><MealSeg value={meal} onChange={setMeal} /></div>
      {body}
      <div className="list icons" style={{ marginTop: 18 }}>
        <button className="li" onClick={() => go({ kind: 'quick' })}>
          <span className="ico" style={{ background: 'var(--mind)' }}><Icon name="bolt" size={18} /></span>
          <div className="m"><div className="t">{ADD_FOOD.quickEstimate}</div><div className="s">{ADD_FOOD.quickEstimateS}</div></div><Chevron />
        </button>
        <button className="li" onClick={() => go({ kind: 'scan' })}>
          <span className="ico" style={{ background: 'var(--tint)' }}><Icon name="barcode" size={18} /></span>
          <div className="m"><div className="t">{SCAN_ENTRY.barcode}</div><div className="s">{online ? SCAN_ENTRY.barcodeSub : SCAN_ENTRY.barcodeSubOffline}</div></div><Chevron />
        </button>
        {LABEL_SCAN_ENABLED && (
          online ? (
            <button className="li" onClick={() => go({ kind: 'label', back: { kind: 'search' } })}>
              <span className="ico" style={{ background: 'var(--tint)' }}><Icon name="camera" size={18} /></span>
              <div className="m"><div className="t">{SCAN_ENTRY.label}</div><div className="s">{SCAN_ENTRY.labelSub}</div></div><Chevron />
            </button>
          ) : (
            // online only (ob6-8): shown, off, with the note
            <div className="li needsnet" aria-disabled="true">
              <span className="ico" style={{ background: 'var(--fill2)' }}><Icon name="camera" size={18} /></span>
              <div className="m"><div className="t">{SCAN_ENTRY.label}</div><div className="s">{NEEDS_NET}</div></div>
            </div>
          )
        )}
        <button className="li" onClick={() => go({ kind: 'create' })}>
          <span className="ico" style={{ background: 'var(--energy)', color: 'var(--on-food)' }}><Icon name="plus" size={18} /></span>
          <div className="m"><div className="t">{ADD_FOOD.createFood}</div><div className="s">{ADD_FOOD.createFoodS}</div></div><Chevron />
        </button>
      </div>
    </Sheet>
  )
}
