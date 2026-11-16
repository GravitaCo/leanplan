/**
 * The add-food flow (src/screens/food/AddFoodSheet.tsx): search → portion, quick estimate and
 * create a food. Views swap inside the open sheet without replaying the slide-up. Search and the
 * browse lists are the shared foodModel, so results and their order equal the web's, offline too.
 * The scan, label photo and confirm views are the Scanning stream's (N6, screens/scan), opened as on the web.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Alert, Platform, View } from 'react-native'
import { useStore } from '@/store/store'
import { kcalHidden } from '@/data/consent'
import type { Food, MealSlot } from '@/core/types'
import { fmt, r1 } from '@/core/domain/date'
import { headline, recipePerServing } from '@/core/domain/nutrition'
import { frac, portionText } from '@/core/domain/estimate'
import { MEAL_LABEL, mealNow, recipeServing, usualEntries } from '@/core/domain/insights'
import { LABEL_SCAN_ENABLED } from '@/data/labelReader'
import { allFoods, browseFoods, isMine, mineIndex, searchFoods } from '@/screens/food/foodModel'
import { ADD_FOOD, DUP, FOOD } from '@/copy/food'
import { MISSING_NOTE, SCAN_ENTRY, SHARE_ROW } from '@/copy/scan'
import type { ScanDraft } from '@/core/domain/barcode'
import { draftForShare } from '@/core/domain/sharedProduct'
import { offBeforeShare } from '@/data/sharedProducts'
import { InOffSheet, LabelCaptureView, ScanConfirmView, ScanView } from '../scan'
import { NEEDS_NET } from '@/copy/connection'
import { List } from '../../lib/ui/kit'
import { AddC, ConnectionPill, NavBtn, Row, Sheet } from '../../lib/ui/primitives'
import { SearchBar } from '../../lib/ui/fields'
import { Empty, Foot, Lbl } from '../../lib/ui/text'
import { useTokens } from '../../lib/theme'
import { MealSeg } from './common'
import { QuickEstimateView } from './QuickEstimateView'
import { PortionView } from './PortionView'
import { RecipeLogView } from './RecipeLogView'
import { DuplicateSheets, SameFoodView } from './DuplicateSheets'
import type { DuplicateAnswer, DuplicateAsk } from './useDuplicateSave'
import { CreateFoodView } from './CreateFoodView'

type Step =
  | { kind: 'search' }
  | { kind: 'portion'; food: Food; custom: boolean }
  | { kind: 'recipe'; index: number }
  | { kind: 'quick' }
  /** `offMissing`: Open Food Facts answered "not found" for the barcode (a label read may then join the shared list) */
  | { kind: 'create'; barcode?: string; note?: string; offMissing?: boolean }
  | { kind: 'scan' }
  /** `share`: Check the label with Share, for this saved food (sp-9) */
  | { kind: 'confirm'; draft: ScanDraft; notice?: string; back?: Step; id?: number; share?: Food }
  /** a photo of the label: after a barcode scan it keeps the barcode (and OFF's name); `share`: from a saved food's Share this product (sp-8b) */
  | { kind: 'label'; barcode?: string; base?: ScanDraft; back: Step; offMissing?: boolean; share?: Food }
  /** two saved foods that look the same (board dup-4): pick the one to keep */
  | { kind: 'same'; ids: [string, string] }

/** the dup-1 / dup-2 question for N6's confirm view (the web's `dup.sheet`) */
const duplicateSheet = (ask: DuplicateAsk, answer: (a: DuplicateAnswer) => void, dismiss: () => void) => <DuplicateSheets ask={ask} answer={answer} dismiss={dismiss} />

