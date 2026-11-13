/**
 * The duplicate-food questions (src/screens/food/DuplicateViews.tsx, boards dup-1 and dup-2, approved
 * by Benn): the same barcode asks to update the saved food; a likely match shows both side by side.
 * Words and figures from duplicateModel and src/copy/food; the open question from useDuplicateSave.
 */
import type { ReactNode } from 'react'
import { Text, View } from 'react-native'
import { useStore } from '@/store/store'
import { barcodeUpdate, likelySame } from '@/screens/food/duplicateModel'
import { DUP } from '@/copy/food'
import { Btn, List } from '../../lib/ui/kit'
import { BareSheet, Row } from '../../lib/ui/primitives'
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
      <List>
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
      <List style={{ marginTop: 18 }}>
        <Row title={ask.saved.n} sub={DUP.yours} />
        <Row title={ask.next.n} sub={v.theirs} />
      </List>
      {/* TODO(N1-followup): Row with the 13 pt key above the 17 pt name (`.dup-k`, `.dup-nm`); here the key is the sub */}
      <View accessibilityLabel={DUP.tableLabel(v.theirs, v.per)} style={{ marginTop: 8 }}>
        <List style={{ paddingHorizontal: 16 }}>
          {tableRow('h', th(v.per.replace(/^per/, 'Per')), th(DUP.yours), th(v.theirs), true)}
          {v.rows.map((r) => tableRow(r.label,
            <Text style={[tx(17), { color: t.label }]}>{r.label}</Text>,
            <Text style={[tx(17), num, { color: t.label2 }]}>{r.yours}</Text>,
            <Text style={[tx(17, r.differs ? 600 : 400), num, { color: t.label }]}>{r.theirs}</Text>))}
        </List>
      </View>
      <View style={{ gap: 8, marginTop: 20 }}>
        <Btn title={DUP.keepYours} onPress={() => answer('keep')} />
        <Btn kind="gray" title={DUP.useTheirs(v.theirs)} onPress={() => answer('use-theirs')} />
        {/* `.btn.dup-link`: a 50 pt button with tinted words and no fill; TODO(N1-followup): Btn kind link */}
        <Btn kind="tinted" title={DUP.saveAsNew} onPress={() => answer('save-new')} style={{ backgroundColor: 'transparent', marginTop: -4 }} />
      </View>
      <Foot style={{ paddingTop: 2 }}>{DUP.keepsName(v.theirs)}</Foot>
    </BareSheet>
  )
}
