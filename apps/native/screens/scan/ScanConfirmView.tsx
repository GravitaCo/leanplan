/**
 * Check a scanned product before it's saved: the web's src/screens/food/ScanConfirmView.tsx on
 * lib/ui (the logic below is the web's, line for line; only the drawing is React Native). Open Food
 * Facts is crowdsourced, so the numbers are laid out like the pack's own nutrition panel (per 100 g,
 * editable and what's saved, beside a live per-serving column), fields that don't hang together are
 * marked (neutrally: the user has the pack, we don't), and nothing is saved or logged until Save.
 *
 * A label photo (draft.label) opens here too: the per-serving column shows the label's own
 * per-serving figures, the misread checks (core/domain/label.ts) re-run as the user edits, and a
 * suspected misread offers its one suggested fix to accept with a tap. Tilo's shared product list
 * (sp-1 to sp-6) and Share this product (`shareFor`, sp-9) as on web.
 *
 * Saving goes through N5's native useDuplicateSave (screens/food), the web's signature; its open
 * question (dup-1, dup-2) is drawn by the host with N5's sheets (`duplicateSheet`).
 */
import { useRef, useState, type ReactNode } from 'react'
import { Text, View } from 'react-native'
import { useStore } from '@/store/store'
import { latestConsent } from '@/data/consent'
import { SHARED_PRODUCTS_ENABLED } from '@/data/sharedProducts'
import { sameAsFound, shareDecision, shareEligible, TIER_SOURCE } from '@/core/domain/sharedProduct'
import type { Food, MealSlot } from '@/core/types'
import { checkLabel, foodFromConfirmed, type FoodKind, type LabelField, type LabelValues, type ScanDraft } from '@/core/domain/barcode'
import { cellId, kjFromKcal, labelIssues, parseCell, parseServing, servingRef, SERVING_NEEDED, type LabelIssue, type LabelTexts } from '@/core/domain/label'
import { CONFIRM, NAME_HINT, SHARE_CHECK } from '@/copy/scan'
import { CREATE_FOOD } from '@/copy/food'
import { NEEDS_NET } from '@/copy/connection'
import { num, tx, BTN, useTokens } from '../../lib/theme'
import { BackButton, NavBtn, Seg, Sheet } from '../../lib/ui/primitives'
import { Btn, List, Note } from '../../lib/ui/kit'
import { FRow } from '../../lib/ui/fields'
import { Foot, Lbl, Sub } from '../../lib/ui/text'
import { useDuplicateSave, type DuplicateAnswer, type DuplicateAsk } from '../food/useDuplicateSave'
import { ReportProductSheet, ShareOptInSheet, SharedServing, SharedSourceCard } from './SharedProduct'
import { FlagNote, NutritionRow, NutritionTable } from './parts'

/** UK label order. `sub` rows are the "of which" lines; `unit` is shown beside the name. */
const ROWS: { f: LabelField; label: string; unit?: string; sub?: boolean; dp: number }[] = [
  { f: 'kj', label: 'Energy', unit: 'kJ', dp: 0 },
  { f: 'k', label: 'Energy', unit: 'kcal', dp: 0 },
  { f: 'f', label: 'Fat', dp: 1 },
  { f: 'sat', label: 'of which saturates', sub: true, dp: 1 },
  { f: 'c', label: 'Carbohydrate', dp: 1 },
  { f: 'sugars', label: 'of which sugars', sub: true, dp: 1 },
  { f: 'fibre', label: 'Fibre', dp: 1 },
  { f: 'p', label: 'Protein', dp: 1 },
  { f: 'salt', label: 'Salt', dp: 2 },
  { f: 'alcohol', label: 'Alcohol', unit: '% vol', dp: 1 },
]
const REQUIRED: LabelField[] = ['k', 'p', 'c', 'f']

const toText = (v: number | undefined) => (v === undefined ? '' : String(Math.round(v * 100) / 100))
const round = (v: number, dp: number) => String(Math.round(v * 10 ** dp) / 10 ** dp)
/** Issues that belong to one row (its two columns, its RI, its own text) are explained on that row. */
const oneRow = (i: LabelIssue) => new Set(i.cells.map((c) => c.split(':')[0])).size === 1

/** "Photo of the label": online only, so offline it stays in view, off, with the note (ob6-8). */
export function LabelPhotoButton({ onPress }: { onPress: () => void }) {
  const online = useStore((s) => s.online)
  return (
    <>
      <Btn kind="gray" icon="camera" title={CREATE_FOOD.labelPhoto} disabled={!online} onPress={onPress} />
      {!online && <Foot style={{ paddingHorizontal: 0 }}>{NEEDS_NET}</Foot>}
    </>
  )
}

