/**
 * Tester feedback (src/screens/profile/FeedbackSheet.tsx): each key area (a quick rating and an
 * optional note), then what they'd like to see, then a review. Sending opens the email app with it
 * all filled in (core/domain/feedback.ts); every question can be skipped. Closing by accident keeps
 * the answers while the app is open; they clear once it's sent.
 * "Copy instead" copies with expo-clipboard (first-party; allowed by docs/plans/native-dependencies.md).
 */
import { useEffect, useState } from 'react'
import { Linking, Platform, Pressable, Text, View } from 'react-native'
import * as Clipboard from 'expo-clipboard'
import Constants from 'expo-constants'
import { useStore } from '@/store/store'
import { FEEDBACK as F } from '@/copy/profile'
import { FEEDBACK_AREAS, FEEDBACK_RATINGS, FEEDBACK_TO, feedbackEmail, feedbackMailto, hasFeedback, type FeedbackAnswers } from '@/core/domain/feedback'
import { font, num, useTokens } from '../theme'
import { Btn, Foot, Input, Lbl, NavBtn, Sheet, useSurface } from './ui'

const STEPS = FEEDBACK_AREAS.length + 3 // intro, the areas, open questions, review
const EMPTY: FeedbackAnswers = { areas: {}, wishes: '', other: '' }
let draft: { step: number; a: FeedbackAnswers } = { step: 0, a: EMPTY }

/** The app version and build, as the web sends its service-worker cache name. */
const appVersion = () => {
  const c = Constants.expoConfig
  const build = Platform.OS === 'ios' ? c?.ios?.buildNumber : c?.android?.versionCode
  return c?.version ? `native ${c.version}${build ? ` (${build})` : ''}` : undefined
}

