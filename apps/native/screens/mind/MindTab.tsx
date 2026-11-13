/**
 * The Mind tab (board B5 as a tab), ported from src/screens/MindScreen.tsx and mind/MindPage.tsx,
 * for app/(tabs)/mind.tsx. Top to bottom: today's check-in, the support row directly under it, the
 * skills with a screen (MIND_REVIEWED only), Your week, the if-then plans row and the wellness line.
 * Skills push their own screens (Reset, Wind down, Get outside: no tab bar, as on web) or open
 * Unload's sheet over the page or over Wind down. The stack, page and words come from model.ts.
 */
import { useEffect, useLayoutEffect, useState, type ReactNode } from 'react'
import { Alert, BackHandler, ScrollView, Text, View } from 'react-native'
import { useNavigation } from 'expo-router'
import { useStore, type MindView } from '@/store/store'
import { MIND_REVIEWED } from '@/data/wellbeingFlag'
import { MIND, MIND_UI, SHARED } from '@/copy/mind'
import type { IconName } from '../../lib/ui/icons'
import { Btn, Card, List } from '../../lib/ui/kit'
import { PageHeader, Row } from '../../lib/ui/primitives'
import { Foot, Lbl } from '../../lib/ui/text'
import { tx, useTokens, type Tokens } from '../../lib/theme'
import { openMindCheckin, popView, pushView, stackOnArrival, stackView, useMindPage, type MindStack } from './model'
import { OutsideScreen } from './OutsideScreen'
import { ReflectionCard } from './ReflectionCard'
import { ResetScreen } from './ResetScreen'
import { SupportSheet } from './SupportSheet'
import { UnloadSheet } from './UnloadSheet'
import { WindDownScreen } from './WindDownScreen'

/** N4's check-in sheet, passed in by the tab until it lands; meanwhile Today's own "not here yet" note. */
export type RenderCheckin = (onClose: () => void) => ReactNode
const checkinNotYet = () => Alert.alert('Check-in', 'Not in the native app yet: it arrives with the Today stream.')

export function MindTab({ renderCheckin }: { renderCheckin?: RenderCheckin }) {
  const navigation = useNavigation()
  // store.tab drives the tabs (lib/navBridge.ts, the tab bar's setTab), as App.tsx does on the web
  const onMind = useStore((s) => s.tab === 'mind')
  const setTab = useStore((s) => s.setTab)
  const mindOpen = useStore((s) => s.mindOpen)
  const clearOpen = useStore((s) => s.clearOpen)
  const [sheet, setSheet] = useState<'checkin' | 'support' | null>(null)
  const [stack, setStack] = useState<MindStack>([])
  const push = (v: MindView) => setStack((s) => pushView(s, v))
  const pop = () => setStack(popView)
  // The web unmounts the Mind tab whenever another tab shows (App.tsx), so its pushed screens and
  // sheets end there: a Reset left mid-run is never logged and stops talking, and nothing is waiting
  // on return. Expo Router keeps this tab mounted, so off the Mind tab nothing is pushed (the pacer
  // unmounts at once) and the stack and sheets are cleared.
  const view = stackView(onMind ? stack : [])
  useEffect(() => { if (!onMind) { setStack([]); setSheet(null) } }, [onMind])

  // a one-thing chip with a skill opens its view on arrival (openMind), only once the skills are reviewed
  useEffect(() => {
    if (!mindOpen) return
    const s = stackOnArrival(mindOpen, MIND_REVIEWED)
    if (s) setStack(s)
    clearOpen()
  }, [mindOpen, clearOpen])
  // Reset, Wind down and Get outside are card screens with no tab bar (lib/ui TabBar reads this)
  useLayoutEffect(() => { navigation.setOptions({ tabBarStyle: view.hideTabBar ? { display: 'none' } : undefined } as object) }, [navigation, view.hideTabBar])
  // Android's back closes the newest view first
  useEffect(() => {
    if (!onMind || !stack.length) return
    const sub = BackHandler.addEventListener('hardwareBackPress', () => { pop(); return true })
    return () => sub.remove()
  }, [onMind, stack.length])

  const openCheckin = () => {
    if (openMindCheckin(useStore.getState()) === 'sheet') { if (renderCheckin) setSheet('checkin'); else checkinNotYet() }
  }
  const unload = view.unload ? <UnloadSheet onClose={pop} /> : null
  const sheetOpen = onMind ? sheet : null
  if (view.screen === 'reset') return <ResetScreen onBack={pop} backLabel={view.resetBack} />
  if (view.screen === 'wind-down') return <WindDownScreen onBack={pop} onSkill={push}>{unload}</WindDownScreen>
  if (view.screen === 'outside') return <OutsideScreen onBack={pop} />
  return (
    <MindPage onCheckin={openCheckin} onSupport={() => setSheet('support')} onSkill={push} onPlans={() => setTab('plan')}>
      {sheetOpen === 'checkin' && renderCheckin?.(() => setSheet(null))}
      {sheetOpen === 'support' && <SupportSheet onClose={() => setSheet(null)} />}
      {unload}
    </MindPage>
  )
}

