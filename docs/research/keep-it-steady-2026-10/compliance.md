# Coming off weight-loss medication: legal and regulatory view

Compliance proposal, 11 Oct 2026. Not legal advice. Before any public launch or ad spend, get a solicitor's view or free CAP Copy Advice.

## 1. Naming the medicines

- **Marketing (website, social, store listing, ads): don't name them.** Under Human Medicines Regulations 2012 reg. 284, no person may publish an advert "likely to lead to the use of" a prescription-only medicine (POM). CAP Code 12.12 says POMs "may not be advertised to the public". The ASA's advice (29 May 2026) treats "any claims, images or references that consumers could understand to refer to" POMs as a breach. That includes "GLP-1" and "weight loss pen". Juniper's "GLP-1" ad was upheld even though the offer covered coaching and an app. October 2026 rulings caught ads that never named the product.
- **Untested for Tali.** I found no ruling on an app that doesn't sell the drug. "Coming off" arguably doesn't lead to use, but the risk remains.
- **Generic wording is safer, not safe.** Every weight-loss injection is a POM, so "after weight-loss medication" or "after the jab" will probably still be read as a POM reference. Safest is no medicine reference at all: "when the extra help stops", "keeping it", "stepping down".
- **Trademarks.** Mounjaro is Eli Lilly's mark. Ozempic and Wegovy are Novo Nordisk's. The Trade Marks Act 1994 s.11(2)(c) allows referential use only "in accordance with honest practices". "Mounjaro maintenance" implies a brand link: infringement and passing-off risk. Semaglutide and tirzepatide are generic names (INNs), not marks.
- **App stores.** No listing yet. Apple guideline 2.3.7 and Google Play's metadata policy bar trademarked terms in metadata.
- **In the app.** The onboarding safety question already says "A weight-loss injection, like semaglutide or tirzepatide" (`src/screens/onboarding/copy.ts:78`). That is a safety screen, not an advert, so it's fine. Keep brand names out of plans and guidance.

## 2. Medical device and health claims

- **Device.** UK MDR 2002 reg. 2 makes software a device when its intended purpose includes the "prevention, monitoring, treatment or alleviation of disease". The manufacturer's own words set that purpose, including marketing. The MHRA's stand-alone software guidance keeps general lifestyle and wellbeing apps outside the regime. Obesity is a medical condition (CAP 13.2), and these drugs treat it. Guidance framed as managing the end of a treatment moves Tali towards a device.
- **Out of scope** without a regulatory plan:
  - taper or dose schedules, or dose logging;
  - advice on when or how to stop;
  - checking for side effects or "rebound";
  - predicting regain;
  - anything for people taking it for type 2 diabetes. Ozempic is licensed for diabetes, so for them stopping changes blood glucose.
- **Words to avoid:** treat, manage obesity, prevent regain, withdrawal, rebound, taper, clinically proven, medical weight management, programme. Also avoid "maintain your weight loss" as a promise: CAP 12.1 and 13.1 need trials on people.
- **Words that keep it general wellness:** keep your habits, a steady week, strength, a protein range, plan for hungry days, ranges not rules.
- **Medical supervision.** CAP 12.2 bars discouraging essential treatment. Nothing may suggest Tali replaces the medicine or that stopping is a good idea.
- **Unknown:** whether the MHRA would agree for this exact design. The qualification note in `docs/compliance/dpia.md` §4.8 is still open and should cover this plan.

## 3. Data

- **The choice is health data.** Picking an "after medication" plan says, with reasonable certainty, that the person took a prescription weight-loss medicine. That is "data concerning health" (UK GDPR Art. 4(15)), special category by inference (Art. 9; ICO special category guidance). Storing or syncing a plan id, tag or flag that encodes it would be storing medication status, against Benn's 5 Oct decision (`docs/plans/maintenance-loop.md` decision 4).
- **What to do:**
  - Build it as the Maintain goal plus content written so it fits this moment. There should be no medication plan id, tag, flag or onboarding answer.
  - Never log which guidance someone reads.
  - Keep medicine words out of push text.
  - Keep the plan choice out of any AI prompt.
- **A named "after medication" plan anyway** would need: Art. 9(2)(a) treatment, `HEALTH_FIELDS` (cleared on withdrawal), export and deletion, privacy policy, register and DPIA updates, and a security-data review.
- **Watch the protein split.** The proposed split (`maintenance-loop.md`, numbers rule) stores a separate outcome when someone currently takes GLP-1. That outcome would itself reveal medication status. The safe version is a routing outcome that doesn't name the medicine, so it can't be read back as "on GLP-1".
- **Unknown:** how the maintain flow will store its outcomes. Review it when Engineering II designs it.

## 4. Disclaimers and GP lines

On the plan, before it starts, and in the guidance:

- "Tali doesn't give advice about any medicine. Talk to your prescriber or GP before you stop, reduce or change a dose, and about how you feel after."
- "If you take it for diabetes, this isn't a diabetes plan. Follow your diabetes team."
- "Planning a pregnancy or pregnant? Talk to your GP or midwife." (Pregnancy routing still applies.)
- Keep the existing wellbeing signposting (Beat, Samaritans, NHS 111), because this group includes people at eating-disorder risk.

The terms already cover "take medication affected by diet or exercise" (`src/core/legal/terms.ts:46`). Add one sentence on stopping medicines. That is not a material change to what people consent to, so no re-consent.

## 5. Marketing

**May say:**
- who Tali is for, without the medicine: "when the extra help stops";
- what Tali does: ranges not rules, short strength sessions, plan for hungry days;
- the three messages in `docs/research/market-wedge-2026-09.md`, after CAP Copy Advice.

