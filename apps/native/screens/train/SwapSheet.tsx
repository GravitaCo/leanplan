/**
 * Swap one exercise in today's card for another that fills the same slot (web:
 * screens/train/SwapSheet.tsx): one step easier or harder, or a similar move. Today only; the
 * planned exercise is one tap away. With sets already logged it asks first (they're kept).
 */
import { useState } from 'react'
import { Text } from 'react-native'
import type { Exercise } from '@/core/types'
import { alternativesFor, exById } from '@/core/domain/library'
import { EQUIPMENT_LABEL, careList, LEVEL_LABEL } from '@/core/data/libraryLabels'
import { CARE_DISCLAIMER } from '@/copy/train'
import { Btn, List } from '../../lib/ui/kit'
import { Sheet } from '../../lib/ui/primitives'
import { font } from '../../lib/theme'
import { Foot, GrpH, Li, LiText, Stack, Sub } from './pendingN1'

function Row({ x, tag, onPick }: { x: Exercise; tag?: string; onPick: () => void }) {
  const kit = x.equipment.length ? x.equipment.map((q) => EQUIPMENT_LABEL[q]).join(' or ') : 'No equipment'
  return (
    <Li onPress={onPick} label={x.n}>
      <LiText t={x.n} s={[tag, tag === 'Easier' || tag === 'Harder' ? '' : LEVEL_LABEL[x.difficulty], kit, x.defaultRx].filter(Boolean).join(' · ')}>
        {x.care?.length ? <Sub style={{ fontSize: 13, marginTop: 2 }}>Asks quite a lot of {careList(x.care)}</Sub> : null}
      </LiText>
    </Li>
  )
}

export function SwapSheet({ current, planned, shorter, loggedSets = 0, onPick, onClose }: {
  current: Exercise
  /** a shorter day: no "Harder" step (no progression prompts that day, plan §4.0.5) */
  shorter?: boolean
  /** the workout's own exercise for this slot, when something else is in it now */
  planned?: Exercise
  /** working sets already logged today for this slot: the swap asks first (they are kept, not wiped) */
  loggedSets?: number
  onPick: (id: string) => void
  onClose: () => void
}) {
  const [confirm, setConfirm] = useState<string | null>(null)
  const all = alternativesFor(planned ?? current)
  const alt = shorter ? { ...all, harder: undefined } : all
  const pick = (id: string) => { if (loggedSets > 0 && !confirm) { setConfirm(id); return } onPick(id); onClose() }
  const to = exById(confirm ?? undefined)
  if (confirm && to) {
    return (
      <Sheet title="Swap exercise" onClose={onClose}>
        <Sub style={{ paddingHorizontal: 4, paddingBottom: 14 }}>
          You've logged {loggedSets} {loggedSets === 1 ? 'set' : 'sets'} of {current.n} today. {loggedSets === 1 ? 'It stays' : 'They stay'} in today's log, and {to.n} starts fresh.
        </Sub>
        <Stack style={{ marginTop: 0 }}>
          <Btn title={`Swap to ${to.n}`} onPress={() => { onPick(confirm); onClose() }} />
          <Btn title={`Keep ${current.n}`} kind="gray" onPress={() => setConfirm(null)} />
        </Stack>
      </Sheet>
    )
  }
  const shown = (x?: Exercise) => !!x && x.id !== current.id
  return (
    <Sheet title="Swap exercise" onClose={onClose} tall>
      <Foot style={{ paddingTop: 0, paddingHorizontal: 4, paddingBottom: 12 }}>
        Instead of <Text style={font(600)}>{current.n}</Text>, today only. Your workout stays the same for next time.
      </Foot>
      {planned && planned.id !== current.id && (
        <List><Row x={planned} tag="Back to planned" onPick={() => pick(planned.id)} /></List>
      )}
      {(shown(alt.easier) || shown(alt.harder)) && (
        <>
          <GrpH>Same move, different step</GrpH>
          <List>
            {shown(alt.easier) && <Row x={alt.easier!} tag="Easier" onPick={() => pick(alt.easier!.id)} />}
            {shown(alt.harder) && <Row x={alt.harder!} tag="Harder" onPick={() => pick(alt.harder!.id)} />}
          </List>
        </>
      )}
      {alt.similar.some(shown) ? (
        <>
          <GrpH>Works the same area</GrpH>
          <List>
            {alt.similar.filter(shown).map((x) => (
              <Row key={x.id} x={x} tag={x.id === (planned ?? current).gentler ? 'Gentler' : undefined} onPick={() => pick(x.id)} />
            ))}
          </List>
        </>
      ) : (
        !planned && !alt.easier && !alt.harder && <Foot style={{ paddingTop: 0, paddingHorizontal: 4 }}>There's nothing similar in the library yet.</Foot>
      )}
      <Foot style={{ paddingTop: 12, paddingHorizontal: 4 }}>Easier and gentler options are here for any day, for any reason. {CARE_DISCLAIMER}</Foot>
    </Sheet>
  )
}
