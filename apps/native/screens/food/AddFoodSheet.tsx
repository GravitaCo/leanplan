/**
 * The add-food flow in one sheet (src/screens/food/AddFoodSheet.tsx): search → portion, plus quick
 * estimate, create-a-food, recipe logging and the duplicate-food merge. Views swap inside the open
 * sheet without replaying the slide-up. Search is core's `rankByName` over the same list in the
 * same order as the web, and needs no connection.
 *
 * Scanning (barcode, label photo, shared products) is the Scanning stream's (N6): it plugs its views
 * in through `scan`. Until then the scan rows say so.
 */
import { useMemo, useState, type ReactNode } from 'react'
import { Alert, Platform, View } from 'react-native'
import { useStore } from '@/store/store'
import { kcalHidden } from '@/data/consent'
import { rankByName } from '@/core/domain/search'
import type { Food, MealSlot } from '@/core/types'
import { FOODS } from '@/core/data/foods'
import { fmt, r1 } from '@/core/domain/date'
import { recipePerServing, headline } from '@/core/domain/nutrition'
import { frac, portionText } from '@/core/domain/estimate'
import { MEAL_LABEL, mealNow, queryWords, recentFoods, recipeServing, recipesByUse, usualEntries, usuals } from '@/core/domain/insights'
import { likelyPairs } from '@/core/domain/duplicates'
import { LABEL_SCAN_ENABLED } from '@/data/labelReader'
import { NEEDS_NET } from '@/ui/ConnectionPill'
import { useTokens } from '../../lib/theme'
import { AddC, Chevron, ConnPill, Empty, Foot, IconBtn, Ico, Lbl, Li, List, RowText, SearchBar, Sheet, SheetHost } from './ui'
import { MealSeg } from './common'
import { PortionView } from './PortionView'
import { RecipeLogView } from './RecipeLogView'
import { QuickEstimateView } from './QuickEstimateView'
import { CreateFoodView } from './CreateFoodView'
import { SameFoodView, SameFoodsRow } from './DuplicateViews'

/** What a scan view can do inside the Add food sheet. */
export type ScanApi = {
  meal: MealSlot; setMeal: (m: MealSlot) => void; onBack?: () => void; onClose: () => void; animate: boolean
  /** open a food's portion view (a local hit, or a food just saved from a scan) */
  toPortion: (food: Food, custom: boolean) => void
  /** nothing found: type it in, keeping the barcode */
  toCreate: (o: { barcode?: string; note?: string; offMissing?: boolean }) => void
}
/** The Scanning stream's views (N6): a barcode scan, or a photo of the label. */
export type ScanHooks = {
  render: (which: 'scan' | 'label', api: ScanApi) => ReactNode
  /** extra content under a saved food's portion view ("Share this product", sp-7) */
  portionExtra?: (food: Food, custom: boolean, api: ScanApi) => ReactNode
}

type Step =
  | { kind: 'search' }
  | { kind: 'portion'; food: Food; custom: boolean }
  | { kind: 'recipe'; index: number }
  | { kind: 'quick' }
  | { kind: 'create'; barcode?: string; note?: string; offMissing?: boolean }
  | { kind: 'scan' | 'label' }
  /** two saved foods that look the same (board dup-4): pick the one to keep */
  | { kind: 'same'; ids: [string, string] }

const notYet = () => Platform.OS === 'web'
  ? window.alert('Scanning arrives with the Scanning stream.')
  : Alert.alert('Scanning', 'Scanning arrives with the Scanning stream.')

export function AddFoodSheet({ initialMeal, initialView, onClose, scan }: { initialMeal?: MealSlot; initialView?: 'quick' | 'create' | 'scan'; onClose: () => void; scan?: ScanHooks }) {
  return (
    <SheetHost onClose={onClose}>
      <AddFoodViews initialMeal={initialMeal} initialView={initialView} onClose={onClose} scan={scan} />
    </SheetHost>
  )
}

