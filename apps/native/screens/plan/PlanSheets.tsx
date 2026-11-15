/**
 * The web's src/screens/plan/PlanSheets.tsx on lib/ui: create or edit an if–then plan (and a Mind
 * plan from the day's one thing), the weekly plan check-in, and ob5-4's "Plan when you'll do it".
 * Today (N4) opens the last two and the Mind-plan form; Plan opens the editor.
 */
import { useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import { useStore } from '@/store/store'
import type { IfThenPlan } from '@/core/types'
import { plansDue } from '@/core/domain/insights'
import { IF_THEN } from '@/copy/onboardingApp'
import { FIRST_PLAN_CUES, MIND_PLAN, PLAN_OUTCOME } from '@/copy/plan'
import { whenLine } from '@/screens/plan/planModel'
import { Btn, Card, Chip, Chips, useSurface } from '../../lib/ui/kit'
import { BareSheet, NavBtn, Sheet } from '../../lib/ui/primitives'
import { Input } from '../../lib/ui/fields'
import { Foot, Lbl, Sub } from '../../lib/ui/text'
import { tx, useTokens } from '../../lib/theme'

/**
 * Create or edit an if–then plan (implementation intention + optional coping plan). `prefill` and
 * `kind` make a new plan from the day's one thing (B9.10 to B9.17).
 */
export function PlanEditSheet({ id, prefill, kind, onClose }: { id?: string; prefill?: { when: string; then: string }; kind?: 'mind'; onClose: () => void }) {
  const plan = useStore((s) => (id ? s.data.profile.plans?.find((p) => p.id === id) : undefined))
  const savePlan = useStore((s) => s.savePlan)
  const deletePlan = useStore((s) => s.deletePlan)
  const showToast = useStore((s) => s.showToast)
  const [when, setWhen] = useState(plan?.when ?? prefill?.when ?? '')
  const [then, setThen] = useState(plan?.then ?? prefill?.then ?? '')
  const [cope, setCope] = useState(plan?.cope ?? '')
  const mind = !plan && kind === 'mind'
  const save = () => {
    if (!when.trim() || !then.trim()) { showToast("Fill in when and what you'll do"); return }
    // a Mind plan is refused while health data is off (the store says why); the sheet stays open
    const ok = mind
      ? savePlan({ when: when.trim(), then: then.trim(), cope: cope.trim(), kind: 'mind' }, { toast: MIND_PLAN.saved })
      : savePlan({ id: plan?.id, when: when.trim(), then: then.trim(), cope: cope.trim() })
    if (ok) onClose()
  }
  return (
    <Sheet title={plan ? 'Edit plan' : 'New plan'} onClose={onClose} right={<NavBtn bold title="Save" onPress={save} />}>
      <Lbl>When…</Lbl>
      <Input sheetInput label="When…" value={when} placeholder={mind ? undefined : 'I get home from work hungry'} onChangeText={setWhen} />
      <Lbl>I'll…</Lbl>
      <Input sheetInput label="I'll…" value={then} placeholder={mind ? undefined : 'have a yoghurt before I start cooking'} onChangeText={setThen} />
      <Lbl>If something gets in the way…</Lbl>
      <Input sheetInput label="If something gets in the way…" value={cope} placeholder={mind ? MIND_PLAN.optional : 'keep protein bars in my bag'} onChangeText={setCope} />
      {mind && <Foot>{MIND_PLAN.savedUnder}</Foot>}
      <Foot>Specific beats ambitious. A plan you'll actually do is worth more than a perfect one.</Foot>
      {plan && <View style={{ marginTop: 16 }}><Btn kind="danger" title="Delete plan" onPress={() => { deletePlan(plan.id); onClose() }} /></View>}
    </Sheet>
  )
}

/** Weekly follow-up: the part that makes if–then plans work. */
export function PlanReviewSheet({ onClose }: { onClose: () => void }) {
  const t = useTokens()
  const profile = useStore((s) => s.data.profile)
  const reviewPlans = useStore((s) => s.reviewPlans)
  const [due] = useState(() => plansDue(profile))
  const [out, setOut] = useState<Record<string, IfThenPlan['reviews'][number]['r']>>({})
  const answered = Object.keys(out).length > 0
  const save = () => { if (answered) { reviewPlans(out); onClose() } }
  return (
    <Sheet title="Plan check-in" onClose={onClose} right={<NavBtn bold title="Done" onPress={save} disabled={!answered} />}>
      <Sub style={{ paddingHorizontal: 4, paddingBottom: 12 }}>
        How did each plan go this week? A plan that isn't working is worth rewriting. It's not a failing on your part.
      </Sub>
      {due.map((pl) => (
        <Card plain key={pl.id} style={{ marginBottom: 10 }}>
          <Text style={[tx(17, 600), { color: t.label }]}>{whenLine(pl.when)}</Text>
          <Sub style={{ marginTop: 2, marginBottom: 10 }}>I'll {pl.then}{pl.cope ? `. If something gets in the way: ${pl.cope}` : ''}</Sub>
          <Chips>
            {(Object.keys(PLAN_OUTCOME) as (keyof typeof PLAN_OUTCOME)[]).map((k) => (
              <Chip key={k} on={out[pl.id] === k} title={PLAN_OUTCOME[k]} onPress={() => setOut({ ...out, [pl.id]: k })} />
            ))}
          </Chips>
        </Card>
      ))}
    </Sheet>
  )
}

/**
 * ob5-4: once on Today after the first workout, "Plan when you'll do it". Saved as an ordinary
 * if-then plan, so the weekly check-in and the Plan tab carry it. Save or Not now: never offered again.
 */
export function FirstPlanSheet({ onDone }: { onDone: () => void }) {
  const savePlan = useStore((s) => s.savePlan)
  const [after, setAfter] = useState('')
  const [then, setThen] = useState<string>(IF_THEN.thenValue)
  const ok = !!after.trim() && !!then.trim()
  const save = () => { if (!ok) return; savePlan({ when: `after ${after.trim()}`, then: then.trim() }); onDone() }
  return (
    <BareSheet label={IF_THEN.title} onClose={onDone}>
      <FirstPlanBody after={after} setAfter={setAfter} then={then} setThen={setThen} ok={ok} save={save} onDone={onDone} />
    </BareSheet>
  )
}

/** `.ift`: the sheet's body (onboarding.css), inside the sheet so its card sits on --elev. */
function FirstPlanBody({ after, setAfter, then, setThen, ok, save, onDone }: {
  after: string; setAfter: (v: string) => void; then: string; setThen: (v: string) => void; ok: boolean; save: () => void; onDone: () => void
}) {
  const t = useTokens()
  const surface = useSurface(t)
  const input = [tx(17, 400, 1.3, 0), { color: t.label, padding: 0 }]
  // TODO(N1-followup): `.ift-card` and `.ift-cues` are onboarding.css classes shared with N11; move to lib/ui if N11 needs them too
  return (
    <View style={{ gap: 14 }}>
      <Text style={[tx(13, 600), { color: t.tint }]}>{IF_THEN.k}</Text>
      <Text accessibilityRole="header" style={[tx(24, 600, 30), { color: t.label, marginTop: -6 }]}>{IF_THEN.title}</Text>
      <Text style={[tx(15, 400, 1.5), { color: t.label2 }]}>{IF_THEN.lead}</Text>
      <View style={{ backgroundColor: surface, borderRadius: t.radius, paddingVertical: 14, paddingHorizontal: 16, gap: 6 }}>
        <Text style={[tx(13), { color: t.label2 }]} importantForAccessibility="no" accessibilityElementsHidden>{IF_THEN.after}</Text>
        <TextInput accessibilityLabel={IF_THEN.after} value={after} placeholder={IF_THEN.placeholder} placeholderTextColor={t.label3} maxLength={80} onChangeText={setAfter} style={[...input, { marginTop: -2 }]} />
        <Text style={[tx(13), { color: t.label2, marginTop: 6 }]} importantForAccessibility="no" accessibilityElementsHidden>{IF_THEN.then}</Text>
        <TextInput accessibilityLabel={IF_THEN.then} value={then} maxLength={80} onChangeText={setThen} style={[...input, { marginTop: -2 }]} />
      </View>
      <View accessibilityLabel={FIRST_PLAN_CUES.label} style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {IF_THEN.cues.map((c) => {
          const on = after === c
          return (
            <Pressable key={c} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => setAfter(c)}
              style={({ pressed }) => ({ paddingVertical: 9, paddingHorizontal: 12, borderRadius: 18, backgroundColor: on ? t.label : surface, opacity: pressed ? 0.7 : 1 })}>
              <Text style={[tx(14, 400, 1.3, 0), { color: on ? t.card : t.label }]}>{FIRST_PLAN_CUES.chip(c)}</Text>
            </Pressable>
          )
        })}
      </View>
      <Btn title={IF_THEN.save} disabled={!ok} onPress={save} style={{ minHeight: 54, borderRadius: 27 }} />
      <Pressable accessibilityRole="button" onPress={onDone} style={({ pressed }) => ({ padding: 4, alignSelf: 'center', opacity: pressed ? 0.7 : 1 })}>
        <Text style={[tx(16, 500, 1.3, 0), { color: t.tint, textAlign: 'center' }]}>{IF_THEN.later}</Text>
      </Pressable>
    </View>
  )
}
