import { LEGAL_URLS, MIN_AGE, UNCONSENTED_DELETION, fact, type LegalDoc } from './index'

const who = () => fact('controller', 'legal name')

/**
 * Terms and conditions. Written for a free service to consumers. A paid tier needs a legal
 * review first (cancellation rights, subscription rules, app store terms).
 * The setup-questions paragraph is gated on `onboarding` (ONBOARDING_ENABLED, src/data/onboardingFlag.ts)
 * and the Mind paragraph on `mind` (WELLBEING_ENABLED): `npm run legal:html` publishes with both
 * flags. With both off, the text matches the page live on www.tali.fit (checked 2026-10-10), so the
 * date stays; with onboarding on and Mind off, it's main's as of 2026-10-09
 * (scripts/fixtures-legal-onboarding.json).
 */
export function termsOfUse({ onboarding = false, mind = false }: { onboarding?: boolean; mind?: boolean } = {}): LegalDoc {
  return {
    title: 'Terms and conditions',
    // Mind on 10 Oct 2026; the Mind paragraph no longer names the skill screens or the low-mood
    // signpost, which stay behind MIND_REVIEWED (compliance 2026-10-10), so it holds either way
    updated: mind ? '2026-10-10' : '2026-09-28',
    intro:
      `These terms are the agreement between you and ${who()} ("we", "us") for using the Tali app and website. ` +
      `${who()} is registered in England and Wales, company number ${fact('companyNumber', 'company number')}, ` +
      `registered office ${fact('address', 'address')}. ` +
      'By using Tali you accept these terms. Please read the health section in particular.',
    sections: [
      {
        h: 'Who can use Tali',
        p: [
          `You must be ${MIN_AGE} or over. Tali is for personal, non-commercial use.`,
        ],
      },
      {
        h: 'Not medical advice',
        p: [
          'Tali offers general wellness and fitness information. It is not a medical device and does not diagnose, treat or prevent any condition. ' +
            'It is not a substitute for advice from a doctor, dietitian or other qualified professional.',
          'Talk to a GP before changing your diet or starting exercise, and do not use Tali to guide your eating, if you:',
        ],
        ul: [
          'are pregnant or breastfeeding;',
          'have, or have had, an eating disorder or a difficult relationship with food;',
          'have diabetes, heart, kidney or liver disease, or another medical condition;',
          'take medication affected by diet or exercise.',
        ],
      },
      {
        h: '',
        p: [
          ...(onboarding
            ? [
                'Tali\'s setup questions about your health only decide how gently your plan starts and whether Tali suggests eating less. They are not a medical check, and they can\'t tell you whether exercise or a change in diet is safe for you. ' +
                  'If you tell Tali you are pregnant or breastfeeding, or have one of the conditions or medicines it asks about, it won\'t suggest eating less. That is a safety setting, not advice for your situation, so still talk to your GP, midwife or care team.',
              ]
            : []),
          'Stop exercising and get medical help if you feel pain, dizziness or shortness of breath. ' +
            'If you are struggling with food, mood or your body, you can talk to your GP, call Beat (0808 801 0677) about eating disorders, or Samaritans (116 123) at any time.',
          ...(mind
            ? [
                "The Mind part of Tali, including check-ins and the one thing for the day, offers general wellbeing ideas. It isn't therapy or counselling, and it isn't a crisis service. Tali doesn't monitor what you write, and nobody is alerted because of how you answer. Tali can show you where to find support (\"Need support now?\" in Mind), and that is all it does. If you or someone else is in danger now, call 999.",
              ]
            : []),
        ],
      },
      {
        h: 'Numbers are estimates',
        p: [
          'Calorie and nutrient values come from published sources such as UK CoFID and brand information, and portions are often estimated. ' +
            'Tali shows a margin (±) for this reason. Targets are calculated with standard formulas and are a starting point, not a prescription. ' +
            'Always check the label if you have an allergy or a medical reason to be exact. Tali does not provide allergen information.',
          'Scanned products come from Open Food Facts, a public database, and can be wrong or out of date, so check the numbers against the pack before you save.',
        ],
      },
      {
        h: 'Your account',
        ul: [
          'Keep your password safe. You are responsible for activity under your account.',
          `Once you’ve agreed to Tali keeping your health data, your log is stored on your phone and synced to your account. Until then, or if you withdraw, new entries are kept only on your phone. If you used Tali before we asked and haven’t agreed by ${UNCONSENTED_DELETION.long}, we delete the copy in your account then. Changes made offline only reach your account once you’re back online. Export a backup now and then: if you lose or reset your phone or clear its browser data, anything that isn’t in your account is gone.`,
          'You can delete your account at any time in Profile, then Privacy, then Delete account.',
        ],
      },
      {
        h: 'Your content',
        p: [
          'What you log is yours. You let us store and process it only to run Tali for you, as described in the privacy policy. We do not claim ownership of it.',
        ],
      },
      {
        h: 'Feedback',
        p: ['If you send us ideas or feedback, we may use them to improve Tali without owing you anything for them.'],
      },
      {
        h: 'Fair use',
        p: [
          'Don\'t misuse Tali: no attempts to access other people\'s data, disrupt the service, reverse engineer it to harm it, or use it for anything unlawful. ' +
            'We may suspend accounts that do, and will tell you why unless the law prevents it.',
        ],
      },
      {
        h: 'The service',
        p: [
          'Tali is currently free. We work to keep it available and accurate but cannot promise it will always be available, error free or unchanged. ' +
            'We may change or stop features. If we plan to close Tali or your account, we will give you reasonable notice where we can so you can export your data.',
        ],
      },
      {
        h: 'Our responsibility to you',
        p: [
          'Nothing in these terms limits our liability for death or personal injury caused by our negligence, for fraud, or for anything else the law does not allow us to limit. ' +
            'Your legal rights as a consumer are not affected.',
          'Otherwise, because Tali is a free wellness tool, we are not responsible for loss that was not foreseeable, for loss caused by you not following the health guidance above, ' +
            'or for business losses. We are not responsible for losing data stored only on your device.',
          'Early access is a test version. Features may change, break or be removed, and we may reset or end early access, telling you first where we can.',
        ],
      },
      {
        h: 'Changes to these terms',
        p: [
          `We may update these terms, for example when the law or Tali changes. We will show the new date above, and for important changes we will ask you to agree again in the app. ` +
            `The current version is always at ${LEGAL_URLS.terms}.`,
        ],
      },
      {
        h: 'Law',
        p: [
          `These terms are governed by the law of ${fact('jurisdiction', 'governing law')}. ` +
            'If you live elsewhere in the UK or in the EU, you keep the protection of your local consumer law and can bring a claim in your local courts.',
          `Questions or complaints: ${fact('contactEmail', 'contact email')}.`,
        ],
      },
    ],
  }
}
