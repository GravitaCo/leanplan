import { LEGAL_URLS, MIN_AGE, fact, type LegalDoc } from './index'

const who = () => fact('controller', 'legal name')
const email = () => fact('contactEmail', 'privacy email')

/**
 * Privacy policy for the app (app.tali.fit) and the website (www.tali.fit). Must describe
 * what the code and the site actually do: any new data field, recipient, SDK, embed or
 * purpose means this changes in the same commit.
 */
export function privacyPolicy(): LegalDoc {
  return {
    title: 'Privacy policy',
    updated: '2026-09-24',
    intro:
      `This explains what Tali collects, why, who else handles it and the rights you have. It covers the Tali app ` +
      `(app.tali.fit) and the Tali website (www.tali.fit). Tali is run by ${who()} ("we", "us"). We are the controller ` +
      `of your personal data under the UK GDPR, the Data Protection Act 2018 and, for people in the EU, the EU GDPR.`,
    sections: [
      {
        h: 'Who we are',
        p: [
          `${who()}, a company registered in England and Wales, company number ${fact('companyNumber', 'company number')}. ` +
            `Registered office: ${fact('address', 'address')}. Privacy questions and requests: ${email()}.`,
        ],
      },
      {
        h: 'The short version',
        ul: [
          `Tali stores your log on your device so it works offline.`,
          `With an account, it also syncs to a private database in Ireland (EU) that only you can read.`,
          `Without an account, nothing you log leaves your device.`,
          `No ads, no analytics, no tracking cookies, and we never sell your data or share it for marketing.`,
          `You can export everything or delete your account from the app at any time.`,
        ],
      },
      {
        h: 'What we collect in the app',
        p: [`Only what you enter, or what is needed to run your account:`],
        ul: [
          `Account: your email address and a password (stored as a secure hash, which we can't read). If you sign in with Google, we receive your email address, name and profile picture link from Google.`,
          `Profile: display name, sex, age, height, weight, body fat (if you add it), activity level, goal, pace, diet pattern (such as vegetarian or vegan), training experience, equipment, days per week, and any body areas to train around, with a note if you add one.`,
          `Your log: food and drink, portions, recipes and custom foods; body weight; workouts, including exercises, sets, time, effort and how you felt (sleep, stress, energy and soreness, if you answer); supplements and reminder times; mood and hunger check-ins and their notes; and your if-then plans.`,
          `Settings: calorie and macro targets and ranges, weekly workout schedule, display preferences (including Gentle mode), accuracy preferences and hand-portion sizes.`,
          `On your device only: the list of ingredients you have at home, used for meal suggestions. It is never uploaded.`,
          `Reminders: if you turn them on, a push subscription (an address and keys issued by your browser) so we can send supplement reminders.`,
          `Your consent record: the date you agreed and the version of this policy.`,
        ],
      },
      {
        h: 'What we collect on the website',
        ul: [
          `Early access: if you join the list, your email address.`,
          `Technical: like any website, the servers that deliver the site and app see your IP address, browser and the time of each request. The sign-up form uses a security check (Cloudflare Turnstile) that looks at technical signals from your browser to tell people from bots.`,
        ],
      },
      {
        h: 'Health data',
        p: [
          `Much of what you log in the app (weight, diet, exercise, injuries, sleep, stress, supplements, mood) is health data, a special category of personal data. ` +
            `Your diet pattern may also reveal beliefs. We only process this information with your explicit consent, which the app asks for before you start and records with the date.`,
          `Tali runs on this information, so the app can't work without that consent. You can withdraw it at any time by deleting your account in the app ` +
            `(Profile, then Privacy; this needs a connection) or, without an account, by deleting your data on the device. Withdrawing does not affect what happened before.`,
        ],
      },
      {
        h: 'Why we use it, and our legal basis',
        ul: [
          `To provide the app: store and sync your log, calculate your targets, ranges and trends, suggest meals and workouts, and send reminders you asked for. Basis: our contract with you, and your explicit consent for health data.`,
          `To invite you to early access and tell you when Tali is ready. Basis: your consent, given when you join the list. You can unsubscribe at any time.`,
          `To keep accounts, the app and the site secure and working (sign-in, stopping bots and abuse, fixing faults). Basis: our legitimate interest in running a secure service.`,
          `To answer your requests and meet legal duties. Basis: legal obligation.`,
        ],
      },
      {
        h: 'Automatic calculations',
        p: [
          `Tali suggests calorie and macro targets, meals and workout adjustments from what you enter, using standard formulas. They are suggestions you can change at any time. ` +
            `They have no legal or similarly significant effect on you, and nobody makes decisions about you from them.`,
        ],
      },
      {
        h: 'Who else handles your data',
        p: [`We use a small number of service providers who process data for us, on our instructions:`],
        ul: [
          `Supabase: the app's database, sign-in and reminder service. Your account data is stored in the AWS eu-west-1 region (Ireland).`,
          `GitHub Pages: hosts the app's files and sees technical request data.`,
          `Webflow: hosts the website and stores early access sign-ups. The site is delivered through Cloudflare, which also runs the sign-up security check.`,
          `Bunny.net: delivers the exercise demo videos, and sees technical request data when you play one.`,
          `Your browser's push service (Apple, Google or Mozilla, depending on your device): delivers reminders if you turn them on. A reminder carries only the supplement name, and it is encrypted so the push service can't read it.`,
          `Google: only if you choose "Continue with Google". Google handles that sign-in under its own privacy policy.`,
        ],
      },
      {
        h: 'International transfers',
        p: [
          `Your app account data is stored in the EU. Some of our providers are based in, or may access data from, the United States. ` +
            `Where personal data leaves the UK or EU, we rely on the safeguards the law provides, such as the UK International Data Transfer Addendum, ` +
            `the EU Standard Contractual Clauses or the UK-US and EU-US Data Privacy Framework. Contact us for details of the safeguard for a particular provider.`,
        ],
      },
      {
        h: 'How long we keep it',
        ul: [
          `App account data is kept while you have an account. When you delete your account it is removed from our live database straight away. Copies in our database provider's backups are deleted as those backups expire on its regular cycle.`,
          `Data on your device stays until you delete it in the app, clear your browser data or remove Tali.`,
          `Early access emails are kept until Tali launches and we've invited you, or until you unsubscribe, whichever is sooner.`,
          `Emails you send us are kept only as long as needed to deal with them.`,
        ],
      },
      {
        h: 'Cookies and storage on your device',
        p: [
          `The app uses your browser's storage only for things it needs to work, and the website sets one security cookie. We use no advertising or analytics cookies. ` +
            `Our cookie policy lists each one: ${LEGAL_URLS.cookies}.`,
        ],
      },
      {
        h: 'Security',
        p: [
          `Data travels over encrypted connections. Each row in the app's database is locked to its owner, so no other user can read it, and passwords are stored as hashes. ` +
            `If a breach is likely to put your rights at high risk, we will tell you, and we will report breaches to the Information Commissioner's Office as the law requires.`,
        ],
      },
      {
        h: 'Your rights',
        p: [`You have the right to:`],
        ul: [
          `access your data and get a copy in a portable format (in the app: Profile, then Data and backup, then Export);`,
          `correct it (you can edit everything in the app);`,
          `have it deleted (in the app: Profile, then Privacy);`,
          `restrict or object to how we use it;`,
          `withdraw consent at any time, including unsubscribing from early access emails.`,
        ],
      },
      {
        h: '',
        p: [
          `To use a right the app doesn't cover, email ${email()}. We reply within one month, and it's free.`,
          `If you're unhappy with how we handle your data, please tell us first so we can put it right. You can also complain to the Information Commissioner's Office (ico.org.uk, 0303 123 1113) or, in the EU, to your local data protection authority.`,
        ],
      },
      {
        h: 'Age',
        p: [`Tali is for people aged ${MIN_AGE} and over. We don't knowingly collect data from anyone younger. If you think a child has used Tali, contact us and we will delete their data.`],
      },
      {
        h: 'Changes',
        p: [
          `We update this policy when what we do changes, and show the new date at the top. If a change affects what you've consented to, the app will ask you again. ` +
            `The current version is always at ${LEGAL_URLS.privacy}.`,
        ],
      },
    ],
  }
}