const fillOf = (t: Tokens, p: string) => (p === 'move' ? t.moveFill : p === 'food' ? t.foodFill : t.mindFill)
const inkOf = (t: Tokens, p: string) => (p === 'move' ? t.moveInk : p === 'food' ? t.foodInk : t.mindInk)

function MindPage({ onCheckin, onSupport, onSkill, onPlans, children }: {
  onCheckin: () => void; onSupport: () => void; onSkill: (v: MindView) => void; onPlans: () => void; children?: ReactNode
}) {
  const t = useTokens()
  const m = useMindPage(MIND_REVIEWED)
  return (
    <View testID="screen-mind" style={{ flex: 1, backgroundColor: t.bg }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 12 }}>
        <PageHeader eyebrow={m.eyebrow} title={m.title} pill={false} />
        <Lbl style={{ paddingTop: 4 }}>{MIND.today}</Lbl>
        {/* .card.mind-today: padding 16, rows 12 apart; its button 44 tall */}
        <Card plain style={{ padding: 16, paddingVertical: 16, paddingHorizontal: 16, gap: 12, marginBottom: 10 }}>
          <View accessibilityLabel={MIND_UI.todayCheckin} style={{ gap: 12 }}>
            {m.pairs.length
              ? (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', rowGap: 12, columnGap: 14 }}>
                  {m.pairs.map(([k, v]) => (
                    <View key={k} testID="mind-pair" style={{ width: '46%', flexGrow: 1 }}>
                      <Text style={[tx(13), { color: t.label2 }]}>{k}</Text>
                      <Text style={[tx(17, 500), { color: t.label, marginTop: 1 }]}>{v}</Text>
                    </View>
                  ))}
                </View>
              )
              : (
                <View>
                  <Text style={[tx(17, 500), { color: t.label }]}>{MIND.askTitle}</Text>
                  <Text style={[tx(13), { color: t.label2, marginTop: 2 }]}>{MIND.askSub}</Text>
                </View>
              )}
            <Btn title={m.checkinButton.title} kind={m.checkinButton.kind} small onPress={onCheckin} style={{ height: 44, minHeight: 44, borderRadius: 22, paddingHorizontal: 18 }} />
          </View>
        </Card>
        <List style={{ marginBottom: 8 }}><Row title={SHARED.support} onPress={onSupport} /></List>
        {m.skills.length > 0 && (
          <>
            <Lbl>{MIND.skills}</Lbl>
            <List icons style={{ marginBottom: 8 }}>
              {m.skills.map((s) => (
                <View key={s.id} testID="mind-skill">
                  <Row title={s.name} sub={s.sub} wrapSub onPress={() => onSkill(s.id)}
                    square={{ icon: s.icon as IconName, fill: fillOf(t, s.pillar), ink: inkOf(t, s.pillar) }} />
                </View>
              ))}
            </List>
          </>
        )}
        <ReflectionCard />
        <List style={{ marginBottom: 8 }}><Row title={MIND.plans} value={MIND.plansWhere} onPress={onPlans} /></List>
        <Foot style={{ textAlign: 'center', paddingTop: 6, paddingHorizontal: 4 }}>{SHARED.wellness}</Foot>
      </ScrollView>
      {children}
    </View>
  )
}
