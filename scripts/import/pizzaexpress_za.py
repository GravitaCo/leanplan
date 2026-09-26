# NOT SHIPPED: "ZA" is PizzaExpress South Africa (Jan 2020), not UK data. Kept for reference only;
# its output is not in FOODS. See ship-critic review, Sep 2026.
"""Import PizzaExpress "ZA" nutrition (slices, wraps, 14" pizzas) into src/core/data/chains/pizzaexpress_za.ts.

Usage:  python3 scripts/import/pizzaexpress_za.py "path/to/ZA 2 Nutritional Info Website V1 PE.pdf"
Needs:  pip install pdfplumber   (dev tool only; the app never runs this)

Only page 3 has text (pages 1-2 are a cover, "Nutritional Information, January 2020 V1", and an
intro paragraph, both images). The table has per-serving and per-100 g columns (kcal, kJ, fat,
saturates, carbs, sugars, fibre, protein, salt). In the text stream numbers run together
("306 127711.8"), so this reads word positions: each number goes to the header column it sits
under, and a value set on two lines (salt "10." over "6") is joined. PizzaExpress gives no
serving weight, so every food is per item (`each`), exactly the per-serving line. Every row is
cross-checked against its own per-100 g line (same implied weight for every nutrient).
Deterministic: no AI, no guessing.
"""
import json, re, sys
import pdfplumber

NUT = ['k', 'kj', 'f', 'sat', 'c', 'su', 'fib', 'p', 'salt']
HEAD = ['kcal', 'kJ', 'Fat', 'Saturates', 'Carbs', 'Sugars', 'Fibre', 'Protein', 'Salt']
NUMW = re.compile(r'^\d+(?:\.\d*)?$')
SECTIONS = {'PIZZA SLICES': 'slice', 'WRAPS & DOUGH BALLS': 'wrap', '14” PIZZA': 'pizza'}
# kJ misprinted (587 kcal is ~2456 kJ, the PDF says 245): kcal kept as published
KJ_TYPO = {'Goat’s Cheese & Caramelised Onion'}
# rows whose per-serving line contradicts its own per-100 g line: left out rather than guessed
# the only item in "WRAPS & DOUGH BALLS" that may be either (a "Dough Balls" line sits just below it
# with no figures of its own), so it isn't called a wrap
UNSURE_KIND = {'Goat’s Cheese & Caramelised Onion'}
REJECT = {('pizza', 'Pollo ad Astra'): 'per-serving carbs printed as 27.7 g; its per-100 g line implies about 277 g'}


def parse(path):
    with pdfplumber.open(path) as pdf:
        page = pdf.pages[2]
        ws = page.extract_words(x_tolerance=1, y_tolerance=1)
    htop = next(w['top'] for w in ws if w['text'] == 'Saturates')
    heads = sorted((w for w in ws if abs(w['top'] - htop) < 1 and w['text'] in HEAD), key=lambda w: w['x0'])
    assert [w['text'] for w in heads] == HEAD * 2, 'unexpected header'
    centres = [(w['x0'] + w['x1']) / 2 for w in heads]
    col = lambda w: min(range(18), key=lambda i: abs(centres[i] - (w['x0'] + w['x1']) / 2))
    body = [w for w in ws if w['top'] > htop + 5]
    # section titles: capitals centred over the numbers
    lines = {}
    for w in body:
        if w['x0'] > 300 and not NUMW.match(w['text']):
            lines.setdefault(round(w['top']), []).append(w['text'])
    secs = []
    for t, words in sorted(lines.items()):
        title = next((s for s in SECTIONS if ' '.join(words).startswith(s)), None)
        assert title, f'unknown heading {words}'
        secs.append((t, SECTIONS[title]))
    nums = [w for w in body if NUMW.match(w['text']) and w['x0'] > 260]
    anchors = sorted({round(w['top'], 1) for w in nums if col(w) == 0})  # a row = a per-serving kcal figure
    rows = []
    for a in anchors:
        cells = {}
        for w in nums:
            if abs(w['top'] - a) < 9 and (min(anchors, key=lambda t: abs(t - w['top'])) == a):
                cells.setdefault(col(w), []).append(w)
        assert sorted(cells) == list(range(18)), f'row at {a}: columns {sorted(cells)}'
        vals = [float(''.join(x['text'] for x in sorted(cells[i], key=lambda x: x['top']))) for i in range(18)]
        rows.append({'top': a, 'sec': [s for t, s in secs if t < a][-1], 'serv': dict(zip(NUT, vals[:9])), 'per100': dict(zip(NUT, vals[9:])), 'words': []})
    # names: words left of the numbers, on the line of (or wrapped around) the nearest row
    orphans = []
    for w in sorted((w for w in body if w['x0'] < 262), key=lambda w: (round(w['top']), w['x0'])):
        r = min(rows, key=lambda r: abs(r['top'] - w['top']))
        if abs(r['top'] - w['top']) < 9 and [t for t, _ in secs if t < w['top']][-1] == [t for t, _ in secs if t < r['top']][-1]:
            r['words'].append(w['text'])
        else:
            orphans.append((round(w['top']), w['text']))
    for r in rows: r['name'] = ' '.join(r['words'])
    return rows, orphans