export function ScanConfirmView({ draft, onBack, onClose, animate = true, onSaved, notice, onLabelPhoto, shareFor, duplicateSheet }: {
  draft: ScanDraft; meal: MealSlot; setMeal: (m: MealSlot) => void; onBack?: () => void; onClose: () => void; animate?: boolean; onSaved: (f: Food) => void
  /** why the view opened this way (a photo that couldn't be read) */
  notice?: string
  /** "Photo of the label": read the numbers from the user's own pack instead */
  onLabelPhoto?: () => void
  /** "Share this product" from this saved food (sp-9): Share in place of Save */
  shareFor?: Food
  /** N5's dup-1 / dup-2 sheet for the open duplicate question (the web's `dup.sheet`); required, so a save never waits on a question nobody shows */
  duplicateSheet: (ask: DuplicateAsk, answer: (a: DuplicateAnswer) => void, dismiss: () => void) => ReactNode
}) {
  const t = useTokens()
  const queueSharedProduct = useStore((s) => s.queueSharedProduct)
  const setShareProducts = useStore((s) => s.setShareProducts)
  // the same barcode, or a food that looks like a saved one, asks first (boards dup-1, dup-2). A
  // share agreed for this read is queued only once a food is really saved or chosen
  const pendingShare = useRef(false)
  const markFoodShared = useStore((s) => s.markFoodShared)
  const dup = useDuplicateSave((f) => {
    const queued = pendingShare.current && !!draft.share && queueSharedProduct(draft.share)
    pendingShare.current = false
    // the food this read was saved as (new, kept or updated) has now been shared: its row goes
    onSaved(queued && f.id ? markFoodShared(f.id) ?? f : f)
  }, 'scan')
  const info = draft.label
  const shared = draft.shared
  const shareSavedFood = useStore((s) => s.shareSavedFood)
  const [optIn, setOptIn] = useState<Omit<Food, 'id'> | null>(null)
  const [shareAsk, setShareAsk] = useState(false)
  const [reporting, setReporting] = useState(false)
  const [kind, setKind] = useState<FoodKind>(draft.kind)
  const [ml, setMl] = useState(draft.ml)
  const [showUnit, setShowUnit] = useState(draft.liquid || draft.ml)
  const [name, setName] = useState(draft.name)
  const [serving, setServing] = useState(draft.serving[draft.kind] != null ? String(draft.serving[draft.kind]) : '')
  const [servingTouched, setServingTouched] = useState(false)
  const [text, setText] = useState<Record<LabelField, string>>(() => {
    const x = {} as Record<LabelField, string>
    for (const { f } of ROWS) x[f] = toText(draft.values[f])
    return x
  })
  // the label's own per-serving column, as read (changed only by accepting a suggestion)
  const [servText, setServText] = useState<Partial<Record<LabelField, string>>>(() => ({ ...(info?.texts.serving || {}) }))
  const [sugg, setSugg] = useState(info?.suggestion ?? null)
  // alcohol only when the product lists it; everything else always, so a gap can be filled in
  const rows = ROWS.filter(({ f }) => f !== 'alcohol' || draft.values.alcohol !== undefined)

  const values: LabelValues = {}
  for (const f of Object.keys(text) as LabelField[]) {
    const n = parseFloat(text[f].replace(',', '.'))
    if (text[f].trim() !== '' && Number.isFinite(n)) values[f] = n
  }
  const unit = ml ? 'ml' : 'g'
  const g = parseFloat(serving.replace(',', '.')) || 0
  const untouched = (f: LabelField) => text[f] === toText(draft.values[f])
  // kJ worked out from kcal when it isn't there (a shared product keeps no kJ): shown, never saved
  const kjShown = values.kj === undefined && values.k !== undefined ? kjFromKcal(values.k) : undefined

  // label photo: the misread checks, re-run on the panel as it stands now (an untouched field
  // keeps the text as read, so "<0.5g" or a flagged unit stays visible until it's edited)
  let live: ReturnType<typeof labelIssues> | null = null
  if (info) {
    const per100: LabelTexts['per100'] = {}
    for (const { f } of ROWS) {
      const x = untouched(f) ? info.texts.per100[f] ?? text[f] : text[f]
      if (x) per100[f] = x
    }
    live = labelIssues({ ...info.texts, ml, servingG: g > 0 ? g : undefined, per100, serving: servText })
  }
  const labelHard = live ? live.issues.filter((i) => !i.soft) : []
  const lowConf = new Set((info?.lowConf || []).filter((c) => {
    const [f, col] = c.split(':') as [LabelField, string]
    return col === 'per100' ? untouched(f) : true
  }).map((c) => c.split(':')[0] as LabelField))
  const suggFor = (f: LabelField) => {
    if (!sugg) return null
    const [sf, col] = sugg.cell.split(':') as [LabelField, string]
    if (sf !== f) return null
    const still = col === 'per100' ? untouched(f) : col === 'serving' ? servText[f] === sugg.from : true
    return still ? sugg : null
  }

  // product-level notes mark calories until they're edited, the serving until it's typed
  const kUnchanged = values.k === draft.values.k
  const productNotes = draft.notes.filter((n) => (n.field === 'serving' ? !servingTouched : kUnchanged))
  const checked = checkLabel(values, { ml, name, usLabel: draft.usLabel, serving: g })
  // a label photo's own checks replace the general ones (they're stricter and name the cell)
  const problems = [...(info ? checked.filter((p) => p.kind === 'missing') : checked), ...productNotes]
  const missing = problems.some((p) => p.kind === 'missing')
  const odd = new Set<LabelField | 'name' | 'serving'>(problems.filter((p) => p.kind === 'odd').map((p) => p.field))
  const rowIssues = new Map<LabelField, LabelIssue[]>()
  for (const i of live?.issues || []) {
    for (const c of i.cells) {
      const f = c.split(':')[0] as LabelField
      odd.add(f)
      if (!rowIssues.get(f)?.includes(i)) rowIssues.set(f, [...(rowIssues.get(f) || []), i])
    }
  }
  for (const f of lowConf) odd.add(f)
  const notes = [...new Set([
    ...problems.filter((p) => p.kind === 'odd').map((p) => p.msg),
    ...(live?.issues || []).filter((i) => !oneRow(i)).map((i) => i.msg),
  ])]
  const vague = draft.vague && name === draft.name
  const allGood = !problems.length && !labelHard.length && !(live?.issues.length) && !lowConf.size

  const pickKind = (k: FoodKind) => {
    setKind(k)
    if (!servingTouched) setServing(draft.serving[k] != null ? String(draft.serving[k]) : '')
  }
  const commit = (def: Omit<Food, 'id'>, share: boolean) => {
    // queued on the device only, once saved; sent later, after a random delay (never on this save)
    pendingShare.current = share
    dup.save(def)
  }
  const confirmed = (): Omit<Food, 'id'> => {
    // the pack's per-serving line, when it agrees and the saved serving is the printed one (a
    // whole number, since saved servings are whole grams)
    const printed = info ? parseServing(info.texts.servingText) : undefined
    const ref = live && Number.isInteger(g) ? servingRef(live, printed, g) : undefined
    // a shared product saved with its figures unchanged keeps its tier's source and margin
    const sharedSrc = shared && sameAsFound(shared, values, ml) ? `${TIER_SOURCE[shared.tier]}:${draft.barcode}` : undefined
    return foodFromConfirmed({ barcode: draft.barcode, name, values, ml, kind, meal: draft.meal, cat: draft.cat, g, source: draft.source === 'shared' ? 'label' : draft.source, ref, sharedSrc })
  }
  // sp-9: only a read that may join the list (shareEligible: signed, not in Open Food Facts, unchanged)
  const canShare = !!shareFor && !missing && SHARED_PRODUCTS_ENABLED && shareEligible(draft, { name, values, ml })
  const doShare = () => {
    if (!shareFor?.id || !draft.share) return
    const food = shareSavedFood(shareFor.id, confirmed(), draft.share)
    if (food) onSaved(food)
  }
  const share = () => {
    if (!canShare) return
    // not agreed yet (never asked, or a no): the sp-1 opt-in first, unchanged
    if (latestConsent(useStore.getState().data, 'shared-products')?.granted) doShare()
    else setShareAsk(true)
  }
  const answerShareAsk = (yes: boolean) => {
    setShareAsk(false)
    // a no is recorded once (as at a first save); an earlier no isn't recorded again
    if (yes || !latestConsent(useStore.getState().data, 'shared-products')) setShareProducts(yes)
    if (yes) doShare()
  }
  const save = () => {
    if (missing) return
    const def = confirmed()
    const shareable = SHARED_PRODUCTS_ENABLED && shareEligible(draft, { name, values, ml })
    const decision = shareDecision(shareable, latestConsent(useStore.getState().data, 'shared-products'))
    // the first time a product could be shared: ask once (sp-1), then save either way
    if (decision === 'ask') { setOptIn(def); return }
    commit(def, decision === 'share')
  }
  const answerOptIn = (yes: boolean) => {
    const def = optIn
    setOptIn(null)
    setShareProducts(yes)
    if (def) commit(def, yes)
  }
  const accept = () => {
    if (!sugg) return
    const [f, col] = sugg.cell.split(':') as [LabelField, string]
    if (col === 'per100') setText({ ...text, [f]: String(sugg.value) })
    else if (col === 'serving') setServText({ ...servText, [f]: sugg.to })
    setSugg(null)
  }

  const servings = draft.pack && g > 0 ? Math.round((draft.pack / g) * 10) / 10 : null
  const gText = g > 0 ? `${round(g, 1)} ${unit}` : ''
  const fromLabel = draft.source === 'label'

  return (
    <>
    <Sheet title={CONFIRM.title} onClose={onClose} animate={animate} left={onBack ? <BackButton onPress={onBack} /> : undefined}
      right={shareFor
        ? <NavBtn bold title={SHARE_CHECK.share} onPress={share} disabled={!canShare} />
        : <NavBtn bold title={CONFIRM.save} onPress={save} disabled={missing} />}>
      {notice ? <Note status style={{ marginTop: 0, marginBottom: 12 }}>{notice}</Note> : null}
      {shared ? (
        <SharedSourceCard info={shared} barcode={draft.barcode} onReport={() => setReporting(true)} />
      ) : (
        <View style={{ paddingHorizontal: 4, paddingBottom: 12 }}>
          <Sub>{fromLabel ? CONFIRM.fromLabel : CONFIRM.fromOff}</Sub>
          {(draft.barcode || draft.kcalFromKj) ? <Text style={[tx(13), num, { color: t.label2, marginTop: 2 }]}>{draft.barcode ? `Barcode ${draft.barcode}` : ''}{draft.kcalFromKj ? CONFIRM.kcalFromKj : ''}</Text> : null}
        </View>
      )}
      {onLabelPhoto && (
        <View style={{ gap: 8, marginTop: shared ? 12 : 0, marginBottom: 12 }}>
          <LabelPhotoButton onPress={onLabelPhoto} />
          {!fromLabel && <Foot style={{ paddingHorizontal: 0, paddingTop: 0 }}>{CONFIRM.photoInstead}</Foot>}
        </View>
      )}
      <Seg<FoodKind> options={[['cook', CONFIRM.cook], ['eat', CONFIRM.eat]]} value={kind} onChange={pickKind} />
      <Foot>{kind === 'eat' ? CONFIRM.eatNote : CONFIRM.cookNote}</Foot>

      <List style={{ marginTop: 12 }}>
        <FRow label={CONFIRM.name} value={name} onChangeText={setName} placeholder={CONFIRM.needed} need={!name.trim()}
          flag={vague ? CONFIRM.addFlavour : undefined} autoFocus={!!draft.vague} />
        <FRow label={CONFIRM.serving} value={serving} onChangeText={(v) => { setServing(v); setServingTouched(true) }} unit={unit} placeholder={CONFIRM.servingPh}
          need={!(g > 0)} keyboardType="decimal-pad"
          flag={odd.has('serving') ? (productNotes.some((n) => n.msg === SERVING_NEEDED) ? CONFIRM.servingNeeded : CONFIRM.servingCheck) : undefined} />
      </List>
      {fromLabel && !name.trim() && <Foot>{NAME_HINT}</Foot>}
      {shared && <SharedServing info={shared} kcal={values.k !== undefined && g > 0 ? (values.k * g) / 100 : 0} />}
      {draft.pack ? <Foot style={num}>Pack: {draft.pack} {unit}{servings ? ` · ${servings} serving${servings === 1 ? '' : 's'}` : ''}</Foot> : null}

      {shareFor ? null : showUnit ? (
        <View style={{ marginTop: 12 }}>
          <Seg<'g' | 'ml'> options={[['g', 'Per 100 g'], ['ml', 'Per 100 ml']]} value={unit} onChange={(u) => setMl(u === 'ml')} />
        </View>
      ) : (
        <View style={{ paddingTop: 7, paddingHorizontal: 16, alignItems: 'flex-start' }}>
          <Text accessibilityRole="button" onPress={() => setShowUnit(true)} style={[tx(13, 400, 1.3, BTN), { color: t.tint, paddingVertical: 4 }]}>{CONFIRM.per100ml}</Text>
        </View>
      )}

      {(draft.usLabel || draft.staleYear) ? (
        <Foot>{draft.usLabel ? CONFIRM.usLabel : ''}{draft.staleYear ? CONFIRM.stale(draft.staleYear) : ''}</Foot>
      ) : null}
      <Lbl>{CONFIRM.nutrition}</Lbl>
      <NutritionTable per100={`Per 100 ${unit}`} perServing={`${CONFIRM.perServing}${gText ? ` (${gText})` : ''}`} label="Nutrition per 100 and per serving">
        {rows.map(({ f, label, unit: u, sub, dp }) => {
          const need = REQUIRED.includes(f) && values[f] === undefined
          const v = values[f]
          // a label photo shows the label's own per-serving figure; otherwise it's worked out
          const read = info ? parseCell(servText[f], f, 'serving') : undefined
          const per = read?.value !== undefined
            ? (read.mark === 'lt' ? '<' + round(read.raw!, Math.max(read.dp - 1, 0)) : round(read.value, Math.max(read.dp, 0)))
            : f === 'alcohol' ? (v !== undefined ? round(v, 1) : '')
            : f === 'kj' && v === undefined && kjShown !== undefined && g > 0 ? round((kjShown * g) / 100, dp)
            : v !== undefined && g > 0 ? round((v * g) / 100, dp) : ''
          const s = suggFor(f)
          const own = (rowIssues.get(f) || []).find(oneRow)
          const note = s ? (
            // the web's `.flagnote .btn.sm { margin-left: 8px }`, wrapping under the sentence
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }}>
              <FlagNote>{CONFIRM.didYouMean} <Text style={[tx(13, 700), num]}>{s.display}</Text>{s.cell === cellId(f, 'serving') ? CONFIRM.perServingSuffix : ''}? {s.because}</FlagNote>
              <Btn small kind="tinted" title={CONFIRM.accept} label={`Use ${s.display}`} onPress={accept} style={{ marginLeft: 8 }} />
            </View>
          ) : own ? <FlagNote>{own.msg}</FlagNote>
            : odd.has(f) ? <FlagNote>{lowConf.has(f) && !rowIssues.has(f) ? CONFIRM.hard : CONFIRM.second}</FlagNote>
            : null
          return (
            <NutritionRow key={f} label={label} unit={u} sub={sub} value={text[f]} onChange={(x) => setText({ ...text, [f]: x })}
              placeholder={need ? CONFIRM.needed : f === 'kj' && kjShown !== undefined ? String(kjShown) : ''} perServing={per}
              flag={odd.has(f)} need={need} note={note} inputLabel={`${label}${u ? ' ' + u : ''}, per 100 ${unit}`} />
          )
        })}
      </NutritionTable>
      <Foot>{CONFIRM.grams(unit)}</Foot>
      {info && info.marks.length > 0 && <Foot>{info.marks.join(' ')}</Foot>}

      {notes.length > 0 && <View>{notes.map((m) => <Note key={m} status>{m}</Note>)}</View>}
      {allGood && !shareFor && <Note kind="ok" status>{CONFIRM.consistent}</Note>}
      {shareFor ? (
        <>
          <View style={{ marginTop: 16 }}><Btn title={SHARE_CHECK.button} onPress={share} disabled={!canShare} /></View>
          <Foot>{SHARE_CHECK.what}</Foot>
          <Foot>{SHARE_CHECK.saved(shareFor.n)}</Foot>
        </>
      ) : (
        <>
          <View style={{ marginTop: 16 }}><Btn title={missing ? CONFIRM.fillMarked : CONFIRM.saveFood} onPress={save} disabled={missing} /></View>
          <Foot>{CONFIRM.savedFoods(!!draft.barcode)}</Foot>
        </>
      )}
    </Sheet>
    {dup.ask ? duplicateSheet(dup.ask, dup.answer, dup.dismiss) : null}
    {optIn && <ShareOptInSheet onAnswer={answerOptIn} />}
    {shareAsk && <ShareOptInSheet onAnswer={answerShareAsk} />}
    {reporting && shared && <ReportProductSheet name={draft.baseName} barcode={draft.barcode} version={shared.version} onClose={() => setReporting(false)} />}
    </>
  )
}
