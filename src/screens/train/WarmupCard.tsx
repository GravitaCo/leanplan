import { warmupLine, type WarmupBlock } from '@/core/domain/warmup'
import { warmupNote } from './trainCopy'

export { warmupNote } from './trainCopy'

/**
 * "First: Warm-up · N min", then "Then" over the exercises (board ob3-5), wherever a session's
 * exercises are listed. `extra` adds a line (the lighter sets on the first lift).
 */
export function WarmupCard({ block, extra }: { block: WarmupBlock; extra?: string }) {
  return (
    <>
      <h2 className="wu-day-h">First</h2>
      <section className="wu-day" aria-label={`Warm-up, ${block.mins} minutes`}>
        <div className="r">
          <span className="mn num">{block.mins} min</span>
          <span><span className="t" style={{ display: 'block' }}>Warm-up</span><span className="s" style={{ display: 'block' }}>{warmupLine(block)}</span></span>
        </div>
        <div className="n">{warmupNote(block)}{extra ? ' ' + extra : ''}</div>
      </section>
      <h2 className="wu-day-h">Then</h2>
    </>
  )
}
