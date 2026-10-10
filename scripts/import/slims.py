"""Import Slim Chickens UK's menu nutrition into src/core/data/chains/slims.ts.

Usage:  curl -sSL https://menus.tenkites.com/brg/slimscore -o slimscore.html
        python3 scripts/import/slims.py slimscore.html
Needs:  Python 3 only (stdlib). Dev tool: the app never runs this.

Source: Slim Chickens UK's "Dietary Information" page (linked from slimchickens.co.uk's footer)
is hosted by Ten Kites. `brg/slimscore` is the core restaurant menu most UK sites use (Belfast,
high-street, hub and breakfast sites have their own variants, not imported). Each menu item
is a `k10-recipe_menu-item` under a course heading. Items in a build-your-own group carry
their figures in a `data-recipe` JSON blob (`ntrs`, the displayed `Val` per serving); the
rest carry a nutrition table (`data-nutr-name` rows). We keep the displayed per-serving
values. Ten Kites gives no portion weights, so every food is per item (`each`), exactly as
published. Deterministic: no AI, no guessing. Review the diff on each re-run.
"""
import html, json, re, sys

OUT = 'src/core/data/chains/slims.ts'
# nutrient names as the two layouts spell them -> our keys
KEYS = {'Energy kJ': 'kj', 'Energy kcal': 'k', 'Protein g': 'p', 'Carb g': 'c', 'Fat g': 'f',
        'Energy (kJ)': 'kj', 'Energy (kCal)': 'k', 'Protein (g)': 'p', 'Carb (g)': 'c', 'Fat (g)': 'f'}
# the page's own wording, tidied into item names (names are stable IDs: settle them before shipping)
RENAME = {
    '3 Tender & 3 Crispy Wing': '3 Tenders & 3 Crispy Wings Meal',
    '5 Tenders & 5 Crispy Wings': '5 Tenders & 5 Crispy Wings Meal',
    'Plant Based 3 Tenders Meal': 'Plant-Based Tenders Meal (3 pieces)',
    'Hot Buffalo Sandwich Solo': 'Hot Buffalo Sandwich', 'Honey BBQ Sandwich Solo': 'Honey BBQ Sandwich',
    'Classic Chicken Sandwich Solo': 'Classic Chicken Sandwich',
    'Plant Based Buffalo Sandwich Solo': 'Plant-Based Buffalo Sandwich',
    'Plant Based Buffalo Sandwich Meal': 'Plant-Based Buffalo Sandwich Meal',
    'Cheese & Bacon - Add On': 'Cheese & Bacon Sandwich Add-On',
    'Extra Chicken Breast': 'Extra Chicken Breast Sandwich Add-On',
    'Regular Seasoned Fries': 'Seasoned Fries (regular)',
    'Kids Boneless Bite Meal': 'Kids Boneless Bites Meal',
    'Coca Cola Can': 'Coca-Cola Can',
    'Fruit Shoot Apple and Blackcurrant': 'Fruit Shoot Apple & Blackcurrant',
    'Slims Crave Box': 'Crave Box', 'Slims Cookie': 'Cookie',
}
# items whose name doesn't say what they are on their own
SUFFIX = {'HOUSE SAUCES': ' Sauce', 'HANDSPUN SHAKES': ' Shake'}
# the 2nd run of '6/8/10 Crispy Wings' (606/808/1,011 kcal) repeats the plain wings' name and
# description with other figures (salt like the Buffalo sauce): which product it is isn't
# published, so it is skipped rather than guessed. Keyed by (name, published kcal).
AMBIGUOUS = {('6 Crispy Wings', 606), ('8 Crispy Wings', 808), ('10 Crispy Wings', 1011)}
# published figures that contradict themselves: left out rather than shown wrong (keyed by
# the tidied name, before the count moves to the end)
DROP = {
    # protein 32.8 g is below the 8 bites on their own (46.9 g), and 2,802 kJ = 670 kcal, not the 770 shown
    '8 Boneless Bites Meal': 'figures contradict each other',
    # 534 kcal shown, but 1,911 kJ = 457 kcal and the macros give 450
    'Kids Boneless Bites Meal': 'kcal disagrees with its kJ and macros',
    # 10 kcal, where a UK 330 ml can of Fanta Orange is 63 kcal
    'Fanta Can': 'kcal far below a UK can of Fanta Orange',
}
# kJ doesn't match kcal: the kcal shown to customers is what we keep (listed so any new
# disagreement still stops the import). Korean BBQ: 448 kJ = 107 kcal, shown 115.
KJ_TYPO = {'Korean BBQ'}
# every shake's kcal sits 4-5% under its kJ (how they're calculated, not a misread): allowed up to 6%
KJ_LOOSE = {'HANDSPUN SHAKES': 0.06}
# kcal well above what the published macros explain: kept as published (none at present)
MACRO_GAP: set = set()
DRINK_SECS = {'HANDSPUN SHAKES', 'SOFT DRINKS', 'ALCOHOLIC DRINKS', 'HOT DRINKS'}
# the house sauces, the gravy pot and the sharing sauce pots ('The Big Ranch Pot')
SAUCE = lambda sec, n: sec == 'HOUSE SAUCES' or n == 'Gravy' or n.endswith(' Pot')


def num(v):
    v = v.strip().replace(',', '')
    return None if v in ('', '-') else float(v)


