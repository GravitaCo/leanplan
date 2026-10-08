/* WP2: the device-only store (security-data H1): Unload notes stamped with the owner, caps,
   validation, export and import, clearing on withdrawal and on keep / fresh / sign-out-remove,
   lowMoodShown, the "More about sleep" state and the reminder log. Includes the sentinel test (a
   note never reaches any sync payload) and the import-boundary test. Run from
   scripts/test-wellbeing.ts; returns the number of failures. */
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs'
import { join, relative } from 'node:path'
import type { PersistedState } from '@/data/persistence'
import { backupSummary, ensureMeta, freshForAccount, freshForDevice, keepForAccount, loadStateFrom, stateFromBackup, unloadImportResult, unloadImportSkipped } from '@/data/persistence'
import { applyHealthWithdrawal, clearHealthData, HEALTH_FIELDS, healthDataSummary, pauseHealthSync, recordConsent, withdraw } from '@/data/consent'
import {
  addUnloadNote, clearNotifyStore, deleteUnloadNote, lowMoodShownOn, markLowMoodShown, notifyLog, recordNotifyEvents, setSleepMoreOpen, sleepMoreOpen, unloadCount, unloadNotes,
  NOTE_ACCESSORS, PERSISTENCE_ONLY, NOTIFY_DB, NOTIFY_LOG_MAX, UNLOAD_MAX_NOTES, UNLOAD_MAX_PAIRS, UNLOAD_NOTE_MAX_CHARS, type NotesContext,
} from '@/data/deviceOnly'
import { pushDirty, toServerDay, toServerFood, toServerPlan } from '@/data/sync'
import { LOCAL_USER } from '@/data/supabase'

type FakeServer = (rows: Record<string, any[]>, broken?: string[]) => { fetchFn: typeof fetch; calls: string[] }

const SENTINEL = 'SENTINEL-UNLOAD'
const OTHER = '00000000-0000-0000-0000-0000000000bb'
const ON: NotesContext = { signedIn: true, ownerAsk: false, healthAllowed: true }
const T = '2026-10-08T07:40:00.000Z'

/** A state owned by `owner` (LOCAL_USER, the fake server's account, by default). */
function owned(owner = LOCAL_USER): PersistedState {
  const s = loadStateFrom(null)
  ensureMeta(s, false).owner = owner
  return s
}
const note = (mind: string, next?: string) => ({ pairs: [next ? { mind, next } : { mind }] })

async function withFetch<T>(f: typeof fetch, run: () => Promise<T>): Promise<T> {
  const real = globalThis.fetch
  globalThis.fetch = f
  try { return await run() } finally { globalThis.fetch = real }
}

const NOTES_ALLOWED = ['src/data/deviceOnly.ts', 'src/data/persistence.ts', 'src/data/backup.ts', 'src/screens/mind/UnloadSheet.tsx']
const isDeviceOnly = (spec: string) => /(^|\/)deviceOnly(\.tsx?|\.js)?$/.test(spec)
const namesIn = (clause: string): string[] =>
  clause.trim().startsWith('*') ? ['*'] : clause.replace(/[{}]/g, '').split(',').map((x) => x.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0]).filter(Boolean)

/**
 * The import-boundary problems in one source file (security-data, WP2): a notes accessor imported
 * outside NOTES_ALLOWED, a load or restore helper (PERSISTENCE_ONLY) imported outside
 * persistence.ts, any re-export (`export … from`) or dynamic `import()` of deviceOnly, and any
 * direct reach into the notes (`deviceOnly.unload`, `deviceOnly['unload']`, `{ unload } = …deviceOnly`).
 */
