/* After a session ends, the next sign-in opens on Summary (Benn, build 16: signing out from Profile
   and signing in again landed on Profile). The store runs in Node with a Map for localStorage;
   nothing is signed in, so the sign-out reaches no server. Also every place a session ends calls
   the same reset. Run from scripts/test-wellbeing.ts; returns the number of failures. */
import { readFileSync } from 'node:fs'
import { useStore } from '@/store/store'

function memoryStorage(): Storage {
  const m = new Map<string, string>()
  return {
    get length() { return m.size }, clear: () => m.clear(), getItem: (k) => (m.has(k) ? m.get(k)! : null),
    key: (i) => [...m.keys()][i] ?? null, removeItem: (k) => { m.delete(k) }, setItem: (k, v) => { m.set(k, String(v)) },
  }
}

export async function firstTabSuite(): Promise<number> {
  let bad = 0
  const ok = (name: string, pass: boolean, detail?: unknown) => {
    if (!pass) bad++
    console.log(pass ? 'PASS' : 'FAIL', 'first tab:', name, pass || detail === undefined ? '' : JSON.stringify(detail))
  }
  const g = globalThis as { localStorage?: Storage; window?: unknown }
  const real = g.localStorage, realWindow = g.window
  g.localStorage = memoryStorage()
  // a page with no push support (the sign-out stops push first)
  if (g.window === undefined) g.window = {}
  try {
    useStore.setState({ tab: 'profile', profileOpen: 'privacy', signedIn: true, authed: false })
    await useStore.getState().signOut()
    const s = useStore.getState()
    ok('signing out from Profile: the next sign-in opens on Summary, with no Profile section open', s.tab === 'today' && s.profileOpen === null && !s.signedIn, { tab: s.tab, profileOpen: s.profileOpen })
  } finally {
    g.localStorage = real
    g.window = realWindow
  }
  const src = readFileSync('src/store/store.ts', 'utf8')
  // every set that ends a session (signedIn = false) also resets the tab
  const ends = src.match(/set\(\(st\) => \{[^}]*st\.signedIn = false[^}]*\}\)|st\.signedIn = false; st\.authed = false[^\n]*/g) ?? []
  ok('every place a session ends resets the tab', ends.length >= 7 && ends.every((x) => x.includes('toFirstTab(st)')), ends.filter((x) => !x.includes('toFirstTab(st)')))
  return bad
}