function AddFoodViews({ initialMeal, initialView, onClose, scan }: { initialMeal?: MealSlot; initialView?: 'quick' | 'create' | 'scan'; onClose: () => void; scan?: ScanHooks }) {
  const [meal, setMeal] = useState<MealSlot>(initialMeal ?? mealNow())
  const [view, setView] = useState<Step>(initialView ? { kind: initialView } : { kind: 'search' })
  const [q, setQ] = useState('')
  const [moved, setMoved] = useState(false)
  const customFoods = useStore((s) => s.data.customFoods)
  const cur = useStore((s) => s.cur)
  const go = (v: Step) => {
    if ((v.kind === 'scan' || v.kind === 'label') && !scan) { notYet(); return }
    setMoved(true); setView(v)
  }
  const back = initialView ? undefined : () => go({ kind: 'search' })
  const common = { meal, setMeal, onBack: back, onClose, animate: !moved }
  const api: ScanApi = {
    ...common,
    toPortion: (food, custom) => go({ kind: 'portion', food, custom }),
    toCreate: (o) => go({ kind: 'create', ...o }),
  }

  if (view.kind === 'same') {
    const pair = view.ids.map((id) => (customFoods || []).find((f) => f.id === id))
    if (pair[0] && pair[1]) return <SameFoodView pair={[pair[0], pair[1]]} cur={cur} onBack={() => go({ kind: 'search' })} onClose={onClose} animate={!moved} />
  }
  if (view.kind === 'portion') {
    return <PortionView {...common} food={view.food} custom={view.custom} extra={scan?.portionExtra?.(view.food, view.custom, api)} />
  }
  if (view.kind === 'recipe') return <RecipeLogView {...common} index={view.index} />
  if (view.kind === 'quick') return <QuickEstimateView {...common} />
  if (view.kind === 'create') {
    return <CreateFoodView {...common} barcode={view.barcode} note={view.note} onSaved={(food) => go({ kind: 'portion', food, custom: true })}
      onLabelPhoto={LABEL_SCAN_ENABLED && view.barcode && scan ? () => go({ kind: 'label' }) : undefined} />
  }
  if ((view.kind === 'scan' || view.kind === 'label') && scan) return <>{scan.render(view.kind, api)}</>
  return <SearchView meal={meal} setMeal={setMeal} q={q} setQ={setQ} go={go} onClose={onClose} animate={!moved} />
}

