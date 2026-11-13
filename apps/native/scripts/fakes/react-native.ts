export const Platform = { OS: 'ios' }
const ls: ((s: string) => void)[] = []
export const AppState = {
  currentState: 'active',
  addEventListener: (_t: string, f: (s: string) => void) => { ls.push(f); return { remove() { ls.splice(ls.indexOf(f), 1) } } },
}
/** The app comes back to the front (as after a visit to Settings). */
export const toFront = () => { for (const f of [...ls]) f('active') }
