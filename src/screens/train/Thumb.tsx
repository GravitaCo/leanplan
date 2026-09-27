import { useState } from 'react'
import type { ExerciseMedia, LogShape } from '@/core/types'
import { mediaUrl } from '@/core/data/media'
import { Icon } from '@/ui/icons'

/**
 * A small still for an exercise row: the demo's poster when there is one (it loads lazily and
 * falls back quietly offline), otherwise a typographic tile ("Cue", "Hold").
 */
export function Thumb({ video, shape, play, big }: { video?: ExerciseMedia; shape?: LogShape; play?: boolean; big?: boolean }) {
  const [failed, setFailed] = useState(false)
  const cls = 'thumb' + (big ? ' big' : '')
  if (video?.poster && !failed) {
    return (
      <span className={cls}>
        <img src={mediaUrl(video.poster)} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} />
        {play && <span className="thumb-play"><Icon name="play" size={10} /></span>}
      </span>
    )
  }
  return <span className={cls + ' ph'} aria-hidden="true">{shape === 'hold' ? 'Hold' : shape === 'duration' ? 'Time' : shape ? 'Cue' : <Icon name="dumbbell" size={22} />}</span>
}
