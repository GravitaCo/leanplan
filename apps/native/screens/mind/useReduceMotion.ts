/**
 * The device's Reduce Motion setting, following a change while the screen is open (the web's
 * prefers-reduced-motion listener in ResetScreen.tsx; PARITY 3.6). Seeded from Reanimated's value,
 * which is read once at launch, then kept current by AccessibilityInfo's reduceMotionChanged.
 */
import { useEffect, useState } from 'react'
import { AccessibilityInfo } from 'react-native'
import { useReducedMotion } from 'react-native-reanimated'

export function useReduceMotion(): boolean {
  const initial = useReducedMotion()
  const [on, setOn] = useState(initial)
  useEffect(() => {
    let alive = true
    AccessibilityInfo.isReduceMotionEnabled().then((v) => { if (alive) setOn(v) }).catch(() => {})
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setOn)
    return () => { alive = false; sub.remove() }
  }, [])
  return on
}
