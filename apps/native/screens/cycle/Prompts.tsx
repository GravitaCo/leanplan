/**
 * The safety cards (boards G1, G2; G4 lives in the check-in, CycleCheckin.tsx). Generic signposting,
 * never an assessment: a neutral card with the mind-ink info icon, a link to the NHS page and
 * "This is usual for me". No close button (Sara, 22 Nov 2026). After "This is usual for me", the
 * app's toast with Undo (Sara, 22 Nov). Shown together, only the first opens with "You know
 * what's usual…" (cycle.md §5.1). Shown only here and in the check-in: never on Summary, never in
 * a notification. The rules (when, "usual", re-arming) are core's (cycle.ts), all provisional.
 */
import { useEffect } from 'react'
import { Linking, Text, View } from 'react-native'
import { useStore } from '@/store/store'
import { markShown, markUsual, promptsDue, promptsToShow, type CyclePrompt, type CycleStore, type PromptFacts } from '@/core/domain/cycle'
import { todayStr } from '@/core/domain/date'
import { tx, useTokens } from '../../lib/theme'
import { LinkBtn } from '../../lib/ui/kit'
import { Icon } from '../../lib/ui/icons'
import { CY, NHS } from './text'

type Card = Exclude<CyclePrompt, 'no-period'>
const WORDS: Record<Card, { body: string; link: string; url: string; opener: boolean }> = {
  'long-bleed': { body: CY.prompt.longBleed, link: CY.help.heavyLink, url: NHS.heavy, opener: true },
  heavy: { body: CY.prompt.heavy, link: CY.help.heavyLink, url: NHS.heavy, opener: true },
  pain: { body: CY.prompt.pain, link: CY.help.painLink, url: NHS.pain, opener: false },
}

/** The facts the prompts need from the store: the pregnancy pause and the days with a check-in. */
export function usePromptFacts(): PromptFacts {
  const paused = useStore((s) => !!s.data.profile?.pregnancy?.flagged)
  const days = useStore((s) => s.data.days)
  return { paused, checkinDays: Object.keys(days).filter((d) => !!days[d]?.checkin) }
}

/** G1/G2 for `log` on today. Records a first showing once (markShown), as core's once-per-episode rule needs. */
export function SafetyCards({ log, facts }: { log: CycleStore; facts: PromptFacts }) {
  const t = useTokens()
  const editCycle = useStore((s) => s.editCycle)
  const showToast = useStore((s) => s.showToast)
  const today = todayStr()
  const cards = promptsToShow(log, today, facts).filter((p): p is Card => p !== 'no-period')
  const due = promptsDue(log, today, facts).filter((p) => p !== 'no-period').join(',')
  useEffect(() => {
    if (due) editCycle((l) => markShown(l, due.split(',') as CyclePrompt[], today))
  }, [due])
  if (!cards.length) return null
  const usual = (p: Card) => {
    const before = log.usual?.[p]
    editCycle((l) => markUsual(l, p, today))
    showToast(CY.prompt.toast, { label: 'Undo', run: () => editCycle((l) => { l.usual = { ...l.usual }; if (before) l.usual[p] = before; else delete l.usual[p] }) })
  }
  return (
    <View style={{ gap: 10 }}>
      {cards.map((p, i) => {
        const w = WORDS[p]
        return (
          <View key={p} style={{ flexDirection: 'row', gap: 12, alignItems: 'flex-start', backgroundColor: t.card, borderRadius: t.radius, paddingVertical: 12, paddingHorizontal: 14 }}>
            <Icon name="info" color={t.mindInk} />
            <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
              <Text style={[tx(15, 400, 1.4), { color: t.label }]}>{(i === 0 && w.opener ? CY.prompt.usualOpener : '') + w.body}</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 14 }}>
                <LinkBtn title={w.link} flat onPress={() => { void Linking.openURL(w.url) }} />
                <LinkBtn title={CY.prompt.usual} flat onPress={() => usual(p)} />
              </View>
            </View>
          </View>
        )
      })}
    </View>
  )
}
