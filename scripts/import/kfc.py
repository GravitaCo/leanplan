"""Import KFC UK's allergen & nutrition PDF into src/core/data/chains/kfc.ts.

Usage:  python3 scripts/import/kfc.py path/to/KFC-nutrition-allergens.pdf
Needs:  pip install pdfplumber   (dev tool only; the app never runs this)

The PDF is two tables side by side on each page, with allergen words (some set vertically)
between each name and its eight numbers (kJ, kcal, fat, saturates, carbs, sugars, protein,
salt). Text order is scrambled, so this reads word positions instead: each table's columns are
found from its own header ("Contains" starts the allergen column, "kJ" the numbers), a row is a
line of eight numbers in the number columns, and the name is the words in the name column
nearest that line. KFC gives no portion weights, so every food is per item (`each`), exactly as
published. Parsing is deterministic: no AI, no guessing. Re-run on each new PDF and review the diff.
"""
import json, re, sys
import pdfplumber

NUMW = re.compile(r'^<?\d+(?:\.\d+)?$')
COLS = ['kj', 'k', 'f', 'sat', 'c', 'su', 'p', 'salt']
# existing Tali names are stable IDs (learned usuals match by name): keep them
LEGACY = {'Zinger Burger': 'KFC Zinger Burger', 'Original Recipe Chicken (per piece, average)': 'KFC Original Recipe Chicken piece'}
# the PDF's own wording, tidied into a singular item name (names are stable IDs: settle them before shipping)
RENAME = {
    'Original Recipe Chicken Fillet Roll': 'Original Recipe Fillet Roll',
    'Hot Wing (per piece, average)': 'Hot Wing', 'Tender (per piece, average)': 'Tender',
    'Hash Brown (per piece average)': 'Hash Brown', 'Heinz Tomato Ketchup sachet': 'Heinz Tomato Ketchup Sachet',
    'Bottle of Still Water': 'Still Water Bottle', 'Pepsi- Regular': 'Pepsi (regular)', 'Pepsi- Large': 'Pepsi (large)',
    'Oreo Krushems Shake': 'Oreo Krushem Shake', 'MilkyBar Krushems Shake': 'Milkybar Krushem Shake',
    'Club Orange per 250ml': 'Club Orange (per 250ml)',
}
# bundles that just multiply a single item already kept; an add-on that isn't a food on its own
DROP = {'2 Corn Cobettes (Large)': 'two of the Corn Cobette', 'Cheese Slice (per slice average)': 'burger add-on'}
# where KFC's own kJ and kcal disagree (a typo in one of them): the kcal figure is what KFC shows
# customers and what we keep; listed so any new disagreement still stops the import
KJ_TYPO = {'Caramel Krunch Shake', 'Apple Tango - Regular'}
DRINK = re.compile(r'Pepsi|7up|Tango|Club Orange|Lipton|Robinsons|Fruit Shoot|Water|Lemonade|Refresher|Latte|Matcha|Shake|Krushem', re.I)
SAUCE = re.compile(r'Dip Pot|Ketchup|Gravy')


def num(v):
    return float(v.lstrip('<'))


def tables(page):
    """(name_x0, allergen_x0, kj_x0, header_tops) for each of the page's two side-by-side tables."""
    ws = page.extract_words(y_tolerance=0.8, x_tolerance=1.2)
    mid = page.width / 2
    out = []
    for side in (lambda x: x < mid, lambda x: x >= mid):
        kj = [w for w in ws if w['text'] == 'kJ' and side(w['x0'])]
        # the allergen column's left edge: the most common "Contains"/"May" left edge in this half
        cont = sorted(w['x0'] for w in ws if w['text'] in ('Contains', 'M') and side(w['x0']))
        out.append((0 if side(0) else mid, round(cont[0]) - 1, round(kj[0]['x0']) - 8, [w['top'] for w in kj]))
    return ws, out


def parse(path):
    rows = []
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            ws, tabs = tables(page)
            foot = min(w['top'] for w in ws if w['text'] in ('IMPORTANT', 'SEE'))
            for x0, ax, kx, heads in tabs:
                body = [w for w in ws if heads[0] - 5 < w['top'] < foot - 2 and x0 <= w['x0'] and not any(abs(w['top'] - h) < 4 for h in heads)]
                nums = [w for w in body if kx <= w['x0'] < kx + 150 and NUMW.match(w['text'])]
                lines = {}
                for w in nums:
                    key = next((t for t in lines if abs(t - w['top']) < 1.5), w['top'])
                    lines.setdefault(key, []).append(w)
                rtops = sorted(t for t, l in lines.items() if len(l) == 8)
                assert all(len(l) in (8,) for l in lines.values()), f'stray numbers on page {page.page_number}: {[[w["text"] for w in l] for l in lines.values() if len(l) != 8]}'
                names = {t: [] for t in rtops}
                for w in body:
                    if w['x0'] < ax and w['x1'] <= ax + 2:
                        t = min(rtops, key=lambda t: abs(t - w['top']))
                        if abs(t - w['top']) < 10: names[t].append(w)
                for t in rtops:
                    nw = sorted(names[t], key=lambda w: (round(w['top']), w['x0']))
                    name = re.sub(r'\s+', ' ', ' '.join(w['text'] for w in nw))
                    # footnotes: '#' = Republic of Ireland only, '~' = Northern Ireland and Ireland only (so still UK)
                    ireland = ' #' in name
                    name = name.replace(' ~', '').replace(' #', '').strip()
                    vals = [num(w['text']) for w in sorted(lines[t], key=lambda w: w['x0'])]
                    rows.append({'name': name, 'ireland': ireland, 'page': page.page_number, **dict(zip(COLS, vals))})
    return rows


