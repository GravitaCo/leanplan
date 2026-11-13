/**
 * Photograph a pack's nutrition panel (and, optionally, its front for the name), then have it read:
 * the web's src/screens/food/LabelCaptureView.tsx on lib/ui. Live checks on the camera's frames say
 * what to change (light, glare, focus) before capture; "Capture anyway" and a photo from the
 * library are always there. The photo is made small on the phone, sent once to be read, and
 * deleted: Tilo never keeps it.
 *
 * Anything but a good read (offline, not signed in, slow, the daily cap, an error) opens the
 * confirm view to type the label in, so this is never a dead end. For "Share this product"
 * (`forShare`, sp-8b) it opens with one line saying why and offers no "Type it in instead"; a
 * failed read goes back to the food (`onFail`) and nothing is shared.
 *
 * Behaviour lives in the shared and UI-free modules: useLabelCamera (camera, live line, capture,
 * pick), labelPhoto (resize, re-encode, delete), src/data/labelRead (gates, consent, the read).
 */
import { useEffect, useRef, useState } from 'react'
import { Text, View } from 'react-native'
import { useStore } from '@/store/store'
import { consentLetsSync, hasCurrentConsent } from '@/data/consent'
import { readLabel } from '@/data/labelReader'
import { readPhotos, typedDraft } from '@/data/labelRead'
import { FOODS } from '@/core/data/foods'
import type { ScanDraft } from '@/core/domain/barcode'
import { QUALITY_PROMPT } from '@/core/domain/labelQuality'
import { CONSENT, GUIDANCE, LABEL, LABEL_CAMERA_NOTE, LABEL_TITLE, SHARE_LABEL_NOTE } from '@/copy/scan'
import { tx, useTokens } from '../../lib/theme'
import { BackButton, NavBtn, Row, Sheet, SettingRow } from '../../lib/ui/primitives'
import { Btn, Card, List } from '../../lib/ui/kit'
import { Foot, Sub } from '../../lib/ui/text'
import { TiloCameraView } from '../../modules/tilo-camera'
import { useLabelCamera } from './useLabelCamera'
import { discardAll, discardShot, type Shot } from './labelPhoto'
import { ScanBox, ThumbRow } from './parts'
import { Empty, Note } from './pending'

type Step = 'consent' | 'panel' | 'front' | 'review' | 'reading'

