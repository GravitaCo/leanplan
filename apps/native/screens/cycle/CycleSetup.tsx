/**
 * Cycle setup (boards A2, A3, B1, B2, B3, B3b; approved by Benn 22 Nov 2026; native only). Opened
 * from Profile's "Your cycle" row (Tracking, women-only offer) or Privacy's (anyone 18+ with a health
 * yes; Sara, 22 Nov). Order: the offer (A2), the cycle consent (B1, skipped when a current cycle
 * yes is already on the phone), the one question (B2), how it works (B3). "I don't have periods"
 * closes it (A3) and keeps no reason. The consent is recorded at B1's Continue; Cycle is "on" once
 * B3's "Turn on Your cycle" saves the answer. The words are text.ts's; the rules are core's.
 */
import { useState } from 'react'
import { ScrollView, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { selectCycle, useStore } from '@/store/store'
import { cycleAllowed } from '@/data/consent'
import { setSetup, type CycleSetup } from '@/core/domain/cycle'
import { todayStr } from '@/core/domain/date'
import { GLYPH_ROOM, tx, useTokens } from '../../lib/theme'
import { Btn, Card, LinkBtn } from '../../lib/ui/kit'
import { BackButton, BareSheet } from '../../lib/ui/primitives'
import { ConsentRow, Opts, Ticks } from '../../lib/ui/choices'
import { Icon } from '../../lib/ui/icons'
import { Foot, Lbl } from '../../lib/ui/text'
import { openLegal } from '../../lib/account/legal'
import { CY, SETUP_LINE, SETUP_OPTS, setupLabel } from './text'

type Step = 'offer' | 'consent' | 'question' | 'works'

/** A page with a back button, a large title and a scrolling body (as Health check answers). */
function Page({ back, onBack, eyebrow, title, lead, children }: { back: string; onBack: () => void; eyebrow?: string; title: string; lead?: string; children: React.ReactNode }) {
  const t = useTokens()
  const insets = useSafeAreaInsets()
  return (
    <View style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 18, paddingHorizontal: 16, paddingBottom: insets.bottom + 40, gap: 16 }}>
        <View style={{ marginLeft: -6 }}><BackButton label={back} onPress={onBack} /></View>
        {eyebrow ? <Text style={[tx(13, 600), { color: t.tint, marginBottom: -12 }]}>{eyebrow}</Text> : null}
        <Text accessibilityRole="header" style={[tx(32, 600, 38, -0.02), GLYPH_ROOM, { color: t.label }]}>{title}</Text>
        {lead ? <Text style={[tx(16, 400, 1.45), { color: t.label2, marginTop: -8 }]}>{lead}</Text> : null}
        {children}
      </ScrollView>
    </View>
  )
}

/** A2's "What Tilo won't do": grey dashes, not ticks. */
function Dashes({ items }: { items: readonly string[] }) {
  const t = useTokens()
  return (
    <View role="list" style={{ gap: 10 }}>
      {items.map((s) => (
        <View key={s} role="listitem" style={{ flexDirection: 'row', gap: 10 }}>
          <Text style={[tx(15, 600, 1.45), { color: t.label3, width: 16, textAlign: 'center' }]}>–</Text>
          <Text style={[tx(15, 400, 1.45), { color: t.label2, flex: 1 }]}>{s}</Text>
        </View>
      ))}
    </View>
  )
}

/**
 * The whole setup, or (with `change`) just the B2 question from the Cycle page's "Which fits you
 * best". `onClose`: back to where it was opened; `onOn`: on to the Cycle page. `onNone` (with
 * `change`): "I don't have periods" from the page, which deletes the log, so the page confirms it.
 */
