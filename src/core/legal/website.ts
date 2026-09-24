import { LEGAL_URLS, MIN_AGE, fact, type LegalDoc } from './index'

/**
 * Interim, website-only versions of the three documents, published on www.tali.fit while
 * the app is in testing (decided 2026-09-24). They describe only what the Webflow site does
 * today: the early-access form, Cloudflare and Webflow. The full app + website versions
 * (privacy.ts, terms.ts, cookies.ts) replace them at go-live, once the app on main has the
 * consent screen and account deletion. Render with `npm run legal:html -- --site`.
 */
const who = () => fact('controller', 'legal name')
const email = () => fact('contactEmail', 'contact email')
const company = () =>
  `${who()}, a company registered in England and Wales, company number ${fact('companyNumber', 'company number')}, ` +
  `registered office ${fact('address', 'address')}`

export function sitePrivacy(): LegalDoc {
  return {
    title: 'Privacy policy',
    updated: '2026-09-24',
    intro:
      `This explains how we handle personal data on the Tali website (www.tali.fit), including the early access list. ` +
      `The Tali app is still in testing and will have its own, fuller privacy policy here before it opens to the public.`,
    sections: [
      {
        h: 'Who we are',
        p: [`Tali is run by ${company()} ("we", "us"). We are the controller of your personal data. Questions and requests: ${email()}.`],
      },
      {
        h: 'What we collect',
        ul: [
          `Early access: your email address, if you join the list.`,
          `Technical: like any website, the servers that deliver this site see your IP address, browser and the time of each request, and keep short-term logs for security.`,
          `Bot protection: pages with the sign-up form load Cloudflare Turnstile when they open. It checks technical signals from your browser to tell people from bots, whether or not you use the form.`,
        ],
      },
      {
        h: 'Why we use it, and our legal basis',
        ul: [
          `To invite you to try Tali early access. Basis: your consent, given when you join the list. We use your email for nothing else.`,
          `To keep the site secure and free of spam. Basis: our legitimate interest in running a secure website.`,
          `To answer your requests and meet legal duties. Basis: legal obligation.`,
        ],
      },
      {
        h: 'Who else handles it',
        p: [`Service providers who process data for us, on our instructions:`],
        ul: [
          `Webflow: hosts this website and stores early access sign-ups.`,
          `Cloudflare: delivers the site and runs the bot check.`,
          `Amazon CloudFront: delivers some of the site's page code for Webflow.`,
        ],
      },
      {
        h: '',
        p: [`We never sell your data or share it for marketing. There are no ads or analytics on this site.`],
      },
      {
        h: 'International transfers',
        p: [
          `Some of these providers are based in, or may access data from, the United States. Where personal data leaves the UK or EU, we rely on the safeguards the law provides, ` +
            `such as the UK International Data Transfer Addendum, the EU Standard Contractual Clauses or the UK-US and EU-US Data Privacy Framework. Contact us for details.`,
        ],
      },
      {
        h: 'How long we keep it',
        ul: [
          `Early access emails: until we've invited you and early access has ended, or until you ask to be removed, whichever is sooner.`,
          `Emails you send us: only as long as needed to deal with them.`,
        ],
      },
      {
        h: 'Your rights',
        p: [
          `You can ask for a copy of your data, to correct or delete it, to restrict or object to how we use it, and you can withdraw consent at any time. ` +
            `To leave the early access list or use any of these rights, email ${email()}. We reply within one month, and it's free.`,
          `If you're unhappy with how we handle your data, please tell us first so we can put it right. You can also complain to the Information Commissioner's Office (ico.org.uk, 0303 123 1113) or, in the EU, to your local data protection authority.`,
        ],
      },
      {
        h: 'Age',
        p: [`Early access is for people aged ${MIN_AGE} and over. Please don't join the list if you're younger.`],
      },
      {
        h: 'Cookies',
        p: [`This site sets one security cookie and no tracking cookies. Our cookie policy has the details: ${LEGAL_URLS.cookies}.`],
      },
      {
        h: 'Changes',
        p: [`We'll update this policy when what we do changes, including when the app opens, and show the new date at the top. The current version is always at ${LEGAL_URLS.privacy}.`],
      },
    ],
  }
}

export function siteCookies(): LegalDoc {
  return {
    title: 'Cookie policy',
    updated: '2026-09-24',
    intro:
      `This explains the cookies and similar technology used on the Tali website (www.tali.fit). The short version: only what's needed to deliver the site and keep it safe. ` +
      `No advertising cookies, no analytics, no tracking. The site is run by ${who()}.`,
    sections: [
      {
        h: 'What the site uses',
        ul: [
          `_cfuvid: a cookie set by Cloudflare, which delivers the site, to protect it from abuse and excessive requests. It is deleted when you close your browser.`,
          `Cloudflare Turnstile: pages with the early access form load this bot check when they open. It checks technical signals from your browser to tell people from bots and keep the form free of spam. It is used only for that.`,
        ],
      },
      {
        h: '',
        p: [`At the time of writing, the site sets no other cookies.`],
      },
      {
        h: 'Why there is no cookie banner',
        p: [
          `The law (the Privacy and Electronic Communications Regulations) lets a website use cookies and similar technology that are strictly necessary to provide it securely without asking first. ` +
            `If we ever add anything that isn't, such as analytics, we will ask for your permission before using it.`,
        ],
      },
      {
        h: 'Your choices',
        p: [
          `You can block or delete cookies in your browser settings. Blocking them may stop the sign-up form working.`,
          `The Tali app will have its own section here before it opens to the public. Questions: ${email()}. How we handle personal data: ${LEGAL_URLS.privacy}.`,
        ],
      },
    ],
  }
}

export function siteTerms(): LegalDoc {
  return {
    title: 'Terms and conditions',
    updated: '2026-09-24',
    intro:
      `These terms cover your use of the Tali website (www.tali.fit). It is run by ${company()} ("we", "us"). ` +
      `The Tali app is still in testing and will have its own, fuller terms here before it opens to the public.`,
    sections: [
      {
        h: 'Early access',
        p: [
          `Joining the early access list is free and doesn't commit you to anything. It's an invitation to try a test version when places are available, not a promise of access, features or a launch date. ` +
            `You must be ${MIN_AGE} or over to join.`,
        ],
      },
      {
        h: 'Not medical advice',
        p: [
          `Tali offers general wellness information. It is not a medical device and does not diagnose, treat or prevent any condition. ` +
            `Nothing on this site is a substitute for advice from a doctor, dietitian or other qualified professional.`,
        ],
      },
      {
        h: 'Using the site',
        p: [
          `Please don't misuse the site: no attempts to disrupt it, get around its security, or submit other people's details. ` +
            `The name Tali, the design and the content belong to us, and you may not copy them except to share a link or for your own reference.`,
        ],
      },
      {
        h: 'Our responsibility to you',
        p: [
          `We work to keep the site accurate and available but can't promise it always will be. ` +
            `Nothing in these terms limits our liability for death or personal injury caused by our negligence, for fraud, or for anything else the law does not allow us to limit. Your legal rights as a consumer are not affected.`,
        ],
      },
      {
        h: 'Changes and law',
        p: [
          `We may update these terms and will show the new date at the top. The current version is always at ${LEGAL_URLS.terms}. ` +
            `These terms are governed by the law of ${fact('jurisdiction', 'governing law')}. If you live elsewhere in the UK or in the EU, you keep the protection of your local consumer law.`,
          `Questions: ${email()}.`,
        ],
      },
    ],
  }
}
