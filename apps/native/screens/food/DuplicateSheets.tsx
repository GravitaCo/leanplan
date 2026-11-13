/**
 * The duplicate-food questions (src/screens/food/DuplicateViews.tsx, boards dup-1 and dup-2, approved
 * by Benn): the same barcode asks to update the saved food; a likely match shows both side by side.
 * Words and figures from duplicateModel and src/copy/food; the open question from useDuplicateSave.
 */
import { useState, type ReactNode } from 'react'
import { Text, View } from 'react-native'
import { useStore } from '@/store/store'
import type { Food } from '@/core/types'
import { barcodeUpdate, likelySame, sameFood } from '@/screens/food/duplicateModel'
import { DUP } from '@/copy/food'
import { Btn, Card, List } from '../../lib/ui/kit'
import { BackButton, BareSheet, Row, Sheet, Toggle } from '../../lib/ui/primitives'
import { Check } from '../../lib/ui/choices'
import { Icon, type IconName } from '../../lib/ui/icons'
import { Foot, Lbl } from '../../lib/ui/text'
import { num, tx, useTokens } from '../../lib/theme'
import type { DuplicateAnswer, DuplicateAsk } from './useDuplicateSave'

export function DuplicateSheets({ ask, answer, dismiss }: { ask: DuplicateAsk | null; answer: (a: DuplicateAnswer) => void; dismiss: () => void }) {
  if (ask?.kind === 'barcode') return <BarcodeUpdateSheet ask={ask} answer={answer} dismiss={dismiss} />
  if (ask?.kind === 'like') return <LikelySameSheet ask={ask} answer={answer} dismiss={dismiss} />
  return null
}