export function boundaryIssues(rel: string, code: string): string[] {
  if (rel === 'src/data/deviceOnly.ts') return []
  const out: string[] = []
  for (const m of code.matchAll(/import\s+(?:type\s+)?(\*\s+as\s+\w+|\{[^}]*\})\s+from\s+['"]([^'"]+)['"]/g)) {
    if (!isDeviceOnly(m[2])) continue
    const names = namesIn(m[1])
    if (names.some((n) => n === '*' || (NOTE_ACCESSORS as readonly string[]).includes(n)) && !NOTES_ALLOWED.includes(rel)) out.push(rel)
    if (names.some((n) => n === '*' || (PERSISTENCE_ONLY as readonly string[]).includes(n)) && rel !== 'src/data/persistence.ts') out.push(rel + ' (load or restore helper)')
  }
  for (const m of code.matchAll(/export\s+(?:type\s+)?(\*(?:\s+as\s+\w+)?|\{[^}]*\})\s+from\s+['"]([^'"]+)['"]/g)) {
    if (isDeviceOnly(m[2])) out.push(rel + ' (re-exports deviceOnly)')
  }
  for (const m of code.matchAll(/import\(\s*['"`]([^'"`]+)['"`]\s*\)/g)) {
    if (isDeviceOnly(m[1])) out.push(rel + ' (dynamic import of deviceOnly)')
  }
  if (/deviceOnly\??\.unload\b/.test(code)) out.push(rel + ' (deviceOnly.unload)')
  if (/deviceOnly\s*(\?\.)?\s*\[\s*['"`]unload['"`]\s*\]/.test(code)) out.push(rel + " (deviceOnly['unload'])")
  if (/\{[^{}=]*\bunload\b[^{}=]*\}\s*=\s*[^;\n]*\bdeviceOnly\b/.test(code)) out.push(rel + ' ({ unload } = deviceOnly)')
  return out
}

/** Every .ts/.tsx/.js file under a directory. */
function files(dir: string): string[] {
  const out: string[] = []
  for (const n of readdirSync(dir)) {
    const p = join(dir, n)
    if (statSync(p).isDirectory()) out.push(...files(p))
    else if (/\.(tsx?|js)$/.test(n)) out.push(p)
  }
  return out
}

export async function dataDeviceSuite(fakeServer: FakeServer): Promise<number> {
  let bad = 0
  const checks: [string, boolean][] = []

  /* ---------- the sentinel: a note never reaches any sync payload ---------- */
  {
    const s = owned()
    s.days['2026-10-08'] = { foods: [{ n: 'Porridge', g: 250, k: 180, p: 6, c: 30, f: 4 } as never], supps: { vitd: true }, weight: 81.8, workout: null, checkin: { mood: 2, sleep: 1, t: T } as never }
    s.customFoods.push({ n: 'My flapjack', k: 400, p: 6, c: 50, f: 18, g: 100 } as never)
    s.recipes.push({ name: 'Oats bowl', items: [], servings: 1 } as never)
    s.routines.push({ name: 'Legs', modality: 'strength', effort: 'hard', source: 'custom', blocks: [] } as never)
    s.trainingPlans.push({ name: 'Plan', source: 'custom', state: 'active', phases: [] } as never)
    s.profile.plans = [{ id: 'p1', when: 'If I wake at 3', then: 'I get up', created: '2026-10-01', reviews: [], kind: 'mind' }]
    const added = addUnloadNote(s, { pairs: [{ mind: SENTINEL, next: SENTINEL + '-next' }], ok: SENTINEL + '-ok' }, ON)
    markLowMoodShown(s, '2026-10-08'); setSleepMoreOpen(s, true); recordNotifyEvents(s, [{ kind: 'checkin', at: T, ev: 'shown' }])
    // a migrate pass marks every record dirty with real ids, as a first upload would
    delete s._meta
    ensureMeta(s, true).owner = LOCAL_USER
    // the stored state still holds it (the payloads below are what leaves the phone)
    checks.push(['the sentinel note is saved, under deviceOnly only', added.ok && JSON.stringify(s.deviceOnly).includes(SENTINEL) && !JSON.stringify({ ...s, deviceOnly: undefined }).includes(SENTINEL)])
    recordConsent(s, 'health', true)
    const rows: Record<string, any[]> = { settings: [], day_logs: [], custom_foods: [], recipes: [], routines: [], training_plans: [], consents: [] }
    const srv = fakeServer(rows)
    const bodies: string[] = []
    const spy = (async (url: string, o: RequestInit = {}) => { bodies.push(String(url) + ' ' + (o.body == null ? '' : String(o.body))); return srv.fetchFn(url as never, o) }) as typeof fetch
    const failed = await withFetch(spy, () => pushDirty(s, s._meta!))
    const tables = ['settings', 'day_logs', 'custom_foods', 'recipes', 'routines', 'training_plans', 'consents']
    checks.push(['sentinel: the push reached every table', !failed.length && tables.every((t) => srv.calls.some((c) => c.startsWith('POST ' + t)))])
    const all = bodies.join('\n') + JSON.stringify(rows)
    checks.push(['sentinel: no upload body or stored row holds the note text', !all.includes(SENTINEL)])
    checks.push(['sentinel: nor the deviceOnly key, the marker or the reminder log', !all.includes('deviceOnly') && !all.includes('lowMoodShown') && !all.includes('sleepMore') && !all.includes('"ev"')])
    const direct = [
      toServerDay(s, '2026-10-08', LOCAL_USER), toServerDay(s, '2026-10-08', LOCAL_USER, { serverCheckin: null }),
      toServerFood(s.customFoods[0], LOCAL_USER), toServerPlan(s.trainingPlans[0], LOCAL_USER),
      { user_id: LOCAL_USER, target: s.target, schedule: s.schedule, profile: s.profile },
    ].map((x) => JSON.stringify(x)).join('\n')
    checks.push(['sentinel: toServerDay, toServerFood, toServerPlan and the settings row never carry it', !direct.includes(SENTINEL) && !direct.includes('deviceOnly')])
  }

  /* ---------- the import boundary ---------- */
  {
    const root = process.cwd()
    const src = files(join(root, 'src'))
    const ALLOWED = NOTES_ALLOWED
    const offenders = src.flatMap((f) => boundaryIssues(relative(root, f).split('\\').join('/'), readFileSync(f, 'utf8')))
    checks.push(['import graph: only persistence, backup, deviceOnly and UnloadSheet use the notes accessors, only persistence the load and restore helpers' + (offenders.length ? ' (' + offenders.join(', ') + ')' : ''), !offenders.length])
    // the checker itself catches each way round it
    const caught = (code: string, rel = 'src/screens/X.tsx') => boundaryIssues(rel, code).length > 0
    checks.push(['boundary check catches a re-export, a dynamic import, bracket access and destructuring', [
      "export { unloadNotes } from '@/data/deviceOnly'",
      "export * from '../data/deviceOnly'",
      "const m = await import('@/data/deviceOnly')",
      "const n = s.deviceOnly['unload']",
      "const n = s.deviceOnly?.['unload']",
      'const { unload } = s.deviceOnly',
      'const { unload: u } = state.deviceOnly ?? {}',
      "import { unloadNotes } from '@/data/deviceOnly'",
    ].every((c) => caught(c))])
    checks.push(['boundary check: the load and restore helpers are persistence.ts only', caught("import { mergeUnloadForImport } from './deviceOnly'", 'src/data/backup.ts') && caught("import { cleanDeviceOnly } from '@/data/deviceOnly'", 'src/screens/mind/UnloadSheet.tsx') && !caught("import { cleanDeviceOnly, mergeUnloadForImport } from './deviceOnly'", 'src/data/persistence.ts')])
    checks.push(['boundary check passes the allowed uses', !caught("import { unloadCount, clearDeviceHealth } from './deviceOnly'", 'src/data/consent.ts') && !caught("import { unloadNotes } from '@/data/deviceOnly'", 'src/screens/mind/UnloadSheet.tsx')])
    const quiet = ALLOWED.filter((f) => existsSync(join(root, f))).filter((f) => /console\.\w+\([^)]*(note|pairs|unload|mind|next)/i.test(readFileSync(join(root, f), 'utf8')))
    checks.push(['no console call in those files takes a note', !quiet.length])
    const elsewhere = ['src/data/sync.ts', 'src/data/push.ts', 'src/data/labelReader.ts', 'public/sw.js', 'supabase/functions/send-supplement-reminders/index.ts']
      .filter((f) => existsSync(join(root, f))).filter((f) => /deviceOnly|unload/i.test(readFileSync(join(root, f), 'utf8')))
    checks.push(['sync, push, AI, the service worker and the reminder function never mention it', !elsewhere.length])
  }

  /* ---------- owner stamping ---------- */
  {
    const s = owned()
    addUnloadNote(s, note('work'), ON)
    checks.push(['a note is stamped with the device owner', s.deviceOnly?.unload?.owner === LOCAL_USER && unloadNotes(s, ON).length === 1])
    const json = JSON.parse(JSON.stringify(s)) as PersistedState
    checks.push(['it survives a save and load', unloadNotes(loadStateFrom(json), ON)[0]?.pairs[0].mind === 'work'])
    const other = JSON.parse(JSON.stringify(s)) as PersistedState
    other._meta!.owner = OTHER
    checks.push(['owner mismatch: the notes are dropped on load', !loadStateFrom(other).deviceOnly?.unload])
    const none = JSON.parse(JSON.stringify(s)) as PersistedState
    delete none._meta!.owner
    checks.push(['no owner recorded: the notes are dropped on load', !loadStateFrom(none).deviceOnly?.unload])
    checks.push(['hidden while an owner question is pending, or signed out', !unloadNotes(s, { signedIn: true, ownerAsk: true }).length && !unloadNotes(s, { signedIn: false, ownerAsk: false }).length])
    const kept = keepForAccount(JSON.parse(JSON.stringify(s)), OTHER)
    checks.push(['keepForAccount drops them', !kept.deviceOnly?.unload])
    markLowMoodShown(s, '2026-10-01'); setSleepMoreOpen(s, true); recordNotifyEvents(s, [{ kind: 'checkin', at: T, ev: 'opened' }])
    const kept2 = keepForAccount(JSON.parse(JSON.stringify(s)), OTHER)
    checks.push(['keepForAccount also drops the low-mood marker and the reminder log, keeps the UI state', !kept2.deviceOnly?.lowMoodShown && !kept2.deviceOnly?.notify && kept2.deviceOnly?.ui?.sleepMore === true])
    checks.push(['fresh state and sign-out-remove hold none', !freshForDevice().deviceOnly && !freshForAccount(LOCAL_USER).deviceOnly])
    const refused = [
      addUnloadNote(owned(), note('x'), { ...ON, signedIn: false }),
      addUnloadNote(owned(), note('x'), { ...ON, ownerAsk: true }),
      addUnloadNote(owned(), note('x'), { ...ON, healthAllowed: false }),
      addUnloadNote(loadStateFrom(null), note('x'), ON),
    ]
    checks.push(['not saved signed out, with an owner question, under withdrawal or with no owner', refused.every((r) => !r.ok && r.reason === 'not-now')])
    const d = owned(); const r1 = addUnloadNote(d, note('a'), ON)
    checks.push(['delete removes one note', r1.ok && deleteUnloadNote(d, r1.note.id, ON) && unloadCount(d) === 0 && !deleteUnloadNote(d, r1.note.id, ON)])
  }

  /* ---------- caps and validation ---------- */
  {
    const s = owned()
    const long = addUnloadNote(s, { pairs: [{ mind: 'a'.repeat(UNLOAD_NOTE_MAX_CHARS - 9), next: 'b'.repeat(10) }] }, ON)
    const exact = addUnloadNote(s, { pairs: [{ mind: 'a'.repeat(UNLOAD_NOTE_MAX_CHARS - 10), next: 'b'.repeat(5) }], ok: 'c'.repeat(5) }, ON)
    checks.push(['a note over 2,000 characters is refused with a reason; one at the cap saves', !long.ok && long.reason === 'too-long' && exact.ok])
    const emoji = addUnloadNote(owned(), { pairs: [{ mind: '\u{1F600}'.repeat(UNLOAD_NOTE_MAX_CHARS) }] }, ON)
    checks.push(['the cap counts characters, not UTF-16 units', emoji.ok])
    const empty = addUnloadNote(owned(), { pairs: [{ mind: '  ', next: '' }], ok: ' ' }, ON)
    checks.push(['an empty note is refused', !empty.ok && empty.reason === 'empty'])
    const pairs = addUnloadNote(owned(), { pairs: Array.from({ length: UNLOAD_MAX_PAIRS + 1 }, (_, i) => ({ mind: 'p' + i })) }, ON)
    checks.push(['too many pairs is refused', !pairs.ok && pairs.reason === 'too-many-pairs'])
    const full = owned()
    for (let i = 0; i < UNLOAD_MAX_NOTES; i++) addUnloadNote(full, note('n' + i), ON, new Date(Date.parse(T) + i * 1000).toISOString())
    const over = addUnloadNote(full, note('one more'), ON)
    checks.push(['past 200 notes a new one is refused, and nothing is pruned', !over.ok && over.reason === 'full' && unloadCount(full) === UNLOAD_MAX_NOTES && unloadNotes(full, ON).some((n) => n.pairs[0].mind === 'n0')])
    checks.push(['notes list newest first', unloadNotes(full, ON)[0].pairs[0].mind === 'n' + (UNLOAD_MAX_NOTES - 1)])
    const trimmed = owned(); const t = addUnloadNote(trimmed, { pairs: [{ mind: '  work  ', next: '  ' }, { mind: '', next: '' }], ok: '' }, ON)
    checks.push(['text is trimmed and empty pairs dropped', t.ok && JSON.stringify(t.note.pairs) === '[{"mind":"work"}]' && t.note.ok === undefined])
    const raw = owned() as any
    raw.deviceOnly = {
      unload: { owner: LOCAL_USER, notes: [
        { id: 'good', at: T, pairs: [{ mind: 'ok' }], extra: 'x' },
        { id: 'good', at: T, pairs: [{ mind: 'dup' }] },
        { id: 'noat', pairs: [{ mind: 'x' }] },
        { id: 'big', at: T, pairs: [{ mind: 'x'.repeat(UNLOAD_NOTE_MAX_CHARS + 1) }] },
        { id: 'num', at: T, pairs: [{ mind: 42 }] },
        'junk', null,
      ] },
      lowMoodShown: 'yesterday', notify: [{ kind: 'checkin', at: T, ev: 'shown' }, { kind: 'Bad Kind', at: T, ev: 'shown' }, { kind: 'plan', at: T, ev: 'tapped' }],
      ui: { sleepMore: 'yes' }, stray: 1,
    }
    const v = loadStateFrom(raw)
    checks.push(['load drops malformed, duplicate and over-cap notes and unknown keys', JSON.stringify(v.deviceOnly) === JSON.stringify({ unload: { owner: LOCAL_USER, notes: [{ id: 'good', at: T, pairs: [{ mind: 'ok' }] }] }, notify: [{ kind: 'checkin', at: T, ev: 'shown' }] })])
    const many = owned() as any
    many.deviceOnly = { unload: { owner: LOCAL_USER, notes: Array.from({ length: UNLOAD_MAX_NOTES + 5 }, (_, i) => ({ id: 'n' + i, at: new Date(Date.parse(T) + i * 1000).toISOString(), pairs: [{ mind: 'x' }] })) } }
    checks.push(['a hand-edited file over 200 notes loads the newest 200', unloadCount(loadStateFrom(many)) === UNLOAD_MAX_NOTES])
    checks.push(['an empty device-only store is removed on load', !loadStateFrom({ ...owned(), deviceOnly: {} } as PersistedState).deviceOnly])
  }

  /* ---------- withdrawal clears; "Not now" keeps ---------- */
  {
    const make = () => {
      const s = owned()
      addUnloadNote(s, note('work', 'email Sam'), ON)
      markLowMoodShown(s, '2026-10-02'); setSleepMoreOpen(s, true); recordNotifyEvents(s, [{ kind: 'checkin', at: T, ev: 'shown' }])
      return s
    }
    const a = make()
    checks.push(['healthDataSummary counts the notes', healthDataSummary(a).unloadNotes === 1])
    checks.push(['HEALTH_FIELDS names the device-only health fields', ['device.unload', 'device.lowMoodShown'].every((f) => (HEALTH_FIELDS as readonly string[]).includes(f))])
    const changed = clearHealthData(a, ensureMeta(a, false))
    checks.push(['clearHealthData clears the notes and lowMoodShown, keeps the reminder log and UI state', changed && !a.deviceOnly?.unload && !lowMoodShownOn(a) && notifyLog(a).length === 1 && sleepMoreOpen(a)])
    checks.push(['and they count zero after', healthDataSummary(a).unloadNotes === 0])
    const b = make(); recordConsent(b, 'health', true); withdraw(b, ensureMeta(b, false), 'health')
    checks.push(['withdraw() clears them', !b.deviceOnly?.unload && !lowMoodShownOn(b)])
    const c = make(); recordConsent(c, 'health', false)
    checks.push(['a withdrawal pulled from another phone clears them', applyHealthWithdrawal(c, ensureMeta(c, false)) && !c.deviceOnly?.unload && !lowMoodShownOn(c)])
    const n = make(); pauseHealthSync(n)
    checks.push(['"Not now" keeps them', unloadCount(n) === 1 && lowMoodShownOn(n) === '2026-10-02'])
  }

  /* ---------- export and import ---------- */
  {
    const src = owned()
    const kept = addUnloadNote(src, note('from the backup'), ON)
    markLowMoodShown(src, '2026-09-01')
    const file = JSON.parse(JSON.stringify(src)) as PersistedState // exportBackup writes JSON.stringify(state)
    checks.push(['the export holds the notes', JSON.stringify(file).includes('from the backup') && backupSummary(file).unloadNotes === 1])
    const here = owned(OTHER)
    const mine = addUnloadNote(here, note('on this phone'), ON)
    const dupe = JSON.parse(JSON.stringify(file)) as PersistedState
    dupe.deviceOnly!.unload!.notes.push({ ...(mine.ok ? mine.note : ({} as never)), pairs: [{ mind: 'older copy' }] })
    const r = stateFromBackup(JSON.parse(JSON.stringify(dupe)), JSON.parse(JSON.stringify(here)))
    const texts = unloadNotes(r, ON).map((x) => x.pairs[0].mind).sort()
    checks.push(['a restore merges notes by id (this phone\'s copy wins) and re-stamps the owner', r.deviceOnly?.unload?.owner === OTHER && texts.join('|') === 'from the backup|on this phone' && kept.ok])
    checks.push(['a restore never brings back the backup\'s low-mood marker', !lowMoodShownOn(r)])
    const reloaded = loadStateFrom(JSON.parse(JSON.stringify(r)))
    checks.push(['restored notes survive the next load (stamp matches the owner)', unloadCount(reloaded) === 2])
    const withdrawn = owned(OTHER); recordConsent(withdrawn, 'health', false)
    const w = stateFromBackup(JSON.parse(JSON.stringify(file)), JSON.parse(JSON.stringify(withdrawn)))
    checks.push(['import under withdrawal drops the notes', !w.deviceOnly?.unload])
    const noOwner = stateFromBackup(JSON.parse(JSON.stringify(file)))
    checks.push(['import with no owner on this device drops the notes', !noOwner.deviceOnly?.unload])
    const nearly = owned()
    for (let i = 0; i < UNLOAD_MAX_NOTES - 1; i++) addUnloadNote(nearly, note('n' + i), ON)
    const three = owned()
    for (let i = 0; i < 3; i++) addUnloadNote(three, note('b' + i), ON, new Date(Date.parse(T) + i * 1000).toISOString())
    const over = unloadImportResult(JSON.parse(JSON.stringify(three)), nearly)
    checks.push(['unloadImportResult says how many don\'t fit, and why', over.skipped === 2 && over.reason === 'full' && unloadImportSkipped(JSON.parse(JSON.stringify(three)), nearly) === 2])
    checks.push(['nothing skipped: no reason', JSON.stringify(unloadImportResult(JSON.parse(JSON.stringify(three)), owned())) === '{"skipped":0}'])
    const notNowW = unloadImportResult(JSON.parse(JSON.stringify(three)), withdrawn)
    const unowned = loadStateFrom(null)
    const notNowO = unloadImportResult(JSON.parse(JSON.stringify(three)), unowned)
    checks.push(['import under withdrawal or with no owner says every note was skipped, and why (never silent)', notNowW.skipped === 3 && notNowW.reason === 'not-now' && notNowO.skipped === 3 && notNowO.reason === 'not-now'])
    checks.push(['unloadImportSkipped (the cap count) stays 0 for the not-now case', unloadImportSkipped(JSON.parse(JSON.stringify(three)), withdrawn) === 0])
    checks.push(['a backup with no notes skips nothing, whatever the consent', JSON.stringify(unloadImportResult(owned(), withdrawn)) === '{"skipped":0}'])
    const full = stateFromBackup(JSON.parse(JSON.stringify(three)), JSON.parse(JSON.stringify(nearly)))
    checks.push(['and the restore keeps this phone\'s notes, adding the newest that fit', unloadCount(full) === UNLOAD_MAX_NOTES && unloadNotes(full, ON).some((n) => n.pairs[0].mind === 'b2') && unloadNotes(full, ON).some((n) => n.pairs[0].mind === 'n0')])
  }

  /* ---------- low-mood marker, sleep disclosure, reminder log, wipe ---------- */
  {
    const s = owned()
    markLowMoodShown(s, 'not a day')
    checks.push(['markLowMoodShown takes a YYYY-MM-DD day only', !lowMoodShownOn(s)])
    markLowMoodShown(s, '2026-10-08')
    setSleepMoreOpen(s, true)
    checks.push(['marker and sleep disclosure saved', lowMoodShownOn(s) === '2026-10-08' && sleepMoreOpen(s)])
    setSleepMoreOpen(s, false)
    checks.push(['closing the disclosure removes the key', !sleepMoreOpen(s) && !s.deviceOnly?.ui])
    recordNotifyEvents(s, Array.from({ length: NOTIFY_LOG_MAX + 10 }, (_, i) => ({ kind: 'checkin', at: new Date(Date.parse(T) + i * 60000).toISOString(), ev: 'shown' })))
    checks.push(['the reminder log keeps the newest events only', notifyLog(s).length === NOTIFY_LOG_MAX && notifyLog(s)[NOTIFY_LOG_MAX - 1].at === new Date(Date.parse(T) + (NOTIFY_LOG_MAX + 9) * 60000).toISOString()])
    const deleted: string[] = []
    clearNotifyStore({ deleteDatabase: (n: string) => { deleted.push(n); return {} as IDBOpenDBRequest } })
    clearNotifyStore({ deleteDatabase: () => { throw new Error('blocked') } })
    checks.push(['clearNotifyStore deletes the tali-notify database, quietly when blocked', deleted.join() === NOTIFY_DB && NOTIFY_DB === 'tali-notify'])
    const wipeSrc = readFileSync(join(process.cwd(), 'src/data/account.ts'), 'utf8')
    checks.push(['the account-deletion wipe clears it too', /export function wipeDevice\(\): void \{[\s\S]*?clearNotifyStore\(\)\n\}/.test(wipeSrc)])
  }

  for (const [n, ok] of checks) { if (!ok) bad++; console.log(ok ? 'PASS' : 'FAIL', 'wellbeing device:', n) }
  return bad
}
