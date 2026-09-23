import { LEGAL_URLS, MIN_AGE, fact, type LegalDoc } from './index'

const who = () => fact('controller', 'legal name')

/**
 * Terms of use. Written for a free service to consumers. A paid tier needs a legal
 * review first (cancellation rights, subscription rules, app store terms).
 */
export function termsOfUse(): LegalDoc {
  return {
    title: 'Terms of use',
    updated: '2026-09-23',
    intro:
      `These terms are the agreement between you and ${who()} ("we") for using Tali. ` +
      'By using Tali you accept them. Please read the health section in particular.',
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
          'Stop exercising and get medical help if you feel pain, dizziness or shortness of breath. ' +
            'If you are struggling with food, mood or your body, you can talk to your GP, call Beat (0808 801 0677) about eating disorders, or Samaritans (116 123) at any time.',
        ],
      },
      {
        h: 'Numbers are estimates',
        p: [
          'Calorie and nutrient values come from published sources such as UK CoFID and brand information, and portions are often estimated. ' +
            'Tali shows a margin (±) for this reason. Targets are calculated with standard formulas and are a starting point, not a prescription. ' +
            'Always check the label if you have an allergy or a medical reason to be exact. Tali does not provide allergen information.',
        ],
      },
      {
        h: 'Your account',
        ul: [
          'Keep your password safe. You are responsible for activity under your account.',
          'Without an account, your data is only on your device. We cannot recover it if the device is lost or its browser data is cleared, so export a backup now and then.',
          'You can delete your account at any time in Profile, then Privacy.',
        ],
      },
      {
        h: 'Your content',
        p: [
          'What you log is yours. You let us store and process it only to run Tali for you, as described in the privacy policy. We do not claim ownership of it.',
        ],
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
        ],
      },
      {
        h: 'Changes to these terms',
        p: [
          `We may update these terms, for example when the law or Tali changes. We will show the new date above and tell you in the app about important changes. ` +
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