/** `.dup-hd` (Food-only): the 52 pt soft icon square, the 22 pt title and its lead line. */
function DupHead({ icon, title, lead }: { icon: IconName; title: string; lead: string }) {
  const t = useTokens()
  return (
    <View style={{ paddingHorizontal: 4 }}>
      <View style={{ width: 52, height: 52, borderRadius: 16, backgroundColor: t.tintSoft, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name={icon} size={22} stroke={1.8} color={t.tint} />
      </View>
      <Text accessibilityRole="header" style={[tx(22, 600, 28, -0.02), { color: t.label, marginTop: 16 }]}>{title}</Text>
      <Text style={[tx(17, 400, 1.45), { color: t.label2, marginTop: 8 }]}>{lead}</Text>
    </View>
  )
}

/** dup-1: same barcode = same food. Only what changes, old → new; the rest summed up in one row. */
function BarcodeUpdateSheet({ ask, answer, dismiss }: { ask: DuplicateAsk; answer: (a: DuplicateAnswer) => void; dismiss: () => void }) {
  const t = useTokens()
  const customFoods = useStore((s) => s.data.customFoods)
  const v = barcodeUpdate(customFoods || [], ask.saved, ask.next)
  const small = (s: string) => <Text style={[tx(13), { color: t.label2 }]}>{s}</Text>
  return (
    <BareSheet label={v.title} onClose={dismiss}>
      <DupHead icon="refresh" title={v.title} lead={DUP.barcodeLead} />
      <Lbl>{DUP.changes(v.per)}</Lbl>
      <List style={{ marginBottom: 8 }}>
        {v.name && (
          <View style={{ paddingVertical: 10, paddingHorizontal: 16 }}>
            {small(DUP.name)}
            <Text style={[tx(15), { color: t.label2, marginTop: 3 }]}>{small(DUP.was)} {v.name[0]}</Text>
            <Text style={[tx(17), { color: t.label, marginTop: 2 }]}>{small(DUP.now)} {v.name[1]}</Text>
          </View>
        )}
        {v.figures.map(({ field, label, was, now }) => (
          <Row key={field} title={label} right={
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Text style={[tx(17), num, { color: t.label2 }]}>{was}</Text>
              <Text accessibilityLabel={DUP.changesTo} style={[tx(15), { color: t.label2 }]}>→</Text>
              <Text style={[tx(17, 600), num, { color: t.label }]}>{now}</Text>
            </View>
          } />
        ))}
        {v.same ? <Row title={v.same} right={<Text style={[tx(15), { color: t.label2 }]}>{DUP.noChange}</Text>} /> : null}
      </List>
      <Foot>{DUP.followFoot}</Foot>
      <View style={{ gap: 8, marginTop: 20 }}>
        <Btn title={DUP.updateIt} onPress={() => answer('update')} />
        <Btn kind="gray" title={DUP.keepMine} onPress={() => answer('keep')} />
      </View>
    </BareSheet>
  )
}

/** dup-2: likely the same food, no barcode match. Both side by side. */
function LikelySameSheet({ ask, answer, dismiss }: { ask: DuplicateAsk; answer: (a: DuplicateAnswer) => void; dismiss: () => void }) {
  const t = useTokens()
  const v = likelySame(ask.saved, ask.next, ask.from)
  // `.dup-row`: a label, then two 92 pt right-aligned columns, 10 apart
  const tableRow = (key: string, a: ReactNode, b: ReactNode, c: ReactNode, head?: boolean) => (
    <View key={key} accessibilityRole={head ? 'header' : undefined} style={{ flexDirection: 'row', alignItems: 'center', columnGap: 10, minHeight: head ? 36 : 44, borderTopWidth: head ? 0 : 1, borderTopColor: t.sep }}>
      <View style={{ flex: 1, minWidth: 0 }}>{a}</View>
      <View style={{ width: 92, alignItems: 'flex-end' }}>{b}</View>
      <View style={{ width: 92, alignItems: 'flex-end' }}>{c}</View>
    </View>
  )
  const th = (s: string) => <Text style={[tx(13), { color: t.label2 }]}>{s}</Text>
  return (
    <BareSheet label={v.title} onClose={dismiss}>
      <DupHead icon="copy" title={v.title} lead={v.lead} />
      <List style={{ marginTop: 18, marginBottom: 8 }}>
        <Row k={DUP.yours} title={ask.saved.n} />
        <Row k={v.theirs} title={ask.next.n} />
      </List>
      <View accessibilityLabel={DUP.tableLabel(v.theirs, v.per)}>
        <List style={{ paddingHorizontal: 16, marginBottom: 8 }}>
          {tableRow('h', th(v.per.replace(/^per/, 'Per')), th(DUP.yours), th(v.theirs), true)}
          {v.rows.map((r) => tableRow(r.label,
            <Text style={[tx(17), { color: t.label }]}>{r.label}</Text>,
            <Text style={[tx(17), num, { color: t.label2 }]}>{r.yours}</Text>,
            <Text style={[tx(17, r.differs ? 600 : 400), num, { color: t.label }]}>{r.theirs}</Text>))}
        </List>
      </View>
      <View style={{ gap: 8, marginTop: 12 }}>
        <Btn title={DUP.keepYours} onPress={() => answer('keep')} />
        <Btn kind="gray" title={DUP.useTheirs(v.theirs)} onPress={() => answer('use-theirs')} />
        <Btn kind="link" title={DUP.saveAsNew} onPress={() => answer('save-new')} style={{ marginTop: -4 }} />
      </View>
      <Foot style={{ paddingTop: 2 }}>{DUP.keepsName(v.theirs)}</Foot>
    </BareSheet>
  )
}

/** dup-4: pick the one to keep. A pushed view in the Add food sheet. */
export function SameFoodView({ pair, onBack, onClose, animate, cur }: { pair: [Food, Food]; onBack: () => void; onClose: () => void; animate: boolean; cur: string }) {
  const t = useTokens()
  const data = useStore((s) => s.data)
  const merge = useStore((s) => s.mergeCustomFoods)
  const different = useStore((s) => s.markFoodsDifferent)
  const sf = sameFood(data, cur, pair)
  // the one with more logs is kept by default (the first on a tie)
  const [keepIdx, setKeepIdx] = useState(sf.defaultKeep)
  // off by default (Benn, 11 Oct 2026): both barcodes may be real, e.g. a multipack
  const [takeBarcode, setTakeBarcode] = useState(false)
  const { keep, drop, what, switchable, offBarcode } = sf.outcome(keepIdx)
  const done = (fn: () => void) => { fn(); onBack() }
  return (
    <Sheet title={DUP.sameTitle} tall onClose={onClose} animate={animate} left={<BackButton onPress={onBack} />}>
      <Text accessibilityRole="header" style={[tx(22, 600, 28, -0.02), { color: t.label, paddingTop: 12, paddingHorizontal: 4 }]}>{DUP.pick}</Text>
      <Text style={[tx(17, 400, 1.45), { color: t.label2, marginTop: 6, paddingHorizontal: 4 }]}>{DUP.pickLead}</Text>
      <View accessibilityRole="radiogroup" accessibilityLabel={DUP.foodToKeep} style={{ marginTop: 18 }}>
        <List style={{ marginBottom: 8 }}>
          {sf.rows.map(({ food: f, figures, origin, logged }, i) => (
            // TODO(N1-followup): `.dup-radio` (24 pt, 2 pt --fill3 ring; on: --tint with a 13/3.2 tick); Check is the 26 pt `.chk`
            // `.li.dup-opt`: top-aligned, padding 13 16, at least 52 tall
            <Row key={f.id} title={f.n} wrap onPress={() => setKeepIdx(i)} chevron={false} lead={<Check on={keepIdx === i} />} style={{ alignItems: 'flex-start', paddingVertical: 13, minHeight: 52 }}
              sub={<>{figures}</>} sub2={<>{origin ? <>{origin}{'\n'}</> : null}{logged}</>} />
          ))}
        </List>
      </View>
      <Lbl>{DUP.whatHappens}</Lbl>
      {/* `.dup-what`: radius-sm, padding 12 16, 15 pt at 1.45, no margin */}
      <Card plain style={{ borderRadius: t.radiusSm, paddingVertical: 12 }}><Text style={[tx(15, 400, 1.45), { color: t.label }]}>{what}</Text></Card>
      {switchable && (
        <>
          {/* `.dup-switch`: 8 above, none below */}
          <List style={{ marginTop: 8 }}>
            <Row title={DUP.otherBarcode} right={<Toggle on={takeBarcode} onChange={() => setTakeBarcode(!takeBarcode)} label={DUP.otherBarcode} />} />
          </List>
          {offBarcode && <Foot>{DUP.offBarcode}</Foot>}
        </>
      )}
      {/* TODO(N1-followup): the web's `.dup-grow` spacer puts these at the foot of the tall sheet; N1's Sheet content doesn't grow */}
      <View style={{ gap: 8, marginTop: 16 }}>
        <Btn title={DUP.keepThis} onPress={() => done(() => merge(keep.id!, drop.id!, switchable && takeBarcode))} />
        <Btn kind="gray" title={DUP.different} onPress={() => done(() => different(pair[0].id!, pair[1].id!))} />
      </View>
    </Sheet>
  )
}
