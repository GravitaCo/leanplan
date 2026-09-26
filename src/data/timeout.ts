/**
 * Wait for `p`, but settle with `fallback` after `ms` if it hasn't finished: for network calls
 * that must never hold up launch, sign-in or sign-out (offline, a stalled token refresh). A
 * rejection that comes before the deadline still rejects, as with a plain await.
 */
export function withTimeout<T, F>(p: Promise<T>, ms: number, fallback: F): Promise<T | F> {
  let timer: ReturnType<typeof setTimeout> | undefined
  const late = new Promise<F>((resolve) => { timer = setTimeout(() => resolve(fallback), ms) })
  return Promise.race([p, late]).finally(() => clearTimeout(timer))
}
