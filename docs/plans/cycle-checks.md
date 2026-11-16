# Cycle: regulatory check and demand research (16 Nov 2026)

Results for `docs/plans/cycle.md` §10 (gate 3 of the N14 brief). They are kept here until the
latest cycle.md (Sara's 4 Nov changes and the alpha fixes, on `claude/pensive-bohr-twbee5`) reaches
this branch; then they move into §10 and this file goes. Both block turning Cycle on for testers
beyond Benn and Sara, not building. Neither is legal or medical advice. Agent reports, condensed;
Benn and Sara decide what follows from them.

## Regulatory check (`compliance`, 16 Nov 2026)

Sources checked that day: UK MDR 2002 reg. 2 (legislation.gov.uk); MHRA "Medical device stand-alone
software including apps" v1.10g; Equality Act 2010 Sch. 3 Part 7; CAP Code s.12; ICO glossary.

1. **Medical device: general wellness, with three conditions. Not blocking.** MHRA guidance says
   apps that "simply replace a written diary/log to track or display data related to a woman's
   menstrual cycle", give tips, or only signpost ("see your GP") are unlikely to be devices; symptom
   tracking with automated reasoning, red-flag or severity filters, or anything influencing treatment
   points the other way.
   - Logging, "Day N" and the pain-to-lighter-session offer: wellness.
   - §5.1 prompts: wellness while they only signpost; never name a condition, grade severity or say
     "abnormal".
   - The long-gap deficit pause: probably wellness (consistent with DPIA §4.8) if it reads as Tilo
     pausing its own suggestion, not treatment: word it "Tilo won't suggest eating less while there's
     a gap"; never say or imply eating more brings periods back; never set a target; the person
     keeps control.
   - Never surface the internal usual-start estimate (as a date, count, export field or
     notification): that would be a forecast. No "irregular cycle detected" style labels.
   - Unknown whether MHRA would agree; an optional MHRA borderline enquiry before public launch
     would settle it.
   - **Draft intended-purpose statement** (for the register, the terms and Cycle settings): "Tilo's
     Cycle feature lets adults record their periods and how they feel (menstrual flow, pain and
     everyday symptoms) as a personal diary. Tilo uses what they record to offer general wellness
     choices, such as a lighter training session, and shows general NHS-based information on when
     to speak to a GP or call NHS 111. It is not intended to diagnose, prevent, monitor or treat any
     disease or condition, to predict periods, ovulation or fertile days, or to help anyone get
     pregnant or avoid pregnancy. It is not a medical device."
2. **Equality Act: low risk; one recommended change before wider testers (a decision for Benn or
   Sara, since it changes the 29 Oct "only women see it" rule).** Sch. 3 para 27(2) plus
   proportionality covers a claim by a man. The weak spot is someone who menstruates and answered
   "Male" or "Prefer not to say" (since *For Women Scotland* [2025] UKSC 16, "sex" in the Act means
   biological sex): a gender reassignment or sex discrimination claim needs proportionality, which
   is hard to show when a less restrictive option exists. Suggested fix: keep the proactive offer
   women-only, but let anyone turn Cycle on from settings, unadvertised. Residual risk low.
3. **Art. 9: a separate `cycle` consent is right.** The ICO names signing up to a period tracker as
   an example of sex-life data: treat the log, the synced consent record and any "offer hidden" flag
   as possibly special category, and say so in the consent text ("can reveal things about your
   sexual and reproductive health"), the DPIA addendum and D10. B2 stores bleeding only, so it is
   acceptable; dropping "for example with some contraception" is cleaner and loses nothing. Never
   add free text there.
4. **ASA/CAP.** Evidence for every objective claim (12.1); no medicinal claims; no claim that Tilo
   eases, treats, regulates or restores periods or symptoms; never discourage seeing a GP; s.13 if
   weight is mentioned; iron copy only in authorised wording; no harmful gender stereotypes (4.9);
   no "predict", "fertility", "natural", "sync training to your cycle". Verify every † citation
   first. cycle.md §6 still says www.tali.fit (now www.tilo.fit).
5. **Gates.** Blocks the Benn-and-Sara alpha: the `cycle` consent type and the
   `consents_type_check` migration (Benn applies); withdrawal and "Delete all cycle data" working
   offline; the §6 leakage tests; the intended-purpose statement recorded; onboarding switched on
   through its own `ship-critic`. The policy text may be held for these two informed users.
   Blocks wider testers: the published privacy policy Cycle section and the new sex-answer purpose;
   the register row; the DPIA §10 addendum (with §7.3 re-checked) and DPIA D1; the item 2 settings
   route, if chosen; testers told the thresholds are provisional; the ICO fee (`LEGAL.icoNumber` is
   null); D4 processor DPAs confirmed.

## Demand research (`marketing-research`, 16 Nov 2026)

**Answer.** Women clearly use cycle tracking and symptoms clearly disrupt training. Evidence that
they want a symptom-first cycle feature inside a fitness app specifically: **unknown** (no survey
asks it). Worth an alpha: moderate confidence. Drives adoption on its own: low.

- 51% of UK women aged 44 and under track their cycle with an app or device (YouGov, n=2,199,
  Mar 2024). 34% of UK women had used a period or fertility app, 69% at 18 to 24 (ICO/Savanta,
  n=1,152, Sept 2023; ICO page now 404, figures via trade press).
- Symptoms are near-universal among exercising women, who say they limit training (Bruinvels et
  al., BJSM 2021, n=6,812).
- Flo's own study (SAGE Women's Health, n=5,703; Flo release 16 Sept 2026; correlational,
  self-published) found workout frequency changed little by phase, which supports symptoms over
  phase plans.
- Incumbents sell phases: WHOOP (phase advice; symptom predictions since Mar 2026), Oura (phases,
  fertile window), Garmin (phase guidance, predictions), FitrWoman (phase training and nutrition).
  Strava: no native feature found. Apple Health: not re-checked.
- Risks (inferred or guessed): people expecting "cycle syncing" find it underwhelming; regular
  users of Flo, Clue or a watch log twice for less; no reason to open Cycle except on symptom days.
  People with irregular cycles, perimenopause or contraception that changes bleeding are poorly
  served by forecasts, which fits Tilo's audience.
- Differentiation: privacy you can explain (on the phone only; transparency 59% and security 57%
  were women's top worries, ICO 2023); it acts where the person trains and eats; it is honest.

**Validation plan (alpha, no analytics).** Five 20-minute interviews with women who train or track
food, at least two with irregular cycles or perimenopause, through Benn's and Sara's networks.
`compliance` must clear this first (it collects menstrual health data from non-users); anonymised
notes, no names next to answers. Questions: how periods affect training or eating (the last time);
what they track with now and why they keep or drop it; (showing the board) what they'd expect it to
do (probe for phase coaching); would they log here as well as their current app; anything
intrusive, judging or missing. **Go to wider testers if** at least 3 of 5 would log here as well as
or instead of their current app, and at most 1 expects phase coaching and wouldn't use Cycle
without it.

**Alpha measures** (thresholds are guesses), asked at 2 and 6 weeks: on symptom days, a session or
the lighter swap rather than a skip (most); check-in extra work 1 to 5 (median 2 or lower); turned
Cycle off (at most 1 in 5); any prompt felt judging (zero; any yes goes to `mental-performance`);
still using another tracker (duplication, not a gate).

Sources: yougov.com/en-gb/articles/48998-what-brits-are-tracking-health-apps-2024;
pubmed.ncbi.nlm.nih.gov/33199360; verdict.co.uk and research-live.com (ICO/Savanta figures);
finance.yahoo.com (Flo, 16 Sept 2026); whoop.com thelocker cycle coaching; techcrunch.com 10 Mar
2026; support.ouraring.com 4410663885331; garmin.com blog; apps.apple.com FitrWoman.
