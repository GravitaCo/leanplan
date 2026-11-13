/**
 * The add-food flow (src/screens/food/AddFoodSheet.tsx): search → portion, quick estimate and
 * create a food. Views swap inside the open sheet without replaying the slide-up. Search and the
 * browse lists are the shared foodModel, so results and their order equal the web's, offline too.
 * Scanning is the Scanning stream's (N6): it plugs its views in through `scan`.
 */
import { useMemo, useState, type ReactNode } from 'react'
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
import { SCAN_ENTRY } from '@/copy/scan'
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
import { SameFoodView } from './DuplicateSheets'
import { CreateFoodView } from './CreateFoodView'

/** What a scan view gets inside the Add food sheet. */
export type ScanApi = {
  meal: MealSlot; setMeal: (m: MealSlot) => void; onBack?: () => void; onClose: () => void; animate: boolean
  /** open a food's portion view (a local hit, or a food just saved from a scan) */
  toPortion: (food: Food, custom: boolean) => void
  /** nothing found: type it in, keeping the barcode */
  toCreate: (o: { barcode?: string; note?: string; offMissing?: boolean }) => void
}
/** The Scanning stream's views (N6): a barcode scan, or a photo of the label. */
export type ScanHooks = { render: (which: 'scan' | 'label', api: ScanApi) => ReactNode }

type Step =
  | { kind: 'search' }
  | { kind: 'portion'; food: Food; custom: boolean }
  | { kind: 'recipe'; index: number }
  | { kind: 'quick' }
  | { kind: 'create'; barcode?: string; note?: string; offMissing?: boolean }
  | { kind: 'scan' | 'label' }
  | { kind: 'same'; ids: [string, string] }

export function AddFoodSheet({ initialMeal, initialView, onClose, scan }: { initialMeal?: MealSlot; initialView?: 'quick' | 'create' | 'scan'; onClose: () => void; scan?: ScanHooks }) {
  const [meal, setMeal] = useState<MealSlot>(initialMeal ?? mealNow())
  const [view, setView] = useState<Step>(initialView ? { kind: initialView } : { kind: 'search' })
  const [q, setQ] = useState('')
  const [moved, setMoved] = useState(false)
  const go = (v: Step) => { setMoved(true); setView(v) }
  const back = initialView ? undefined : () => go({ kind: 'search' })
  const common = { meal, setMeal, onBack: back, onClose, animate: !moved }
  const customFoods = useStore((s) => s.data.customFoods)
  const cur = useStore((s) => s.cur)

  if (view.kind === 'same') {
    const pair = view.ids.map((id) => (customFoods || []).find((f) => f.id === id))
    if (pair[0] && pair[1]) return <SameFoodView pair={[pair[0], pair[1]]} cur={cur} onBack={() => go({ kind: 'search' })} onClose={onClose} animate={!moved} />
  }
  if (view.kind === 'portion') return <PortionView {...common} food={view.food} custom={view.custom} />
  if (view.kind === 'recipe') return <RecipeLogView {...common} index={view.index} />

  if (view.kind === 'quick') return <QuickEstimateView {...common} />
  if (view.kind === 'create') {
    return <CreateFoodView {...common} barcode={view.barcode} note={view.note} onSaved={(food) => go({ kind: 'portion', food, custom: true })}
      onLabelPhoto={LABEL_SCAN_ENABLED && view.barcode && scan ? () => go({ kind: 'label' }) : undefined} />
  }
  if ((view.kind === 'scan' || view.kind === 'label') && scan) {
    return <>{scan.render(view.kind, { ...common, toPortion: (food, custom) => go({ kind: 'portion', food, custom }), toCreate: (o) => go({ kind: 'create', ...o }) })}</>
  }
  return <SearchView meal={meal} setMeal={setMeal} q={q} setQ={setQ} go={go} onClose={onClose} animate={!moved} canScan={!!scan} />
}

