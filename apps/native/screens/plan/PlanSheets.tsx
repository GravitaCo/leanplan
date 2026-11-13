/**
 * Native port of src/screens/plan/PlanSheets.tsx: create or edit an if–then plan (and a Mind plan
 * from the day's one thing), the weekly plan check-in, and ob5-4's "Plan when you'll do it".
 * Today (N4) opens the last two and the Mind-plan form; Plan opens the editor.
 */
import { useState } from 'react'
import { Pressable, Text, TextInput, View } from 'react-native'
import { useStore } from '@/store/store'
import type { IfThenPlan } from '@/core/types'
import { plansDue } from '@/core/domain/insights'
import { IF_THEN } from '@/screens/onboarding/copyApp'
import { MIND_PLAN, PLAN_OUTCOME, whenLine } from './planShared'
import { BareSheet, Btn, Card, Chip, Chips, Field, Foot, Lbl, NavBtn, Sheet, Sub, font, useInSheet, useTokens } from './ui'

export { MIND_PLAN, PLAN_OUTCOME, whenLine }

/**
 * Create or edit an if–then plan (implementation intention + optional coping plan). `prefill` and
 * `kind` make a new plan from the day's one thing (B9.10 to B9.17): the fields start filled (nothing
 * is saved for you), the B9.15 line shows, and saving says B9.17.
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
    const ok = mind
      ? savePlan({ when: when.trim(), then: then.trim(), cope: cope.trim(), kind: 'mind' }, { toast: MIND_PLAN.saved })
      : savePlan({ id: plan?.id, when: when.trim(), then: then.trim(), cope: cope.trim() })
    if (ok) onClose()
  }
  return (
    <Sheet title={plan ? 'Edit plan' : 'New plan'} onClose={onClose} right={<NavBtn bold title="Save" onPress={save} />}>
      <Lbl>When…</Lbl>
      <Field accessibilityLabel="When…" value={when} placeholder={mind ? undefined : 'I get home from work hungry'} onChangeText={setWhen} />
      <Lbl>I'll…</Lbl>
      <Field accessibilityLabel="I'll…" value={then} placeholder={mind ? undefined : 'have a yoghurt before I start cooking'} onChangeText={setThen} />
      <Lbl>If something gets in the way…</Lbl>
      <Field accessibilityLabel="If something gets in the way…" value={cope} placeholder={mind ? MIND_PLAN.optional : 'keep protein bars in my bag'} onChangeText={setCope} />
      {mind && <Foot>{MIND_PLAN.savedUnder}</Foot>}
      <Foot>Specific beats ambitious. A plan you'll actually do is worth more than a perfect one.</Foot>
      {plan && <View style={{ marginTop: 16 }}><Btn kind="danger" title="Delete plan" onPress={() => { deletePlan(plan.id); onClose() }} /></View>}
    </Sheet>
  )
}

/** Weekly follow-up — the part that makes if–then plans work. */
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
        <Card key={pl.id}>
          <Text style={[font(600), { fontSize: 17, color: t.label }]}>{whenLine(pl.when)}</Text>
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
 * if-then plan ("after my morning coffee" → "do my workout"), so the weekly check-in and the Plan
 * tab carry it as they do any other. Save or Not now: never offered again (onDone).
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

function FirstPlanBody({ after, setAfter, then, setThen, ok, save, onDone }: {
  after: string; setAfter: (v: string) => void; then: string; setThen: (v: string) => void; ok: boolean; save: () => void; onDone: () => void
}) {
  const t = useTokens()
  const elev = useInSheet()
  const input = [font(400), { fontSize: 17, color: t.label, padding: 0 }]
  return (
    <View style={{ gap: 14 }}>
      <Text style={[font(600), { fontSize: 13, color: t.tint }]}>{IF_THEN.k}</Text>
      <Text accessibilityRole="header" style={[font(600), { fontSize: 24, lineHeight: 30, color: t.label, marginTop: -6 }]}>{IF_THEN.title}</Text>
      <Text style={[font(400), { fontSize: 15, lineHeight: 22.5, color: t.label2 }]}>{IF_THEN.lead}</Text>
      <View style={{ backgroundColor: elev ? t.elev : t.card, borderRadius: t.radius, paddingVertical: 14, paddingHorizontal: 16, gap: 6 }}>
        <Text style={[font(400), { fontSize: 13, color: t.label2 }]}>{IF_THEN.after}</Text>
        <TextInput accessibilityLabel={IF_THEN.after} value={after} placeholder={IF_THEN.placeholder} placeholderTextColor={t.label3} maxLength={80} onChangeText={setAfter} style={[...input, { marginTop: -2 }]} />
        <Text style={[font(400), { fontSize: 13, color: t.label2, marginTop: 6 }]}>{IF_THEN.then}</Text>
        <TextInput accessibilityLabel={IF_THEN.then} value={then} maxLength={80} onChangeText={setThen} style={[...input, { marginTop: -2 }]} />
      </View>
      <View accessibilityRole="none" accessibilityLabel="Cues" style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {IF_THEN.cues.map((c) => {
          const on = after === c
          return (
            <Pressable key={c} accessibilityRole="button" accessibilityState={{ selected: on }} onPress={() => setAfter(c)}
              style={{ paddingVertical: 9, paddingHorizontal: 12, borderRadius: 18, backgroundColor: on ? t.label : elev ? t.elev : t.card }}>
              <Text style={[font(400), { fontSize: 14, color: on ? t.card : t.label }]}>After {c}</Text>
            </Pressable>
          )
        })}
      </View>
      <Btn tall title={IF_THEN.save} disabled={!ok} onPress={save} />
      <Pressable accessibilityRole="button" onPress={onDone} style={{ padding: 4, alignSelf: 'center' }}>
        <Text style={[font(500), { fontSize: 16, color: t.tint, textAlign: 'center' }]}>{IF_THEN.later}</Text>
      </Pressable>
    </View>
  )
}
