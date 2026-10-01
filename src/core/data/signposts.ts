/**
 * Helplines and services Tali points to (first-run-onboarding §3, §14). Numbers were checked on
 * 27 Sept 2026 and are approved in §14; re-check them before wider launch and whenever this file
 * changes. Tali offers general wellness guidance, never medical advice: these are where the
 * person gets real help.
 */

export type UkNation = 'england' | 'scotland' | 'wales' | 'northern-ireland'

/** The four nations with their names, in the order the signpost lists show them. */
export const NATIONS: [UkNation, string][] = [['england', 'England'], ['scotland', 'Scotland'], ['wales', 'Wales'], ['northern-ireland', 'Northern Ireland']]

export type SignpostKind = 'beat' | 'samaritans' | 'childline' | 'nhs111' | 'nhs111-mental-health' | 'gp' | 'midwife' | 'emergency'

export interface Signpost {
  kind: SignpostKind
  name: string
  /** one number for everywhere it covers; Beat has one per nation instead (`byNation`) */
  phone?: string
  byNation?: Record<UkNation, string>
  /** the nations the phone number covers; absent = the whole UK */
  nations?: UkNation[]
  /** the service's own name where a nation differs (Scotland: NHS 24) */
  nameByNation?: Partial<Record<UkNation, string>>
  hours: string
  free?: boolean
  note?: string
  /** the service's own page (webchat, email); re-check with the numbers */
  web?: string
}

export const CHECKED_ON = '2026-09-27'

export const SIGNPOSTS: Record<SignpostKind, Signpost> = {
  beat: {
    kind: 'beat',
    name: 'Beat (eating disorder support)',
    byNation: {
      england: '0808 801 0677',
      scotland: '0808 801 0432',
      wales: '0808 801 0433',
      'northern-ireland': '0808 801 0434',
    },
    hours: '3pm–8pm, Monday to Friday',
    free: true,
    note: 'Webchat and email too.',
    web: 'https://www.beateatingdisorders.org.uk/',
  },
  samaritans: { kind: 'samaritans', name: 'Samaritans', phone: '116 123', hours: '24 hours, every day', free: true },
  childline: { kind: 'childline', name: 'Childline', phone: '0800 1111', hours: '24 hours, every day', free: true },
  nhs111: {
    kind: 'nhs111',
    name: 'NHS 111',
    phone: '111',
    nations: ['england', 'wales', 'scotland'],
    nameByNation: { scotland: 'NHS 24 (111)' },
    hours: '24 hours, every day',
    free: true,
    note: 'In Northern Ireland, contact your GP.',
  },
  'nhs111-mental-health': {
    kind: 'nhs111-mental-health',
    name: 'NHS 111, option 2 (mental health)',
    phone: '111',
    nations: ['england', 'wales'],
    hours: '24 hours, every day',
    free: true,
    note: 'Call 111 and choose option 2 for your local NHS mental health crisis line.',
  },
  gp: { kind: 'gp', name: 'Your GP', hours: 'Surgery hours' },
  midwife: { kind: 'midwife', name: 'Your midwife or GP', hours: 'Surgery hours' },
  emergency: { kind: 'emergency', name: 'Emergency services', phone: '999', hours: '24 hours, every day', free: true, note: 'If you or someone else is in danger now.' },
}

/** Beat's number for a nation. */
export const beatFor = (nation: UkNation): string => SIGNPOSTS.beat.byNation![nation]

/** Where to go for urgent advice that isn't an emergency: NHS 111, or the GP in Northern Ireland. */
export const urgentAdviceFor = (nation: UkNation): Signpost =>
  nation === 'northern-ireland' ? SIGNPOSTS.gp : SIGNPOSTS.nhs111

/** The name to show for a service in a nation ("NHS 24 (111)" in Scotland). */
export const signpostName = (sp: Signpost, nation?: UkNation): string => (nation && sp.nameByNation?.[nation]) || sp.name

/** The signposts that apply in a nation (drops services, like NHS 111 option 2, that don't run there). */
export const signpostsFor = (kinds: SignpostKind[], nation: UkNation): Signpost[] =>
  kinds.map((k) => SIGNPOSTS[k]).filter((sp) => !sp.nations || sp.nations.includes(nation) || (sp.kind === 'nhs111' && nation === 'northern-ireland'))
    .map((sp) => (sp.kind === 'nhs111' && nation === 'northern-ireland' ? SIGNPOSTS.gp : sp))
    .filter((sp, i, all) => all.findIndex((x) => x.kind === sp.kind) === i)
