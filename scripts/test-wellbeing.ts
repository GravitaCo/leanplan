/* Wellbeing Phase 1 tests (build plan, ground rule 6). Run from scripts/test-core.ts (npm test);
   returns the number of failures. Each work package adds its own suite under scripts/wellbeing/
   and one line below. `npm test` bundles with import.meta.env empty, so WELLBEING_ENABLED and
   MIND_REVIEWED read false here: suites call core with explicit arguments instead. */
import { WELLBEING_ENABLED, MIND_REVIEWED } from '@/data/wellbeingFlag'
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

type FakeServer = (rows: Record<string, any[]>, broken?: string[]) => { fetchFn: typeof fetch; calls: string[] }

export async function wellbeingSuite(fakeServer: FakeServer): Promise<number> {
  let bad = 0
  const ok = !WELLBEING_ENABLED && !MIND_REVIEWED
  if (!ok) bad++
  console.log(ok ? 'PASS' : 'FAIL', 'wellbeing: both flags off in unit tests')
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
  return bad
}
