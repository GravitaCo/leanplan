import { BackButton } from '@/ui/primitives'
import { MIND } from './copy'

/**
 * Reset (board B7, P6 Glow pacer): a pushed view inside the Mind tab. A placeholder until WP12
 * replaces it: Back to Mind and the title only. Reached only when MIND_REVIEWED is on.
 */
export function ResetScreen({ onBack }: { onBack: () => void }) {
  return (
    <div className="screen mind-pushed">
      <div className="pv-back"><BackButton label={MIND.title} onClick={onBack} /></div>
      <h1 className="ltitle">Reset</h1>
    </div>
  )
}
