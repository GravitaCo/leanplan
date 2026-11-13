/**
 * The account screens' small pure rules, kept out of the components so they're tested
 * (scripts/test-account.mjs) and imported by Node directly: no React, no React Native.
 */

/** The word typed to confirm deletion (board ob6-6); the server's own phrase is sent by src/data/account.ts. */
export const DELETE_WORD = 'DELETE'
export const typedOk = (x: string): boolean => x.trim().toUpperCase() === DELETE_WORD

/** The code from a tilo://auth-callback return, or the reason it failed (some error redirects carry
 *  it after # rather than in the query). */
export function codeFrom(url: string): { code: string | null; why: string | null } {
  const back = new URL(url)
  const frag = new URLSearchParams(back.hash.replace(/^#/, ''))
  const why = back.searchParams.get('error_description') || frag.get('error_description') || back.searchParams.get('error') || frag.get('error')
  return { code: back.searchParams.get('code'), why }
}

/** The sign-in photo's height (.auth2-photo): 48% of the screen for sign-in (at least 260), 36% for
 *  creating an account (at least 200), 52% for the email steps (at least 260). */
export function photoHeight(mode: 'signin' | 'signup' | 'forgot' | 'check-email', screenH: number): number {
  return mode === 'signup' ? Math.max(200, screenH * 0.36) : mode === 'signin' ? Math.max(260, screenH * 0.48) : Math.max(260, screenH * 0.52)
}

/** object-fit: cover at object-position 50% 30%: the image's size and offset inside a box. */
export function coverFrame(imgW: number, imgH: number, boxW: number, boxH: number): { width: number; height: number; left: number; top: number } {
  const scale = Math.max(boxW / imgW, boxH / imgH), width = imgW * scale, height = imgH * scale
  return { width, height, left: (boxW - width) / 2, top: -(height - boxH) * 0.3 }
}

/**
 * A Google (or Apple) re-sign-in before deleting confirms the same account: the one this phone's
 * data belongs to (`_meta.owner`), not whatever `getUid()` holds (its signed-out fallback is
 * LOCAL_USER, e.g. on a launch with a weak signal). With no recorded owner there's nothing to compare
 * and the deletion's own owner check (tokenMatchesOwner) fails closed anyway.
 */
export function reauthMatches(owner: string | undefined, signedInAs: string): boolean {
  return !owner || owner === signedInAs
}
