import { useState } from 'react'
import type { ExerciseMedia, LogShape } from '@/core/types'
import { previewUrls } from '@/core/data/media'
import { Icon } from '@/ui/icons'

const reducedMotion = () => { try { return window.matchMedia('(prefers-reduced-motion: reduce)').matches } catch { return false } }

/**
 * The image to show for a clip before it plays: with `motion`, Bunny's animated preview (skipped
 * for anyone who asks for reduced motion), else the still poster. `onError` steps to the next one
 * (offline, or a missing file); `src` is undefined once none is left, so the caller shows its own
 * placeholder. `letterboxed` says the image needs cropping to the clip.
 */
export function useClipPreview(m: ExerciseMedia | undefined, motion: boolean): { src?: string; letterboxed: boolean; onError: () => void } {
  const [reduced] = useState(reducedMotion)
  const [step, setStep] = useState(0)
  const cur = m ? previewUrls(m, motion && !reduced)[step] : undefined
  return { src: cur?.url, letterboxed: !!cur?.letterboxed, onError: () => setStep((s) => s + 1) }
}

/**
 * A small picture for an exercise row: the demo's moving preview when there is one (it loads lazily and
 * falls back quietly offline), otherwise a typographic tile ("Cue", "Hold").
 */
export function Thumb({ video, shape, play, big }: { video?: ExerciseMedia; shape?: LogShape; play?: boolean; big?: boolean }) {
  const { src, letterboxed, onError } = useClipPreview(video, true)
  const cls = 'thumb' + (big ? ' big' : '')
  if (src) {
    return (
      <span className={cls}>
        <img src={src} className={letterboxed ? 'lb' : undefined} alt="" loading="lazy" decoding="async" onError={onError} />
        {play && <span className="thumb-play"><Icon name="play" size={10} /></span>}
      </span>
    )
  }
  return <span className={cls + ' ph'} aria-hidden="true">{shape === 'hold' ? 'Hold' : shape === 'duration' ? 'Time' : shape ? 'Cue' : <Icon name="dumbbell" size={22} />}</span>
}
