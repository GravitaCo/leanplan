/**
 * Every scan screen in its states, for design review and the parity screenshots (app/scan-preview,
 * e2e builds only: never in a release bundle). `?s=` picks one: scan, label, confirm-<draft>,
 * share-<draft>, optin, report, inoff, row-on, row-offline. Nothing here is a screen of its own:
 * each state renders the real component with fixed data.
 */
import { useMemo } from 'react'
import { View } from 'react-native'
import { useLocalSearchParams } from 'expo-router'
import type { Food } from '@/core/types'
import { useTokens } from '../../lib/theme'
import { InOffSheet, ReportProductSheet, ScanConfirmView, ScanView, LabelCaptureView, ShareOptInSheet, ShareProductRow } from './index'
import { CODE, previewDrafts } from './previewFixtures'

const noop = () => {}

export function ScanPreview() {
  const t = useTokens()
  const { s = 'scan' } = useLocalSearchParams<{ s?: string }>()
  const drafts = useMemo(previewDrafts, [])
  const common = { meal: 'lunch' as const, setMeal: noop, onBack: noop, onClose: noop }
  let screen: React.ReactNode = null
  if (s === 'scan') screen = <ScanView {...common} onResult={noop} />
  else if (s === 'label') screen = <LabelCaptureView onBack={noop} onClose={noop} barcode={CODE} onDone={noop} />
  else if (s === 'label-share') screen = <LabelCaptureView onBack={noop} onClose={noop} barcode={CODE} onDone={noop} forShare onFail={noop} />
  else if (s.startsWith('confirm-') && drafts[s.slice(8)]) screen = <ScanConfirmView {...common} draft={drafts[s.slice(8)]} onSaved={noop}
      // as the web's host: reading the user's own pack is offered on figures that didn't come from it
      onLabelPhoto={drafts[s.slice(8)].source !== 'label' ? noop : undefined} />
  else if (s.startsWith('share-') && drafts[s.slice(6)]) {
    const saved = { id: 'p1', n: 'Oat & raisin flapjack', k: 442, p: 5.5, c: 58, f: 20, barcode: CODE } as Food
    screen = <ScanConfirmView {...common} draft={drafts[s.slice(6)]} onSaved={noop} shareFor={saved} />
  }
  else if (s === 'optin') screen = <ShareOptInSheet onAnswer={noop} />
  else if (s === 'report') screen = <ReportProductSheet name="Oat & raisin flapjack" barcode={CODE} version={2} onClose={noop} />
  else if (s === 'inoff') screen = <InOffSheet onOk={noop} />
  else if (s === 'row-on' || s === 'row-offline') screen = <View style={{ padding: 16 }}><ShareProductRow state={s === 'row-on' ? 'on' : 'offline'} onShare={noop} /></View>
  return <View style={{ flex: 1, backgroundColor: t.bg }} testID={`scan-preview-${s}`}>{screen}</View>
}
