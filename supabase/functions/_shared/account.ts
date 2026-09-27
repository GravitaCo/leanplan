/**
 * Shared by the `delete-account` Edge Function (Deno) and the tests: pure TS, no imports.
 *
 * Every table holding a user's rows, keyed by user_id. Add a table here in the same change that
 * creates it: `npm test` fails when a table in docs/security-rls.sql or docs/migrations/ is missing.
 */
export const USER_TABLES = ['consents', 'ai_usage', 'push_subscriptions', 'training_plans', 'routines', 'recipes', 'custom_foods', 'day_logs', 'settings'] as const

/** The body the function requires (src/data/account.ts sends it), so a stray POST deletes nothing. */
export const DELETE_CONFIRM = 'delete my account'