export function AddFoodSheet({ initialMeal, initialView, onClose }: { initialMeal?: MealSlot; initialView?: 'quick' | 'create' | 'scan'; onClose: () => void }) {
  const [meal, setMeal] = useState<MealSlot>(initialMeal ?? mealNow())
  const [view, setView] = useState<Step>(initialView ? { kind: initialView } : { kind: 'search' })
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
  const go = (v: Step) => { setMoved(true); setView(v) }
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
        <PortionView {...common} food={food} custom={view.custom} share={{ onShare: () => void startShare(), busy: shareBusy }} />
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
    return (
      <LabelCaptureView onBack={() => go(view.back)} onClose={onClose} animate={!moved} barcode={view.barcode} base={view.base} onDone={toConfirm}
        // a failed read goes back to the food: nothing is shared (canvas note s-share)
        {...(sf ? { forShare: true, onFail: (note: string) => { go(view.back); showToast(note) } } : {})} />
    )
  }
  if (view.kind === 'confirm') {
    const d = view.draft
    // OFF's figures, or a label that couldn't be read: offer reading the user's own pack
    // offMissing carries over: from a shared product (never in Open Food Facts) or a typed label after a not-found
    const photo = LABEL_SCAN_ENABLED && !view.share && (d.source !== 'label' || view.notice)
      ? () => go({ kind: 'label', barcode: d.barcode || undefined, base: d.source !== 'label' ? d : undefined, back: view, offMissing: d.offMissing }) : undefined
    return <ScanConfirmView key={view.id ?? 0} {...common} onBack={() => go(view.back ?? { kind: 'scan' })} draft={d} notice={view.notice} onLabelPhoto={photo}
      shareFor={view.share} onSaved={(food) => go({ kind: 'portion', food, custom: true })} duplicateSheet={duplicateSheet} />
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
  go: (v: Step) => void; onClose: () => void; animate: boolean
}) {
  const t = useTokens()
  const data = useStore((s) => s.data)
  const cur = useStore((s) => s.cur)
  const online = useStore((s) => s.online)
  const logEntries = useStore((s) => s.logEntries)
  const logRecipe = useStore((s) => s.logRecipe)
  const removeCustomFood = useStore((s) => s.removeCustomFood)
  const all = useMemo(() => allFoods(data.customFoods), [data.customFoods])
  const query = q.trim().toLowerCase()
  const gentle = kcalHidden(data)

  const foodRow = (f: Food, idx: number, trailing?: ReactNode) => (
    <Row key={f.n + idx} title={f.n} tag={isMine(idx) ? ADD_FOOD.mine : undefined} onPress={() => go({ kind: 'portion', food: f, custom: isMine(idx) })}
      sub={`${gentle ? '' : `${Math.round(headline(f).k)} kcal · `}${r1(headline(f).p)} g protein ${headline(f).per}`} right={trailing ?? <AddC />} />
  )
  // Recipes: tap the row to choose servings, tap + to log your usual serving in one go.
  const recipeRow = (ri: number) => {
    const r = data.recipes[ri]
    const per = recipePerServing(r)
    const serv = recipeServing(data, r.name)
    return (
      <Row key={r.id} title={r.name} onPress={() => go({ kind: 'recipe', index: ri })}
        sub={`${FOOD.servings(frac(serv), serv)} · ${gentle ? '' : `${fmt(per.k * serv)} kcal · `}${Math.round(per.p * serv)} g protein`}
        right={<AddC label={ADD_FOOD.logServing(frac(serv), r.name)} onPress={() => { logRecipe(r, serv, meal); onClose() }} />} />
    )
  }
  // the web asks with the browser's confirm; native with the system alert (lead, 13 Nov)
  const confirmDelete = (f: Food, ci: number) => {
    const msg = ADD_FOOD.deleteFoodAsk(f.n)
    if (Platform.OS === 'web') { if (window.confirm(msg)) removeCustomFood(ci); return }
    Alert.alert(msg, undefined, [{ text: ADD_FOOD.cancel, style: 'cancel' }, { text: ADD_FOOD.delete, style: 'destructive', onPress: () => removeCustomFood(ci) }])
  }

  let body: ReactNode
  // the bottom list sits 18 below what's above; after a list (8 below it) that is 10 more, as the web's margins collapse
  let endsWithList = false
  if (!query) {
    const { recipes: byUse, usuals: us, recent: rc, mine: cf, pair, common } = browseFoods(data, all, cur, meal)
    endsWithList = common.length > 0 || (cf.length > 0 ? !pair : rc.length + us.length + byUse.length > 0)
    body = (
      <>
        {byUse.length > 0 && <><Lbl>{ADD_FOOD.yourRecipes}</Lbl><List style={{ marginBottom: 8 }}>{byUse.map(recipeRow)}</List></>}
        {us.length > 0 && (
          <>
            <Lbl>{ADD_FOOD.yourUsual(MEAL_LABEL[meal])}</Lbl>
            <List style={{ marginBottom: 8 }}>
              {us.map((u) => (
                <Row key={u.n} title={u.n} sub={`${portionText(u.last)} · ${ADD_FOOD.oneTap}`} right={<AddC />}
                  onPress={() => { logEntries(usualEntries(data, u.n, meal)); onClose() }} />
              ))}
            </List>
          </>
        )}
        {rc.length > 0 && <><Lbl>{ADD_FOOD.recent}</Lbl><List style={{ marginBottom: 8 }}>{rc.map(({ f, i }) => foodRow(f, i))}</List></>}
        {cf.length > 0 && (
          <>
            <Lbl>{ADD_FOOD.myFoods}</Lbl>
            {/* dup-3: one quiet row while two saved foods look the same */}
            {pair && <List style={{ marginBottom: 8 }}><Row title={DUP.looksSame} sub={pair[0].n} square={{ icon: 'copy', fill: t.tintSoft, ink: t.tint }} onPress={() => go({ kind: 'same', ids: [pair[0].id!, pair[1].id!] })} /></List>}
            <List style={{ marginBottom: 8 }}>
              {cf.map((f, ci) => foodRow(f, mineIndex(ci), <NavBtn icon="x" muted label={ADD_FOOD.deleteFood(f.n)} onPress={() => confirmDelete(f, ci)} />))}
            </List>
            {pair && <Foot>{ADD_FOOD.pairFoot}</Foot>}
          </>
        )}
        {common.length > 0 && <><Lbl>{ADD_FOOD.common}</Lbl><List style={{ marginBottom: 8 }}>{common.map((f, i) => foodRow(f, i))}</List></>}
      </>
    )
  } else {
    const { recipes, foods } = searchFoods(data, all, query)
    endsWithList = recipes.length + foods.length > 0
    body = (
      <>
        {recipes.length > 0 && <><Lbl>{ADD_FOOD.yourRecipes}</Lbl><List style={{ marginBottom: 8 }}>{recipes.map((o) => recipeRow(o.ri))}</List></>}
        {foods.length > 0 && <><Lbl>{ADD_FOOD.foods}</Lbl><List style={{ marginBottom: 8 }}>{foods.map((o) => foodRow(o.f, o.i))}</List></>}
        {!recipes.length && !foods.length && <Empty>{ADD_FOOD.nothingMatches(q.trim())}{'\n'}{ADD_FOOD.eatingOut}</Empty>}
      </>
    )
  }

  return (
    <Sheet title={ADD_FOOD.title} tall onClose={onClose} animate={animate} right={online ? undefined : <ConnectionPill />}>
      <SearchBar label={ADD_FOOD.searchLabel} value={q} onChangeText={setQ} placeholder={ADD_FOOD.searchPlaceholder(fmt(all.length))} autoFocus autoCorrect={false} autoCapitalize="none"
        right={<NavBtn icon="barcode" label={SCAN_ENTRY.barcode} onPress={() => go({ kind: 'scan' })} style={{ paddingVertical: 4, paddingHorizontal: 2 }} />} />
      <View style={{ marginTop: 10, marginBottom: 2 }}><MealSeg value={meal} onChange={setMeal} /></View>
      {body}
      <List icons style={{ marginTop: endsWithList ? 10 : 18, marginBottom: 8 }}>
        <Row title={ADD_FOOD.quickEstimate} sub={ADD_FOOD.quickEstimateS} square={{ icon: 'bolt', fill: t.mind }} onPress={() => go({ kind: 'quick' })} />
        <Row title={SCAN_ENTRY.barcode} sub={online ? SCAN_ENTRY.barcodeSub : SCAN_ENTRY.barcodeSubOffline} square={{ icon: 'barcode', fill: t.tint }} onPress={() => go({ kind: 'scan' })} />
        {LABEL_SCAN_ENABLED && (online
          ? <Row title={SCAN_ENTRY.label} sub={SCAN_ENTRY.labelSub} square={{ icon: 'camera', fill: t.tint }} onPress={() => go({ kind: 'label', back: { kind: 'search' } })} />
          // online only (ob6-8): shown, off, with the note
          : <Row title={SCAN_ENTRY.label} sub={NEEDS_NET} square={{ icon: 'camera', fill: t.fill2 }} needsnet />)}
        <Row title={ADD_FOOD.createFood} sub={ADD_FOOD.createFoodS} square={{ icon: 'plus', fill: t.energy, ink: t.onFood }} onPress={() => go({ kind: 'create' })} />
      </List>
    </Sheet>
  )
}
