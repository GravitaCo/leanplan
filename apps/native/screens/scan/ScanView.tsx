/**
 * Scan a pack's barcode: the web's src/screens/food/ScanView.tsx on lib/ui. The live camera (Tilo's
 * camera module reading barcodes natively), a photo of the barcode (Take Photo with the live camera,
 * or one from the library, as Safari's file input offers), or the number typed in. A valid code is
 * looked up on the device first (a food saved from an earlier scan opens at once, offline too),
 * then on Tilo's shared product list, then on Open Food Facts; anything else goes to Create a food
 * with the barcode filled in (src/data/scanLookup.ts, the web's own). Logging never waits on the
 * network. Behaviour: useBarcodeScanner.
 */
import { useRef } from 'react'
import { ActionSheetIOS, Platform, Text, View } from 'react-native'
import type { MealSlot } from '@/core/types'
import type { ScanOutcome } from '@/data/scanLookup'
import { SCAN, SCAN_CAMERA_NOTE, SCAN_TITLE } from '@/copy/scan'
import { num, useTokens } from '../../lib/theme'
import { BackButton, Sheet, SettingRow } from '../../lib/ui/primitives'
import { Btn, List } from '../../lib/ui/kit'
import { Foot, Lbl } from '../../lib/ui/text'
import { TiloCameraView, type TiloCameraViewRef } from '../../modules/tilo-camera'
import { useBarcodeScanner, type ScanMessage } from './useBarcodeScanner'
import { ScanBox } from './parts'
import { Empty, FRow, Note } from './pending'

const MESSAGE: Record<ScanMessage, string> = { 'bad-check': SCAN.badCheck, 'no-barcode': SCAN.noBarcode, 'photo-unreadable': SCAN.photoUnreadable }

export type { ScanOutcome }

export function ScanView({ onBack, onClose, animate = true, onResult }: {
  meal: MealSlot; setMeal: (m: MealSlot) => void; onBack?: () => void; onClose: () => void; animate?: boolean
  onResult: (r: ScanOutcome) => void
}) {
  const t = useTokens()
  const s = useBarcodeScanner(onResult)
  const camRef = useRef<TiloCameraViewRef | null>(null)
  const left = onBack ? <BackButton onPress={onBack} /> : undefined
  const live = s.camera === 'starting' || s.camera === 'on'

  // Safari's file input offers taking a photo or choosing one; without a running camera, the library
  const choosePhoto = () => {
    if (s.camera !== 'on' || Platform.OS !== 'ios') { s.scanPhoto(null); return }
    const o = SCAN.photoSource
    ActionSheetIOS.showActionSheetWithOptions({ options: [o.take, o.library, o.cancel], cancelButtonIndex: 2 }, (i) => {
      if (i === 0) s.scanPhoto(camRef.current)
      else if (i === 1) s.scanPhoto(null)
    })
  }

  if (s.busy) {
    return (
      <Sheet title={SCAN_TITLE} onClose={onClose} animate={animate} left={left}>
        <Empty>{SCAN.lookingUp} <Text style={num}>{s.busy}</Text>…{'\n'}{SCAN.lookingUpAfter}</Empty>
      </Sheet>
    )
  }

  return (
    <Sheet title={SCAN_TITLE} onClose={onClose} animate={animate} left={left}>
      {live ? (
        <ScanBox>
          <TiloCameraView ref={camRef} style={{ flex: 1 }} accessibilityLabel="Camera view" {...s.cameraProps} />
        </ScanBox>
      ) : (
        <Note>{SCAN_CAMERA_NOTE[s.camera === 'denied' ? 'denied' : 'none']}</Note>
      )}
      {live && <Foot style={{ textAlign: 'center' }}>{s.camera === 'starting' ? SCAN.starting : SCAN.hold}</Foot>}
      {s.message && <Note alert>{MESSAGE[s.message]}</Note>}

      <List icons style={{ marginTop: 14 }}>
        <SettingRow icon="camera" color={t.tint} label={s.readingPhoto ? SCAN.readingPhoto : SCAN.takePhoto} sub={SCAN.photoSub} onPress={choosePhoto} />
      </List>

      <Lbl>{SCAN.orType}</Lbl>
      <List>
        <FRow label={SCAN.barcode} value={s.typed} onChange={s.setTyped} placeholder={SCAN.placeholder}
          inputProps={{ keyboardType: 'number-pad', autoComplete: 'off', autoCorrect: false, returnKeyType: 'search', onSubmitEditing: s.submitTyped }} />
      </List>
      <View style={{ marginTop: 16 }}><Btn kind="tinted" title={SCAN.lookUp} disabled={!s.canSubmit} onPress={s.submitTyped} /></View>
      <Foot>{SCAN.source}</Foot>
    </Sheet>
  )
}
