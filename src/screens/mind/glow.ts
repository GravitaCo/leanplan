/**
 * The P6 Glow pacer's shape (Benn, 8 Oct 2026; canvas 8c, artboards wp-pacer-glow-light/dark), with
 * no React or DOM, so the web pacer (Pacer.tsx) and the native one draw from the same numbers.
 */

export interface Ring { d: number; o: number; w: number }
export interface Glow { sphere: number; rings: Ring[] }

/* The board's keyframes at fullness 0 (rest), 0.7 (end of the breath in) and 1 (after the second
   breath in): ring diameter in px, opacity and border width, inner ring first. */
export const KNOTS = [0, 0.7, 1]
export const DIAM = [[221, 232, 243, 254], [268, 288, 308, 328], [290, 315, 340, 365]]
export const OPAC = [[0.55, 0.38, 0.24, 0.13], [0.44, 0.30, 0.19, 0.10], [0.33, 0.23, 0.14, 0.08]]
export const BORDER = [2, 1.5, 1]
/** the sphere's scale at rest and when full (board: 0.8 to 1) */
export const S_MIN = 0.8

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const round = (x: number, d: number) => Math.round(x * 10 ** d) / 10 ** d

/** The glow at fullness `u` (0 to 1, pacerAt's `scale`). */
export function glowAt(u: number): Glow {
  const x = Math.min(1, Math.max(0, u))
  const k = x <= KNOTS[1] ? 0 : 1
  const t = (x - KNOTS[k]) / (KNOTS[k + 1] - KNOTS[k])
  return {
    sphere: round(lerp(S_MIN, 1, x), 4),
    rings: [0, 1, 2, 3].map((i) => ({
      d: round(lerp(DIAM[k][i], DIAM[k + 1][i], t), 1),
      o: round(lerp(OPAC[k][i], OPAC[k + 1][i], t), 3),
      w: round(lerp(BORDER[k], BORDER[k + 1], t), 2),
    })),
  }
}

/** Reduced motion: the board's still frame, a middle size that never moves. */
export const GLOW_MID: Glow = {
  sphere: 0.9,
  rings: [256, 274, 292, 310].map((d, i) => ({ d, o: [0.44, 0.30, 0.19, 0.10][i], w: 1.5 })),
}
