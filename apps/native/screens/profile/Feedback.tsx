/**
 * Tester feedback (src/screens/profile/FeedbackSheet.tsx): each key area (a rating and an optional
 * note), what they'd like to see, then a review. Sending opens the email app with it all filled in
 * (core/domain/feedback.ts); "Copy instead" copies it (expo-clipboard). Closing by accident keeps the
 * answers while the app is open; they clear once it's sent.
 */
import { useEffect, useState } from 'react'
import { Linking, Platform, Text, View } from 'react-native'
import * as Clipboard from 'expo-clipboard'
import Constants from 'expo-constants'
import { useStore } from '@/store/store'
import { FEEDBACK_AREAS, FEEDBACK_TO, feedbackEmail, feedbackMailto, hasFeedback, type FeedbackAnswers } from '@/core/domain/feedback'
import { FEEDBACK as F } from '@/copy/profile'
import { num, tx, useTokens } from '../../lib/theme'
import { Btn, Card } from '../../lib/ui/kit'
import { BackButton, Sheet } from '../../lib/ui/primitives'
import { foot, sub } from './text'

const STEPS = FEEDBACK_AREAS.length + 3 // intro, the areas, open questions, review
const EMPTY: FeedbackAnswers = { areas: {}, wishes: '', other: '' }
// the unsent draft, kept while the app is open (a stray tap on the backdrop shouldn't lose it)
let draft: { step: number; a: FeedbackAnswers } = { step: 0, a: EMPTY }

/** The app version and build, where the web sends its service-worker cache name. */
function appVersion(): string | undefined {
  const c = Constants.expoConfig
  const build = Platform.OS === 'ios' ? c?.ios?.buildNumber : c?.android?.versionCode
  return c?.version ? `native ${c.version}${build ? ` (${build})` : ''}` : undefined
}

export function FeedbackSheet({ onClose }: { onClose: () => void }) {
  const t = useTokens()
  const showToast = useStore((s) => s.showToast)
  const [step, setStep] = useState(draft.step)
  const [a] = useState<FeedbackAnswers>(draft.a)
  useEffect(() => { draft = { step, a } }, [step, a])
  const [opened, setOpened] = useState(false)

  const email = feedbackEmail(a, { version: appVersion(), device: `${Platform.OS} ${Platform.Version}` })
  const next = () => setStep((s) => Math.min(STEPS - 1, s + 1))
  const back = () => { setOpened(false); setStep((s) => Math.max(0, s - 1)) }
  const area = step >= 1 && step <= FEEDBACK_AREAS.length ? FEEDBACK_AREAS[step - 1] : null
  const copy = async () => {
    try { await Clipboard.setStringAsync(email.body); showToast(F.copied(FEEDBACK_TO)) } catch { showToast(F.copyFailed) }
  }
  const ready = hasFeedback(a)
  const q = [tx(22, 600, 28, -0.01), { color: t.label, marginTop: 4, marginBottom: 6 }]
  const hint = [foot(t), { paddingTop: 0, paddingHorizontal: 0, paddingBottom: 12 }]

  return (
    <Sheet title={F.title} tall onClose={onClose} left={step > 0 ? <BackButton onPress={back} /> : undefined}
      right={step > 0 ? <Text style={[sub(t), num]}>{F.of(step, STEPS - 1)}</Text> : undefined}>
      {step === 0 && (
        <View>
          <Text style={q}>{F.introT}</Text>
          <Text style={[sub(t), { marginBottom: 10 }]}>{F.intro}</Text>
          <Text style={[sub(t), { marginBottom: 10 }]}>{F.goesTo(FEEDBACK_TO)}</Text>
        </View>
      )}

      {area && (
        <View>
          <Text style={q}>{area.question}</Text>
          <Text style={hint}>{area.hint}</Text>
          {/* TODO(N1-followup): the `.scale` rating radios (FEEDBACK_RATINGS, tap again to clear) setting a.areas[area.id].rating (src/screens/profile/FeedbackSheet.tsx) */}
          {/* TODO(N1-followup) item 1, textarea: F.note, placeholder F.optional, setting a.areas[area.id].note */}
        </View>
      )}

      {step === FEEDBACK_AREAS.length + 1 && (
        <View>
          <Text style={q}>{F.wishesT}</Text>
          <Text style={hint}>{F.wishesHint}</Text>
          {/* TODO(N1-followup) item 1, textareas: a.wishes (5 rows), then F.other with a.other (3 rows), placeholders F.optional */}
        </View>
      )}

      {step === STEPS - 1 && (
        <View>
          <Text style={q}>{F.readyT}</Text>
          {/* `.card.fb-preview` */}
          <Card style={{ marginBottom: 12 }}><Text style={[tx(13, 400, 1.4), { color: t.label2 }]}>{email.body}</Text></Card>
          <Text style={hint}>{opened ? F.opened(FEEDBACK_TO) : (ready ? F.opens(FEEDBACK_TO) : F.answerOne) + F.included}</Text>
          <View style={{ gap: 8, marginTop: 4 }}>
            {opened
              ? <Btn title={F.done} onPress={() => { draft = { step: 0, a: EMPTY }; onClose() }} />
              : <Btn title={F.send} disabled={!ready} onPress={() => { void Linking.openURL(feedbackMailto(email)); setOpened(true); draft = { step: 0, a: EMPTY } }} />}
            <Btn kind="gray" title={F.copy} disabled={!ready} onPress={() => void copy()} />
          </View>
        </View>
      )}

      {step < STEPS - 1 && <View style={{ marginTop: 16 }}><Btn title={step === 0 ? F.start : F.next} onPress={next} /></View>}
    </Sheet>
  )
}
