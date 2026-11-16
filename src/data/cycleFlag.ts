/**
 * Cycle (docs/plans/cycle.md): built behind its own flag, OFF in every production build. A build
 * with VITE_CYCLE=1 turns it on: Benn's and Sara's local previews (scripts/preview.sh) and native
 * dev builds, and headless tests only. It stays that way until:
 * - a clinician signs off the provisional thresholds in core/domain/cycle.ts (CYCLE_THRESHOLDS)
 *   before beta (cycle.md §0, 4 Nov; §10.2);
 * - the regulatory check (compliance) and demand research are recorded in cycle.md §10 and clear
 *   testers beyond Benn and Sara;
 * - onboarding is on (its own change: DPIA §§1-7 signed by Benn, register #34), since the gate
 *   reads the onboarding sex answer;
 * - the consents_type_check migration (docs/migrations/2026-11-16-cycle-consent.sql) is applied by Benn.
 * Lives in data/, not a screen, so the store, screens and legal scripts can read it without React;
 * core/ never imports it. Data shapes, validation, withdrawal and delete don't depend on it, so a
 * build with it off still deletes any cycle data on a health withdrawal.
 */
export const CYCLE_ENABLED: boolean = false || import.meta.env?.VITE_CYCLE === '1'