export function LabelCaptureView({ onBack, onClose, animate = true, barcode, base, onDone, forShare, onFail }: {
  onBack?: () => void; onClose: () => void; animate?: boolean
  /** a barcode scanned in the same session: saved with the food */
  barcode?: string
  /** the Open Food Facts draft this photo replaces the numbers of */
  base?: ScanDraft
  /** the confirm view's starting point; `notice` when the photo couldn't be read */
  onDone: (draft: ScanDraft, notice?: string) => void
  /** opened from a saved food's "Share this product" (sp-8b) */
  forShare?: boolean
  /** share mode: the read failed (why, as a short line) */
  onFail?: (note: string) => void
}) {
  const t = useTokens()
  const customFoods = useStore((s) => s.data.customFoods)
  const grantConsent = useStore((s) => s.grantConsent)
  // the notice again when the yes was to older wording (CONSENT_VERSIONS['label-photo'])
  const [step, setStep] = useState<Step>(() => (hasCurrentConsent(useStore.getState().data, 'label-photo') ? 'panel' : 'consent'))
  const [panel, setPanel] = useState<Shot | null>(null)
  const [front, setFront] = useState<Shot | null>(null)
  const aliveRef = useRef(true)
  const readRef = useRef<AbortController | null>(null)
  const isFront = step === 'front'
  const cam = useLabelCamera(isFront ? 'front' : 'panel', step === 'panel' || step === 'front')

  const taken = () => FOODS.concat(customFoods || []).map((f) => f.n)
  const typeInstead = (notice?: string) => onDone(typedDraft({ barcode, base, taken: taken() }), notice)

  // photos live only while this view is open: every file goes when it closes
  useEffect(() => () => {
    aliveRef.current = false
    readRef.current?.abort()
    discardAll()
  }, [])

  const keep = (shot: Shot | null) => {
    if (!shot || !aliveRef.current) return
    if (isFront) { discardShot(front); setFront(shot) } else { discardShot(panel); setPanel(shot) }
    setStep('review')
  }

  const read = async () => {
    if (!panel) return
    setStep('reading')
    const ctl = new AbortController()
    readRef.current = ctl
    const st = useStore.getState
    const out = await readPhotos({
      photos: async () => ({ panel: panel.base64, ...(front ? { front: front.base64 } : {}) }),
      barcode, base, taken: taken(), forShare: !!(forShare && onFail),
    }, {
      consentLetsSync: () => consentLetsSync(st().data), underAge: () => !!st().underAge, flushConsents: () => st().flushConsents(),
      readLabel, discard: discardAll, signal: ctl.signal,
    })
    if (!aliveRef.current) return
    if (out.kind === 'share-failed') { onFail?.(out.note); return }
    onDone(out.draft, out.notice)
  }

  const left = onBack ? <BackButton onPress={onBack} /> : undefined

  if (step === 'consent') {
    return (
      <Sheet title={LABEL_TITLE} onClose={onClose} animate={animate} left={left}>
        <Card plain style={{ padding: 16 }}>
          <Text accessibilityRole="header" style={[tx(17, 600), { color: t.label, marginBottom: 6 }]}>{LABEL.before}</Text>
          <Sub>{CONSENT}</Sub>
          <Foot style={{ paddingTop: 10, paddingHorizontal: 0 }}>{LABEL.nothingElse}</Foot>
        </Card>
        <View style={{ gap: 8, marginTop: 16 }}>
          <Btn kind="tinted" title={LABEL.ok} onPress={() => { grantConsent('label-photo'); setStep('panel') }} />
          {!forShare && <Btn kind="gray" title={LABEL.typeInstead} onPress={() => typeInstead()} />}
        </View>
      </Sheet>
    )
  }

  if (step === 'reading') {
    return (
      <Sheet title={LABEL_TITLE} onClose={onClose} animate={animate} left={left}>
        <Empty>{LABEL.reading}</Empty>
      </Sheet>
    )
  }

  if (step === 'review' && panel) {
    return (
      <Sheet title={LABEL_TITLE} onClose={onClose} animate={animate} left={left}>
        <List icons>
          <ThumbRow uri={panel.uri} alt={LABEL.tableAlt} title={LABEL.table}
            sub={panel.issue ? LABEL.hardToRead + QUALITY_PROMPT[panel.issue].toLowerCase() : LABEL.ready}
            right={<NavBtn title={LABEL.retake} onPress={() => setStep('panel')} />} />
          {front
            ? <ThumbRow uri={front.uri} alt={LABEL.frontAlt} title={LABEL.front} sub={LABEL.forName}
                right={<NavBtn title={LABEL.remove} onPress={() => { discardShot(front); setFront(null) }} />} />
            : <SettingRow icon="camera" color={t.fill} soft label={LABEL.addFront} sub={LABEL.addFrontSub} onPress={() => setStep('front')} />}
        </List>
        <View style={{ marginTop: 16 }}><Btn kind="tinted" title={LABEL.read} onPress={() => void read()} /></View>
        <Foot>{LABEL.readOnce}</Foot>
      </Sheet>
    )
  }

  const showLive = cam.camera === 'starting' || cam.camera === 'on'
  const prompt = cam.camera === 'starting' ? LABEL.starting : cam.issue ? QUALITY_PROMPT[cam.issue] : cam.issue === null ? LABEL.looksGood : LABEL.checking
  const error = cam.error === 'unusable' ? LABEL.unusable : cam.error === 'unopenable' ? LABEL.unopenable : null
  return (
    <Sheet title={LABEL_TITLE} onClose={onClose} animate={animate} left={isFront ? <BackButton onPress={() => setStep('review')} /> : left}>
      {forShare && !isFront && <Note style={{ marginTop: 0 }}>{SHARE_LABEL_NOTE}</Note>}
      <Foot style={{ paddingTop: forShare && !isFront ? 12 : 0, paddingHorizontal: 4, paddingBottom: 10 }}>{isFront ? LABEL.fitFront : GUIDANCE}</Foot>
      {showLive ? (
        <ScanBox tall>
          <TiloCameraView ref={cam.ref} style={{ flex: 1 }} accessibilityLabel="Camera view" {...cam.cameraProps} />
        </ScanBox>
      ) : (
        <Note>{LABEL_CAMERA_NOTE[cam.camera === 'denied' ? 'denied' : 'none']}</Note>
      )}
      {showLive && <Foot style={{ textAlign: 'center' }}>{prompt}</Foot>}
      {error && <Note alert>{error}</Note>}
      {cam.camera === 'on' && (
        <View style={{ gap: 8, marginTop: 16 }}>
          <Btn kind="tinted" title={LABEL.capture} disabled={!cam.ready || cam.busy} onPress={() => void cam.capture().then(keep)} />
          {!cam.ready && <Btn kind="gray" title={LABEL.captureAnyway} disabled={cam.busy} onPress={() => void cam.capture().then(keep)} />}
        </View>
      )}
      <List icons style={{ marginTop: 14 }}>
        <SettingRow icon="camera" color={t.tint} label={LABEL.choose} sub={isFront ? LABEL.chooseFrontSub : LABEL.choosePanelSub}
          onPress={() => void cam.choose().then(keep)} />
        {!isFront && !forShare ? <Row title={LABEL.typeInstead} onPress={() => typeInstead()} /> : null}
      </List>
    </Sheet>
  )
}
