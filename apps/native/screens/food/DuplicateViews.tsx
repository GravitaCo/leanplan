/**
 * Duplicate saved foods (src/screens/food/DuplicateViews.tsx; Design canvas boards dup-1 to dup-4,
 * approved by Benn).
 *
 * - dup-1: saving a product whose barcode is already saved asks to update that food instead.
 * - dup-2: saving a food that looks like a saved one shows both side by side.
 * - dup-3: My foods carries one quiet row while two saved foods look the same.
 * - dup-4: that row opens "Same food?": pick the one to keep; the other's logs move to it.
 */
import { useState, type ReactNode } from 'react'
import { Pressable, View } from 'react-native'
import { useStore } from '@/store/store'
import type { Food, MealSlot } from '@/core/types'
import { foodChanges, hasChanges, likelySaved, nameAfterUpdate, savedWithBarcode, timesLogged, type ChangeField } from '@/core/domain/duplicates'
import { uniqueName } from '@/core/domain/barcode'
import { MEAL_LABEL, usuals } from '@/core/domain/insights'
import { r1 } from '@/core/domain/date'
import { useTokens } from '../../lib/theme'
import { BackButton, BareSheet, Button, Card, Chevron, FIcon, Foot, Lbl, Li, List, RowText, Sheet, Toggle, Txt, type FIconName } from './ui'

/** Where the food being saved came from: a barcode or label scan, or typed in. */
export type NewFrom = 'scan' | 'typed'

const per = (f: Pick<Food, 'ml' | 'each'>) => (f.each ? 'per item' : `per 100 ${f.ml ? 'ml' : 'g'}`)
const unitOf = (f: Pick<Food, 'ml' | 'each'>) => (f.each ? '' : f.ml ? ' ml' : ' g')
const ends = (code?: string) => (code ? '…' + code.slice(-4) : '—')
const FIELD: Record<ChangeField, string> = { k: 'Energy (kcal)', g: 'Serving', p: 'Protein', f: 'Fat', c: 'Carbs' }

/**
 * Save a food through the duplicate checks: the same barcode asks to update (dup-1), a likely
 * match shows both (dup-2), anything else saves. `sheet` renders the open question, if any.
 */
export function useDuplicateSave(onSaved: (f: Food) => void, from: NewFrom) {
  const customFoods = useStore((s) => s.data.customFoods)
  const saveCustomFood = useStore((s) => s.saveCustomFood)
  const [ask, setAsk] = useState<{ kind: 'barcode' | 'like'; saved: Food; next: Omit<Food, 'id'> } | null>(null)

  const save = (next: Omit<Food, 'id'>) => {
    const foods = customFoods || []
    const same = savedWithBarcode(foods, next.barcode)
    if (same) {
      // nothing would change: it's the saved food, opened as it is
      if (!hasChanges(foodChanges(same, { ...next, n: nameAfterUpdate(foods, same, next) }))) { onSaved(same); return }
      setAsk({ kind: 'barcode', saved: same, next }); return
    }
    const like = likelySaved(foods, next as Food)
    if (like) { setAsk({ kind: 'like', saved: like, next }); return }
    onSaved(saveCustomFood(next))
  }
  const done = (f: Food | null) => { setAsk(null); if (f) onSaved(f) }

  let sheet: ReactNode = null
  if (ask?.kind === 'barcode') sheet = <BarcodeUpdateSheet saved={ask.saved} next={ask.next} onClose={() => setAsk(null)} onDone={done} />
  if (ask?.kind === 'like') sheet = <LikelySameSheet saved={ask.saved} next={ask.next} from={from} onClose={() => setAsk(null)} onDone={done} />
  return { save, sheet }
}

/** `.dup-hd`: the soft icon square, the 22 pt title and its lead line */
function DupHead({ icon, title, lead }: { icon: FIconName; title: string; lead: string }) {
  const t = useTokens()
  return (
    <View style={{ paddingHorizontal: 4 }}>
      <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: t.tintSoft, alignItems: 'center', justifyContent: 'center' }}>
        <FIcon name={icon} size={22} stroke={1.8} color={t.tint} />
      </View>
      <Txt accessibilityRole="header" size={22} w={600} style={{ marginTop: 16, lineHeight: 28, letterSpacing: -0.44 }}>{title}</Txt>
      <Txt color={t.label2} style={{ marginTop: 8, lineHeight: 25 }}>{lead}</Txt>
    </View>
  )
}