export function FeedbackSheet({ onClose }: { onClose: () => void }) {
  const t = useTokens()
  const showToast = useStore((s) => s.showToast)
  const [step, setStep] = useState(draft.step)
  const [a, setA] = useState<FeedbackAnswers>(draft.a)
  useEffect(() => { draft = { step, a } }, [step, a])
  const [opened, setOpened] = useState(false)

  const email = feedbackEmail(a, { version: appVersion(), device: `${Platform.OS} ${Platform.Version}` })
  const next = () => setStep((s) => Math.min(STEPS - 1, s + 1))
  const back = () => { setOpened(false); setStep((s) => Math.max(0, s - 1)) }
  const area = step >= 1 && step <= FEEDBACK_AREAS.length ? FEEDBACK_AREAS[step - 1] : null
  const cur = area ? a.areas[area.id] ?? {} : {}
  const setArea = (patch: { rating?: (typeof FEEDBACK_RATINGS)[number]; note?: string }) =>
    area && setA((x) => ({ ...x, areas: { ...x.areas, [area.id]: { ...x.areas[area.id], ...patch } } }))
  const copy = async () => {
    try { await Clipboard.setStringAsync(email.body); showToast(F.copied(FEEDBACK_TO)) } catch { showToast(F.copyFailed) }
  }
  const ready = hasFeedback(a)
  const q = [font(600), { fontSize: 22, lineHeight: 28, letterSpacing: -0.22, color: t.label, marginTop: 4, marginBottom: 6 }]
  const sub = [font(), { fontSize: 15, lineHeight: 22, color: t.label2, marginBottom: 10 }]
  const surface = useSurface()

  return (
    <Sheet title="Feedback" tall scrollKey={step} onClose={onClose} left={step > 0 ? <NavBtn title="Back" back onPress={back} /> : undefined}
      right={step > 0 ? <Text style={[font(), num, { fontSize: 15, color: t.label2 }]}>{step} of {STEPS - 1}</Text> : undefined}>
      {step === 0 && (
        <View>
          <Text style={q}>Help shape Tilo</Text>
          <Text style={sub}>A few quick questions about each part of the app, then what you’d like to see next. It takes about two minutes, and you can skip anything.</Text>
          <Text style={sub}>Your answers go to {FEEDBACK_TO} from your own email app, so you’ll see exactly what’s sent.</Text>
        </View>
      )}

      {area && (
        <View>
          <Text style={q}>{area.question}</Text>
          <Foot style={{ paddingHorizontal: 0, paddingTop: 0, paddingBottom: 12 }}>{area.hint}</Foot>
          <View accessibilityRole="radiogroup" accessibilityLabel={area.question} style={{ flexDirection: 'row', gap: 6 }}>
            {FEEDBACK_RATINGS.map((r) => {
              const on = cur.rating === r
              return (
                <Pressable key={r} accessibilityRole="radio" accessibilityState={{ checked: on }} onPress={() => setArea({ rating: on ? undefined : r })}
                  style={{ flex: 1, borderRadius: 10, paddingVertical: 8, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? t.tint : surface }}>
                  <Text style={[font(), { fontSize: 13, lineHeight: 16, textAlign: 'center', color: on ? t.onTint : t.label }]}>{r}</Text>
                </Pressable>
              )
            })}
          </View>
          <Lbl style={{ paddingHorizontal: 4 }}>What worked, or what got in the way?</Lbl>
          <Input label="What worked, or what got in the way?" multiline rows={4} value={cur.note ?? ''} placeholder="Optional" autoCap="sentences"
            onChangeText={(v) => setArea({ note: v })} style={{ backgroundColor: surface }} />
        </View>
      )}

      {step === FEEDBACK_AREAS.length + 1 && (
        <View>
          <Text style={q}>What would you like to see in Tilo?</Text>
          <Foot style={{ paddingHorizontal: 0, paddingTop: 0, paddingBottom: 12 }}>Features, foods, workouts, anything that would make it more useful for you.</Foot>
          <Input label="What would you like to see in Tilo?" multiline rows={5} value={a.wishes} placeholder="Optional" autoCap="sentences"
            onChangeText={(v) => setA({ ...a, wishes: v })} style={{ backgroundColor: surface }} />
          <Lbl style={{ paddingHorizontal: 4 }}>Anything else?</Lbl>
          <Input label="Anything else?" multiline rows={3} value={a.other} placeholder="Optional" autoCap="sentences"
            onChangeText={(v) => setA({ ...a, other: v })} style={{ backgroundColor: surface }} />
        </View>
      )}

      {step === STEPS - 1 && (
        <View>
          <Text style={q}>Ready to send</Text>
          <View style={{ backgroundColor: surface, borderRadius: t.radius, padding: 16, marginBottom: 12 }}>
            <Text style={[font(), { fontSize: 13, lineHeight: 18, color: t.label2 }]}>{email.body}</Text>
          </View>
          <Foot style={{ paddingHorizontal: 0, paddingTop: 0, paddingBottom: 12 }}>
            {opened
              ? `Your email app should now be open with this ready to send. Didn’t open? Copy it instead and paste it into an email to ${FEEDBACK_TO}.`
              : `${ready ? `Opens your email app, addressed to ${FEEDBACK_TO}.` : 'Answer at least one question to send.'} The app version and device type are included to help track down bugs.`}
          </Foot>
          <View style={{ gap: 8, marginTop: 4 }}>
            {opened
              ? <Btn title="Done" onPress={() => { draft = { step: 0, a: EMPTY }; onClose() }} />
              : <Btn title="Send by email" disabled={!ready} onPress={() => { void Linking.openURL(feedbackMailto(email)); setOpened(true); draft = { step: 0, a: EMPTY } }} />}
            <Btn kind="gray" title="Copy instead" disabled={!ready} onPress={() => void copy()} />
          </View>
        </View>
      )}

      {step < STEPS - 1 && <View style={{ marginTop: 16 }}><Btn title={step === 0 ? 'Start' : 'Next'} onPress={next} /></View>}
    </Sheet>
  )
}
