import { LEGAL_URLS, MIN_AGE, UNCONSENTED_DELETION, fact, type LegalDoc } from './index'

const who = () => fact('controller', 'legal name')
const email = () => fact('contactEmail', 'privacy email')

/**
 * Privacy policy for the app (app.tali.fit) and the website (www.tali.fit). Must describe
 * what the code and the site actually do: any new data field, recipient, SDK, embed or
 * purpose means this changes in the same commit. Label photo reading (Anthropic) is switched off
 * (LABEL_SCAN_ENABLED in src/data/labelReader.ts) and deliberately not described yet: add it, with
 * its transfer and retention, before that flag is turned on.
 */
export function privacyPolicy(): LegalDoc {
  return {
    title: 'Privacy policy',
    updated: '2026-10-01',
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
          `Tali stores your log on your phone so it works offline. Once you agree, it also syncs to a database in Ireland (EU) that's private to your account.`,
          `When you scan a barcode, Tali looks the product up on Open Food Facts, a public food database.`,
          `No ads, no analytics, no tracking cookies, and we never sell your data or share it for marketing.`,
          `You can export everything or delete your account from the app at any time.`,
        ],
      },
      {
        h: 'What we collect in the app',
        p: [`Only what you enter, or what is needed to run your account:`],
        ul: [
          `Account: your email address and a password (stored as a secure hash, which we can't read). If you sign in with Google, we receive your email address, name and profile picture link from Google.`,
          `Profile: display name, sex (and, if you set Tali up with its questions, your answer of female, male or prefer not to say, used for your energy estimate), age, height, weight, body fat (if you add it), how much you move on a normal day (a steps band or the kind of work you do), activity level, goal, pace, what would make Tali worth it for you, diet pattern (such as vegetarian or vegan), and your training preferences: how confident you feel, how much you move at the moment, days and weekdays, session length, where you train, equipment, what you enjoy, cardio preferences, muscle groups to focus on, and any body areas to go easy on, with a note if you add one.`,
          `Setup health questions: when you set Tali up, it asks a few questions so your plan starts safely. Each one is optional. For the health check (heart, dizziness, pregnancy or recent surgery), the question about some conditions and medicines (diabetes treated with insulin or tablets that can cause lows, kidney disease, a weight-loss injection) and how things have been lately (sleep, stress and how much room you have for change), we keep only the result, such as "start gently" or "don't suggest eating less", never which item you picked (apart from pregnancy, below). We never keep which condition or medicine applies to you. We do keep your answer about how food and weight feel for you (as "yes", "sometimes", "no" or "rather not say") and whether it turned Gentle mode on. If you answered sometimes, Tali asks once, about two weeks in, whether you'd like your food range on Today as well as on Food, and we keep what you chose. If you answered yes, Tali asks at your week-4 look-back whether a calorie range would help, and we keep what you chose and the date, so that after "Not now" it waits 12 weeks before asking again. Closing either question counts as the second answer ("Keep it on Food" or "Not now"). Because these choices are tied to your answer, we treat them as health data too. We also keep whether you're pregnant or breastfeeding (not which) with the date you told us. If you told us you are, Tali asks every 12 weeks whether that still applies; if you choose "Ask me later" or close the question, we keep that date too and ask again two weeks later. We also keep when each answer was last changed, so answers given on two phones don't overwrite each other. You can see these answers, and change or clear them, in the app (Profile, then Health data, then Health check answers). How things have been lately isn't listed there: you can change it, or skip it to delete it, by redoing setup (Profile, then Health data, then Redo setup), which also lets you change what would make Tali worth it and your daily movement.`,
          `Your log: food and drink, portions, recipes and custom foods, including foods you scan with their barcode and where the numbers came from; body weight; workouts, including exercises, sets, time, effort and how you felt (sleep, stress, energy and soreness, if you answer); workouts you create and weekly training plans, with the reasons Tali gives for their choices (some come from your answers above, such as going easy on your knees or starting gently) and any notes you add when a plan ends; supplements and reminder times; mood and hunger check-ins and their notes; and your if-then plans.`,
          `Settings: calorie and macro targets and ranges, weekly workout schedule, display preferences (including Gentle mode), accuracy preferences and hand-portion sizes.`,
          `On your device only: the list of ingredients you have at home, used for meal suggestions. It is never uploaded.`,
          `On your device only, while you set Tali up: your answers so far, so you can pick up where you left off. This draft is never uploaded, and is deleted when you finish setup, withdraw consent for health data, remove this device's log or delete your account.`,
          `Reminders: if you turn them on, a push subscription (an address and keys issued by your browser) so we can send supplement reminders.`,
          `Your consent choices: each time you give or withdraw consent, we record which one, the version of the wording you saw, and when.`,
          `Feedback: if you send feedback from the app, it goes from your own email app to us, with the app version and your browser and device type. Please leave out health details you'd rather keep private.`,
        ],
      },
      {
        h: 'What we collect on the website',
        ul: [
          `Early access: if you join the list, your email address.`,
          `Technical: like any website, the servers that deliver and run the site and app see your IP address, browser and the time of each request, which our providers keep for a short time under their own retention periods, for security and fault-finding.`,
          `Bot protection: when a website page with the sign-up form opens, it loads Cloudflare Turnstile, which checks technical signals from your browser to tell people from bots, whether or not you use the form.`,
        ],
      },
      {
        h: 'Health data',
        p: [
          `Much of what you log in the app (weight, diet, exercise, injuries, sleep, stress, supplements, mood, and your answers to the setup health questions, including pregnancy) can say something about your health, a special category of personal data, and your diet pattern may also reveal beliefs. ` +
            `So before anything is synced, the app asks for your explicit consent to all of it, when you first sign in, and records the date and the version of the wording you saw. The setup questions about your health only appear once you've agreed. If you used Tali before we asked, what you logged then was already synced to your account. ` +
            `If you used Tali before we asked, you can choose "Not now". Everything you log then stays on your phone, and nothing syncs to your account or is backed up there. What was already in your account is kept there, unused, until ${UNCONSENTED_DELETION.long}, and then deleted unless you've agreed. Your phone keeps its copy, and if you agree later it uploads again from your phone. We ask once more after two weeks. Reminders only run once you've agreed.`,
          `You can withdraw that consent at any time in the app (Profile, then Privacy). Withdrawing stops Tali syncing anything you log and deletes your log, profile, settings and reminders from your account, so your log stays only on your phones. ` +
            `It also clears your weigh-ins, check-ins, body details (weight, body fat, height and the sex answer used for your energy estimate), your setup answers (the health check, medical and lately results, pregnancy, how food and weight feel and what you chose when Tali asked about a food or calorie range, what would make Tali worth it, daily movement), your training preferences (including any injuries you've noted), and the reasons in your plans and workouts that came from them, from this phone straight away, and from your other phones the next time each one connects. Your name, age, goal, the sex shown in Profile and whether Gentle mode is on stay on your phones. ` +
            `Your account and your consent choices stay, so you can agree again later, and your log then uploads from your phone. To remove everything, delete your account (Profile, then Privacy, then Delete account; this needs a connection). Withdrawing does not affect what happened before.`,
        ],
      },
      {
        h: 'Why we use it, and our legal basis',
        ul: [
          `To provide the app: store and sync your log (only once you've agreed), calculate your targets, ranges and trends, suggest meals and workouts, and send reminders you asked for. Basis: our contract with you, and your explicit consent for health data.`,
          `To look up a product when you scan its barcode. Basis: our contract with you.`,
          `To read and answer feedback you send us. Basis: our legitimate interest in improving Tali.`,
          `To invite you to try Tali early access. Basis: your consent, given when you join the list. We use your email for nothing else, and you can ask to be removed at any time by emailing us.`,
          `To keep accounts, the app and the site secure and working (sign-in, stopping bots and abuse, fixing faults). Basis: our legitimate interest in running a secure service.`,
          `To send account emails you need, such as confirming your address or resetting your password. Basis: our contract with you.`,
          `To keep a record of the consents you give and withdraw, so we can show what you agreed to and when. Basis: legal obligation (the law requires us to be able to show consent). Kept until you delete your account.`,
          `To answer your requests and meet legal duties. Basis: legal obligation.`,
        ],
      },
      {
        h: 'Automatic calculations',
        p: [
          `Tali suggests calorie and macro targets, meals and workout adjustments from what you enter, using standard formulas. They are suggestions you can change at any time. ` +
            `Some setup answers change what Tali shows, as safety settings: a yes in the health check starts your plan more gently; a yes to the question about conditions and medicines means Tali won't suggest eating less; if you tell Tali you're pregnant or breastfeeding, food stays at maintenance with no calorie number; a yes about food and weight turns on Gentle mode: there's no calorie target, your weight isn't shown on Today, and a calorie range appears on Food only if you ask for one when Tali checks at week 4; and a sometimes leaves Gentle mode off and keeps food to a maintenance range, with your weight not shown on Today and your day on Today in words unless you choose to see the range there. After a yes or sometimes, Tali never suggests eating less and doesn't step up your workouts by itself. These don't diagnose anything and aren't medical advice. ` +
            `They have no legal or similarly significant effect on you, and nobody makes decisions about you from them.`,
        ],
      },
      {
        h: 'Who else handles your data',
        p: [`We use a small number of service providers who process data for us, on our instructions:`],
        ul: [
          `Supabase: the app's database, sign-in, account emails and reminder service. Your account data is stored in the AWS eu-west-1 region (Ireland).`,
          `GitHub Pages: hosts the app's files and sees technical request data.`,
          `Webflow: hosts the website and stores early access sign-ups. The site is delivered through Cloudflare, which also runs the bot check, and some of Webflow's page code loads from Amazon CloudFront.`,
          `Bunny.net: delivers the exercise demo videos, and sees technical request data when you play one.`,
          `Your browser's push service (Apple, Google or Mozilla, depending on your device): delivers reminders if you turn them on. A reminder carries only the supplement name, and it is encrypted so the push service can't read it.`,
          `Google Workspace: our email, which receives feedback and requests you send us.`,
          `Google: only if you choose "Continue with Google". Google handles that sign-in under its own privacy policy.`,
        ],
      },
      {
        h: '',
        p: [
          `Open Food Facts is not our service provider. When you scan a barcode, your phone asks Open Food Facts (openfoodfacts.org, a non-profit in France) for that product, so it sees the barcode and your IP address, under its own privacy policy. Nothing else you log is sent to it.`,
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
          `App account data is kept while you have an account, except as described below. When you delete your account it is removed from our live database straight away. Copies in our database provider's backups, and our providers' security logs, are deleted as they expire on those providers' regular cycles. Early access emails on the website are separate and aren't affected.`,
          `If you withdraw consent for health data, we delete your log, profile, settings and reminders from your account straight away (or as soon as your phone next connects), and keep your account and your consent choices.`,
          `If you used Tali before we asked for consent and haven't agreed by ${UNCONSENTED_DELETION.long} (whether you chose "Not now" or haven't opened the app since), we delete your log, profile, settings and reminders from your account on that date, and keep your account. What's on your phone stays there.`,
          `When we delete data from your account for either of these reasons, copies in our database provider's backups are deleted as they expire on its regular cycle.`,
          `Data on your device stays until you delete it in the app, clear your browser data or remove Tali.`,
          `Early access emails are kept until we've invited you and early access has ended, or until you ask to be removed, whichever is sooner.`,
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
          `access your data and get a copy in a portable format (in the app: Profile, then Back up and restore, then Export);`,
          `correct it (you can edit most of it in the app, including your setup health answers in Profile, then Health data, and we'll correct anything else if you email us);`,
          `have it deleted (in the app: Profile, then Privacy, then Delete account);`,
          `restrict or object to how we use it;`,
          `withdraw consent at any time, including leaving the early access list.`,
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
        p: [`Tali is for people aged ${MIN_AGE} and over. We don't knowingly collect data from anyone younger. If Tali learns that you're under ${MIN_AGE}, whether you tell it during setup, enter it in your profile, restore a backup that says so, or it's already saved on your phone or in your account, it stops there. While it shows, nothing new is saved and nothing syncs to or from your account and reminders stop. A backup that says you're under ${MIN_AGE} isn't loaded. If you entered your age by mistake, you can go back and correct it. If you choose to close, Tali deletes your account and your data on that phone. During setup, if your phone is offline, it finishes the next time it connects. If deleting your account needs you to sign in again, Tali asks you to. If you close the app without choosing, your account stays as it is until you delete it or contact us. If you think a child has used Tali, contact us and we will delete their data.`],
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
