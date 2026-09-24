import { LEGAL_URLS, fact, type LegalDoc } from './index'

/**
 * Cookie policy for the app and the website. PECR reg. 6 covers any storage or access on
 * the user's device (cookies, localStorage, caches), not just cookies, so every key the
 * app writes is listed. Adding a key, an embed or any analytics means this changes too,
 * and anything not strictly necessary needs opt-in consent before it is set.
 */
export function cookiePolicy(): LegalDoc {
  return {
    title: 'Cookie policy',
    updated: '2026-09-24',
    intro:
      `This explains the cookies and other storage the Tali app (app.tali.fit) and website (www.tali.fit) use on your device. ` +
      `The short version: we only use what's needed to make them work. No advertising cookies, no analytics, no tracking. ` +
      `Tali is run by ${fact('controller', 'legal name')}.`,
    sections: [
      {
        h: 'Why there is no cookie banner',
        p: [
          `The law (the Privacy and Electronic Communications Regulations) lets a service use cookies and storage that are strictly necessary for something you've asked for without asking first. ` +
            `Everything below is in that category. If we ever want to add anything that isn't, such as analytics, we will ask for your permission before using it.`,
        ],
      },
      {
        h: 'In the app',
        p: [
          `The app sets no cookies. It uses your browser's local storage, which stays on your device, so that it works offline and keeps you signed in:`,
        ],
        ul: [
          `leanplan.v1: your log, profile and settings. Kept until you delete your data in the app or clear your browser data.`,
          `tali.mode: whether you use Tali with an account or on this device only. Kept until you sign out.`,
          `tali.consent: the date you agreed to Tali using your health information, and the policy version. Kept until you sign out or delete your data.`,
          `tali.kitchen: the ingredients you have at home, for meal suggestions. Never leaves your device.`,
          `sb-… (keys starting "sb-"): keeps you signed in to your account. Set by our sign-in provider, Supabase. Kept until you sign out.`,
          `App files: the app saves its own code and icons in your browser's cache so it opens with no connection. These contain no personal data.`,
        ],
      },
      {
        h: 'On the website',
        ul: [
          `_cfuvid: set by Cloudflare, which delivers the site, to protect it from abuse and excessive requests. It is deleted when you close your browser.`,
          `The early access form uses Cloudflare Turnstile, a security check that tells people from bots. It runs only for that purpose.`,
        ],
      },
      { h: '', p: [`At the time of writing, the website sets no other cookies.`] },
      {
        h: 'Other sites',
        p: [
          `If you choose "Continue with Google", or follow a link to another site (for example a YouTube search for an exercise), that site may set its own cookies under its own policy. We don't control or receive them.`,
        ],
      },
      {
        h: 'Your choices',
        p: [
          `You can block or delete cookies and site data in your browser settings. Blocking the app's storage stops it working, and clearing it deletes any log that hasn't synced to an account. ` +
            `In the app, Profile, then Privacy lets you delete everything on your device.`,
          `Questions: ${fact('contactEmail', 'contact email')}. More about how we handle personal data: ${LEGAL_URLS.privacy}.`,
        ],
      },
      {
        h: 'Changes',
        p: [`We update this policy when what we store changes, and show the new date at the top. The current version is always at ${LEGAL_URLS.cookies}.`],
      },
    ],
  }
}
