/**
 * The Support and helplines list for one nation, from signposts.ts. No React, so `npm test` checks it.
 * - Profile › Health data (board ob9-7, note s-ob10): Beat first; unchanged.
 * - The Mind context (wellbeing board B6 frame 1, deck B6.5): Samaritans and Shout first, then the
 *   NHS lines, Beat and 999. Shout appears only here, so Profile's list stays as it was. With no
 *   nation (`null`, the sheet's state until one is picked; register item 44) the list is the same
 *   everywhere in the UK: the GP in NHS 111's place, no option 2 line, Beat's UK-wide number. In
 *   Northern Ireland the GP row also names the GP out-of-hours service.
 */
import { SIGNPOSTS, beatFor, signpostName, signpostsFor, smsHref, type SignpostKind, type UkNation } from '@/core/data/signposts'
import type { SP } from '../onboarding/Signposts'
import { SUPPORT as C } from '../onboarding/copyApp'
import { SUPPORT_MIND } from '../mind/copy'

const KINDS: SignpostKind[] = ['beat', 'nhs111-mental-health', 'nhs111', 'samaritans', 'emergency']
const MIND_KINDS: SignpostKind[] = ['samaritans', 'shout', 'nhs111-mental-health', 'nhs111', 'beat', 'emergency']

/** A row of the list; `sms` (an `sms:` href) is set on a text service (Shout) instead of `tel`. */
export type SupportRow = SP & { sms?: string }

export function supportList(nation: UkNation | null, opts: { context?: 'profile' | 'mind' } = {}): SupportRow[] {
  return signpostsFor(opts.context === 'mind' ? MIND_KINDS : KINDS, nation).map((sp): SupportRow => {
    switch (sp.kind) {
      case 'beat': return { name: 'Beat', desc: `${C.beat} · ${sp.hours}`, num: beatFor(nation), tel: beatFor(nation), web: sp.web, webLabel: C.beatWeb }
      case 'nhs111-mental-health': return { name: 'NHS 111, option 2', desc: `${C.mentalHealth} · ${sp.hours}`, num: sp.phone, tel: sp.phone }
      case 'nhs111': return { name: signpostName(sp, nation ?? undefined), desc: `${C.urgent} · 24 hours`, num: sp.phone, tel: sp.phone }
      // Northern Ireland (and no nation known): the GP in NHS 111's place, no single number
      case 'gp': return { name: sp.name, desc: opts.context === 'mind' && nation === 'northern-ireland' ? SUPPORT_MIND.gpOutOfHours : `${C.urgent} · ${sp.hours}`, num: C.contact }
      case 'samaritans': return { name: sp.name, desc: `${C.samaritans} · ${sp.hours}`, num: sp.phone, tel: sp.phone }
      // "Text SHOUT to 85258" stays in the words, since not every phone fills in the message
      case 'shout': return { name: sp.name, desc: `Text ${sp.sms!.body} to ${sp.sms!.to} · ${sp.hours}`, num: sp.sms!.to, sms: smsHref(sp.sms!) }
      default: return { name: SIGNPOSTS.emergency.name, desc: C.emergency, num: sp.phone, tel: sp.phone }
    }
  })
}
