import { warmupLine, type WarmupBlock } from '@/core/domain/warmup'

/** The day view's note under the block (ob3-5). */
export const warmupNote = (b: WarmupBlock) => (b.moves.length === 1
  ? 'Every session starts here: a few easy minutes so your heart rate and breathing can rise gently.'
  : 'Every session starts here: 1 to 2 minutes to raise your pulse, then moving stretches for today’s joints. Each move shows how it’s done.')

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
