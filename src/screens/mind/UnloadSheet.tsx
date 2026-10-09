import { Sheet } from '@/ui/primitives'

/**
 * Unload (board B8): a tall sheet. A placeholder until WP13 replaces it: the title and Cancel only,
 * and it saves nothing. WP13's sheet is the only screen that imports the device-only notes accessor.
 * Reached only when MIND_REVIEWED is on.
 */
export function UnloadSheet({ onClose }: { onClose: () => void }) {
  return <Sheet title="Unload" onClose={onClose} tall><div /></Sheet>
}
