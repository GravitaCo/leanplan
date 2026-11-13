/**
 * The exercise library, read only (web: screens/train/LibrarySheet.tsx, plan P3): search, filter by
 * kind and kit, and open an entry for its cue, easier and harder steps and a gentler option. In pick
 * mode (the workout builder) tapping an exercise chooses it.
 */
import { useMemo, useRef, useState } from 'react'
import { Image, Pressable, Text, TextInput, View, type HostInstance } from 'react-native'
import * as WebBrowser from 'expo-web-browser'
import type { Equipment, Exercise, Modality } from '@/core/types'
import { EXERCISES } from '@/core/data/exercises'
import { MODALITIES, MODALITY_LABEL } from '@/core/data/modalities'
import { careList, EQUIPMENT_LABEL, LEVEL_LABEL, TARGET_LABEL } from '@/core/data/libraryLabels'
import { exById, stepOf } from '@/core/domain/library'
import { rankByName } from '@/core/domain/search'
import { howToLink } from '@/core/domain/workout'
import { CARE_DISCLAIMER, LIB_KIT, RED_FLAG, fitsKit, inModality } from '@/screens/train/trainCopy'
import { DemoPlayer, type Origin } from './DemoPlayer'
import { Thumb, imageSource, useClipPreview } from './media'
import { ExCard } from './Preview'
import { BackButton, Chip, Chips, Foot, Icon, Li, LiText, List, NavBtn, Shade, Sheet, font, useTokens } from './ui'

function Detail({ x, onOpen }: { x: Exercise; onOpen: (id: string) => void }) {
  const t = useTokens()
  const [demo, setDemo] = useState<Origin | null>(null)
  const media = useRef<HostInstance>(null)
  const openDemo = () => {
    const el = media.current
    if (!el) { setDemo({ x: 0, y: 0, width: 0, height: 0 }); return }
    el.measureInWindow((x: number, y: number, width: number, height: number) => setDemo({ x, y, width, height }))
  }
  const still = useClipPreview(x.video, false)
  const easier = stepOf(x, -1)
  const harder = stepOf(x, 1)
  const gentler = exById(x.gentler)
  const kit = x.equipment.length ? x.equipment.map((q) => EQUIPMENT_LABEL[q]).join(' or ') : 'No equipment'
  return (
    <>
      {x.video && (
        // `.ex-media`: the poster, 4:5 up to 380 tall, focus 30% down, a shade at the foot
        <Pressable accessibilityRole="button" accessibilityLabel={`Play the demo: ${x.n}`} ref={media} onPress={openDemo}
          style={({ pressed }) => ({ width: '100%', aspectRatio: 4 / 5, maxHeight: 380, marginBottom: 10, borderRadius: t.radius, overflow: 'hidden', backgroundColor: t.fill, opacity: pressed ? 0.9 : 1 })}>
          {still.src && <Image source={imageSource(still.src)} onError={still.onError} resizeMode="cover" style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />}
          <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 96 }}><Shade stops={[[0, 0], [1, 0.4]]} /></View>
          <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: 60, height: 60, borderRadius: 30, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', paddingLeft: 3 }}><Icon name="play" size={26} color="#fff" fill /></View>
          </View>
          <Text aria-hidden style={[font(600), { position: 'absolute', left: 16, bottom: 14, fontSize: 15, color: '#fff', textShadowColor: 'rgba(0,0,0,0.35)', textShadowRadius: 8, textShadowOffset: { width: 0, height: 1 } }]}>
            Watch the demo{x.video.durationSec ? ` · ${Math.round(x.video.durationSec)} s` : ''}
          </Text>
        </Pressable>
      )}
      <ExCard n={x.n} tg={x.defaultRx}>
        <Foot style={{ paddingTop: 0, paddingHorizontal: 0, paddingBottom: 8 }}>{[MODALITY_LABEL[x.modality], LEVEL_LABEL[x.difficulty], kit, x.perSide ? 'Each side' : ''].filter(Boolean).join(' · ')}</Foot>
        <Text style={[font(400), { fontSize: 15, lineHeight: 21, color: t.label2, marginTop: 6, marginBottom: 8 }]}>{x.cue}</Text>
        {x.targets?.length ? <Foot style={{ paddingTop: 0, paddingHorizontal: 0 }}>Works on: {x.targets.map((tg) => TARGET_LABEL[tg]).join(', ')}</Foot> : null}
      </ExCard>
      {!x.video && (
        <List><Li onPress={() => { WebBrowser.openBrowserAsync(howToLink(x.n)).catch(() => {}) }}><LiText t="Watch how to do it" s="Opens a video search" /></Li></List>
      )}
      {(easier || harder || gentler) && (
        <List>
          {easier && <Li onPress={() => onOpen(easier.id)}><LiText t={easier.n} s="Easier" /></Li>}
          {harder && <Li onPress={() => onOpen(harder.id)}><LiText t={harder.n} s="Harder, when this feels steady" /></Li>}
          {gentler && <Li onPress={() => onOpen(gentler.id)}><LiText t={gentler.n} s="Gentler" /></Li>}
        </List>
      )}
      {x.care?.length ? (
        <Foot style={{ paddingTop: 12, paddingHorizontal: 4 }}>This move asks quite a lot of {careList(x.care)}.{gentler ? " If you'd like to go easier on them, the gentler option above works the same area." : ''} {CARE_DISCLAIMER}</Foot>
      ) : null}
      <Foot style={{ paddingTop: 12, paddingHorizontal: 4 }}>{RED_FLAG}</Foot>
      {demo && x.video && <DemoPlayer back origin={demo.width ? demo : undefined} ex={{ n: x.n, t: x.defaultRx ?? '', cue: x.cue, video: x.video }} onClose={() => setDemo(null)} />}
    </>
  )
}

