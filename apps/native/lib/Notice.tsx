/**
 * A plain centred message: the gate's loading state. The sign-in screen is lib/account/Auth.tsx.
 */
import { Text, View } from 'react-native'
import { Btn } from './ui/kit'
import { font, useTokens } from './theme'

/** A plain centred message for states the spike doesn't build yet. */
export function Notice({ title, body, action }: { title: string; body?: string; action?: { title: string; onPress: () => void } }) {
  const t = useTokens()
  return (
    <View style={{ flex: 1, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 8 }}>
      <Text style={[font(600), { fontSize: 22, color: t.label, textAlign: 'center' }]}>{title}</Text>
      {body ? <Text style={[font(400), { fontSize: 15, lineHeight: 21, color: t.label2, textAlign: 'center' }]}>{body}</Text> : null}
      {action ? <View style={{ marginTop: 16, alignSelf: 'stretch' }}><Btn kind="gray" title={action.title} onPress={action.onPress} /></View> : null}
    </View>
  )
}
