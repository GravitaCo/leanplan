/**
 * Helplines and services Tali points to (first-run-onboarding §3, §14). Numbers were checked on
 * 27 Sept 2026 and are approved in §14; re-check them before wider launch and whenever this file
 * changes. Tali offers general wellness guidance, never medical advice: these are where the
 * person gets real help.
 */

export type UkNation = 'england' | 'scotland' | 'wales' | 'northern-ireland'

/** The four nations with their names, in the order the signpost lists show them. */
export const NATIONS: [UkNation, string][] = [['england', 'England'], ['scotland', 'Scotland'], ['wales', 'Wales'], ['northern-ireland', 'Northern Ireland']]

export type SignpostKind = 'beat' | 'samaritans' | 'shout' | 'childline' | 'nhs111' | 'nhs111-mental-health' | 'gp' | 'midwife' | 'emergency'

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
  /** a text service (Shout): the short number and the word to send; shown in words as well,
   *  since not every phone fills in an `sms:` link's message */
  sms?: { to: string; body: string }
  /** when this entry was last checked, where it differs from CHECKED_ON */
  checkedOn?: string
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
  // Shout: checked by compliance against Shout's own FAQ on 7 Oct 2026 (wellbeing copy deck B6.6).
  // Free from the main UK networks (not every small network), so the copy says exactly that.
  shout: {
    kind: 'shout',
    name: 'Shout',
    sms: { to: '85258', body: 'SHOUT' },
    hours: '24 hours, every day',
    free: true,
    note: 'Text SHOUT to 85258. Free from the main UK networks.',
    checkedOn: '2026-10-07',
  },
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
  // Northern Ireland has no NHS 111: nidirect sends urgent care that can't wait for the surgery to
  // the GP out-of-hours service (6pm weekdays until the surgery opens, 24 hours at weekends and on
  // public holidays), with a local number per area, no single one ("GP out of hours service" and
  // "Mental health emergency - if you're in crisis or despair", nidirect.gov.uk, checked 10 Oct 2026).
  gp: { kind: 'gp', name: 'Your GP', hours: 'Surgery hours' },
  midwife: { kind: 'midwife', name: 'Your midwife or GP', hours: 'Surgery hours' },
  emergency: { kind: 'emergency', name: 'Emergency services', phone: '999', hours: '24 hours, every day', free: true, note: 'If you or someone else is in danger now.' },
}

/**
 * An `sms:` link that opens a new message to the number with the word filled in. `?&body=` is the
 * form both iOS and Android read; the row also says "Text SHOUT to 85258", so it works either way.
 */
export const smsHref = (sms: { to: string; body: string }): string => `sms:${sms.to}?&body=${encodeURIComponent(sms.body)}`

/**
 * Beat's number while no nation is known (the Mind Support sheet before a nation is picked): the
 * line nhs.uk gives as "the Beat helpline" with no nation attached (nhs.uk, Eating disorders
 * overview, page last reviewed 23 January 2024; checked 10 Oct 2026). Beat's own helplines page
 * lists it under England, so a picked nation still gets its own line.
 */
export const BEAT_ANY_NATION = '0808 801 0677'

/** Beat's number for a nation, or the one nhs.uk gives for everyone when no nation is known. */
export const beatFor = (nation: UkNation | null): string => (nation ? SIGNPOSTS.beat.byNation![nation] : BEAT_ANY_NATION)

/** Where to go for urgent advice that isn't an emergency: NHS 111, or the GP in Northern Ireland. */
export const urgentAdviceFor = (nation: UkNation): Signpost =>
  nation === 'northern-ireland' ? SIGNPOSTS.gp : SIGNPOSTS.nhs111

/** The name to show for a service in a nation ("NHS 24 (111)" in Scotland). */
export const signpostName = (sp: Signpost, nation?: UkNation): string => (nation && sp.nameByNation?.[nation]) || sp.name

/**
 * The signposts that apply in a nation (drops services, like NHS 111 option 2, that don't run there).
 * `null`, no nation known (register item 44): only services that run in all four nations, with the GP
 * in NHS 111's place, as in Northern Ireland, so nobody is sent to a 111 that doesn't run where they
 * live. Picking a nation brings the NHS 111 route back.
 */
export const signpostsFor = (kinds: SignpostKind[], nation: UkNation | null): Signpost[] =>
  kinds.map((k) => SIGNPOSTS[k]).filter((sp) => !sp.nations || sp.kind === 'nhs111' || (nation !== null && sp.nations.includes(nation)))
    .map((sp) => (sp.kind === 'nhs111' && (nation === 'northern-ireland' || nation === null) ? SIGNPOSTS.gp : sp))
    .filter((sp, i, all) => all.findIndex((x) => x.kind === sp.kind) === i)
