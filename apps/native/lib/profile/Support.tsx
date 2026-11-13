/**
 * Profile › Health data › Support and helplines (board ob9-7, note s-ob10), from
 * src/screens/profile/AccountData.tsx SupportSheet and onboarding/Signposts.tsx. Pure UI: no store
 * action, no persisted field, no network (its foot says opening it is private). The nation is this
 * sheet's own state, forgotten on close; the list is signposts.ts's, bundled with the app.
 */
import { useState } from 'react'
import { Linking, Pressable, Text, View } from 'react-native'
import { NATIONS, type UkNation } from '@/core/data/signposts'
import { SUPPORT } from '@/screens/onboarding/copyApp'
import { SUPPORT_MIND } from '@/screens/mind/copy'
import { supportList, type SupportRow } from '@/screens/profile/supportRows'
import { font, num, useTokens } from '../theme'
import { NavBtn, Opts, Sheet, useSurface } from './ui'

const call = (n: string) => { void Linking.openURL('tel:' + n.replace(/\s/g, '')) }

/** onboarding/Signposts.tsx: one row per service; a number calls it, a web link opens it. */
export function Signposts({ list }: { list: SupportRow[] }) {
  const t = useTokens()
  const surface = useSurface()
  return (
    <View style={{ backgroundColor: surface, borderRadius: t.radius, overflow: 'hidden' }}>
      {list.map((s, i) => {
        const text = (
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={[font(), { fontSize: 16, color: t.label }]}>{s.name}</Text>
            <Text style={[font(), { fontSize: 13, lineHeight: 18, color: t.label2 }]}>{s.desc}</Text>
            {s.tel && s.web && (
              <Text accessibilityRole="link" onPress={() => void Linking.openURL(s.web!)} style={[font(500), { fontSize: 13, color: t.tint, marginTop: 2 }]}>{s.webLabel ?? 'Webchat and email'}</Text>
            )}
          </View>
        )
        const n = s.num && <Text style={[font(600), num, { fontSize: 16, color: t.tint }]}>{s.num}</Text>
        const row = { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 12, paddingVertical: 13, paddingHorizontal: 16, borderTopWidth: i ? 1 : 0, borderTopColor: t.sep }
        const go = s.sms ? () => void Linking.openURL(s.sms!) : s.tel ? () => call(s.tel!) : undefined
        if (s.tel && s.web) {
          // the text block holds the web link, so only the number calls
          return (
            <View key={s.name} style={row}>
              {text}
              <Pressable accessibilityRole="button" accessibilityLabel={`${s.name}: call ${s.num}`} onPress={go} hitSlop={8}>{n}</Pressable>
            </View>
          )
        }
        return go
          ? <Pressable key={s.name} accessibilityRole="button" accessibilityLabel={`${s.name}: ${s.sms ? 'text' : 'call'} ${s.num}`} onPress={go} style={({ pressed }) => [row, pressed && { backgroundColor: t.fill }]}>{text}{n}</Pressable>
          : <View key={s.name} style={row}>{text}{n}</View>
      })}
    </View>
  )
}

/**
 * It opens on the whole UK (register item 44): "Choose" and a footnote until a nation is picked.
 * `context="mind"` is mind/SupportSheet.tsx (board B6 frame 1): the Mind order, the not-a-crisis
 * line and its own foot; Profile's Pillars link opens that one, as on the web.
 */
export function SupportSheet({ onClose, context = 'profile' }: { onClose: () => void; context?: 'profile' | 'mind' }) {
  const t = useTokens()
  const [nation, setNation] = useState<UkNation | null>(null)
  const [picking, setPicking] = useState(false)
  const name = nation ? NATIONS.find(([k]) => k === nation)![1] : SUPPORT_MIND.anyNation
  const small = [font(), { fontSize: 12, lineHeight: 17, color: t.label2, paddingHorizontal: 4 }]
  return (
    <Sheet title={SUPPORT.title} onClose={onClose} left={null} right={<NavBtn title="Done" bold onPress={onClose} />}>
      <View style={{ gap: 14 }}>
        <Text style={[font(), { fontSize: 16, lineHeight: 24, color: t.label, paddingHorizontal: 4 }]}>{SUPPORT.lead}</Text>
        {picking
          ? <Opts label="Nation" opts={NATIONS} value={nation ?? undefined} onPick={(k) => { setNation(k); setPicking(false) }} />
          : (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', paddingHorizontal: 4 }}>
              <Text style={[font(), { fontSize: 13, color: t.label2, flex: 1 }]}>{SUPPORT.showing(name)}</Text>
              <Text accessibilityRole="button" onPress={() => setPicking(true)} style={[font(600), { fontSize: 13, color: t.tint }]}>{nation ? SUPPORT.change : SUPPORT.choose}</Text>
            </View>
          )}
        <Signposts list={supportList(nation, { context })} />
        {!nation && <Text style={small}>{SUPPORT.chooseNation}</Text>}
        {context === 'mind' && <Text style={small}>{SUPPORT_MIND.notCrisis}</Text>}
        <Text style={small}>{context === 'mind' ? SUPPORT_MIND.foot : SUPPORT.foot}</Text>
      </View>
    </Sheet>
  )
}
