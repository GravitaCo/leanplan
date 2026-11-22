# Cycle: questions for Sara (or Benn)

Asked 19 Nov 2026 by the Cycle engineer (N14, branch `native/n14-cycle`). Also in the Claude doc
https://claude.ai/artifact/VeB7Gm4A86PwCM9RwcENGz (Benn shares it from the doc's Share button).

Eight answers from Sara or Benn unblock the Cycle screens in the native app. The groundwork is built
and passed `ship-critic`, with Cycle switched off for everyone. Answer in your own words (a reply to
Benn, a comment on the doc, or an edit here): only Sara's or Benn's own answer counts. Anything left
blank keeps the built default and stays open. Every number is a provisional alpha value until a
clinician signs it off.

## Product questions

1. **Who can turn Cycle on?** Keep it women-only, or keep the offer women-only but let anyone switch
   it on from settings, unadvertised? `compliance` sees some Equality Act risk for people who
   menstruate but answered "Male" or "Prefer not to say"; this would change Benn's 29 Oct rule.
   Built: women-only (sex answer female, health yes, 18+).
2. **Setup question:** drop "for example with some contraception" from "My periods often stop or
   skip"? `compliance`: it hints at contraception (possible sex-life data) and loses nothing.
   Built: the 4 Nov wording.
3. **Spotting** carries on a period but never starts one; if flow follows within 2 days, the period
   counts from the first spotting day, so "Day N" is right. OK?
4. **Pregnancy or breastfeeding pause:** hide the "Period today?" row too, not just the safety
   prompts? Built: row hidden during the pause.
5. **Long gap with no logged period:** the prompt applies to "Regular", "Irregular" and "Prefer not
   to say", after 90 days, or 180 days for "Irregular"; never for "often stop or skip" or
   perimenopause. Fine for the alpha?

## Board questions (G1/G2, page "Cycle v1 (draft for Benn)" in the master Design canvas, https://claude.ai/artifact/EYDHM6mLouqwPsWxcDsWEb)

6. After "This is usual for me", does "Got it. Tilo won't show this again unless things change"
   appear as the app's existing toast, or replace the card where it sits? Design recommends the toast.
7. Keep the X on the G1 and G2 cards, or drop it so "This is usual for me" is the one way to
   dismiss? Design: two ways to dismiss could confuse.
8. G1's opening line: keep "If this is new for you…" (plan §5.1), or use Sara's "If this is
   different from usual, or getting in the way of things…"?

## Answers

Sara, in the doc above, 22 Nov 2026 (relayed as hers by Benn): (1) keep the offer women-only, but
let anyone switch it on from settings, unadvertised; (2) yes, drop it; (3) yes, as described;
(4) hide the row too; (5) yes, fine for the alpha; (6) toast; (7) drop the X; (8) keep "If this is
new for you…". Recorded in cycle.md §0; (1) is built (cycle.ts `cycleSwitchable`).
