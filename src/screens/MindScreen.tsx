import { PageHeader } from '@/ui/primitives'

/**
 * The Mind tab root (WP5 placeholder, behind WELLBEING_ENABLED): only the large title and the
 * Profile avatar for now. WP6 replaces it with the B5 Mind page, keeping this name and file.
 */
export function MindScreen() {
  return (
    <div className="screen">
      <PageHeader title="Mind" />
    </div>
  )
}
