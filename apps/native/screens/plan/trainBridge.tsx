/**
 * The Train pieces Plan opens (native-build-plan §2: "Plan opens Train's builder and library").
 * Stream N7 (native/n7-train) builds them; until it lands these are STUBS with the web's names and
 * props, so swapping in N7's exports is a change of import here only:
 *   - Thumb (train/Thumb.tsx): the typographic tile only. The clip previews come from Bunny, whose
 *     library refuses requests without a referrer; how native fetches them is N7's and security-data's.
 *   - LibrarySheet (train/LibrarySheet.tsx): the exercise names only.
 *   - RoutineBuilderSheet (train/RoutineBuilderSheet.tsx): an empty sheet.
 *   - WarmupCard (train/WarmupCard.tsx): shown only with ONBOARDING_ENABLED (off on the web too).
 */
import { Text, View } from 'react-native'
import type { ExerciseMedia, LogShape, Routine, RoutineSlot } from '@/core/types'
import type { WarmupBlock } from '@/core/domain/warmup'
import { EXERCISES } from '@/core/data/exercises'
import { Icon, Li, List, M, NavBtn, Sheet, font, useTokens } from './ui'

/** `.thumb` 44×44 (r12), `.thumb.big` 52×64, a week row's 36×44 (r8). */
export function Thumb({ shape, big, row }: { video?: ExerciseMedia; shape?: LogShape; play?: boolean; big?: boolean; row?: boolean }) {
  const t = useTokens()
  const w = row ? 36 : big ? 52 : 44, h = row ? 44 : big ? 64 : 44
  return (
    <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      style={{ width: w, height: h, borderRadius: row ? 8 : 12, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center' }}>
      {shape ? <Text style={[font(600), { fontSize: 12, color: t.label2 }]}>{shape === 'hold' ? 'Hold' : shape === 'duration' ? 'Time' : 'Cue'}</Text>
        : <Icon name="dumbbell" size={22} color={t.label2} />}
    </View>
  )
}

export function LibrarySheet({ initial, onClose }: { initial?: string; onClose: () => void }) {
  const list = initial ? EXERCISES.filter((x) => x.id === initial) : EXERCISES
  return (
    <Sheet title="Exercise library" tall left={null} onClose={onClose} right={<NavBtn bold title="Done" onPress={onClose} />}>
      <List>{list.map((x) => <Li key={x.id}><M t={x.n} /></Li>)}</List>
    </Sheet>
  )
}

/** The web's BuilderStart (train/RoutineBuilderSheet.tsx). */
export type BuilderStart = { routine?: Routine; name?: string; slots?: RoutineSlot[]; baseId?: string }

export function RoutineBuilderSheet({ onClose }: { start: BuilderStart; onClose: () => void; onSaved: (id: string) => void }) {
  return <Sheet title="Build a workout" tall onClose={onClose}><View /></Sheet>
}

export function WarmupCard(_: { block: WarmupBlock }) {
  return null
}
