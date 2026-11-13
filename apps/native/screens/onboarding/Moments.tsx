/**
 * Onboarding's moments inside the app, native ports of the web's, for the streams that place them:
 * - SetupCard: Today's "Finish your setup" (ob2-0b; src/screens/onboarding/Consent.tsx) when
 *   setupCardDue (src/data/firstRun.ts) says so. For N4.
 * - BuildPlanCard: Plan's "Build my plan" (ob6-4) when buildCardDue says so. For N8.
 * - FirstPlanSheet: "Plan when you'll do it" (ob5-4; src/screens/plan/PlanSheets.tsx), once on Today
 *   after the first workout (core insights ifThenOfferDue). For N4.
 * Find your weight and "How was that set?" are the guided player's (N7), on core/domain/guided.ts.
 * All behind ONBOARDING_ENABLED, as on web: the due checks carry the flag.
 */
import { useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import { useStore } from '@/store/store'
import { hideSetupCard } from '@/data/onboardingDraft'
import { BUILD_PLAN } from '@/copy/onboarding'
import { IF_THEN, SETUP_CARD } from '@/copy/onboardingApp'
import { BTN, tx, useTokens } from '../../lib/theme'
import { Btn, Card, LinkBtn } from '../../lib/ui/kit'
import { BareSheet } from '../../lib/ui/primitives'
import { OB_BTN } from './frame'

/** ob2-0b: on Today, above the pillars. "Not now" hides it on this device (as on web). */
export function SetupCard() {
  const t = useTokens()
  const openSetup = useStore((s) => s.openSetup)
  const [hidden, setHidden] = useState(false)
  if (hidden) return null
  return (
    <Card style={{ padding: 18, gap: 10, marginBottom: 16 }}>
      <View accessibilityLabel={SETUP_CARD.k} style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={[tx(13, 600), { color: t.tint }]}>{SETUP_CARD.k}</Text>
          <Text style={[tx(13), { color: t.label2 }]}>{SETUP_CARD.r}</Text>
        </View>
        <Text style={[tx(20, 600, 1.25, -0.01), { color: t.label }]}>{SETUP_CARD.t}</Text>
        <Text style={[tx(14, 400, 1.45), { color: t.label2 }]}>{SETUP_CARD.s}</Text>
        <Btn title={SETUP_CARD.go} onPress={() => openSetup(true)} style={{ minHeight: 52, borderRadius: 26, marginTop: 6 }} />
        <LinkBtn title={SETUP_CARD.later} onPress={() => { hideSetupCard(); setHidden(true) }} style={{ textAlign: 'center', paddingVertical: 4 }} />
      </View>
    </Card>
  )
}

/** ob6-4: on Plan, above the week; `onBuild` opens the setup card on its own (store openSetup). */
export function BuildPlanCard({ onBuild }: { onBuild?: () => void }) {
  const t = useTokens()
  const openSetup = useStore((s) => s.openSetup)
  return (
    <Card style={{ padding: 18, gap: 12 }}>
      <View accessibilityLabel={BUILD_PLAN.t} style={{ gap: 12 }}>
        <Text style={[tx(13, 600), { color: t.tint }]}>{BUILD_PLAN.k}</Text>
        <Text style={[tx(20, 600, 1.25, -0.01), { color: t.label }]}>{BUILD_PLAN.t}</Text>
        <Text style={[tx(14, 400, 1.45), { color: t.label2 }]}>{BUILD_PLAN.s}</Text>
        <Btn title={BUILD_PLAN.go} kind="gray" onPress={onBuild ?? (() => openSetup(true))} style={{ minHeight: 48, borderRadius: 24, backgroundColor: t.bg }} textStyle={{ fontSize: 16 }} />
      </View>
    </Card>
  )
}

/**
 * ob5-4: saved as an ordinary if-then plan ("after my morning coffee" → "do my workout"). Save or Not
 * now: `onDone` records that it was offered (Today calls setPrefs({ ifThenOffered: true })).
 */
export function FirstPlanSheet({ onDone }: { onDone: () => void }) {
  const t = useTokens()
  const savePlan = useStore((s) => s.savePlan)
  const [after, setAfter] = useState('')
  const [then, setThen] = useState<string>(IF_THEN.thenValue)
  const ok = !!after.trim() && !!then.trim()
  const save = () => { if (!ok) return; savePlan({ when: `after ${after.trim()}`, then: then.trim() }); onDone() }
  const input = [tx(17, 400, 1.3, 0), { color: t.label, padding: 0 }]
  const label = [tx(13), { color: t.label2 }]
  return (
    <BareSheet label={IF_THEN.title} onClose={onDone}>
      <View style={{ gap: 14 }}>
        <Text style={[tx(13, 600), { color: t.tint }]}>{IF_THEN.k}</Text>
        <Text accessibilityRole="header" style={[tx(24, 600, 30), { color: t.label, marginTop: -6 }]}>{IF_THEN.title}</Text>
        <Text style={[tx(15, 400, 1.5), { color: t.label2 }]}>{IF_THEN.lead}</Text>
        <View style={{ backgroundColor: t.elev, borderRadius: t.radius, paddingVertical: 14, paddingHorizontal: 16, gap: 6 }}>
          <Text style={label}>{IF_THEN.after}</Text>
          <TextInput accessibilityLabel={IF_THEN.after} value={after} onChangeText={setAfter} placeholder={IF_THEN.placeholder} placeholderTextColor={t.label3} maxLength={80} style={[input, { marginTop: -2 }]} />
          <Text style={[label, { marginTop: 6 }]}>{IF_THEN.then}</Text>
          <TextInput accessibilityLabel={IF_THEN.then} value={then} onChangeText={setThen} maxLength={80} style={[input, { marginTop: -2 }]} />
        </View>
        {/* TODO(N1-followup): the cue chips (.ift-cues) are a variant of .chip; words "Cues", "After …" are N8's (src/copy/plan.ts) */}
        <View role="group" accessibilityLabel="Cues" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
          {IF_THEN.cues.map((c) => {
            const on = after === c
            return (
              <Pressable key={c} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => setAfter(c)}
                style={{ paddingVertical: 9, paddingHorizontal: 12, borderRadius: 18, backgroundColor: on ? t.label : t.elev }}>
                <Text style={[tx(14, 400, 1.3, BTN), { color: on ? t.card : t.label }]}>After {c}</Text>
              </Pressable>
            )
          })}
        </View>
        <Btn title={IF_THEN.save} disabled={!ok} onPress={save} style={OB_BTN} />
        <LinkBtn title={IF_THEN.later} onPress={onDone} style={{ fontSize: 16, textAlign: 'center', paddingVertical: 4 }} />
      </View>
    </BareSheet>
  )
}