/** dup-1: same barcode = same food. Only what changes, old → new; the rest summed up in one row. */
function BarcodeUpdateSheet({ saved, next, onClose, onDone }: { saved: Food; next: Omit<Food, 'id'>; onClose: () => void; onDone: (f: Food | null) => void }) {
  const t = useTokens()
  const update = useStore((s) => s.updateCustomFood)
  const customFoods = useStore((s) => s.data.customFoods)
  // the name it will really have: a name another saved food holds isn't taken
  const ch = foodChanges(saved, { ...next, n: nameAfterUpdate(customFoods || [], saved, next) })
  const title = `Update your saved ${saved.n}?`
  const val = (field: ChangeField, v: number) => (field === 'g' ? `${r1(v)}${unitOf(next)}` : field === 'k' ? String(Math.round(v)) : String(r1(v)))
  const same = ch.same.map((f, i) => (i === 0 ? FIELD[f].replace(' (kcal)', '') : FIELD[f].replace(' (kcal)', '').toLowerCase())).join(', ')
  return (
    <BareSheet label={title} onClose={onClose}>
      <DupHead icon="refresh" title={title} lead="You’ve saved this barcode before. This is what would change." />
      <Lbl>Changes, {per(next)}</Lbl>
      <List>
        {ch.name && (
          <Li>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Txt size={13} color={t.label2}>Name</Txt>
              <Txt size={15} color={t.label2} style={{ marginTop: 3 }}><Txt size={13} color={t.label2}>Was</Txt> {ch.name[0]}</Txt>
              <Txt style={{ marginTop: 2 }}><Txt size={13} color={t.label2}>Now</Txt> {ch.name[1]}</Txt>
            </View>
          </Li>
        )}
        {ch.figures.map(({ field, was, now }) => (
          <Li key={field}>
            <Txt style={{ flex: 1 }}>{FIELD[field]}</Txt>
            <Txt n color={t.label2}>{val(field, was)}</Txt>
            <Txt size={15} color={t.label2} accessibilityLabel="changes to">→</Txt>
            <Txt n w={600}>{val(field, now)}</Txt>
          </Li>
        ))}
        {same ? (
          <Li>
            <Txt size={15} color={t.label2} style={{ flex: 1 }}>{same}</Txt>
            <Txt size={15} color={t.label2}>No change</Txt>
          </Li>
        ) : null}
      </List>
      <Foot>Your logs and usuals follow the food. Days you’ve already logged keep their numbers.</Foot>
      <View style={{ gap: 8, marginTop: 20 }}>
        <Button title="Update it" onPress={() => onDone(update(saved.id!, next))} />
        <Button kind="gray" title="Keep mine" onPress={() => onDone(saved)} />
      </View>
    </BareSheet>
  )
}

