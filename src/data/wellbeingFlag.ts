/**
 * Wellbeing Phase 1 (docs/plans/wellbeing-plan.md §10b): built, off for users until Benn and
 * ship-critic say so. A build with VITE_WELLBEING=1 turns it on (headless tests and local
 * previews only). Lives in data/, not a screen, so the store and screens can read it without
 * React; core/ never imports it (core functions take the facts they need as arguments).
 * Data shapes, validation, merge and withdrawal clearing don't depend on it.
 */
export const WELLBEING_ENABLED: boolean = false || import.meta.env?.VITE_WELLBEING === '1'

/**
 * Clinician-pending content (§12.5): the low-mood signpost, the skill screens and their copy, and
 * any one-thing option that opens a skill screen. Needs WELLBEING_ENABLED too.
 * VITE_MIND_REVIEWED=1 for headless tests and local previews only.
 */
export const MIND_REVIEWED: boolean = WELLBEING_ENABLED && (false || import.meta.env?.VITE_MIND_REVIEWED === '1')
