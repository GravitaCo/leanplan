/**
 * Profile › Health data › Support and helplines (board ob9-7, note s-ob10): the services for one
 * nation, in the board's order, from signposts.ts. No React, so `npm test` checks it.
 */
import { SIGNPOSTS, beatFor, signpostName, signpostsFor, type SignpostKind, type UkNation } from '@/core/data/signposts'
import type { SP } from '../onboarding/Signposts'
import { SUPPORT as C } from '../onboarding/copyApp'

const KINDS: SignpostKind[] = ['beat', 'nhs111-mental-health', 'nhs111', 'samaritans', 'emergency']

export function supportList(nation: UkNation): SP[] {
  return signpostsFor(KINDS, nation).map((sp): SP => {
    switch (sp.kind) {
      case 'beat': return { name: 'Beat', desc: `${C.beat} · ${sp.hours}`, num: beatFor(nation), tel: beatFor(nation), web: sp.web, webLabel: C.beatWeb }
      case 'nhs111-mental-health': return { name: 'NHS 111, option 2', desc: `${C.mentalHealth} · ${sp.hours}`, num: sp.phone, tel: sp.phone }
      case 'nhs111': return { name: signpostName(sp, nation), desc: `${C.urgent} · 24 hours`, num: sp.phone, tel: sp.phone }
      // Northern Ireland: the GP in NHS 111's place, no single number
      case 'gp': return { name: sp.name, desc: `${C.urgent} · ${sp.hours}`, num: C.contact }
      case 'samaritans': return { name: sp.name, desc: `${C.samaritans} · ${sp.hours}`, num: sp.phone, tel: sp.phone }
      default: return { name: SIGNPOSTS.emergency.name, desc: C.emergency, num: sp.phone, tel: sp.phone }
    }
  })
}