function SearchView({ meal, setMeal, q, setQ, go, onClose, animate, canScan }: {
  meal: MealSlot; setMeal: (m: MealSlot) => void; q: string; setQ: (q: string) => void
  go: (v: Step) => void; onClose: () => void; animate: boolean; canScan: boolean
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
  const toScan = (kind: 'scan' | 'label') => () => { if (canScan) go({ kind }) }

  const foodRow = (f: Food, idx: number, trailing?: ReactNode) => (
    <Row key={f.n + idx} title={f.n} label={f.n} tag={isMine(idx) ? ADD_FOOD.mine : undefined} onPress={() => go({ kind: 'portion', food: f, custom: isMine(idx) })}
      sub={`${gentle ? '' : `${Math.round(headline(f).k)} kcal · `}${r1(headline(f).p)} g protein ${headline(f).per}`} right={trailing ?? <AddC />} />
  )
  // Recipes: tap the row to choose servings, tap + to log your usual serving in one go.
  const recipeRow = (ri: number) => {
    const r = data.recipes[ri]
    const per = recipePerServing(r)
    const serv = recipeServing(data, r.name)
    return (
      <Row key={r.id} title={r.name} label={r.name} onPress={() => go({ kind: 'recipe', index: ri })}
        sub={`${FOOD.servings(frac(serv), serv)} · ${gentle ? '' : `${fmt(per.k * serv)} kcal · `}${Math.round(per.p * serv)} g protein`}
        right={<AddC label={ADD_FOOD.logServing(frac(serv), r.name)} onPress={() => { logRecipe(r, serv, meal); onClose() }} />} />
    )
  }
  // the web asks with the browser's confirm; native with the system alert (lead, 13 Nov)
  const confirmDelete = (f: Food, ci: number) => {
    const msg = ADD_FOOD.deleteFoodAsk(f.n)
    if (Platform.OS === 'web') { if (window.confirm(msg)) removeCustomFood(ci); return }
    Alert.alert(msg, undefined, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => removeCustomFood(ci) }])
  }

  let body: ReactNode
  if (!query) {
    const { recipes: byUse, usuals: us, recent: rc, mine: cf, pair, common } = browseFoods(data, all, cur, meal)
    body = (
      <>
        {byUse.length > 0 && <><Lbl>{ADD_FOOD.yourRecipes}</Lbl><List>{byUse.map(recipeRow)}</List></>}
        {us.length > 0 && (
          <>
            <Lbl>{ADD_FOOD.yourUsual(MEAL_LABEL[meal])}</Lbl>
            <List>
              {us.map((u) => (
                <Row key={u.n} title={u.n} label={u.n} sub={`${portionText(u.last)} · ${ADD_FOOD.oneTap}`} right={<AddC />}
                  onPress={() => { logEntries(usualEntries(data, u.n, meal)); onClose() }} />
              ))}
            </List>
          </>
        )}
        {rc.length > 0 && <><Lbl>{ADD_FOOD.recent}</Lbl><List>{rc.map(({ f, i }) => foodRow(f, i))}</List></>}
        {cf.length > 0 && (
          <>
            <Lbl>{ADD_FOOD.myFoods}</Lbl>
            {/* dup-3: one quiet row while two saved foods look the same */}
            {pair && <List><Row title={DUP.looksSame} sub={pair[0].n} square={{ icon: 'copy', fill: t.tintSoft, ink: t.tint }} onPress={() => go({ kind: 'same', ids: [pair[0].id!, pair[1].id!] })} /></List>}
            <List>
              {cf.map((f, ci) => foodRow(f, mineIndex(ci), <NavBtn icon="x" muted label={ADD_FOOD.deleteFood(f.n)} onPress={() => confirmDelete(f, ci)} />))}
            </List>
            {pair && <Foot>{ADD_FOOD.pairFoot}</Foot>}
          </>
        )}
        {common.length > 0 && <><Lbl>{ADD_FOOD.common}</Lbl><List>{common.map((f, i) => foodRow(f, i))}</List></>}
      </>
    )
  } else {
    const { recipes, foods } = searchFoods(data, all, query)
    body = (
      <>
        {recipes.length > 0 && <><Lbl>{ADD_FOOD.yourRecipes}</Lbl><List>{recipes.map((o) => recipeRow(o.ri))}</List></>}
        {foods.length > 0 && <><Lbl>{ADD_FOOD.foods}</Lbl><List>{foods.map((o) => foodRow(o.f, o.i))}</List></>}
        {!recipes.length && !foods.length && <Empty>{ADD_FOOD.nothingMatches(q.trim())}{'\n'}{ADD_FOOD.eatingOut}</Empty>}
      </>
    )
  }

  return (
    <Sheet title={ADD_FOOD.title} tall onClose={onClose} animate={animate} right={online ? undefined : <ConnectionPill />}>
      <SearchBar label={ADD_FOOD.searchLabel} value={q} onChangeText={setQ} placeholder={ADD_FOOD.searchPlaceholder(fmt(all.length))} autoFocus autoCorrect={false} autoCapitalize="none"
        right={<NavBtn icon="barcode" label={SCAN_ENTRY.barcode} onPress={toScan('scan')} style={{ paddingVertical: 4, paddingHorizontal: 2 }} />} />
      <View style={{ marginTop: 10, marginBottom: 2 }}><MealSeg value={meal} onChange={setMeal} /></View>
      {body}
      <List icons style={{ marginTop: 18 }}>
        <Row title={ADD_FOOD.quickEstimate} sub={ADD_FOOD.quickEstimateS} square={{ icon: 'bolt', fill: t.mind }} onPress={() => go({ kind: 'quick' })} />
        <Row title={SCAN_ENTRY.barcode} sub={online ? SCAN_ENTRY.barcodeSub : SCAN_ENTRY.barcodeSubOffline} square={{ icon: 'barcode', fill: t.tint }} onPress={toScan('scan')} />
        {LABEL_SCAN_ENABLED && (online
          ? <Row title={SCAN_ENTRY.label} sub={SCAN_ENTRY.labelSub} square={{ icon: 'camera', fill: t.tint }} onPress={toScan('label')} />
          // online only (ob6-8): shown, off, with the note
          : <Row title={SCAN_ENTRY.label} sub={NEEDS_NET} square={{ icon: 'camera', fill: t.fill2 }} needsnet />)}
        <Row title={ADD_FOOD.createFood} sub={ADD_FOOD.createFoodS} square={{ icon: 'plus', fill: t.energy, ink: t.onFood }} onPress={() => go({ kind: 'create' })} />
      </List>
    </Sheet>
  )
}