**May not say or show:**
- drug names, "GLP-1", jab, injection, pen;
- pen or needle images;
- hashtags such as #mounjaro;
- before and after photos;
- weight-loss or regain-prevention promises (CAP 12.1, 13.1, 13.9);
- obesity references without 12-month evidence (13.2.1);
- anything aimed at under-18s (13.3);
- health professional endorsements (12.18);
- that Tali replaces medication (12.2).

The rules also cover Tali's own social posts and replies in communities such as r/mounjarouk. Use no paid targeting on medicine interest. Before posting in any community, check its rules on promotion.

## Top 3 decisions for Benn

1. **No medicine names anywhere in marketing, plan names or store metadata.** Use generic names only in the onboarding safety question. Ask CAP Copy Advice about "when the extra help stops" before any campaign.
2. **No medication plan in the data.** Build it as Maintain plus suitable content, with no plan id, tag or flag that reveals medication. Make sure the protein split doesn't bring medication status back in.
3. **Keep it general wellness.** No taper, dose, stopping or side-effect features, and no "prevent regain" claims. Mandatory "talk to your prescriber" lines. Finish the MHRA qualification note (DPIA §4.8) before public launch.

Checked 11 Oct 2026: legislation.gov.uk (reg. 284); asa.org.uk (POMs advice, CAP 12 and 13, Juniper); ITV on the Oct 2026 rulings; MHRA software guidance page (its PDF not read).

## 6. Reaching this audience within the rules

Benn's direction (11 Oct): this group is the target, and Tali never gives medical advice. Tali can reach them by naming the moment (appetite back, keeping habits, the next chapter) without naming the medicine. All lines below still need CAP Copy Advice before paid use.

**Marketing lines**

| Line | Verdict | Why |
|---|---|---|
| "Keep what's working when the extra help stops." | OK | No medicine reference, no weight promise |
| "Appetite back? That's normal. Plan for the hungry days." | OK | Describes an experience, makes no claim about a medicine |
| "Two short strength sessions a week. A protein range that fits your life." | OK | General wellness; the protein range must come from `nutrition-accuracy` |
| "Food noise back? You're not starting from zero." | RISKY | "Food noise" is closely tied to these drugs in the community, so in an ad the ASA could read it as an indirect reference. Fine inside the app |
| "Life after weight-loss medication, made calmer." | RISKY | Not named, but every weight-loss injection is a POM, so it is probably a POM reference (ASA advice, 29 May 2026) |
| "Keep the weight off for good." | NOT OK | Unsubstantiated weight claim (CAP 12.1, 13.1) |
| "Coming off the jab? Tali's got you." / "Off the pen? Start here." | NOT OK | "Jab" and "pen" are references the ASA has already ruled against, as is "GLP-1" |
| "Coming off Mounjaro or Ozempic? Try Tali." | NOT OK | Names POMs (reg. 284, CAP 12.12) and uses trade marks |

No pen, needle, vial or fridge-of-pens images. No before and after photos.

**Keywords, SEO and communities**

- **Paid search keywords** ("coming off Ozempic", "semaglutide"):
  - Don't bid on them. Google restricts prescription drug terms in keywords to certified pharmacies and telemedicine providers, and Tali can't be certified.
  - An ad served on a drug search, linking to a page about that moment, adds to the case that it promotes the medicine. The ASA has upheld complaints against paid search ads before (Juniper).
  - Bid instead on the moment: "maintenance calories", "appetite back after diet", "strength training at home", "keep habits without counting". The ad text still follows the table.
- **Social targeting:**
  - No targeting by medicine interest or by lookalike lists built from app data.
  - Meta bars ad text that asserts or implies a personal health attribute ("Are you coming off…?"). This point is from memory: check the current policy.
  - Any pixel or tracking on the website is a PECR consent and privacy-policy change first.
- **Organic content and SEO:**
  - A factual article about the experience ("When appetite comes back: a calm plan for hungry days") is fine.
  - Naming the medicines in body text, factually and without promoting use, is lower risk than an ad but still unknown. Reg. 7 defines an advert as anything "designed to promote… use", and a page on tali.fit with a sign-up button is marketing.
  - Conservative line: no drug names in titles, URLs, meta descriptions, headings or hashtags. A body-text mention goes past CAP Copy Advice first.
- **Community replies** (r/mounjaromaintenanceuk and similar):
  - Allowed if helpful and clearly from Tali. Hiding the business link is a banned practice (DMCC Act 2024 Sch. 20). CAP 2.1 requires marketing to be obviously identifiable.
  - Follow each community's rules. Don't repeat drug names back in replies, and never comment on anyone's dose or medicine.

**In-app lines**

General wellness, and useful:
1. "Hunger can rise when things change. Here's a plan for hungrier days: protein at breakfast, a filling snack ready, and a walk after dinner."
2. "Steady is success. Your weight is shown as a range over weeks, not a daily number."
3. "Two short strength sessions a week help you keep muscle and strength."
4. "Short sleep can make hunger louder. Tonight's wind-down starts at 22:00."
5. "Any change to a medicine is for you and your prescriber. Tali helps with food, movement and sleep around it."

Medical advice, so not allowed:
1. "Reduce your dose every four weeks to avoid regain." (dosing: device and medical advice)
2. "Feeling sick or constipated after stopping? Try this." (side-effect management: talk to a pharmacist instead)
3. "Your hunger is rebound from stopping the medicine. Eat 2 g of protein per kg to prevent regain." (clinical interpretation plus a prevention claim)
