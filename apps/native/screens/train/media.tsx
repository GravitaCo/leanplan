/**
 * Demo clips on native: the same Bunny Stream MP4s and stills as the web (src/core/data/media.ts).
 * The library refuses a request with no referrer (CLAUDE.md), and a web page always sends one, so
 * every request here sends the web app's own Referer, `https://app.tilo.fit/`, through expo-video's
 * `headers` and React Native Image's `headers`. Caching stays off, so the header goes with every
 * range request. Nothing waits on the network: a clip that can't load falls back to its still, then
 * to the caller's placeholder.
 */
import { useEffect, useMemo, useState } from 'react'
import { AccessibilityInfo, Image, Platform, Text, View, useColorScheme, type ImageStyle, type StyleProp } from 'react-native'
import { useVideoPlayer, VideoView, type VideoPlayer, type VideoSource } from 'expo-video'
import { useEvent } from 'expo'
import type { ExerciseMedia, LogShape } from '@/core/types'
import { mediaUrl, previewUrls } from '@/core/data/media'
import { Icon } from '../../lib/ui/icons'
import { tx, useTokens } from '../../lib/theme'

/** The Referer the web app sends (app.tilo.fit is its origin). security-data owns this choice. */
export const BUNNY_REFERER = 'https://app.tilo.fit/'
const headers = Platform.OS === 'web' ? undefined : { Referer: BUNNY_REFERER }

export const clipSource = (path: string): VideoSource => ({ uri: mediaUrl(path), headers, useCaching: false })
export const imageSource = (path: string) => ({ uri: mediaUrl(path), headers })

/**
 * Reduce Motion, as the web's `prefers-reduced-motion`. The web reads it synchronously; here it's
 * read once when the app loads and kept current, so a clip opened later already knows it and never
 * starts playing first.
 */
let reducedNow = false
AccessibilityInfo.isReduceMotionEnabled().then((v) => { reducedNow = v }).catch(() => {})
AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => { reducedNow = v })
export function useReducedMotion(): boolean {
  const [r, setR] = useState(reducedNow)
  useEffect(() => {
    let live = true
    AccessibilityInfo.isReduceMotionEnabled().then((v) => { reducedNow = v; if (live) setR(v) }).catch(() => {})
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setR)
    return () => { live = false; sub.remove() }
  }, [])
  return r
}

/**
 * The image to show for a clip before it plays (Thumb.tsx's useClipPreview): with `motion`, Bunny's
 * animated preview (skipped with Reduce Motion), else the still poster. `onError` steps to the next.
 */
export function useClipPreview(m: ExerciseMedia | undefined, motion: boolean): { src?: string; letterboxed: boolean; onError: () => void } {
  const reduced = useReducedMotion()
  const [failed, setFailed] = useState<{ src?: string; step: number }>({ step: 0 })
  const step = failed.src === m?.src ? failed.step : 0
  const cur = m ? previewUrls(m, motion && !reduced)[step] : undefined
  return { src: cur?.url, letterboxed: !!cur?.letterboxed, onError: () => setFailed({ src: m?.src, step: step + 1 }) }
}

/**
 * `.thumb`: 44 px (52×64 `big`) rounded picture for an exercise row, the moving preview when there
 * is one, else a typographic tile ("Cue", "Hold", "Time") or the dumbbell. The animated preview is
 * 320×180 with the vertical clip pillarboxed in the middle, so it's cropped as the web's `img.lb`.
 */
/** `.thumb.ph`: the placeholder tile is the page colour in light, `--elev` in dark */
export function usePhBg(): string {
  const t = useTokens()
  return useColorScheme() === 'dark' ? t.elev : t.bg
}

