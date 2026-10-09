/* WP12: Reset (board B7) with the P6 Glow pacer (canvas 8c). Run from scripts/test-wellbeing.ts;
   returns the number of failures. The timings are read from RESET_PATTERN, never assumed here. */
import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
import { RESET_DEFAULT_LENGTH, RESET_LENGTHS, RESET_PATTERN } from '@/core/data/skills'
import { breathMs, pacerAt } from '@/core/domain/pacer'
import { mindCopyIssues } from '@/core/domain/engine/why'
import { RESET, finishedLine, leftLine, lengthLabel, resetCopy } from '@/screens/mind/resetCopy'
import { GLOW_MID, glowAt } from '@/screens/mind/Pacer'
import { ResetScreen } from '@/screens/mind/ResetScreen'
import { SHARED } from '@/screens/mind/copy'

export function resetSuite(): number {
  let bad = 0
  const ok = (name: string, pass: boolean, detail?: unknown) => {
    if (!pass) bad++
    console.log(pass ? 'PASS' : 'FAIL', 'wellbeing reset:', name, pass || detail === undefined ? '' : JSON.stringify(detail))
  }

  /* ---------- copy ---------- */
  const copy = [...resetCopy(RESET_LENGTHS), ...RESET_PATTERN.phases.map((p) => p.word)]
  const issues = copy.map((t) => [t, mindCopyIssues(t)] as const).filter(([, i]) => i.length)
  ok('every Reset string passes mindCopyIssues', !issues.length, issues)
  ok('no em dashes', copy.every((t) => !t.includes('—')))
  ok('B7.14 "That\'s {length}." singular and plural', finishedLine(1) === "That's 1 minute." && finishedLine(2) === "That's 2 minutes." && finishedLine(5) === "That's 5 minutes.")
  ok('B7.5 and B7.9 shapes', lengthLabel(2) === '2 min' && leftLine('1:20') === '1:20 left')
  ok('B7.12, B7.13, B7.15 verbatim',
    RESET.stopAnyTime === 'Stop any time. If this makes you feel worse, try a walk instead.'
    && RESET.dizzy === 'If you feel dizzy or uncomfortable, breathe normally.'
    && RESET.comeBack === 'Come back to this whenever you like.')
  ok('lengths from skills.ts, default among them', (RESET_LENGTHS as readonly number[]).includes(RESET_DEFAULT_LENGTH))

  /* ---------- the phase words step in order, counting up (timings from RESET_PATTERN) ---------- */
  const b = breathMs(RESET_PATTERN)
  const seen: string[] = []
  let countsUp = true
  let prev = { phase: -1, count: 0 }
  for (let t = 0; t < b; t += 100) {
    const s = pacerAt(RESET_PATTERN, t, 1)
    if (seen[seen.length - 1] !== s.word) seen.push(s.word)
    if (s.phase === prev.phase && s.count < prev.count) countsUp = false
    if (s.phase !== prev.phase && s.count !== 1) countsUp = false
    prev = { phase: s.phase, count: s.count }
  }
  ok('one breath: Breathe in → And in again → Breathe out', JSON.stringify(seen) === JSON.stringify(['Breathe in', 'And in again', 'Breathe out']), seen)
  ok('counts start at 1 and go up within each phase', countsUp)

  /* ---------- the glow: the board's keyframes, growing and thinning ---------- */
  const rest = glowAt(0), top = glowAt(0.7), full = glowAt(1)
  const d = (g: typeof rest) => g.rings.map((r) => r.d)
  ok('rest = board 0%: sphere 0.8, rings 221/232/243/254, 2 px', rest.sphere === 0.8 && JSON.stringify(d(rest)) === '[221,232,243,254]' && rest.rings.every((r) => r.w === 2))
  ok('end of breath in = board 22%: rings 268/288/308/328, 1.5 px', JSON.stringify(d(top)) === '[268,288,308,328]' && top.rings.every((r) => r.w === 1.5))
  ok('full = board 33%: sphere 1, rings 290/315/340/365, 1 px', full.sphere === 1 && JSON.stringify(d(full)) === '[290,315,340,365]' && full.rings.every((r) => r.w === 1))
  let grows = true
  for (let u = 0.05; u <= 1.0001; u += 0.05) {
    const a = glowAt(u - 0.05), c = glowAt(u)
    if (!(c.sphere >= a.sphere && c.rings.every((r, i) => r.d >= a.rings[i].d && r.w <= a.rings[i].w && r.o <= a.rings[i].o))) grows = false
  }
  ok('as the sphere grows the rings spread, thin and fade', grows)
  ok('rings fade outwards', [rest, top, full, GLOW_MID].every((g) => g.rings.every((r, i) => i === 0 || r.o < g.rings[i - 1].o)))
  ok('reduced motion holds a middle size (board frame)', GLOW_MID.sphere === 0.9 && JSON.stringify(GLOW_MID.rings.map((r) => r.d)) === '[256,274,292,310]')

  /* ---------- the ready screen (server render) ---------- */
  const html = renderToString(createElement(ResetScreen, { onBack: () => {} })).replace(/<!-- -->/g, '')
  const has = (s: string) => html.includes(s.replace(/&/g, '&amp;').replace(/'/g, '&#x27;'))
  for (const s of ['Mind', RESET.title, RESET.sub, RESET.how, RESET.start, RESET.stopAnyTime, RESET.dizzy, SHARED.support, SHARED.wellness, '2 min'])
    ok('ready shows ' + JSON.stringify(s), has(s))
  ok('ready: 1 / 2 / 5 min, 2 selected', /aria-checked="true"[^>]*>2 min</.test(html) && has('1 min') && has('5 min'))
  ok('ready: no count, no word, no time left', !/ left</.test(html) && !html.includes('class="cnt"') && !RESET_PATTERN.phases.some((p) => html.includes('>' + p.word + '<')))

  /* ---------- sources: tokens only, logging only on finish ---------- */
  const css = readFileSync('src/screens/mind/reset.css', 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
  ok('reset.css: mind tokens, never --tint, no hard-coded colours', !css.includes('--tint') && !/#[0-9a-f]{3,8}\b/i.test(css) && css.includes('var(--mind)') && css.includes('var(--mind-fill)') && css.includes('var(--card)'))
  const src = readFileSync('src/screens/mind/ResetScreen.tsx', 'utf8')
  const calls = src.match(/logSkill\(/g) || []
  ok('logSkill is called once, from finish (a stopped run is never logged)', calls.length === 1 && /const finish = \(\) => \{[^}]*logSkill\('reset'\)/.test(src))
  const pacer = readFileSync('src/screens/mind/Pacer.tsx', 'utf8')
  ok('pacer reads the timings (no hard-coded seconds)', !/\bs:\s*\d/.test(pacer) && src.includes('RESET_PATTERN'))
  return bad
}
