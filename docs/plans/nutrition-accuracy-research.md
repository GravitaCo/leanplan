# Nutrition accuracy research — what the evidence says so far

**Status:** Research only, round 1 (September 2026). No app changes made from it yet.
**Owner:** `nutrition-accuracy` agent.
**Method:** multi-source web research with 3-vote adversarial verification per claim
(deep-research workflow, 73 agents, 24 sources fetched, 14 claims checked).

> **Read this first.** Coverage is thin. The cloud sandbox's network proxy blocked most primary
> sources (PMC, PubMed full text, ScienceDirect, gov.uk, the EU and BDA sites), so claims were
> verified from abstracts and snippets. Only three studies survived, each a single paper. Treat
> every figure as a starting point, not settled truth.

## 1. Verified findings

### 1.1 UK menu calorie labels: right on average, unreliable per item (medium confidence)
Bomb calorimetry on **295 menu items** from cafes, pubs and restaurants in England (sampled in 2024,
after mandatory calorie labelling began in 2022):

- Mean measured energy was **17 kcal per item below** the declared value (SD ±149 kcal).
- **Mean absolute difference: 21%** (SD ±29%).
- **35% of items were more than 20% off**: 23% declared too high, 11% too low.
- Pubs were the worst outlet type.

Caveat: calorimetry measures gross energy; menus declare metabolisable energy (Atwater factors),
so the comparison is not strictly like-for-like.

