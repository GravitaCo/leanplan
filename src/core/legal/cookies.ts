import { LEGAL_URLS, MIN_AGE, fact, type LegalDoc } from './index'

/**
 * Cookie policy for the app and the website. PECR reg. 6 covers any storage or access on
 * the user's device (cookies, localStorage, caches), not just cookies, so every key the
 * app writes is listed. Adding a key, an embed or any analytics means this changes too,
 * and anything not strictly necessary needs opt-in consent before it is set.
 */
export function cookiePolicy(): LegalDoc {
  return {
    title: 'Cookie policy',
    updated: '2026-09-28',
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
          `leanplan.v1: your log, profile, settings and consent choices. Kept until you remove this device's log when signing out, delete your account, or clear your browser data.`,
          `tali.mode: which kind of account this device's log belongs to. Kept until you sign out.`,
          `tali.kitchen: the ingredients you have at home, for meal suggestions. Never leaves your device.`,
          `tali.sound: whether the workout player plays sounds. Kept until you change it or clear your data.`,
          `tali.onboarding: your answers so far while you set Tali up, so you can pick up where you left off. Removed when you finish setup, withdraw consent for health data, remove this device's log or delete your account. Never leaves your device.`,
          `tali.setupCardHidden: that you hid the "Finish your setup" card on Today. Kept until you remove this device's log, delete your account or clear your browser data.`,
          `tali.pendingDelete: if you tell Tali during setup that you're under ${MIN_AGE} and the account can't be deleted straight away: which account to delete, and how many tries Tali has made. Tali tries again when you connect, or, if it has asked you to, when you sign in again. Kept on this device, even when Tali clears this device's data, until that deletion finishes; you can also remove it by clearing your browser data.`,
          `tali.labelConsent: an older record of a label-photo choice, moved into leanplan.v1 the next time the app opens, then removed.`,
          `sb-… (keys starting "sb-"): keeps you signed in to your account. Set by our sign-in provider, Supabase. Kept until you sign out.`,
          `tali.reauthForDelete (session storage): set for a few minutes while you confirm it's you to delete your account. Cleared when you come back or close the tab.`,
          `App files: the app saves its own code, icons and font in your browser's cache so it opens with no connection. These contain no personal data.`,
        ],
      },
      {
        h: 'On the website',
        ul: [
          `_cfuvid: set by Cloudflare, which delivers the site, to protect it from abuse and excessive requests. It is deleted when you close your browser.`,
          `Pages with the early access form load Cloudflare Turnstile when they open. It checks technical signals from your browser to tell people from bots, to keep the form free of spam. We use it only for that.`,
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
          `You can block or delete cookies and site data in your browser settings. Blocking the app's storage stops it working, and clearing it deletes any log that hasn't synced to an account. If you haven't agreed to Tali keeping your health data, or have withdrawn it, your log is kept only on your phones, so clearing this device's data can delete it for good. ` +
            `In the app, Sign out, then "Sign out and remove this device's log" deletes your log from this device, and Profile, then Privacy, then Delete account deletes everything.`,
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