export function LibrarySheet({ onClose, initial, onPick }: {
  onClose: () => void
  /** open straight at this entry */
  initial?: string
  /** pick mode (the workout builder): tapping an exercise chooses it */
  onPick?: (id: string) => void
}) {
  const t = useTokens()
  const [q, setQ] = useState('')
  const [mod, setMod] = useState<Modality | null>(null)
  const [kit, setKit] = useState<Equipment | 'none' | null>(null)
  const [open, setOpen] = useState<string[]>(initial ? [initial] : [])
  const cur = exById(open[open.length - 1])

  const list = useMemo(() => {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean)
    const pool = EXERCISES.filter((x) => (!mod || inModality(x, mod)) && fitsKit(x, kit))
    return words.length ? rankByName(pool, (x) => x.n, words) : [...pool].sort((a, b) => a.n.localeCompare(b.n))
  }, [q, mod, kit])

  // the list and the entries share one sheet, as on the web (an entry opens at its top)
  return (
    <Sheet title={cur ? cur.n : onPick ? 'Add an exercise' : 'Exercise library'} onClose={onClose} tall scrollKey={cur?.id ?? ''}
      left={cur ? <BackButton onPress={() => setOpen(open.slice(0, -1))} /> : <NavBtn title={onPick ? 'Cancel' : 'Done'} onPress={onClose} />}>
      {cur ? <Detail key={cur.id} x={cur} onOpen={(id) => setOpen([...open, id])} /> : <>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: t.fill, borderRadius: 10, paddingHorizontal: 8, height: 38 }}>
        <Icon name="search" size={20} color={t.label2} />
        <TextInput value={q} placeholder="Search exercises" placeholderTextColor={t.label2} accessibilityLabel="Search exercises" onChangeText={setQ}
          style={[font(400), { flex: 1, fontSize: 17, color: t.label, padding: 0 }]} autoCorrect={false} />
      </View>
      <Chips label="Kind" style={{ marginTop: 12, marginBottom: 8 }}>
        {MODALITIES.map((m) => <Chip key={m} title={MODALITY_LABEL[m]} on={mod === m} onPress={() => setMod(mod === m ? null : m)} />)}
      </Chips>
      <Chips label="Equipment" style={{ marginBottom: 12 }}>
        {LIB_KIT.map(([k, label]) => <Chip key={k} title={label} on={kit === k} onPress={() => setKit(kit === k ? null : k)} />)}
      </Chips>
      {list.length ? (
        <List inset={72}>
          {list.map((x) => (
            <Li key={x.id} label={x.n} onPress={() => (onPick ? onPick(x.id) : setOpen([x.id]))} style={{ minHeight: 64 }}>
              <Thumb video={x.video} play={!!x.video} />
              <LiText t={x.n} s={`${MODALITY_LABEL[x.modality]} · ${LEVEL_LABEL[x.difficulty]}`} />
            </Li>
          ))}
        </List>
      ) : (
        <Foot style={{ paddingTop: 0, paddingHorizontal: 4 }}>Nothing matches. Try fewer filters.</Foot>
      )}
      </>}
    </Sheet>
  )
}
