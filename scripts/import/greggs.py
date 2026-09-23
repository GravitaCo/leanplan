"""Import Greggs' UK nutrition PDF into src/core/data/chains/greggs.ts.

Usage:  python3 scripts/import/greggs.py path/to/nutritional-information.pdf
Needs:  pip install pdfplumber   (dev tool only; the app never runs this)

Each PDF row is a product name followed by 26 numbers (portion, then per-100 g / per-portion /
%RI columns). Parsing is deterministic: no AI, no guessing. Every row is cross-checked
(per-portion kcal = per-100 g kcal x portion / 100) and the output must then pass
`npm run check:foods`. Re-run each time Greggs publishes a new PDF and review the diff.
"""
import json, re, sys
import pdfplumber

NUM = r'(?:<?\d+(?:\.\d+)?%?|Tr|-)'
ROW = re.compile(r'^(?P<name>.+?)\s+(?P<nums>(?:' + NUM + r'\s+){25}' + NUM + r')\s*$')
COLS = ['portion', 'kj100', 'kjp', 'k100', 'kp', 'k_ri', 'f100', 'fp', 'f_ri', 's100', 'sp', 's_ri', 'c100', 'cp', 'c_ri',
        'su100', 'sup', 'su_ri', 'fi100', 'fip', 'p100', 'pp', 'p_ri', 'salt100', 'saltp', 'salt_ri']
DRINK = re.compile(r'\b(Americano|Cappuccino|Latte|Flat White|Espresso|Mocha|Tea|Coffee|Hot Chocolate (Large|Regular)|'
                   r'Iced Chocolate|Iced Caramel Chocolate|Lemonade|Cooler|Juice|Water|Matcha)\b', re.I)
# existing Tali names are stable IDs (learned usuals match by name): keep them
LEGACY = {'Sausage Roll(s)': 'Greggs Sausage Roll', 'Steak Bake': 'Greggs Steak Bake',
          'Cheese & Onion Bake': 'Greggs Cheese & Onion Bake', 'Yum Yum': 'Greggs Yum Yum'}
# single items the PDF names in the plural (names are stable IDs: settle them before shipping)
RENAME = {'Baguettes': 'Baguette', 'Stotties': 'Stottie', 'Belgian Buns': 'Belgian Bun', 'Glazed Ring Doughnuts': 'Glazed Ring Doughnut',
          'Oval Bites': 'Oval Bite', 'Corn Topped Rolls': 'Corn Topped Roll', 'White & Wholemeal Rolls': 'White & Wholemeal Roll',
          'Chicken Rolls': 'Chicken Roll', 'Cheese Scones': 'Cheese Scone', 'Fruit Scones': 'Fruit Scone', 'Gingerbread Men': 'Gingerbread Man',
          'Spread': 'Spread (sandwich add-on)'}
# not useful as separate foods: multi-item boxes, hospital-shop duplicates, drink syrups/toppings
DROP = re.compile(r'Pizza Box \d Pack|\(HS\)|^Extra .*(Syrup|Cream|Powder)$')
# where a pack's or decaf's single/regular version is named differently in the PDF
TWIN_NAMES = {'Sausage Roll': 'Sausage Roll(s)', 'Yum Yums': 'Yum Yum', 'Flat White': 'Flat White Regular'}
MULTIPACK = re.compile(r'\s*\((\d) pack\)$|\s+\d Pack$', re.I)


def num(v):
    v = v.rstrip('%').lstrip('<')
    return 0.0 if v in ('Tr', '-') else float(v)


def parse(path):
    rows = []
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            for line in (page.extract_text() or '').splitlines():
                m = ROW.match(line.strip())
                if m:
                    d = dict(zip(COLS, map(num, m['nums'].split())))
                    d['name'] = m['name'].strip()
                    rows.append(d)
    return rows


def same(a, b):
    return abs(a['k100'] - b['k100']) <= 2 and all(abs(a[k] - b[k]) <= 0.3 for k in ('p100', 'c100', 'f100'))


def main(path):
    rows = parse(path)
    by = {r['name']: r for r in rows}
    out, dropped = [], []
    for r in rows:
        n = r['name']
        exp = r['k100'] * r['portion'] / 100
        assert abs(r['kp'] - exp) <= max(4, 0.04 * exp), f'row check failed: {n}'
        twin = MULTIPACK.sub('', n) if MULTIPACK.search(n) else re.sub(r'\s+', ' ', n.replace('Decaf', '')).strip() if 'Decaf' in n else None
        twin = TWIN_NAMES.get(twin, twin)
        if DROP.search(n) or (twin and twin in by and same(r, by[twin])):
            dropped.append(n); continue
        base = RENAME.get(n, n).replace('(s)', '')
        if base.startswith('Greggs '): base = base[len('Greggs '):]
        name = LEGACY.get(n) or 'Greggs ' + base
        drink = bool(DRINK.search(n))
        # Greggs' per-portion figures are what customers compare against, so they anchor the
        # values: per 100 is derived from them (unrounded) and the portion is kept exact. A
        # rounded portion or per-100 figure drifts by 1-2 kcal (e.g. bacon roll 323 vs 321).
        P = r['portion']
        per100 = lambda portion_value, fallback: round(portion_value * 100 / P, 2) if P else fallback
        # a pack size in the name ("500ml", "40g") is what one serving of it means
        size = re.search(r'(\d+)\s*(ml|g)$', n)
        g = float(size[1]) if size else P
        f = {'n': name, 'k': per100(r['kp'], r['k100']), 'p': per100(r['pp'], r['p100']), 'c': per100(r['cp'], r['c100']),
             'f': per100(r['fp'], r['f100']), 'g': g}
        if not size:
            # hard gate: one serving in the app must show exactly Greggs' published per-portion kcal
            assert round(f['k'] * g / 100) == round(r['kp']), f'serving kcal mismatch: {n}'
        if drink: f['ml'] = True
        f['cat'] = 'drinks' if drink else 'fastfood'
        f['src'] = 'greggs-uk'
        out.append(f)
    # the long-standing favourites first: ties in search keep database order
    out.sort(key=lambda f: 0 if f['n'] in LEGACY.values() else 1)
    body = json.dumps(out, indent=2, ensure_ascii=False)
    ts = ("import type { Food } from '@/core/types'\n\n"
          "/** Greggs UK menu, per 100 g (per 100 ml for drinks); `g` is Greggs' own portion.\n"
          " *  GENERATED by scripts/import/greggs.py from Greggs' nutrition PDF: don't edit by hand. */\n"
          f"export const GREGGS: Food[] = {body}\n")
    open('src/core/data/chains/greggs.ts', 'w').write(ts)
    print(f'{len(rows)} rows parsed, {len(out)} foods written, {len(dropped)} dropped:')
    for d in dropped: print('  -', d)


if __name__ == '__main__':
    main(sys.argv[1])
