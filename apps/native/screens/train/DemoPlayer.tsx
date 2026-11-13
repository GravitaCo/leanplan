/**
 * The full-screen demo (web: screens/train/DemoPlayer.tsx): the clip with the tempo laid over it,
 * the clip's own rep ("Rep 2 of 3"), the phase and its 1-2-3 count, a progress bar and the pace row.
 * The counter reads the clip's own clock, so it stays in step when paused, buffering or looping. It
 * never counts the person's reps. A hold clip has no count: it says what to hold and for how long.
 * Looks the same in light and dark (video screens rule).
 */
import { Animated, Easing, Modal, Pressable, Text, View, useWindowDimensions } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useEffect, useRef, useState } from 'react'
import type { ExerciseTemplate } from '@/core/types'
import { PHASE_LABEL, PHASE_SHORT, tempoAt } from '@/core/domain/tempo'
import { exById, holdTarget } from '@/core/domain/library'
import { ClipView, Still, useClip, useClipTime, useReducedMotion } from './media'
import { Icon } from '../../lib/ui/icons'
import { font, num } from '../../lib/theme'
import { Shade } from './gp'

const shadow = { textShadowColor: 'rgba(0,0,0,0.35)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 8 }

/** Where the clip was opened from, in window coordinates (the library's poster). */
export interface Origin { x: number; y: number; width: number; height: number }

export function DemoPlayer({ ex, onClose: done, back, origin }: {
  ex: ExerciseTemplate
  onClose: () => void
  /** opened from the library's poster: it leads with Back, since it stands in for the page underneath */
  back?: boolean
  /** the library's poster: the player grows out of it and closes back into it (380 / 300 ms, as the web), not with Reduce Motion */
  origin?: Origin
}) {
  const win = useWindowDimensions()
  const reduced = useReducedMotion()
  const [grows] = useState(() => !!origin && !reduced && win.width / win.height < 3 / 4)
  // the picture's box: from the poster's rect and corner radius to the full screen
  const p = useRef(new Animated.Value(grows ? 0 : 1)).current
  const fade = useRef(new Animated.Value(grows ? 0 : 1)).current
  useEffect(() => {
    if (!grows) return
    Animated.timing(p, { toValue: 1, duration: 380, easing: Easing.bezier(0.2, 0.8, 0.2, 1), useNativeDriver: false }).start()
    Animated.timing(fade, { toValue: 1, duration: 200, delay: 260, useNativeDriver: false }).start()
  }, [grows, p, fade])
  const closing = useRef(false)
  const onClose = () => {
    if (closing.current) return
    closing.current = true
    if (!grows) return done()
    Animated.timing(fade, { toValue: 0, duration: 120, useNativeDriver: false }).start()
    Animated.timing(p, { toValue: 0, duration: 300, easing: Easing.bezier(0.4, 0, 0.2, 1), useNativeDriver: false }).start(() => done())
  }
  const o = origin ?? { x: 0, y: 0, width: win.width, height: win.height }
  const box = {
    position: 'absolute' as const, overflow: 'hidden' as const, backgroundColor: '#000',
    left: p.interpolate({ inputRange: [0, 1], outputRange: [o.x, 0] }),
    top: p.interpolate({ inputRange: [0, 1], outputRange: [o.y, 0] }),
    width: p.interpolate({ inputRange: [0, 1], outputRange: [o.width, win.width] }),
    height: p.interpolate({ inputRange: [0, 1], outputRange: [o.height, win.height] }),
    borderRadius: p.interpolate({ inputRange: [0, 1], outputRange: [22, 0] }),
  }
  const m = ex.video!
  const insets = useSafeAreaInsets()
  const { player, playing, failed, toggle } = useClip(m.src, true)
  const t = useClipTime(player)
  // offline vs a device that can't decode the clip: the copy differs
  // navigator.onLine is the app's own network module (lib/platform), as the web reads it
  const online = typeof navigator !== 'undefined' && navigator.onLine !== false

  const s = tempoAt(m, t)
  // "Romanian deadlift (dumbbell or barbell)" → title + a quieter equipment line
  const [, title, kit] = ex.n.match(/^(.*?)\s*(?:\((.*)\))?$/) || [, ex.n, '']
  const pace = m.tempo.filter((p) => p.rep === 1).map((p) => ({ kind: p.kind, sec: tempoAt(m, p.at).lengthSec }))
  const perSide = exById(ex.id)?.perSide ?? /each side/.test(ex.t)
  const aim = holdTarget(ex.t)
  const W = { color: '#fff' }
  const sub = [font(500), W, shadow, { fontSize: 13, opacity: 0.75, marginTop: 2 }]

  return (
    <Modal visible transparent={grows} animationType={grows ? 'none' : 'fade'} onRequestClose={onClose} statusBarTranslucent supportedOrientations={['portrait']}>
      <Animated.View accessibilityViewIsModal accessibilityLabel={`Example: ${ex.n}`} style={box}>
        {m.poster && <Still path={m.poster} />}
        {failed ? (
          <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, justifyContent: 'center', paddingHorizontal: 32 }}>
            <Text style={[font(400), W, { fontSize: 17, lineHeight: 24, textAlign: 'center', textShadowColor: 'rgba(0,0,0,0.7)', textShadowRadius: 10 }]}>
              {online ? "This example isn't available right now." : 'This example needs a connection. You can still log your sets offline.'}
            </Text>
          </View>
        ) : (
          <Pressable accessibilityRole="button" accessibilityLabel={playing ? 'Pause example' : 'Play example'} onPress={toggle} style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }}>
            <ClipView player={player} poster={m.poster} label={playing ? 'Pause example' : 'Play example'} />
          </Pressable>
        )}

        {/* the overlays arrive once the picture has nearly filled the screen */}
        <Animated.View pointerEvents="box-none" style={{ position: 'absolute', top: 0, left: 0, width: win.width, height: win.height, opacity: fade }}>
        {/* .demo-top: title and kit, the close button (or Back from the library) */}
        <View pointerEvents="box-none" style={{ position: 'absolute', top: 0, left: 0, right: 0, paddingTop: insets.top + 14, paddingHorizontal: 20, flexDirection: back ? 'column' : 'row', alignItems: back ? 'flex-start' : 'flex-start', justifyContent: 'space-between', gap: back ? 4 : 16, paddingBottom: 48 }}>
          <Shade stops={[[0, 0.55], [1, 0]]} />
          {back && (
            <Pressable accessibilityRole="button" onPress={onClose} style={{ flexDirection: 'row', alignItems: 'center', minHeight: 44, marginTop: -10, marginLeft: -8, paddingRight: 12 }}>
              <Icon name="chevL" size={22} stroke={2.4} color="#fff" />
              <Text style={[font(500), W, { fontSize: 17 }]}>Back</Text>
            </Pressable>
          )}
          <View style={{ flexShrink: 1 }}>
            <Text style={[font(600), W, shadow, { fontSize: 17, lineHeight: 22 }]}>{title}</Text>
            {!!kit && <Text style={sub}>{kit[0].toUpperCase() + kit.slice(1)}</Text>}
          </View>
          {!back && (
            <Pressable accessibilityRole="button" accessibilityLabel="Close example" onPress={onClose} hitSlop={6}
              style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' }}>
              <Icon name="x" size={20} stroke={2.4} color="#fff" />
            </Pressable>
          )}
        </View>

        {!failed && !playing && (
          <View pointerEvents="box-none" style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center' }}>
            <Pressable accessibilityRole="button" accessibilityLabel="Play example" onPress={toggle}
              style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(0,0,0,0.4)', alignItems: 'center', justifyContent: 'center', paddingLeft: 4 }}>
              <Icon name="play" size={32} color="#fff" fill />
            </Pressable>
          </View>
        )}

        {!failed && (
          <View pointerEvents="none" style={{ position: 'absolute', bottom: 0, left: 0, right: 0, paddingTop: 96, paddingBottom: insets.bottom + 24, paddingHorizontal: 20 }}>
            <Shade stops={[[0, 0], [0.5, 0.78], [1, 0.78]]} />
            {m.hold ? (
              <>
                {(m.hold !== 'move' || aim) && <Text style={[...sub, { marginTop: 0, marginBottom: 2 }]}>{m.hold === 'move' ? 'A timed move' : perSide ? 'A hold · one side shown, do both' : 'A hold'}</Text>}
                <Text style={[font(700), W, shadow, { fontSize: 28, lineHeight: 32 }]}>{m.hold === 'move' ? 'Keep moving' : m.hold === 'position' ? 'Hold the position' : PHASE_LABEL.stretch}</Text>
                <View style={{ height: 1, backgroundColor: 'rgba(255,255,255,0.25)', marginVertical: 16 }} />
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  {aim && (
                    <View style={{ flex: 1 }}>
                      <Text style={[font(500), W, shadow, { fontSize: 13 }]}>Aim for</Text>
                      <Text style={[font(600), num, W, shadow, { fontSize: 17, marginTop: 1 }]}>{aim.lo === aim.hi ? aim.lo : `${aim.lo}–${aim.hi}`} sec{perSide ? ' each side' : ''}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={[font(500), W, shadow, { fontSize: 13 }]}>Breathe</Text>
                    <Text style={[font(600), W, shadow, { fontSize: 17, marginTop: 1 }]}>Slow and steady</Text>
                  </View>
                </View>
              </>
            ) : (
              <>
                <Text style={[...sub, { marginTop: 0, marginBottom: 2 }]}>{s.rep ? `Rep ${s.rep} of ${s.reps}` : s.reps === 1 ? '1 rep' : `${s.reps} reps`}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
                  <Text style={[font(700), W, shadow, { fontSize: 28, lineHeight: 32, flexShrink: 1 }]}>{PHASE_LABEL[s.kind]}</Text>
                  {s.kind !== 'ready' && <Text style={[font(700), num, W, shadow, { fontSize: 56, lineHeight: 52 }]}>{s.count}</Text>}
                </View>
                <View style={{ height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.25)', overflow: 'hidden', marginTop: 14, marginBottom: 16 }}>
                  <View style={{ height: '100%', width: `${Math.round(s.progress * 1000) / 10}%`, backgroundColor: '#fff' }} />
                </View>
                <View accessibilityLabel="Pace to match" style={{ flexDirection: 'row', gap: 8 }}>
                  {pace.map((p) => (
                    <View key={p.kind} style={{ flex: 1, opacity: p.kind === s.kind ? 1 : 0.62 }}>
                      <Text style={[font(500), W, shadow, { fontSize: 13 }]}>{PHASE_SHORT[p.kind]}</Text>
                      <Text style={[font(600), num, W, shadow, { fontSize: 17, marginTop: 1 }]}>{p.sec} s</Text>
                    </View>
                  ))}
                  {/* the web's grid has four columns whatever the count */}
                  {Array.from({ length: Math.max(0, 4 - pace.length) }, (_, i) => <View key={'pad' + i} style={{ flex: 1 }} />)}
                </View>
              </>
            )}
          </View>
        )}
        </Animated.View>
      </Animated.View>
    </Modal>
  )
}