SIZE = re.compile(r'^(Small|Regular|Large) (.+)$|^(.+?)\s*-?\s+(Regular|Large)$')


def tidy(n):
    """'Regular Coleslaw' / 'Pepsi Max - Large' -> 'Coleslaw (regular)' / 'Pepsi Max (large)'; '... Bottle per 250ml' -> '... Bottle'."""
    n = re.sub(r' per 250ml$', '', n)
    m = SIZE.match(n)
    if m: n = f'{m[2]} ({m[1].lower()})' if m[1] else f'{m[3]} ({m[4].lower()})'
    return n


def sane(r):
    n = r['name']
    assert r['sat'] <= r['f'] + 0.05 and r['su'] <= r['c'] + 0.2, f'sat/sugar above fat/carbs: {n}'
    assert r['k'] < 1500 and max(r['p'], r['c'], r['f']) < 200, f'implausible values: {n}'
    if n not in KJ_TYPO:
        assert abs(r['kj'] - 4.184 * r['k']) <= max(8, 0.03 * r['kj']), f'kJ/kcal disagree: {n} {r["kj"]} vs {r["k"]}'
    macro = 4 * r['p'] + 4 * r['c'] + 9 * r['f']
    assert abs(macro - r['k']) <= max(15, 0.15 * r['k']), f'kcal far from macros: {n} {r["k"]} vs {macro:.0f}'


def main(path):
    rows = parse(path)
    out, dropped, seen = [], [], set()
    for r in rows:
        sane(r)
        n = r['name']
        if n in DROP or r['ireland']:
            dropped.append(f"{n} ({DROP.get(n, 'Republic of Ireland only')})"); continue
        name = LEGACY.get(n) or 'KFC ' + tidy(RENAME.get(n, n))
        assert name not in seen, f'duplicate name: {name}'
        seen.add(name)
        cat = 'drinks' if DRINK.search(n) else 'sauces' if SAUCE.search(n) else 'fastfood'
        # per item, exactly as published: one serving (1 item) is KFC's own line
        ref = {'k': r['k'], 'p': r['p'], 'c': r['c'], 'f': r['f']}
        if 'per 250ml' in n:
            # KFC's line is per 250 ml: a published volume, so per 100 ml is derived from it exactly
            f = {'n': name, **{m: round(v * 100 / 250, 2) for m, v in ref.items()}, 'g': 250, 'ml': True, 'ref': {'g': 250, **ref}}
            assert round(f['k'] * 250 / 100) == round(r['k']), f'serving kcal mismatch: {n}'
        else:
            # per item, exactly as published: one serving (1 item) is KFC's own line
            f = {'n': name, **ref, 'g': 1, 'each': True, 'ref': {'g': 1, **ref}}
            assert round(f['k'] * f['g']) == round(r['k']), f'serving kcal mismatch: {n}'
        f['cat'] = cat; f['src'] = 'kfc-uk'; f['ref'] = f.pop('ref')
        out.append(f)
    missing = set(LEGACY.values()) - seen
    assert not missing, f'legacy foods not found in the PDF: {missing}'
    out.sort(key=lambda f: 0 if f['n'] in LEGACY.values() else 1)
    body = json.dumps(out, indent=2, ensure_ascii=False)
    ts = ("import type { Food } from '@/core/types'\n\n"
          "/** KFC UK menu, per item as KFC publishes it (KFC gives no portion weights).\n"
          " *  GENERATED by scripts/import/kfc.py from KFC's allergen & nutrition PDF: don't edit by hand. */\n"
          f"export const KFC: Food[] = {body}\n")
    open('src/core/data/chains/kfc.ts', 'w').write(ts)
    print(f'{len(rows)} rows parsed, {len(out)} foods written, {len(dropped)} dropped:')
    for d in dropped: print('  -', d)


if __name__ == '__main__':
    if sys.argv[1:2] == ['--rows']:
        for r in parse(sys.argv[2]): print(r['page'], r['name'], [r[c] for c in COLS])
    else:
        main(sys.argv[1])