/** dup-2: likely the same food, no barcode match. Both side by side. */
function LikelySameSheet({ saved, next, from, onClose, onDone }: { saved: Food; next: Omit<Food, 'id'>; from: NewFrom; onClose: () => void; onDone: (f: Food | null) => void }) {
  const t = useTokens()
  const update = useStore((s) => s.updateCustomFood)
  const saveCustomFood = useStore((s) => s.saveCustomFood)
  const customFoods = useStore((s) => s.data.customFoods)
  // a scan (barcode or label photo) reads as "Scanned"; a typed food as "New"
  const theirs = from === 'scan' ? 'Scanned' : 'New'
  const title = `Looks like your saved ${saved.n}.`
  const barcodes = !!(saved.barcode || next.barcode)
  const cell = (a: string, b: string) => [a, b, a !== b] as const
  const rows: [string, readonly [string, string, boolean]][] = [
    ['Energy (kcal)', cell(String(Math.round(saved.k)), String(Math.round(next.k)))],
    ['Protein', cell(String(r1(saved.p)), String(r1(next.p)))],
    ['Serving', cell(`${r1(saved.g)}${unitOf(saved)}`, `${r1(next.g)}${unitOf(next)}`)],
    ...(barcodes ? [['Barcode ends', cell(ends(saved.barcode), ends(next.barcode))] as [string, readonly [string, string, boolean]]] : []),
  ]
  const asNew = () => {
    const n = uniqueName(next.n.trim(), (customFoods || []).map((f) => f.n))
    onDone(saveCustomFood({ ...next, n }))
  }
  const nameRow = (k: string, n: string) => (
    <Li><View style={{ flex: 1, minWidth: 0 }}><Txt size={13} color={t.label2}>{k}</Txt><Txt style={{ marginTop: 2 }}>{n}</Txt></View></Li>
  )
  const grid = (a: ReactNode, b: ReactNode, c: ReactNode, head?: boolean, key?: string) => (
    <View key={key} style={{ flexDirection: 'row', alignItems: 'center', columnGap: 10, minHeight: head ? 36 : 44, borderTopWidth: head ? 0 : 1, borderTopColor: t.sep }}>
      <View style={{ flex: 1, minWidth: 0 }}>{a}</View>
      <View style={{ width: 92, alignItems: 'flex-end' }}>{b}</View>
      <View style={{ width: 92, alignItems: 'flex-end' }}>{c}</View>
    </View>
  )
  return (
    <BareSheet label={title} onClose={onClose}>
      <DupHead icon="copy" title={title}
        lead={`The name and figures are very close.${from === 'scan' && next.barcode ? ' If a barcode was misread, using the scanned one fixes it.' : ''}`} />
      <List style={{ marginTop: 18 }}>
        {nameRow('Yours', saved.n)}
        {nameRow(theirs, next.n)}
      </List>
      <List style={{ paddingHorizontal: 16 }}>
        {grid(<Txt size={13} color={t.label2}>{per(saved).replace(/^per/, 'Per')}</Txt>, <Txt size={13} color={t.label2}>Yours</Txt>, <Txt size={13} color={t.label2}>{theirs}</Txt>, true, 'h')}
        {rows.map(([label, [a, b, diff]]) => grid(<Txt>{label}</Txt>, <Txt n color={t.label2}>{a}</Txt>, <Txt n w={diff ? 600 : 400}>{b}</Txt>, false, label))}
      </List>
      <View style={{ gap: 8, marginTop: 20 }}>
        <Button title="Keep yours" onPress={() => onDone(saved)} />
        <Button kind="gray" title={`Use the ${theirs.toLowerCase()} one`} onPress={() => onDone(update(saved.id!, next, true))} />
        <Button kind="link" title="Save as new" onPress={asNew} style={{ marginTop: -4 }} />
      </View>
      <Foot style={{ paddingTop: 2 }}>Using the {theirs.toLowerCase()} one keeps your name, so usuals and Same as yesterday still find it.</Foot>
    </BareSheet>
  )
}

/** dup-3: the quiet row in My foods, shown only while a likely pair exists. */
export function SameFoodsRow({ pair, onOpen }: { pair: [Food, Food]; onOpen: () => void }) {
  const t = useTokens()
  return (
    <Li onPress={onOpen} minHeight={60} style={{ paddingVertical: 8 }}>
      <View style={{ width: 30, height: 30, borderRadius: 8, backgroundColor: t.tintSoft, alignItems: 'center', justifyContent: 'center' }}>
        <FIcon name="copy" size={18} stroke={1.8} color={t.tint} />
      </View>
      <RowText title="2 foods look the same" sub={pair[0].n} />
      <Chevron />
    </Li>
  )
}

/** A food's origin line on the dup-4 rows: label photo or Open Food Facts, and its barcode. */
function originLine(f: Food): string {
  const from = f.src === 'label' ? 'From your label photo' : f.src?.startsWith('off:') ? 'From Open Food Facts' : ''
  if (!f.barcode) return from
  return from ? `${from} · barcode ${ends(f.barcode)}` : `Barcode ${ends(f.barcode)}`
}

