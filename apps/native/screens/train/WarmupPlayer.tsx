/**
 * The warm-up block a guided session opens with (web: screens/train/WarmupPlayer.tsx, board ob5-0):
 * one timed block, a countdown per move, "Next: …", a 5 s gap to get into place, "Switch sides"
 * halfway through one-sided moves, and Pause, Skip this move and Skip warm-up. The move's clip or
 * still shows full bleed when there is one (no blur, a light shade top and bottom), otherwise a calm
 * placeholder. Nothing is logged as sets. The clock is the device's, so it works offline; it holds
 * while `hold` is set (a sheet over it).
 */
import { useEffect, useRef, useState } from 'react'
import { AccessibilityInfo, Text, View, useWindowDimensions } from 'react-native'
import { warmupStartAt, type WarmupBlock } from '@/core/domain/warmup'
import { fmtClock } from '@/core/domain/guided'
import { EXERCISE_BY_ID } from '@/core/data/exercises'
import { ClipView, Still, useClip, useReducedMotion } from './media'
import { BRAND_COLOR, GpBar, GpBot, GpClock, GpRound, GpSec, GpMain, GpPill, GpShade, GpTextBtn, GpTop, vibrate } from './gp'
import { Icon } from '../../lib/ui/icons'
import { tx } from '../../lib/theme'

export function WarmupPlayer({ block, after, from = 0, hold = false, onEnd, onLeave, onProgress }: {
  block: WarmupBlock
  /** seconds of moves already done (a resume) */
  from?: number
  /** a sheet is over the player: the clock waits */
  hold?: boolean
  /** the first exercise after the warm-up, for the last "Next: …" */
  after?: string
  /** seconds of moves done, and whether the whole block was */
  onEnd: (sec: number, complete: boolean) => void
  onLeave: () => void
  onProgress: (sec: number) => void
}) {
  const moves = block.moves
  const [at] = useState(() => warmupStartAt(block, from))
  const [i, setI] = useState(at.i)
  const [gap, setGap] = useState(false)
  const [left, setLeft] = useState(at.left)
  const [paused, setPaused] = useState(false)
  const spent = useRef(at.spent)
  const st = useRef({ paused: paused || hold, gap })
  st.current = { paused: paused || hold, gap }
  const ended = useRef(false)
  const skipped = useRef(false)
  const say = (s: string) => AccessibilityInfo.announceForAccessibility(s)

  useEffect(() => {
    let last = Date.now()
    const t = setInterval(() => {
      const n = Date.now(), dt = n - last
      last = n
      if (st.current.paused || ended.current) return
      setLeft((l) => l - dt)
      if (!st.current.gap) { spent.current += dt; onProgress(spent.current / 1000) }
    }, 250)
    return () => clearInterval(t)
  }, [onProgress])

  const end = (complete: boolean) => { if (ended.current) return; ended.current = true; onEnd(spent.current / 1000, complete && !skipped.current) }
  const next = (skip = false) => {
    if (skip) skipped.current = true
    if (i >= moves.length - 1) { end(true); return }
    setI(i + 1); setGap(true); setLeft(block.gapSec * 1000)
    say(`Next: ${moves[i + 1].n}. Get ready.`)
  }
  const start = () => { setGap(false); setLeft(moves[i].sec * 1000); say(`${moves[i].n}, ${fmtClock(moves[i].sec)}.`) }
  useEffect(() => {
    if (left > 0 || ended.current) return
    if (gap) start(); else next()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left])

  const m = moves[i]
  const sec = Math.max(0, Math.ceil(left / 1000))
  const half = Math.round(m.sec / 2)
  const second = m.perSide && !gap && sec <= half
  useEffect(() => {
    if (!second) return
    say('Switch sides')
    vibrate(150)
  }, [second])

  const x = EXERCISE_BY_ID[m.id]
  const video = x?.video
  const reduced = useReducedMotion()
  const [bad, setBad] = useState<Record<string, true>>({})
  const clipPath = video && !bad[video.src] && !reduced ? video.src : undefined
  const still = !clipPath && video?.poster && !bad[video.poster] ? video.poster : null
  const plain = !clipPath && !still
  const total = gap ? block.gapSec : m.sec
  const upNext = gap ? `${fmtClock(m.sec)}${m.perSide ? ', switching sides halfway' : ''}` : i < moves.length - 1 ? moves[i + 1].n : after
  const { width } = useWindowDimensions()
  const ph = Math.min(300, width * 0.58)

  return (
    <View style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: plain ? '#121214' : '#000' }}>
      {clipPath && <WarmClip key={clipPath} path={clipPath} poster={video?.poster} name={m.n} onFail={() => setBad((b) => ({ ...b, [clipPath]: true }))} />}
      {still && <Still path={still} label={`How to do ${m.n.toLowerCase()}`} onError={() => setBad((b) => ({ ...b, [still]: true }))} />}
      {plain && (
        <View pointerEvents="none" style={{ position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, alignItems: 'center', justifyContent: 'center', paddingBottom: '46%' }}>
          <View style={{ width: ph, height: ph, borderRadius: ph / 2, backgroundColor: '#cd7fae', opacity: 0.14 }} />
        </View>
      )}
      <GpShade />

      <GpTop plain={plain}>
        <GpRound label="Leave the workout" onPress={onLeave} plain={plain}><Icon name="x" size={20} stroke={2.6} color="#fff" /></GpRound>
        <GpPill plain={plain}>Warm-up · {i + 1} of {moves.length} · {block.mins} min</GpPill>
        <View style={{ width: 40 }} />
      </GpTop>

      <GpBot label={`Warm-up: ${m.n}`} style={{ gap: 10 }}>
        <Text style={[tx(13, 600), { color: BRAND_COLOR }]}>{gap ? 'Get ready' : second ? 'Switch sides' : 'Warm-up'}</Text>
        <Text accessibilityRole="header" style={[tx(28, 600), { lineHeight: 32, letterSpacing: -0.56, color: '#fff', marginTop: -4 }]}>{m.n}</Text>
        <Text style={[tx(15, 400), { lineHeight: 22, color: 'rgba(255,255,255,0.88)' }]}>{m.cue}</Text>
        <GpClock size={56} light={200} big={fmtClock(sec)} small={gap ? `then ${upNext}` : `of ${fmtClock(m.sec)}${m.perSide ? (second ? ' · second side' : ` · switch sides at ${fmtClock(half)}`) : ''}`} label={`${fmtClock(sec)} of ${fmtClock(total)} left`} />
        <GpBar value={Math.min(1, Math.max(0, 1 - left / (total * 1000)))} />
        {!gap && !!upNext && <Text style={[tx(14, 400), { color: 'rgba(255,255,255,0.85)' }]}>Next: {upNext}</Text>}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <GpSec title={paused ? 'Resume' : 'Pause'} onPress={() => setPaused(!paused)} />
          {gap ? <GpMain title="Start now" onPress={start} /> : <GpMain title="Skip this move" onPress={() => next(true)} />}
        </View>
        <GpTextBtn title="Skip warm-up" onPress={() => end(false)} />
      </GpBot>
    </View>
  )
}

function WarmClip({ path, poster, name, onFail }: { path: string; poster?: string; name: string; onFail: () => void }) {
  const { player, failed } = useClip(path, true)
  useEffect(() => { if (failed) onFail() }, [failed, onFail])
  return <ClipView player={player} poster={poster} label={`How to do ${name.toLowerCase()}, on a loop`} />
}
