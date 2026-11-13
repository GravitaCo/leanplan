/**
 * Unload (board B8), ported from src/screens/mind/UnloadSheet.tsx: a tall sheet with Cancel and
 * Done; "On my mind" and "Next step" pairs, "Add another", the optional "went OK" line, Earlier
 * notes, the device-only foot, the not-reading line (its "support is here" opens Support), the
 * crisis line and the support row. The form is unloadReducer (model.ts).
 *
 * Notes never leave this phone. This is the native Unload screen in UNLOAD_SCREENS
 * (scripts/wellbeing/data-device.ts): it reads, adds and deletes notes only through
 * src/screens/mind/unloadNotes.ts, exports nothing but UnloadSheet, and logs nothing.
 */
import { useReducer, useState } from 'react'
import { Text, View } from 'react-native'
import { useStore, selectNotesContext } from '@/store/store'
import { deleteUnload, noteDay, noteLines, notesFor, saveUnload, unloadBlocked } from '@/screens/mind/unloadNotes'
import { MIND_UI, SHARED, UNLOAD } from '@/copy/mind'
import { Card, LinkBtn, List } from '../../lib/ui/kit'
import { BackButton, NavBtn, Row, Sheet } from '../../lib/ui/primitives'
import { Input } from '../../lib/ui/fields'
import { Foot, TextLink } from '../../lib/ui/text'
import { Chevron } from '../../lib/ui/icons'
import { tx, useTokens } from '../../lib/theme'
import { SupportSheet } from './SupportSheet'
import { unloadInitial, unloadReducer, unloadView } from './model'

/** `.foot` in the sheet keeps its own padding, 7 16 0 */
const foot = { lineHeight: 17.9 }

export function UnloadSheet({ onClose }: { onClose: () => void }) {
  const t = useTokens()
  const data = useStore((s) => s.data)
  const signedIn = useStore((s) => s.signedIn)
  const ownerAsk = useStore((s) => s.ownerAsk)
  const ctx = selectNotesContext({ data, signedIn, ownerAsk })
  const notes = notesFor(data, ctx)
  const [f, dispatch] = useReducer(unloadReducer, undefined, unloadInitial)
  const [support, setSupport] = useState(false)
  const v = unloadView(f, notes.length)
  const input = { pairs: f.pairs, ok: f.ok }
  const blocked = unloadBlocked(input, { ...ctx, owner: !!data._meta?.owner }, notes.length)
  const done = () => { if (blocked) return; if (saveUnload(input).ok) onClose() }
  // `.unload .ul-pair textarea`: on the page colour, radius 12, padding 11 14
  const field = { backgroundColor: t.bg, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 14, lineHeight: 23 }
  const label = [tx(13), { color: t.label2, marginHorizontal: 2 }]
  const supportSheet = support && <SupportSheet onClose={() => setSupport(false)} />

  if (v.showEarlier) {
    return (
      <Sheet title={UNLOAD.earlier} onClose={onClose} tall animate={false} left={<BackButton label={UNLOAD.title} onPress={() => dispatch({ type: 'form' })} />}>
        <List>
          {notes.map((n) => {
            const day = noteDay(n.at)
            return (
              <Row key={n.id} title={day} wrapSub sub={noteLines(n).join('\n')}
                right={<LinkBtn title={UNLOAD.delete} label={MIND_UI.deleteNote(day)} onPress={() => deleteUnload(n.id)} style={{ paddingVertical: 12, paddingRight: 0, paddingLeft: 8 }} />} />
            )
          })}
        </List>
        {supportSheet}
      </Sheet>
    )
  }

  return (
    <Sheet title={v.title} onClose={onClose} tall animate={!f.moved} right={<NavBtn title={MIND_UI.done} bold disabled={!!blocked} onPress={done} />}>
      <Text style={[tx(17, 400, 1.4), { color: t.label, marginTop: 2, marginHorizontal: 4, marginBottom: 14 }]}>{UNLOAD.lead}</Text>
      {f.pairs.map((p, i) => (
        <Card key={i} plain style={{ padding: 12, paddingVertical: 12, paddingHorizontal: 12, gap: 8, marginBottom: 8 }}>
          <Text style={label} importantForAccessibility="no" accessibilityElementsHidden>{UNLOAD.mind}</Text>
          <Input testID="unload-mind" label={UNLOAD.mind} multiline value={p.mind} placeholder={UNLOAD.mindHint} autoComplete="off"
            onChangeText={(x) => dispatch({ type: 'pair', i, patch: { mind: x } })} style={[field, { minHeight: 88 }]} />
          <Text style={label} importantForAccessibility="no" accessibilityElementsHidden>{UNLOAD.next}</Text>
          <Input testID="unload-next" label={UNLOAD.next} multiline value={p.next ?? ''} placeholder={UNLOAD.nextHint} autoComplete="off"
            onChangeText={(x) => dispatch({ type: 'pair', i, patch: { next: x } })} style={[field, { minHeight: 68 }]} />
        </Card>
      ))}
      <List>
        {v.canAdd && <Row title={UNLOAD.addAnother} act icon="plus" onPress={() => dispatch({ type: 'add' })} />}
        {/* TODO(N1-followup): Row needs an `expanded` state for screen readers (web aria-expanded) */}
        <Row title={UNLOAD.wentOk} onPress={() => dispatch({ type: 'toggleOk' })} right={<Chevron color={t.label3} rotate={f.okOpen ? 90 : 0} />} />
        {f.okOpen && (
          <View style={{ paddingVertical: 10, paddingHorizontal: 16 }}>
            <Input label={UNLOAD.wentOk} value={f.ok} placeholder={UNLOAD.wentOkHint} autoComplete="off" autoFocus
              onChangeText={(x) => dispatch({ type: 'ok', text: x })} style={field} />
          </View>
        )}
        {v.earlierRow && <Row title={UNLOAD.earlier} onPress={() => dispatch({ type: 'earlier' })} />}
      </List>
      <Foot style={foot}>{v.foots.local}</Foot>
      <Foot style={foot}>{v.foots.notReadLead}<TextLink label={v.foots.notReadLink} onPress={() => setSupport(true)}>{v.foots.notReadLink}</TextLink>.</Foot>
      <Foot style={foot}>{v.foots.notCrisis}</Foot>
      <List style={{ marginTop: 4 }}><Row title={SHARED.support} onPress={() => setSupport(true)} /></List>
      {supportSheet}
    </Sheet>
  )
}