export function CycleSetupFlow({ onClose, onOn, change, onNone }: { onClose: () => void; onOn: () => void; change?: boolean; onNone?: () => void }) {
  const t = useTokens()
  const log = useStore(selectCycle)
  const allowed = useStore((s) => cycleAllowed(s.data))
  const grantConsent = useStore((s) => s.grantConsent)
  const editCycle = useStore((s) => s.editCycle)
  const hide = useStore((s) => s.hideCycleOffer)
  const [step, setStep] = useState<Step>(change ? 'question' : 'offer')
  const [agreed, setAgreed] = useState(false)
  // B2 is never pre-selected: Continue waits for a choice (a change starts from the saved answer)
  const [pick, setPick] = useState<CycleSetup | undefined>(change ? log?.setup : undefined)
  const [closed, setClosed] = useState(false)

  const none = () => { hide(true); setClosed(true) }
  const a3 = closed && (
    <BareSheet label={CY.closed.title} onClose={onClose}>
      <Text accessibilityRole="header" style={[tx(24, 600, 1.2), GLYPH_ROOM, { color: t.label, marginBottom: 8 }]}>{CY.closed.title}</Text>
      <Text style={[tx(16, 400, 1.45), { color: t.label2, marginBottom: 20 }]}>{CY.closed.body}</Text>
      <Btn title={CY.closed.done} onPress={onClose} />
      <Foot style={{ textAlign: 'center', paddingTop: 12 }}>{CY.closed.foot}</Foot>
    </BareSheet>
  )

  if (step === 'offer') return (
    <>
      <Page back={CY.offer.back} onBack={onClose} title={CY.offer.title} lead={CY.offer.lead}>
        <View>
          <Lbl>{CY.offer.willH}</Lbl>
          {/* the ticks in the mind ink (board A2) */}
          <Ticks items={[...CY.offer.will]} color={t.mindInk} />
        </View>
        <View>
          <Lbl>{CY.offer.wontH}</Lbl>
          <Card><Dashes items={CY.offer.wont} /></Card>
        </View>
        <Foot style={{ paddingHorizontal: 0, paddingTop: 0 }}>{CY.offer.foot}</Foot>
        <Btn title={CY.offer.setUp} onPress={() => setStep(allowed ? 'question' : 'consent')} />
        <View style={{ alignItems: 'center', gap: 4 }}>
          <LinkBtn title={CY.offer.notNow} onPress={onClose} />
          <LinkBtn title={CY.offer.none} muted onPress={none} />
        </View>
      </Page>
      {a3}
    </>
  )

  if (step === 'consent') return (
    <Page back={CY.question.back} onBack={() => setStep('offer')} title={CY.consent.title} lead={CY.consent.sub}>
      <Card>
        <ConsentRow label={CY.consent.box.before + CY.consent.box.link + CY.consent.box.after} on={agreed} onChange={setAgreed}>
          {CY.consent.box.before}
          <Text accessibilityRole="link" onPress={() => openLegal('privacy')} style={{ color: t.tint }}>{CY.consent.box.link}</Text>
          {CY.consent.box.after}
        </ConsentRow>
      </Card>
      {/* never pre-ticked; the yes is recorded here (consent.ts grantCycle needs a current health yes) */}
      <Btn title={CY.consent.cont} disabled={!agreed} onPress={() => { grantConsent('cycle'); setStep('question') }} />
      <Btn kind="gray" title={CY.consent.notNow} onPress={onClose} />
      <Foot style={{ textAlign: 'center' }}>{CY.consent.foot}</Foot>
    </Page>
  )

  if (step === 'question') return (
    <>
      <Page back={CY.question.back} onBack={change ? onClose : () => setStep('offer')} eyebrow={CY.question.eyebrow} title={CY.question.title} lead={CY.question.lead}>
        <Opts label={CY.question.title} opts={SETUP_OPTS.map(([k, l]) => [k, l] as [CycleSetup, string])} value={pick} onPick={setPick} />
        <Btn title={CY.question.cont} disabled={!pick} onPress={() => {
          if (!pick) return
          // from the Cycle page, "I don't have periods" deletes the log: it goes through D5's confirm
          if (pick === 'none') { if (change && onNone) onNone(); else none(); return }
          if (change) { editCycle((l) => setSetup(l, pick, todayStr())); onOn(); return }
          setStep('works')
        }} />
      </Page>
      {a3}
    </>
  )

  // B3 (pick is set and isn't 'none' here)
  const chosen = pick as Exclude<CycleSetup, 'none'>
  return (
    <Page back={CY.question.back} onBack={() => setStep('question')} eyebrow={CY.works.eyebrow} title={CY.works.title}>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <Text style={[tx(13), { color: t.label2 }]}>{CY.works.chose}</Text>
            <Text style={[tx(17, 600), { color: t.label, marginTop: 1 }]}>{setupLabel(chosen)}</Text>
          </View>
          <LinkBtn title={CY.works.change} onPress={() => setStep('question')} />
        </View>
        <Text style={[tx(15, 400, 1.45), { color: t.label, marginTop: 10 }]}>{SETUP_LINE[chosen]}</Text>
      </Card>
      <Card>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <Icon name="key" size={18} color={t.mindInk} />
          <Text style={[tx(17, 600), { color: t.label }]}>{CY.works.phoneH}</Text>
        </View>
        {CY.works.phone.map((p) => <Text key={p} style={[tx(15, 400, 1.45), { color: t.label2, marginTop: 6 }]}>{p}</Text>)}
      </Card>
      <Btn title={CY.works.turnOn} onPress={() => {
        // the answer is the switch: Cycle is on once it's saved (refused without a cycle yes)
        if (editCycle((l) => setSetup(l, chosen, todayStr()))) onOn()
      }} />
    </Page>
  )
}