/** dup-4: pick the one to keep. A pushed view in the Add food sheet. */
export function SameFoodView({ pair, onBack, onClose, animate, cur }: { pair: [Food, Food]; onBack: () => void; onClose: () => void; animate: boolean; cur: string }) {
  const t = useTokens()
  const data = useStore((s) => s.data)
  const merge = useStore((s) => s.mergeCustomFoods)
  const different = useStore((s) => s.markFoodsDifferent)
  const logs = pair.map((f) => timesLogged(data.days, f))
  // the one with more logs is kept by default (the first on a tie)
  const [keepIdx, setKeepIdx] = useState(logs[1] > logs[0] ? 1 : 0)
  // off by default (Benn, 11 Oct 2026): both barcodes may be real, e.g. a multipack
  const [takeBarcode, setTakeBarcode] = useState(false)
  const keep = pair[keepIdx], drop = pair[1 - keepIdx]
  const usualMeal = (f: Food): MealSlot | undefined => (['breakfast', 'lunch', 'dinner', 'snack'] as MealSlot[]).find((m) => usuals(data, cur, m).some((u) => u.n === f.n))
  const usualText = (m: MealSlot) => `your usual ${MEAL_LABEL[m].toLowerCase()}`
  const n = logs[1 - keepIdx]
  const dropUsual = usualMeal(drop)
  const what = n > 0
    ? `The ${n} log${n === 1 ? '' : 's'} of ${drop.n} move${n === 1 ? 's' : ''} to ${keep.n}. ${n === 1 ? 'Its calories stay' : 'Their calories stay'} as logged.${dropUsual ? ` ${usualText(dropUsual).replace(/^y/, 'Y')} keeps working.` : ''}`
    : `${drop.n} has no logs to move.`
  const switchable = !!drop.barcode && drop.barcode !== keep.barcode
  const done = (fn: () => void) => { fn(); onBack() }
  const sub = (s: string) => <Txt size={13} n color={t.label2} style={{ marginTop: 2 }}>{s}</Txt>
  return (
    <Sheet title="Same food?" tall onClose={onClose} animate={animate} left={<BackButton onPress={onBack} />}>
      <View style={{ flex: 1 }}>
        <Txt accessibilityRole="header" size={22} w={600} style={{ paddingTop: 12, paddingHorizontal: 4, lineHeight: 28, letterSpacing: -0.44 }}>Pick the one to keep</Txt>
        <Txt color={t.label2} style={{ marginTop: 6, paddingHorizontal: 4, lineHeight: 25 }}>Anything you’ve logged with the other one moves to the one you keep.</Txt>
        <View accessibilityRole="radiogroup" accessibilityLabel="Food to keep" style={{ marginTop: 18 }}>
          <List>
            {pair.map((f, i) => {
              const m = usualMeal(f)
              const origin = originLine(f)
              const on = keepIdx === i
              return (
                <Pressable key={f.id} accessibilityRole="radio" accessibilityState={{ checked: on }} accessibilityLabel={f.n} onPress={() => setKeepIdx(i)}
                  style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 13, paddingHorizontal: 16, minHeight: 52 }}>
                  <View style={[{ width: 24, height: 24, borderRadius: 12, marginTop: 2, alignItems: 'center', justifyContent: 'center' },
                    on ? { backgroundColor: t.tint } : { borderWidth: 2, borderColor: t.fill3 }]}>
                    {on && <FIcon name="check" size={13} stroke={3.2} color={t.onTint} />}
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Txt>{f.n}</Txt>
                    {sub(`${Math.round(f.k)} kcal · ${r1(f.p)} g protein ${per(f)}${f.each ? '' : ` · ${r1(f.g)}${unitOf(f)} serving`}`)}
                    {origin ? sub(origin) : null}
                    {sub(`Logged ${logs[i]} time${logs[i] === 1 ? '' : 's'}${m ? ` · in ${usualText(m)}` : ''}`)}
                  </View>
                </Pressable>
              )
            })}
          </List>
        </View>
        <Lbl>What happens</Lbl>
        <Card><Txt>{what}</Txt></Card>
        {switchable && (
          <>
            <List>
              <Li>
                <Txt style={{ flex: 1 }}>Use the other barcode</Txt>
                <Toggle on={takeBarcode} onChange={() => setTakeBarcode(!takeBarcode)} label="Use the other barcode" />
              </Li>
            </List>
            {drop.src?.startsWith('off:') && <Foot>Its barcode came from Open Food Facts, so scanning the pack finds this food.</Foot>}
          </>
        )}
        <View style={{ flex: 1 }} />
        <View style={{ gap: 8, marginTop: 20 }}>
          <Button title="Keep this one" onPress={() => done(() => merge(keep.id!, drop.id!, switchable && takeBarcode))} />
          <Button kind="gray" title="They’re different" onPress={() => done(() => different(pair[0].id!, pair[1].id!))} />
        </View>
      </View>
    </Sheet>
  )
}
