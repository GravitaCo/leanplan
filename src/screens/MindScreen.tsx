import { MindPage } from './mind/MindPage'

/**
 * The Mind tab root (behind WELLBEING_ENABLED; App.tsx mounts it while the Mind pillar is on):
 * the B5 Mind page from screens/mind/ (WP6), which replaced WP5's placeholder here.
 */
export function MindScreen() {
  return <MindPage />
}
