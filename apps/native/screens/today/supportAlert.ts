/**
 * What the Support stand-in's system alert holds (supportStandIn.ts), with no imports so Node tests
 * it. Every service is in the message with its number, so nothing depends on how many buttons a
 * platform shows. Android shows at most 3 buttons, so there it gets Samaritans, 999 and Close; iOS
 * gets a button per service and Close. The alert can always be closed (Android: back or outside).
 */
export interface SupportAlertRow { name: string; desc: string; num?: string; tel?: string; sms?: string }
export interface SupportAlertButton { text: string; href?: string; cancel?: true }

export function supportAlert(rows: SupportAlertRow[], os: string, words: { lead: string; notCrisis: string; foot: string }) {
  const listed = rows.map((r) => `${r.name}${r.num ? `: ${r.num}` : ''}\n${r.desc}`).join('\n\n')
  const message = `${words.lead}\n\n${listed}\n\n${words.notCrisis}\n\n${words.foot}`
  const reach = rows.filter((r) => r.tel || r.sms)
  const button = (r: SupportAlertRow): SupportAlertButton => ({
    text: `${r.name}: ${r.sms ? 'text' : 'call'} ${r.num}`,
    href: r.sms ?? 'tel:' + r.tel!.replace(/\s/g, ''),
  })
  const close: SupportAlertButton = { text: 'Close', cancel: true }
  if (os === 'android') {
    // the crisis line first, then emergency services: never dropped by Android's 3-button limit
    const first = reach.find((r) => /samaritans/i.test(r.name))
    const emergency = reach.find((r) => r.tel?.replace(/\s/g, '') === '999')
    return { message, buttons: [first, emergency].filter((r): r is SupportAlertRow => !!r).map(button).concat(close) }
  }
  return { message, buttons: [...reach.map(button), close] }
}
