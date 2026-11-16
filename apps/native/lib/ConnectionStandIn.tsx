/**
 * Stand-in for the connection pill (N3 gives the data side; the real ConnectionPill, with its
 * icons and the line under it, comes from N1 against board ob6-7). The state and words are the
 * web's own: useConnection (src/store/hooks.ts) over core/domain/connection.ts, so all six states
 * (up to date, pending with a count, offline, sign in, sync problem, phone only) match the web.
 * Tapping on "Sync problem" tries again, as on web. Lab only, so nothing new shows in the app.
 * testID `cpill-<state>` for the native e2e checks (scripts/e2e-sync.cjs).
 */
import { Pressable, Text } from 'react-native'
import { useStore } from '@/store/store'
import { useConnection } from '@/store/hooks'
import { font, num, useTokens } from './theme'

export function ConnectionStandIn() {
  const t = useTokens()
  const c = useConnection()
  const runSync = useStore((s) => s.runSync)
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={c.label} testID={'cpill-' + c.kind}
      onPress={() => { if (c.kind === 'problem') void runSync() }}
      style={{ alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: t.fill, marginVertical: 6 }}>
      <Text style={[font(500), num, { fontSize: 13, color: t.label2 }]}>{c.label}</Text>
    </Pressable>
  )
}
