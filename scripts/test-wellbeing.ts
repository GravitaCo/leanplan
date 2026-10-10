/* Wellbeing Phase 1 tests (build plan, ground rule 6). Run from scripts/test-core.ts (npm test);
   returns the number of failures. Each work package adds its own suite under scripts/wellbeing/
   and one line below. `npm test` bundles with import.meta.env empty, so the flags read as a
   production build does: WELLBEING_ENABLED and MIND_REVIEWED on (Benn, 10 Oct 2026),
   SUPP_NAMES_ENABLED off. Suites call core with explicit arguments, so they don't depend on it. */
import { readFileSync } from 'node:fs'
import { WELLBEING_ENABLED, MIND_REVIEWED, SUPP_NAMES_ENABLED } from '@/data/wellbeingFlag'
import { dataSyncedSuite } from './wellbeing/data-synced'
import { coreSuite } from './wellbeing/core'
import { dataDeviceSuite } from './wellbeing/data-device'
import { storeSuite } from './wellbeing/store'
import { trainSuite } from './wellbeing/train'
import { mindPageSuite } from './wellbeing/mind-page'
import { pillarsSuite } from './wellbeing/pillars'
import { checkinSuite } from './wellbeing/checkin'
import { unloadSuite } from './wellbeing/unload'
import { reflectionSuite } from './wellbeing/reflection'
import { summarySuite } from './wellbeing/summary'
import { resetSuite } from './wellbeing/reset'
import { notifySuite } from './wellbeing/notify'
import { signpostSuite } from './wellbeing/signpost'
import { oneThingSuite } from './wellbeing/one-thing'
import { legalSuite } from './wellbeing/legal'
import { windDownSuite } from './wellbeing/wind-down'

type FakeServer = (rows: Record<string, any[]>, broken?: string[]) => { fetchFn: typeof fetch; calls: string[] }

export async function wellbeingSuite(fakeServer: FakeServer): Promise<number> {
  let bad = 0
  const ok = WELLBEING_ENABLED && MIND_REVIEWED && !SUPP_NAMES_ENABLED
  if (!ok) bad++
  console.log(ok ? 'PASS' : 'FAIL', 'wellbeing: a build with no env vars has Mind on, Mind skills on, supplement names off')
  // the forced-off builds (the e2e runs them): VITE_WELLBEING=0 turns both off, VITE_MIND_REVIEWED=0 the skills
  const flagSrc = readFileSync('src/data/wellbeingFlag.ts', 'utf8')
  const forced = /MIND_REVIEWED: boolean = WELLBEING_ENABLED && import\.meta\.env\?\.VITE_MIND_REVIEWED !== '0'/.test(flagSrc)
    && /WELLBEING_ENABLED: boolean = import\.meta\.env\?\.VITE_WELLBEING !== '0'/.test(flagSrc)
  if (!forced) bad++
  console.log(forced ? 'PASS' : 'FAIL', 'wellbeing: VITE_MIND_REVIEWED=0 forces the skills off, VITE_WELLBEING=0 forces Mind and the skills off')
  bad += await dataSyncedSuite(fakeServer)
  bad += coreSuite()
  bad += await dataDeviceSuite(fakeServer)
  bad += storeSuite()
  bad += trainSuite()
  bad += mindPageSuite()
  bad += pillarsSuite()
  bad += checkinSuite()
  bad += unloadSuite()
  bad += reflectionSuite()
  bad += summarySuite()
  bad += resetSuite()
  bad += await notifySuite()
  bad += signpostSuite()
  bad += oneThingSuite()
  bad += legalSuite()
  bad += windDownSuite()
  return bad
}
