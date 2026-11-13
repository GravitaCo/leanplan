/** A tab the spike doesn't build yet: its title, the avatar, and which stream brings it. */
import { ScrollView, Text } from 'react-native'
import { PageHeader } from './ui/primitives'
import { font, useTokens } from './theme'

export function Placeholder({ title, stream }: { title: string; stream: string }) {
  const t = useTokens()
  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.bg }} contentContainerStyle={{ paddingHorizontal: 16 }}>
      <PageHeader eyebrow="" title={title} />
      <Text style={[font(400), { fontSize: 15, lineHeight: 21, color: t.label2 }]}>Not in the spike yet. It arrives with the {stream} stream.</Text>
    </ScrollView>
  )
}
