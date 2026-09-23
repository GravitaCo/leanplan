import { LEGAL_URLS, MIN_AGE, fact, type LegalDoc } from './index'

const who = () => fact('controller', 'legal name')
const email = () => fact('contactEmail', 'privacy email')

/**
 * Privacy policy. Must describe what the code actually does: any new data field,
 * recipient, SDK or purpose means this changes in the same commit.
 */
export function privacyPolicy(): LegalDoc {
  return {
    title: 'Privacy policy',
    updated: '2026-09-23',
    intro:
      `This explains what Tali collects, why, who else handles it and the rights you have. ` +
      `Tali is run by ${who()} ("we"). We are the controller of your personal data under the UK GDPR, ` +
      `the Data Protection Act 2018 and, for people in the EU, the EU GDPR.`,
    sections: [
      {
        h: 'Contact',
        p: [
          `${who()}, ${fact('address', 'address')}. Email ${email()}.`,
          `Registered with the UK Information Commissioner's Office, number ${fact('icoNumber', 'ICO registration number')}.`,
        ],
      },
      {
        h: 'The short version',
        ul: [
          'Tali stores your log on your device so it works offline.',
          'With an account, it also syncs to a private database in Ireland (EU) that only you can read.',
          'Without an account, nothing you log leaves your device.',
          'No ads, no analytics, no tracking, no selling or sharing your data for marketing.',
          'You can export everything or delete your account from Profile at any time.',
        ],
      },
      {
        h: 'What we collect',
        p: ['Only what you enter or what is needed to run your account:'],
        ul: [
          'Account: your email address and a password (stored as a secure hash, never readable by us). If you sign in with Google, we receive your email, name and profile picture link from Google.',
          'Profile: display name, sex, age, height, weight, body fat (if you add it), activity level, goal, pace, training experience, equipment, days per week, body areas to train around and any note about them.',
          'Your log: food and drink, portions and recipes, custom foods, body weight, workouts, supplements and reminder times, mood and hunger check-ins and their notes, and your if-then plans.',
          'Settings: calorie and macro targets, your weekly workout schedule, display preferences (including Gentle mode), accuracy preferences and hand-portion sizes.',
          'Reminders: if you turn them on, a push subscription (an address and keys issued by your browser) so we can send supplement reminders.',
          'Technical: like any website, the servers that deliver Tali see your IP address, browser and the time of each request.',
        ],
      },
      {
        h: 'Health data',
        p: [
          'Much of what you log (weight, diet, exercise, injuries, supplements, mood) is health data, a special category of personal data. ' +
            'We only process it with your explicit consent, which we ask for before you start and record with the date. ' +
            'Health data is what Tali runs on, so it can\'t work without this consent. You can withdraw it at any time by deleting your account (Profile, then Privacy; this needs a connection) or, without an account, by deleting your data on the device. Withdrawing does not affect processing before it.',
        ],
      },
      {
        h: 'Why we use it, and our legal basis',
        ul: [
          'To provide Tali: store and sync your log, calculate your targets, ranges and trends, and send reminders you asked for. Basis: our contract with you, and your explicit consent for health data.',
          'To keep accounts secure and the service working (sign-in, preventing abuse, fixing faults). Basis: our legitimate interest in running a secure service.',
          'To answer your requests and meet legal duties. Basis: legal obligation.',
        ],
      },
      {
        h: 'Automatic calculations',
        p: [
          'Tali suggests calorie and macro targets from your profile using standard formulas. These are suggestions you can change at any time. ' +
            'They do not have legal or similarly significant effects, and no one makes decisions about you from them.',
        ],
      },
      {
        h: 'Who else handles your data',
        p: ['We use a small number of service providers who process data on our instructions under written contracts:'],
        ul: [
          'Supabase: our database, sign-in and reminder service. Your account data is stored in the AWS eu-west-1 region (Ireland).',
          'GitHub Pages: hosts the app files, and sees technical request data.',
          'Your browser\'s push service (Apple, Google or Mozilla, depending on your device): delivers reminders if you turn them on. A reminder carries only the supplement name, and it is encrypted so the push service cannot read it.',
          'Google: only if you choose "Continue with Google". Google handles that sign-in under its own privacy policy.',
        ],
      },
      {
        h: 'International transfers',
        p: [
          'Your account data is stored in the EU. Some providers are based in, or may access data from, the United States. ' +
            'Where data leaves the UK or EU, we rely on the safeguards the law provides, such as the UK International Data Transfer Addendum, ' +
            'the EU Standard Contractual Clauses or the UK-US and EU-US Data Privacy Framework. Contact us for a copy of the relevant safeguard.',
        ],
      },
      {
        h: 'How long we keep it',
        ul: [
          'Your account data is kept while you have an account. When you delete your account it is removed from our live database straight away.',
          `Backups held by our database provider are overwritten within ${fact('backupRetention', 'backup retention period')}.`,
          'Data on your device stays until you delete it (Profile, then Privacy), clear your browser data or uninstall Tali.',
          'Emails you send us are kept only as long as needed to deal with them.',
        ],
      },
      {
        h: 'Storage on your device',
        p: [
          'Tali saves your log, your sign-in session and your consent in your browser\'s local storage so the app works offline. ' +
            'This is strictly necessary for the service you asked for. We use no advertising or analytics cookies and no tracking.',
        ],
      },
      {
        h: 'Security',
        p: [
          'Data travels over encrypted connections. Each database row is locked to its owner, so no other user can read it. ' +
            'Passwords are hashed. If a breach puts your rights at high risk, we will tell you and the ICO as the law requires.',
        ],
      },
      {
        h: 'Your rights',
        p: ['You have the right to:'],
        ul: [
          'access your data, and get a copy in a portable format (Profile, Data & backup, Export);',
          'correct it (edit anything in the app);',
          'delete it (Profile, Privacy, Delete account);',
          'restrict or object to how we use it;',
          'withdraw consent at any time.',
        ],
      },
      {
        h: '',
        p: [
          `To use a right the app doesn't cover, email ${email()}. We reply within one month. It is free.`,
          'If you are unhappy with how we handle your data, please tell us first. You can also complain to the Information Commissioner\'s Office (ico.org.uk, 0303 123 1113) or, in the EU, your local data protection authority.',
        ],
      },
      {
        h: 'Age',
        p: [`Tali is for people aged ${MIN_AGE} and over. We do not knowingly collect data from anyone younger. If you think a child has used Tali, contact us and we will delete their data.`],
      },
      {
        h: 'Changes',
        p: [
          `We will update this policy when what we do changes, and show the new date above. If a change affects what you have consented to, we will ask you again in the app. ` +
            `The current version is always at ${LEGAL_URLS.privacy}.`,
        ],
      },
    ],
  }
}
