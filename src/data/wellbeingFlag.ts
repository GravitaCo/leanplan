/**
 * Wellbeing Phase 1 (docs/plans/wellbeing-plan.md §10b): Mind and the new navigation, on for
 * everyone (Benn, 10 Oct 2026). A build with VITE_WELLBEING=0 turns it off (headless flag-off
 * scenarios and local previews only). Lives in data/, not a screen, so the store and screens can
 * read it without React; core/ never imports it (core functions take the facts they need as
 * arguments). Data shapes, validation, merge and withdrawal clearing don't depend on it.
 */
export const WELLBEING_ENABLED: boolean = import.meta.env?.VITE_WELLBEING !== '0'

/**
 * The clinician-pending content (§12.5, register item 44): the low-mood signpost, the skill screens
 * (Reset, Wind down, Unload, Get outside) and their copy, and any one-thing option that opens a skill
 * screen. On for everyone while the app isn't public (Benn, 10 Oct 2026); the clinician review is now
 * a gate before public launch. Needs WELLBEING_ENABLED too. A build with VITE_MIND_REVIEWED=0 turns
 * it off (headless skills-off scenarios and local previews only), as VITE_WELLBEING=0 does for Mind.
 */
export const MIND_REVIEWED: boolean = WELLBEING_ENABLED && import.meta.env?.VITE_MIND_REVIEWED !== '0'

/**
 * "Show supplement names in reminders" (board B11b): built, hidden until DPIA 8.8 is signed
 * (register item 45). Gates SuppNamesRow/SuppNamesFoot in Profile and the privacy policy's
 * sentences about it (privacyPolicy's `suppNames`). Needs WELLBEING_ENABLED too.
 * VITE_SUPP_NAMES=1 for headless tests and local previews only. With it off nobody can set
 * `profile.mind.lockNames`, so the reminder service (which names a supplement only when it is
 * stamped true) keeps every supplement reminder generic.
 */
export const SUPP_NAMES_ENABLED: boolean = WELLBEING_ENABLED && (false || import.meta.env?.VITE_SUPP_NAMES === '1')