export function Thumb({ video, shape, play, big, size }: {
  video?: ExerciseMedia; shape?: LogShape; play?: boolean; big?: boolean
  /** another screen's own size, e.g. Plan's week rows (`.wk-row .thumb`: 36 × 44, radius 8) */
  size?: { width: number; height: number; radius: number }
}) {
  const t = useTokens()
  const phBg = usePhBg()
  const { src, letterboxed, onError } = useClipPreview(video, true)
  const w = size?.width ?? (big ? 52 : 44), h = size?.height ?? (big ? 64 : 44)
  const box = { width: w, height: h, borderRadius: size?.radius ?? 12, overflow: 'hidden' as const, backgroundColor: t.fill }
  if (src) {
    // `.thumb img.lb`: 316.05% wide, centred, 25% down
    const lw = w * 3.1605, lh = lw * 180 / 320
    const lb: StyleProp<ImageStyle> = { position: 'absolute', width: lw, height: lh, left: (w - lw) / 2, top: (h - lh) * 0.25 }
    return (
      <View style={box}>
        <Image source={{ uri: src, headers }} onError={onError} style={letterboxed ? lb : { width: '100%', height: '100%' }} resizeMode="cover" accessibilityIgnoresInvertColors />
        {play && (
          <View style={{ position: 'absolute', right: 3, bottom: 3, width: 16, height: 16, borderRadius: 8, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', paddingLeft: 1 }}>
            <Icon name="play" size={10} color="#fff" fill />
          </View>
        )}
      </View>
    )
  }
  return (
    <View aria-hidden style={[box, { backgroundColor: phBg, alignItems: 'center', justifyContent: 'center' }]}>
      {shape ? <Text style={[tx(12, 600), { color: t.label2 }]}>{shape === 'hold' ? 'Hold' : shape === 'duration' ? 'Time' : 'Cue'}</Text> : <Icon name="dumbbell" size={20} color={t.label2} />}
    </View>
  )
}

/**
 * A looping, muted clip player (the web's `<video muted loop playsInline>`), with its playing state
 * and a failure flag. `autoPlay` false leaves it paused (Reduce Motion in the guided player).
 */
export function useClip(path: string | undefined, autoPlay: boolean): { player: VideoPlayer; playing: boolean; failed: boolean; toggle: () => void } {
  const source = useMemo(() => (path ? clipSource(path) : null), [path])
  const player = useVideoPlayer(source, (p) => {
    p.loop = true
    p.muted = true
    if (autoPlay) p.play()
  })
  // Reduce Motion turning on (or resolving late) stops a clip that started on its own
  useEffect(() => { if (!autoPlay) player.pause() }, [autoPlay, player])
  const { isPlaying } = useEvent(player, 'playingChange', { isPlaying: player.playing })
  const { status } = useEvent(player, 'statusChange', { status: player.status })
  const toggle = () => { if (player.playing) player.pause(); else player.play() }
  return { player, playing: isPlaying, failed: status === 'error', toggle }
}

/**
 * The clip's own clock, read on every frame on iOS (and the web build) as the web's demo player does (requestAnimationFrame
 * over `video.currentTime`), while it plays; once more when it pauses, so a paused clip shows where
 * it stopped. The player's own time events come about every 100 ms and unevenly on iOS, which made
 * the count lag and jump (Benn, 13 Nov).
 */
export function useClipTime(player: VideoPlayer, playing: boolean): number {
  const [t, setT] = useState(() => player.currentTime)
  // Android: reading currentTime blocks the main thread there, so it keeps the player's time events
  const { currentTime: evT } = useEvent(player, 'timeUpdate', { currentTime: player.currentTime, bufferedPosition: 0, currentLiveTimestamp: null, currentOffsetFromLive: null })
  useEffect(() => {
    if (Platform.OS !== 'android') return
    setT(evT)
  }, [evT])
  useEffect(() => {
    if (Platform.OS === 'android') { player.timeUpdateEventInterval = playing ? 0.1 : 0; return }
    setT(player.currentTime)
    if (!playing) return
    let raf = 0
    const tick = () => { setT(player.currentTime); raf = requestAnimationFrame(tick) }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [player, playing])
  return t
}

const FILL = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const

/**
 * Full-bleed clip (`object-fit: cover`) with its still on top until the first frame shows, as the
 * web's `poster` attribute does while the clip loads.
 */
export function ClipView({ player, poster, label }: { player: VideoPlayer; poster?: string; label: string }) {
  const [ready, setReady] = useState(false)
  const [noPoster, setNoPoster] = useState(false)
  return (
    <>
      <VideoView player={player} nativeControls={false} contentFit="cover" allowsPictureInPicture={false}
        accessibilityLabel={label} onFirstFrameRender={() => setReady(true)} style={FILL} />
      {poster && !ready && !noPoster && <Still path={poster} onError={() => setNoPoster(true)} />}
    </>
  )
}

/**
 * A clip's poster filling its parent the way the web's `object-fit: cover; object-position: 50% 25%`
 * does (Plan's workout hero, `.wv-hero img`): scaled to cover, centred across, a quarter of the
 * overflow cut from the top. Sent with the Referer like every Bunny request. `onError` lets the
 * caller fall back (the web's hero turns `.plain`).
 */
export function Poster({ path, onError }: { path: string; onError?: () => void }) {
  const [box, setBox] = useState<{ w: number; h: number } | null>(null)
  const [img, setImg] = useState<{ w: number; h: number } | null>(null)
  let style: ImageStyle = { position: 'absolute', width: '100%', height: '100%' }
  if (box && img && img.w > 0 && img.h > 0) {
    const k = Math.max(box.w / img.w, box.h / img.h)
    const w = img.w * k, h = img.h * k
    style = { position: 'absolute', width: w, height: h, left: (box.w - w) * 0.5, top: (box.h - h) * 0.25 }
  }
  return (
    <View pointerEvents="none" style={[FILL, { overflow: 'hidden' }]} onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      <Image source={imageSource(path)} onError={onError} resizeMode="cover" style={style} accessibilityIgnoresInvertColors
        onLoad={(e) => { const s = e.nativeEvent.source; if (s?.width && s?.height) setImg({ w: s.width, h: s.height }) }} />
    </View>
  )
}

/** A clip's still, full bleed (`.gp-still`, `.demo-still`). */
export function Still({ path, onError, label }: { path: string; onError?: () => void; label?: string }) {
  return <Image source={imageSource(path)} onError={onError} resizeMode="cover" style={FILL} accessibilityLabel={label} accessibilityIgnoresInvertColors />
}