Source: British Journal of Nutrition, PMID 40983597 ([PMC12722009](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC12722009/);
preprint [doi:10.1101/2024.10.24.24316051](https://doi.org/10.1101/2024.10.24.24316051)).

### 1.2 App databases vs a research database, whole foods (medium confidence)
The 50 most-eaten, mostly unprocessed foods from a US weight-loss study, compared against NDSR 2017:

| App | Agreement (ICC) | Notes |
|---|---|---|
| CalorieKing | 0.90–1.00 | Good to excellent throughout |
| Lose It! | good to excellent | All nutrients and food groups |
| MyFitnessPal | 0.89–1.00 | Except fibre (0.67) |
| Fitbit | 0.52–0.98 | Poor in every food group; vegetable fibre 0.16 |

Caveats: this is **database-vs-database agreement, not accuracy** against weighed or lab-analysed food.
It's US data and says nothing about branded, mixed or UK foods. Cronometer and MacroFactor weren't tested.
Verifiers disagreed on the first author; check the full text before quoting.

Source: J Acad Nutr Diet 2022, "Comparative Validity of Mostly Unprocessed and Minimally Processed Food
Items Differs Among Popular Commercial Nutrition Apps Compared with a Research Food Database"
([jandonline](https://www.jandonline.org/article/S2212-2672(21)01382-4/ppt)).

### 1.3 AI photo estimation: about 35% off, and too low on big portions (medium confidence)
52 standardised photos (16 single foods, 36 meals; small, medium and large portions, with cutlery for scale),
reference by weighing plus the Dietist NET database:

| Model (2024) | Energy MAPE | Weight MAPE | Correlation |
|---|---|---|---|
| ChatGPT-4o | 35.8% | 36.3% | r 0.65–0.81 |
| Claude 3.5 Sonnet | 35.8% | 37.3% | r 0.65–0.81 |
| Gemini 1.5 Pro | 64.2% (protein 109.9%) | — | r 0.58–0.73 |

- **Every model underestimated more as portions got larger** (bias slopes −0.23 to −0.50).
- The authors: comparable to self-reported dietary assessment, not yet fit for precise assessment.
- Current models on real users' photos may do better or worse; this needs re-testing before we rely on it.

Source: Current Developments in Nutrition 2025, PMID 41081011 ([PubMed](https://pubmed.ncbi.nlm.nih.gov/41081011/)).

### 1.4 EU/UK label tolerances (checked separately; partly confirmed)
The European Commission's December 2012 tolerance guidance for Regulation 1169/2011, which still applies in the UK,
sets these bands for **carbohydrate and protein**: **< 10 g per 100 g: ±2 g; 10–40 g: ±20%; > 40 g: ±8 g**.
The equivalent fat bands, and whether energy has its own tolerance, were **not confirmed** this round.
A tolerance is a legal band for enforcement, not a measure of typical label error.

Sources: [EC summary table](https://food.ec.europa.eu/system/files/2016-10/labelling_nutrition-vitamins_minerals-guidance_tolerances_summary_table_012013_en.pdf),
[EC full guidance](https://food.ec.europa.eu/system/files/2016-10/labelling_nutrition-vitamins_minerals-guidance_tolerances_1212_en.pdf).

## 2. Tentative ranking (low confidence; synthesis, not voted)
The three studies use different reference standards, so their numbers can't be compared directly.

1. **Curated reference data for whole foods** (CoFID, USDA Foundation/SR Legacy): best available. No lab-measured band yet.
2. **Packaged-food labels**: legally within about ±20% for most macros. Real-world accuracy is unverified here.
3. **UK menu labels**: about ±20% typical per item, with roughly a 1-in-3 chance of worse.
4. **AI photo estimates**: about ±35%, and biased low on large portions.

## 3. What this means for Tali's error model (proposals, not yet applied)
`CAPTURE_ERR` in `src/core/domain/estimate.ts` today: weighed 8%, serving 12%, usual 10%, recipe 12%,
hand 20%, quick 25%, cooking fat 30%.

- **Current values are consistent with the evidence** where it exists. No change is needed now.
- **When restaurant or menu logging arrives**, give it its own capture method at **about 20%**, not the
  serving value (12%). (1.1)
- **When AI photo logging arrives (plan phase 3)**, start at **about 35%**. Photo estimates also run low, so
  always ask about portion size, and add **no** hidden correction factor: ask, don't guess. (1.3)
- **Packaged foods from labels** shouldn't be treated as tighter than about ±10–20%, even when weighed.
  Whether weighed-and-labelled should rise from 8% depends on the real-label-accuracy data we don't have yet. (1.4)
- **Fibre is where databases disagree most** (1.2). If we show fibre, show it as approximate.

## 4. Not covered yet (needs round 2)
No verified claims came back for these parts of the question:

- **Composition tables:** how much of CoFID/McCance & Widdowson, USDA FoodData Central, CIQUAL, NEVO, Frida and AUSNUT is lab-analysed versus calculated or borrowed.
- **Branded data:** Open Food Facts, GS1 UK, Brandbank/Syndigo and retailer feeds; studies of real label accuracy (lead: Food Chemistry 2019, [declared vs analysed values against EU tolerances](https://www.sciencedirect.com/science/article/abs/pii/S0308814619314426)).
- **US rules:** FDA 21 CFR 101.9 tolerances.
- **Commercial APIs:** where Nutritionix, Edamam, FatSecret and Passio get their data.
- **Other apps:** validation of Cronometer and MacroFactor against weighed or lab-analysed meals.
- **Energy maths:** Atwater general vs specific factors; fibre, polyols and alcohol; the metabolisable energy of nuts.
- **Cooking:** raw-vs-cooked yield tables, and the logging error from mixing the two up.
- **Other methods:** depth-sensor estimation, lab-analysis costs, and data-quality techniques.

**How to run round 2:** the blocked domains are the main problem. Either run the `nutrition-accuracy`
agent from a local Claude Code session, or allow these domains in the cloud environment's network policy:
ncbi.nlm.nih.gov, pubmed, sciencedirect.com, gov.uk, food.ec.europa.eu, fdc.nal.usda.gov, ecfr.gov, bda.uk.com.

## 5. Open questions
- How closely do UK packaged-food labels match lab analysis in practice?
- What per-food uncertainty should each composition table carry?
- How much error does the raw/cooked mix-up add? Does asking for cooking method reduce it measurably?
- Do 2025–26 multimodal models, or depth sensors, beat the 35% photo error and the large-portion underestimate on weighed meals?