def parse(path):
    s = open(path, encoding='utf-8').read()
    blobs = {}
    for v in re.findall(r'data-recipe="([^"]*)"', s):
        r = json.loads(html.unescape(v))
        blobs[r['id']] = r
    heads = [(m.start(), html.unescape(m[1]).strip()) for m in re.finditer(r'k10-course__name-value">([^<]*)<', s)]
    items = list(re.finditer(r'<div class="k10-recipe k10-recipe_menu-item\s*"([^>]*)>', s))
    rows = []
    for i, m in enumerate(items):
        sec = [h for p, h in heads if p < m.start()][-1]
        end = min([items[i + 1].start() if i + 1 < len(items) else len(s)] + [p for p, _ in heads if p > m.start()])
        seg = s[m.start():end]
        h3 = seg[:seg.index('</h3>')]
        name = html.unescape(' '.join(x.strip() for x in re.findall(r'name-value">([^<]*)<', h3)))
        shown = re.search(r'\(([\d,]+) kcal\)', h3)
        rid = re.search(r'data-recipe-id="([^"]+)"', m[1])[1]
        if rid in blobs:
            raw = {f"{n['Name'].strip()} {n['Uom']}": n['Val'] for n in blobs[rid]['ntrs']}
        else:
            raw = dict(re.findall(r'data-nutr-name="([^"]*)"\s*data-nutr-uom="[^"]*">\s*([^<]*?)\s*<', seg))
        vals = {KEYS[k]: num(v) for k, v in raw.items() if k in KEYS}
        assert set(vals) == {'kj', 'k', 'p', 'c', 'f'}, f'missing columns: {sec} {name} {raw}'
        # the figure in the item's heading is the table's own kcal
        if vals['k'] is not None:
            assert shown and num(shown[1]) == vals['k'], f'heading kcal differs: {name}'
        rows.append({'sec': sec, 'name': name, **vals})
    return rows


def sane(n, r):
    if r['kj'] is not None and n not in KJ_TYPO:
        tol = KJ_LOOSE.get(r['sec'], 0.03)
        assert abs(r['kj'] - 4.184 * r['k']) <= max(8, tol * r['kj']), f'kJ/kcal disagree: {n}'
    if n in MACRO_GAP: return
    macro = 4 * (r['p'] or 0) + 4 * (r['c'] or 0) + 9 * (r['f'] or 0)
    assert abs(macro - r['k']) <= max(15, 0.15 * r['k']), f'kcal far from macros: {n} {r["k"]} vs {macro:.0f}'


def main(path):
    rows = parse(path)
    out, skipped, seen = [], [], set()
    for r in rows:
        n0, sec = r['name'], r['sec']
        if r['k'] is None:
            skipped.append(f'{n0} (no figures published)'); continue
        if all(r[m] is None for m in 'pcf'):
            skipped.append(f'{n0} (kcal only, no macros published)'); continue
        if (n0, round(r['k'])) in AMBIGUOUS:
            skipped.append(f'{n0}, {r["k"]:.0f} kcal (second item under the same name: product not identified)'); continue
        n = RENAME.get(n0, n0)
        if n in DROP:
            skipped.append(f'{n0} ({DROP[n]})'); continue
        sane(n, r)
        # counts lead the name: '4 Tenders' -> 'Tenders (4 pieces)', '6 Crispy Wings Meal' -> 'Crispy Wings Meal (6 pieces)'
        c = re.match(r'^(\d+) (?!.*&)(.+)$', n)
        if c: n = f'{c[2]} ({c[1]} pieces)'
        if sec in SUFFIX and not n.endswith(SUFFIX[sec].strip()): n += SUFFIX[sec]
        n = 'Slim Chickens ' + n
        assert n.lower() not in seen, f'duplicate name: {n}'
        seen.add(n.lower())
        cat = 'drinks' if sec in DRINK_SECS else 'sauces' if SAUCE(sec, n0) else 'fastfood'
        # a macro the page shows as '-' isn't published: stored as 0 (sane() has checked the
        # kcal is explained without it) and left out of the published figure
        ref = {'k': r['k'], **{m: r[m] for m in 'pcf' if r[m] is not None}}
        f = {'n': n, 'k': r['k'], 'p': r['p'] or 0, 'c': r['c'] or 0, 'f': r['f'] or 0, 'g': 1, 'each': True,
             'cat': cat, 'eat': True, 'src': 'slims-uk', 'ref': {'g': 1, **ref}}
        # one serving (1 item) is Slim Chickens' own line
        assert round(f['k'] * f['g']) == round(r['k']), f'serving kcal mismatch: {n}'
        out.append(f)
    body = ',\n'.join('  ' + json.dumps(f, ensure_ascii=False) for f in out)
    ts = ("import type { Food } from '@/core/types'\n\n"
          "/** Slim Chickens UK core menu, per item as Slim Chickens publishes it (no portion weights given).\n"
          " *  GENERATED by scripts/import/slims.py from menus.tenkites.com/brg/slimscore: don't edit by hand. */\n"
          f"export const SLIMS: Food[] = [\n{body},\n]\n")
    open(OUT, 'w', encoding='utf-8').write(ts)
    print(f'{len(rows)} items parsed, {len(out)} foods written, {len(skipped)} skipped:')
    for d in skipped: print('  -', d)


if __name__ == '__main__':
    if sys.argv[1:2] == ['--rows']:
        for r in parse(sys.argv[2]): print(r['sec'], '|', r['name'], [r[c] for c in ('kj', 'k', 'p', 'c', 'f')])
    else:
        main(sys.argv[1])