def check(r):
    n, s, h = r['name'], r['serv'], r['per100']
    if n not in KJ_TYPO:
        assert abs(s['kj'] - 4.184 * s['k']) <= max(8, 0.03 * s['kj']), f'kJ/kcal disagree: {n}'
    assert abs(h['kj'] - 4.184 * h['k']) <= max(8, 0.03 * h['kj']), f'per-100 kJ/kcal disagree: {n}'
    assert s['sat'] <= s['f'] + 0.1 and s['su'] <= s['c'] + 0.1, f'sat/sugar above fat/carbs: {n}'
    weight = s['k'] * 100 / h['k']
    # every nutrient implies the same serving weight (per-100 figures are rounded to 0.1 g)
    bad = [m for m in ('f', 'c', 'p') if abs(s[m] - h[m] * weight / 100) > max(1.0, 0.06 * s[m])]
    macro = 4 * s['p'] + 4 * s['c'] + 9 * s['f'] + 2 * s['fib']
    if abs(macro - s['k']) > max(15, 0.15 * s['k']): bad.append('kcal vs macros')
    return bad


def main(path):
    rows, orphans = parse(path)
    out, seen, dropped = [], set(), []
    for r in rows:
        bad = check(r)
        key = (r['sec'], r['name'])
        if key in REJECT:
            assert bad, f'{key} is listed as rejected but now checks out: import it'
            dropped.append(f"{r['name']} 14\" ({REJECT[key]})"); continue
        assert not bad, f"{r['name']}: serving and per-100 g lines disagree on {bad}"
        n = r['name']
        kind = {'slice': ' slice', 'wrap': ' wrap', 'pizza': ' 14" pizza'}[r['sec']]
        name = f'PizzaExpress ZA {n}' + ('' if n in UNSURE_KIND else kind)
        assert name not in seen, f'duplicate name: {name}'
        seen.add(name)
        s = r['serv']
        ref = {'g': 1, 'k': s['k'], 'p': s['p'], 'c': s['c'], 'f': s['f']}
        f = {'n': name, 'k': s['k'], 'p': s['p'], 'c': s['c'], 'f': s['f'], 'g': 1, 'each': True, 'cat': 'fastfood', 'src': 'pizzaexpress-za', 'ref': ref}
        assert round(f['k'] * f['g']) == round(s['k']), f'serving kcal mismatch: {name}'
        out.append(f)
    body = json.dumps(out, indent=2, ensure_ascii=False)
    ts = ("import type { Food } from '@/core/types'\n\n"
          "/** PizzaExpress \"ZA\" menu, per item (slice, wrap or whole 14\" pizza) as published; no weights given.\n"
          " *  GENERATED by scripts/import/pizzaexpress_za.py from PizzaExpress' ZA nutrition PDF: don't edit by hand. */\n"
          f"export const PIZZAEXPRESS_ZA: Food[] = {body}\n")
    open('src/core/data/chains/pizzaexpress_za.ts', 'w').write(ts)
    print(f'{len(rows)} rows parsed, {len(out)} foods written, {len(dropped)} dropped:')
    for d in dropped: print('  -', d)
    for o in orphans: print('  name with no figures:', o)


if __name__ == '__main__':
    main(sys.argv[1])
