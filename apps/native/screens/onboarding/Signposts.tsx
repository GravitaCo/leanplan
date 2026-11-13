/**
 * Onboarding's signpost lists (src/screens/onboarding/AgeStop.tsx SPS), word for word, drawn by
 * N1's Signposts. The numbers are core/data/signposts'. No store, no network: every list shows
 * offline. Proposed: move SPS to a React-free shared module so the web imports the same lists
 * (mental-performance, compliance; a src/ change for the lead).
 */
import { NATIONS, SIGNPOSTS, beatFor } from '@/core/data/signposts'
import type { SP } from '@/screens/onboarding/Signposts'
export type { SP }

/** Beat: every nation's number, labelled (Benn: no nation question), and the webchat. */
const beat = (desc: string): SP => ({
  name: 'Beat', desc: `${desc} ${SIGNPOSTS.beat.hours}. Webchat too.`, web: SIGNPOSTS.beat.web,
  lines: NATIONS.map(([k, l]) => [l, beatFor(k)]),
})
const emergency: SP = { name: 'Emergency', desc: 'If you or someone else is in danger now', num: SIGNPOSTS.emergency.phone, tel: SIGNPOSTS.emergency.phone }
const nhs111: SP = { name: 'NHS 111', desc: 'Medical help when it isn’t an emergency, any time. In Northern Ireland, call your GP.', num: '111', tel: SIGNPOSTS.nhs111.phone }

/** The same lists as the web's AgeStop.tsx SPS (kept equal by scripts/e2e-onboarding-parity.cjs). */
export const SPS: Record<'wellbeing' | 'readiness' | 'pregnancy' | 'medical' | 'medicalNoDeficit' | 'under16', SP[]> = {
  wellbeing: [
    beat('For anyone worried about food, eating or their body.'),
    nhs111,
    { name: 'Samaritans', desc: 'Talk about anything, any time, free', num: '116 123', tel: SIGNPOSTS.samaritans.phone },
    emergency,
  ],
  readiness: [{ name: 'Your GP', desc: 'Before you build up, or if anything changes', num: 'Book' }, nhs111, emergency],
  pregnancy: [{ name: 'Your midwife or GP', desc: 'For anything about you or your baby', num: 'Contact' }, nhs111, emergency],
  medical: [{ name: 'Your GP or care team', desc: 'Before changing how much you eat, or how much protein you aim for', num: 'Contact' }, nhs111],
  medicalNoDeficit: [{ name: 'Your GP or care team', desc: 'Before changing how much you eat', num: 'Contact' }, nhs111],
  under16: [
    { name: 'Childline', desc: 'Free and confidential for anyone under 19. Call or chat online, any time.', num: SIGNPOSTS.childline.phone, tel: SIGNPOSTS.childline.phone },
    beat('If food, eating or your body feel hard to think about.'),
    emergency,
  ],
}

/** The list, drawn by N1's lib/ui Signposts (`.wz-group` of `.wz-sp` rows, the web's labels). */
export { Signposts } from '../../lib/ui/choices'
