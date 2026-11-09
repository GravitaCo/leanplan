/** A tab the spike doesn't build yet: its title, the avatar, and which stream brings it. */
import { ScrollView, Text } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { router } from 'expo-router'
import { useStore } from '@/store/store'
import { PageHeader } from './ui/kit'
import { font, useTokens } from './theme'

export function Placeholder({ title, stream }: { title: string; stream: string }) {
  const t = useTokens()
  const insets = useSafeAreaInsets()
  const name = useStore((s) => s.data.profile.name)
  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={{ paddingHorizontal: 16, paddingTop: insets.top }}>
      <PageHeader eyebrow="" title={title} name={name} onAvatar={() => router.push('/lab')} />
      <Text style={[font(400), { fontSize: 15, lineHeight: 21, color: t.label2 }]}>Not in the spike yet. It arrives with the {stream} stream.</Text>
    </ScrollView>
  )
}