function SearchView({ meal, setMeal, q, setQ, go, onClose, animate }: {
  meal: MealSlot; setMeal: (m: MealSlot) => void; q: string; setQ: (q: string) => void
  go: (v: Step) => void; onClose: () => void; animate: boolean
}) {
  const t = useTokens()
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
    <Li key={f.n + idx} onPress={() => go({ kind: 'portion', food: f, custom: idx >= FOODS.length })} label={f.n}>
      <RowText title={f.n} n tag={idx >= FOODS.length ? 'Mine' : undefined}
        sub={`${gentle ? '' : `${Math.round(headline(f).k)} kcal · `}${r1(headline(f).p)} g protein ${headline(f).per}`} />
      {trailing ?? <AddC />}
    </Li>
  )
  // Recipes: tap the row to choose servings, tap + to log your usual serving in one go.
  const recipeRow = (ri: number) => {
    const r = data.recipes[ri]
    const per = recipePerServing(r)
    const serv = recipeServing(data, r.name)
    return (
      <Li key={r.id} onPress={() => go({ kind: 'recipe', index: ri })} label={r.name}>
        <RowText title={r.name} n sub={`${frac(serv)} serving${serv !== 1 ? 's' : ''} · ${gentle ? '' : `${fmt(per.k * serv)} kcal · `}${Math.round(per.p * serv)} g protein`} />
        <AddC label={`Log ${frac(serv)} serving of ${r.name}`} onPress={() => { logRecipe(r, serv, meal); onClose() }} />
      </Li>
    )
  }
  const confirmDelete = (f: Food, ci: number) => {
    const msg = `Delete "${f.n}" from your foods?`
    if (Platform.OS === 'web') { if (window.confirm(msg)) removeCustomFood(ci); return }
    Alert.alert(msg, undefined, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: () => removeCustomFood(ci) }])
  }

  let body: ReactNode
  if (!query) {
    const us = usuals(data, cur, meal)
    const rc = recentFoods(data, all)
    const cf = data.customFoods || []
    // one quiet row while two saved foods look the same (board dup-3)
    const pair = likelyPairs(cf)[0]
    const byUse = recipesByUse(data)
    body = (
      <>
        {byUse.length > 0 && <><Lbl>Your recipes</Lbl><List>{byUse.map(recipeRow)}</List></>}
        {us.length > 0 && (
          <>
            <Lbl>Your usual {MEAL_LABEL[meal].toLowerCase()}</Lbl>
            <List>
              {us.map((u) => (
                <Li key={u.n} label={u.n} onPress={() => { logEntries(usualEntries(data, u.n, meal)); onClose() }}>
                  <RowText title={u.n} sub={`${portionText(u.last)} · one tap`} />
                  <AddC />
                </Li>
              ))}
            </List>
          </>
        )}
        {rc.length > 0 && <><Lbl>Recent</Lbl><List>{rc.map((f) => foodRow(f, all.indexOf(f)))}</List></>}
        {cf.length > 0 && (
          <>
            <Lbl>My foods</Lbl>
            {pair && <List><SameFoodsRow pair={pair} onOpen={() => go({ kind: 'same', ids: [pair[0].id!, pair[1].id!] })} /></List>}
            <List>
              {cf.map((f, ci) => foodRow(f, FOODS.length + ci,
                <IconBtn name="x" label={`Delete ${f.n}`} color={t.label3} onPress={() => confirmDelete(f, ci)} />))}
            </List>
            {pair && <Foot>Shown only while two saved foods look alike. Merging or “They’re different” clears it.</Foot>}
          </>
        )}
        {!rc.length && !cf.length && <><Lbl>Common</Lbl><List>{FOODS.slice(0, 8).map((f, i) => foodRow(f, i))}</List></>}
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
        {recipes.length > 0 && <><Lbl>Your recipes</Lbl><List>{recipes.map((o) => recipeRow(o.ri))}</List></>}
        {foods.length > 0 && <><Lbl>Foods</Lbl><List>{foods.map((o) => foodRow(o.f, o.i))}</List></>}
        {!recipes.length && !foods.length && (
          <Empty>Nothing matches “{q.trim()}”.{'\n'}Eating out? A quick estimate is better than nothing.</Empty>
        )}
      </>
    )
  }

  return (
    <Sheet title="Add food" tall onClose={onClose} animate={animate} right={online ? undefined : <ConnPill />}>
      <SearchBar value={q} onChange={setQ} placeholder={`Search ${fmt(all.length)} foods and your recipes`} label="Search foods" autoFocus
        right={<IconBtn name="barcode" size={20} label="Scan barcode" onPress={() => go({ kind: 'scan' })} />} />
      <View style={{ marginTop: 10, marginBottom: 2 }}><MealSeg value={meal} onChange={setMeal} /></View>
      {body}
      <List icons style={{ marginTop: 18 }}>
        <Li minHeight={48} onPress={() => go({ kind: 'quick' })}>
          <Ico name="bolt" bg={t.mind} color={t.onCat} />
          <RowText title="Quick estimate" sub="Restaurant or unknown food" /><Chevron />
        </Li>
        <Li minHeight={48} onPress={() => go({ kind: 'scan' })}>
          <Ico name="barcode" bg={t.tint} color={t.onCat} />
          <RowText title="Scan barcode" sub={online ? 'Packaged food, from the pack' : 'Works for products you’ve scanned before'} /><Chevron />
        </Li>
        {LABEL_SCAN_ENABLED && (
          online ? (
            <Li minHeight={48} onPress={() => go({ kind: 'label' })}>
              <Ico name="camera" bg={t.tint} color={t.onCat} />
              <RowText title="Scan the label" sub="A photo of the nutrition table" /><Chevron />
            </Li>
          ) : (
            // online only (ob6-8): shown, off, with the note
            <Li minHeight={48} disabled>
              <Ico name="camera" bg={t.fill2} color={t.onCat} />
              <RowText title="Scan the label" titleColor={t.label2} sub={NEEDS_NET} />
            </Li>
          )
        )}
        <Li minHeight={48} onPress={() => go({ kind: 'create' })}>
          <Ico name="plus" bg={t.energy} color={t.onFood} />
          <RowText title="Create a food" sub="From the label on the packet" /><Chevron />
        </Li>
      </List>
    </Sheet>
  )
}
