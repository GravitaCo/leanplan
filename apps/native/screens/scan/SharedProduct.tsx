/**
 * Tilo's shared product list in the add-food flow, as the web's src/screens/food/SharedProduct.tsx
 * (Design canvas "Shared products", approved by Benn 10 Oct 2026; sp-7 to sp-9 approved 11 Oct):
 * the source card a found product opens with (sp-2, sp-3, sp-3b), its margin (One serving), the
 * one-time opt-in (sp-1, compliance's copy word for word), the report sheet (sp-6), the Share this
 * product row (sp-7, sp-7b) and the sheet saying Open Food Facts already has it (sp-8a).
 * Words from src/copy/scan.ts; logic from src/core and src/data, as the web.
 */
import { useState } from 'react'
import { View } from 'react-native'
import * as WebBrowser from 'expo-web-browser'
import { useStore } from '@/store/store'
import { LEGAL_URLS } from '@/core/legal'
import { marginNote, sourceCard, tierErr, type SharedInfo } from '@/core/domain/sharedProduct'
import { reportShared, type ReportReason } from '@/data/sharedProducts'
import { IN_OFF, ONE_SERVING, OPT_IN, REPORT, REPORT_TOAST, SHARE_ROW } from '@/copy/scan'
import { LEGAL_LABEL } from '@/copy/legal'
import { useTokens } from '../../lib/theme'
import { BareSheet, Sheet, SettingRow } from '../../lib/ui/primitives'
import { Btn, LinkBtn, List } from '../../lib/ui/kit'
import { Foot } from '../../lib/ui/text'
import { ReasonList, ReportHead, ServingMargin, SheetBody, SheetTitle, SourceCard, SpTile } from './parts'

/** sp-2 / sp-3 / sp-3b: where the numbers came from, with Report this product under it. */
export function SharedSourceCard({ info, barcode, onReport }: { info: SharedInfo; barcode: string; onReport: () => void }) {
  const card = sourceCard(info)
  const icon = info.tier === 'verified' ? 'checkc' : info.tier === 'counted' ? 'pages' : 'people'
  return <SourceCard icon={icon} stroke={info.tier === 'verified' ? 2 : 1.8} title={card.title} sub={card.sub} barcode={`Barcode ${barcode}`} report={REPORT.title} onReport={onReport} />
}

/** One serving, with the tier's margin and the line that explains it. Nothing until a serving is set. */
export function SharedServing({ info, kcal }: { info: SharedInfo; kcal: number }) {
  if (!(kcal > 0)) return null
  const k = Math.round(kcal)
  return (
    <>
      <ServingMargin label={ONE_SERVING} kcal={k} margin={Math.round(k * tierErr(info.tier))} />
      <Foot>{marginNote(info.tier)}</Foot>
    </>
  )
}

/** The terms link under the opt-in (the web opens the website's page in a new tab).
 *  TODO(N2): use N2's legal link once it exists, so every legal link opens the same way. */
function TermsLink() {
  return <LinkBtn title={LEGAL_LABEL.terms} onPress={() => { void WebBrowser.openBrowserAsync(LEGAL_URLS.terms) }} style={{ paddingHorizontal: 0, fontSize: 13, lineHeight: 18 }} />
}

/** sp-1: compliance's copy, word for word, then a link to the terms (where the sharing licence
 *  lives). Either answer saves the food; no never blocks anything; closing it counts as Not now. */
export function ShareOptInSheet({ onAnswer }: { onAnswer: (yes: boolean) => void }) {
  return (
    <BareSheet label={OPT_IN.title} onClose={() => onAnswer(false)}>
      <View style={{ paddingTop: 2, paddingHorizontal: 4 }}>
        <SpTile icon="people" size={20} />
        <SheetTitle>{OPT_IN.title}</SheetTitle>
        <SheetBody>{OPT_IN.body}</SheetBody>
        <View style={{ marginTop: 2, alignItems: 'flex-start' }}><TermsLink /></View>
        <Btn title={OPT_IN.yes} onPress={() => onAnswer(true)} style={{ marginTop: 24 }} />
        <Btn kind="gray" title={OPT_IN.no} onPress={() => onAnswer(false)} style={{ marginTop: 8 }} />
      </View>
    </BareSheet>
  )
}

/** sp-6: anonymous. Send stays off until an option is picked (canvas note s-sp). */
export function ReportProductSheet({ name, barcode, version, onClose }: { name: string; barcode: string; version: number; onClose: () => void }) {
  const showToast = useStore((s) => s.showToast)
  const [why, setWhy] = useState<ReportReason | null>(null)
  const [busy, setBusy] = useState(false)
  const send = async () => {
    if (!why || busy) return
    setBusy(true)
    const r = await reportShared(barcode, version, why)
    setBusy(false)
    showToast(REPORT_TOAST[r])
    if (r === 'sent') onClose()
  }
  return (
    <Sheet title={REPORT.title} onClose={onClose}>
      <ReportHead name={name} barcode={`Barcode ${barcode}`} />
      <SheetTitle legend>{REPORT.what}</SheetTitle>
      <ReasonList options={REPORT.reasons} value={why} onChange={setWhy} label={REPORT.what} />
      <Btn title={REPORT.send} disabled={!why || busy} onPress={() => void send()} style={{ marginTop: 24 }} />
    </Sheet>
  )
}

/** sp-7: at the foot of a saved food's sheet, under Add (N5's portion view). Offline it stays in
 *  view, off, with its line (sp-7b). TODO(N1-followup): the dim `.li.needsnet` row from P1b. */
export function ShareProductRow({ state, busy, onShare }: { state: 'on' | 'offline'; busy?: boolean; onShare: () => void }) {
  const t = useTokens()
  return (
    <>
      <List icons style={{ marginTop: 18 }}>
        {state === 'on'
          ? <SettingRow icon="people" color={t.tint} label={SHARE_ROW.title} sub={SHARE_ROW.sub} onPress={busy ? undefined : onShare} />
          : <SettingRow icon="people" color={t.fill2} soft label={SHARE_ROW.title} sub={SHARE_ROW.sub} />}
      </List>
      {state === 'offline' && <Foot>{SHARE_ROW.offline}</Foot>}
    </>
  )
}

/** sp-8a: Open Food Facts has the product, so nothing is shared. OK (or closing it) and the row goes. */
export function InOffSheet({ onOk }: { onOk: () => void }) {
  return (
    <BareSheet label={IN_OFF.title} onClose={onOk}>
      <View style={{ paddingTop: 2, paddingHorizontal: 4 }}>
        <SpTile icon="bars" size={22} />
        <SheetTitle>{IN_OFF.title}</SheetTitle>
        <SheetBody>{IN_OFF.body}</SheetBody>
        <Btn title={IN_OFF.ok} onPress={onOk} style={{ marginTop: 24 }} />
      </View>
    </BareSheet>
  )
}
