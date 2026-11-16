"""Import Starbucks UK's nutrition & allergen booklets into src/core/data/chains/starbucks.ts.

Usage:  python3 scripts/import/starbucks.py nutritional_downloads/Starbucks-UK-AUT26-AllergenBook-CORE-FOOD-v03-2.pdf \
            nutritional_downloads/Starbucks-UK-AUT26-AllergenBook-CORE-BEVERAGE-v04.pdf
        python3 scripts/import/starbucks.py --fetch-defaults   # refresh the default-milk snapshot (needs network)
Needs:  pip install pdfplumber   (dev tool only; the app never runs this)

Source: the two booklets linked from https://www.starbucks.co.uk/nutrition (Autumn 2026,
September to November), currently
  food:      https://www.starbucks.co.uk/sites/starbucks-uk-pwa/files/2026-08/AUT%2026_UK_AllergenBook_CORE_FOOD_v03-2.pdf  (version 17/08/26)
  beverages: https://www.starbucks.co.uk/sites/starbucks-uk-pwa/files/2026-09/AUT_26_UK_AllergenBook_CORE_BEVERAGE_v04.pdf  (version 18/09/26)
The booklets are Starbucks' copyright, so they're not kept in the repo: download them from the
links above into nutritional_downloads/ (git-ignored) to re-run. The files this import used:
  food      sha256 ec3a5c581bc82a49bf0f01926531140a53e2db4fb5b0f0b4fc34ab129881ab3e
  beverages sha256 9e05d19718303c4590a85050ffe5b986195e28b418f9877f9e5fb8f188051494
Both give figures per portion only (food per item, drinks per size and milk), with no weights or
volumes, so every food is per item (`each`), exactly as published.

Layout: one table per page. Columns are found from fixed x positions (the booklets use the same
grid on every page); a row is a line of numbers in the number columns (drinks: the size word in
the Size column, then kJ, kcal, fat, saturates, carbs, sugars, fibre, protein, salt, caffeine).
A drink's sizes are the run of size rows until the size order starts again; its name is the
product-column words between the midpoints to the neighbouring products. Section headings are set
larger (9 pt) than names (6 pt) and are left out. Deterministic: no AI, no guessing.

Drinks kept: each size in Starbucks' default milk, plus oat drink for the main lattes (OAT_TOO).
The booklet marks the default ("Standard Build") only on seasonal and protein drinks; for the
rest the default is the milk Starbucks' own UK menu pages show (docs/data/snapshots/
starbucks-defaults-*.json, a list of each drink's default size and figures read from
starbucks.co.uk/menu): semi-skimmed, whole milk for Frappuccinos, the Flat White, Cortado and
Ristretto Bianco, oat drink for the "Oat" drinks. The import checks every snapshot figure that
matches exactly one booklet line agrees with the milk chosen here. Values are the booklet's
(the menu pages lag it for a few drinks). Re-run on each new booklet and review the diff.
"""
import json, re, subprocess, sys

OUT = 'src/core/data/chains/starbucks.ts'
SNAP = 'docs/data/snapshots/starbucks-defaults-2026-10-10.json'
SITE = 'https://www.starbucks.co.uk'

NUMW = re.compile(r'^<?\d+(?:\.\d+)?g?$')
SIZES = {'Mini': 0, 'Short': 1, 'Tall': 2, 'Grande': 3, 'Venti': 4, 'Single': 0, 'Doppio': 1, 'Double': 1}
BEV_EDGES = [545, 565, 585, 605, 625, 645, 665, 685, 705, 725, 745]
BEV_COLS = ['kj', 'k', 'f', 'sat', 'c', 'su', 'fi', 'p', 'salt', 'caf']
FOOD_EDGES = [523, 546, 569, 592, 615, 638, 661, 684, 707, 730]
FOOD_COLS = ['kj', 'k', 'f', 'sat', 'c', 'su', 'fi', 'p', 'salt']

# whole sections left out, with the reason
DROP_SECTIONS = {'Syrups, Drizzles & Cream Cold Foams': 'add-ons to a drink (syrups, drizzles, whipped cream, cold foams)',
                 'Reserve': 'Starbucks Reserve bar menu, a few stores only'}
# drink families left out
DROP_FAMILY = {'Iced Brown Sugar Shaken Espresso': 'milk swaps of the Iced Brown Sugar Oat Shaken Espresso, which is kept'}
MILKS = ('semi-skimmed', 'skimmed', 'whole', 'almond', 'soya', 'oat', 'coconut')
MILK_NAME = {'semi-skimmed': 'semi-skimmed milk', 'skimmed': 'skimmed milk', 'whole': 'whole milk', 'almond': 'almond drink',
             'soya': 'soya drink', 'oat': 'oat drink', 'coconut': 'coconut drink'}
WHOLE_MILK = {'Flat White', 'Cortado', 'Ristretto Bianco'}
# the main lattes: oat drink kept as well as the default milk
OAT_TOO = {'Caffe Latte', 'Iced Latte', 'Cappuccino', 'Flat White', 'Pumpkin Spice Latte', 'Iced Pumpkin Spice Latte',
           'Chai Tea Latte', 'Iced Chai Tea Latte', 'Matcha Green Tea Latte', 'Iced Matcha Green Tea Latte'}
# the booklet's wording tidied (names are stable IDs: settle them before shipping)
RENAME = {'Iced Carmaelised Macadamia Oat Shaken Espresso': 'Iced Caramelised Macadamia Oat Shaken Espresso',
          'Pink Coconut Refresha': 'Pink Coconut Refresha Drink'}
FOOD_RENAME = {'Pain Au Chocolat (at selected stores)': 'Pain au Chocolat (at selected stores)', 'Peach Iced Tea': 'Peach Iced Tea (bottle)', 'Ginger shot': 'Ginger Shot',
               'One Water (Still/ Sparkling)': 'One Water (still or sparkling)'}
# Starbucks' own figures are self-contradictory for these: dropped, never patched
DROP_FOOD = {'Propercorn Sea Salt Popcorn': 'published 88 kcal but 1.7 g protein, 2.2 g carbs, 3.5 g fat (47 kcal)'}
# a bottled or canned drink sold in one size: no cup size in its name
NO_SIZE = {'Starbucks Doubleshot Iced Coffee', 'Starbucks Doubleshot Vanilla Iced Coffee'}
DRINK = re.compile(r'Juice|Shot|Cola|Smoothie|Water|Iced Tea|Lemonade|Vitwater')


def num(v):
    # '<0.5g' is kept as 0.5, as the other chain importers do
    return float(v.rstrip('g').lstrip('<'))


def tidy(n):
    n = n.replace('\ufffd', ' ').replace('®', '').replace('™', '')
    n = re.sub(r'\s+', ' ', n).strip()
    n = re.sub(r'^Starbucks ', '', n).replace(' Starbucks Refresha', ' Refresha')  # the prefix is added once
    return RENAME.get(n, n)


def page_words(pg):
    ws = pg.extract_words(y_tolerance=1, x_tolerance=1.2, extra_attrs=['size'])
    return [w for w in ws if 110 < w['top'] < 530]


def cells(words, edges, cols):
    out = {}
    for w in words:
        xc = (w['x0'] + w['x1']) / 2
        i = next(i for i in range(len(cols)) if edges[i] <= xc < edges[i + 1])
        assert cols[i] not in out, f'two numbers in one column: {[w["text"] for w in words]}'
        out[cols[i]] = num(w['text'])
    return out


def names_between(words, tops):
    """Product-column words (6 pt names, not 9 pt headings) for each row group, split at midpoints."""
    names = [w for w in words if w['x0'] >= 19 and w['x1'] <= 93 and w['size'] < 8]
    out = []
    for i, (first, last) in enumerate(tops):
        lo = -1e9 if i == 0 else (tops[i - 1][1] + first) / 2
        hi = 1e9 if i == len(tops) - 1 else (last + tops[i + 1][0]) / 2
        nw = sorted([w for w in names if lo <= w['top'] < hi], key=lambda w: (round(w['top']), w['x0']))
        out.append(re.sub(r'(\w)- (\w)', r'\1-\2', ' '.join(w['text'] for w in nw)))
    return out


def section(pg, kind):
    m = re.search(r'\| ' + kind + r' \| (.+?) Version', pg.extract_text() or '')
    return m[1].strip() if m else None


def parse_bev(path):
    import pdfplumber
    prods = []
    with pdfplumber.open(path) as pdf:
        for pg in pdf.pages:
            sec = section(pg, 'Beverages')
            if not sec: continue
            body = page_words(pg)
            rows = []
            for s in sorted((w for w in body if 514 <= w['x0'] < 545 and w['text'] in SIZES), key=lambda w: w['top']):
                line = [w for w in body if abs(w['top'] - s['top']) < 2 and 545 <= w['x0'] < 745 and NUMW.match(w['text'])]
                rows.append({'size': s['text'], 'top': s['top'], **cells(line, BEV_EDGES, BEV_COLS)})
            groups = []
            for r in rows:
                if not groups or SIZES[r['size']] <= SIZES[groups[-1][-1]['size']]: groups.append([])
                groups[-1].append(r)
            for name, g in zip(names_between(body, [(g[0]['top'], g[-1]['top']) for g in groups]), groups):
                prods.append({'page': pg.page_number, 'section': sec, 'name': name, 'rows': g})
    return prods


def parse_food(path):
    import pdfplumber
    items = []
    with pdfplumber.open(path) as pdf:
        for pg in pdf.pages:
            sec = section(pg, 'Food')
            if not sec: continue
            body = [w for w in page_words(pg) if w['top'] > 118]
            lines = {}
            for w in body:
                if 523 <= w['x0'] < 730 and NUMW.match(w['text']):
                    key = next((t for t in lines if abs(t - w['top']) < 1.5), w['top'])
                    lines.setdefault(key, []).append(w)
            tops = sorted(lines)
            for name, t in zip(names_between(body, [(t, t) for t in tops]), tops):
                items.append({'page': pg.page_number, 'section': sec, 'name': name, **cells(lines[t], FOOD_EDGES, FOOD_COLS)})
    return items


def sane(n, r):
    assert len([c for c in FOOD_COLS if c in r]) == 9, f'missing columns: {n} {r}'
    assert r['sat'] <= r['f'] + 0.05 and r['su'] <= r['c'] + 0.2, f'sat/sugar above fat/carbs: {n}'
    assert r['k'] < 1500 and max(r['p'], r['c'], r['f']) < 200, f'implausible values: {n}'
    assert abs(r['kj'] - 4.184 * r['k']) <= max(8, 0.03 * r['kj']), f'kJ/kcal disagree: {n} {r["kj"]} vs {r["k"]}'
    macro = 4 * r['p'] + 4 * r['c'] + 9 * r['f']
    assert abs(macro - r['k']) <= max(15, 0.15 * r['k']), f'kcal far from macros: {n} {r["k"]} vs {macro:.0f}'


def split(name):
    """'Caffe Latte - semi-skimmed milk (Standard Build)' -> ('Caffe Latte', 'semi-skimmed', True)."""
    std = '(Standard Build)' in name
    name = name.replace('(Standard Build)', '').strip()
    fam, sep, var = name.partition(' - ')
    if not sep: return tidy(fam), None, std
    v = var.lower()
    milk = next((m for m in MILKS if v.startswith(m + ' ')), None)
    assert milk and ' - ' not in var, f'unclear product name: {name}'
    return tidy(fam), milk, std


def default_milk(fam, std):
    if std: return std
    if fam in WHOLE_MILK or 'Frappuccino' in fam: return 'whole'
    if re.search(r'\bOat\b', fam): return 'oat'
    return 'semi-skimmed'


def food(name, r, cat):
    v = {m: r[m] for m in ('k', 'p', 'c', 'f')}
    f = {'n': name, **v, 'g': 1, 'each': True, 'eat': True, 'cat': cat, 'src': 'starbucks-uk', 'ref': {'g': 1, **v}}
    # per item, exactly as published: one serving (1 item) is Starbucks' own line
    assert round(f['k'] * f['g']) == round(r['k']), f'serving kcal mismatch: {name}'
    return f


def drinks(prods, dropped):
    fams = {}  # family -> {milk: rows}, in booklet order
    std = {}
    for pr in prods:
        if pr['section'] in DROP_SECTIONS:
            continue
        try:
            fam, milk, is_std = split(pr['name'])
        except AssertionError:
            dropped.append(f'{pr["name"]} (p{pr["page"]}: rows run together in the booklet, not separable)'); continue
        if fam in DROP_FAMILY:
            continue
        assert milk not in fams.get(fam, {}), f'listed twice: {fam} {milk}'
        fams.setdefault(fam, {})[milk] = pr['rows']
        if is_std: std[fam] = milk
    for sec, why in DROP_SECTIONS.items():
        dropped.append(f'{sec} section ({why})')
    for fam, why in DROP_FAMILY.items():
        dropped.append(f'{fam} ({why})')
    out, chosen = [], {}
    for fam, by in fams.items():
        if None in by:
            assert len(by) == 1, f'{fam}: listed with and without milk'
            picks = [None]
        else:
            d = default_milk(fam, std.get(fam))
            assert d in by, f'{fam}: default milk {d} not listed'
            picks = [d] + (['oat'] if fam in OAT_TOO and d != 'oat' else [])
            chosen[fam] = d
        for milk in picks:
            for r in by[milk]:
                label = ', '.join(x for x in (r['size'] if 'Starbucks ' + fam not in NO_SIZE else None, MILK_NAME.get(milk)) if x)
                n = f'Starbucks {fam}' + (f' ({label})' if label else '')
                sane(n, r)
                out.append(food(n, r, 'drinks'))
    return out, chosen, fams


def check_defaults(fams, chosen):
    """Every menu-page default that matches exactly one booklet line must be the milk chosen here."""
    snap = json.load(open(SNAP))
    lines = [(fam, milk, r) for fam, by in fams.items() for milk, rows in by.items() for r in rows]
    checked = 0
    for w in snap['products']:
        alias = {'Doppio': 'Double', 'Double': 'Doppio'}
        hit = [(fam, milk) for fam, milk, r in lines if r['size'] in (w['size'], alias.get(w['size']))
               and all(r[m] == w[m] for m in ('k', 'p', 'c', 'f'))]
        if len(hit) == 1 and hit[0][1]:
            fam, milk = hit[0]
            assert chosen.get(fam) == milk, f'{w["title"]}: menu page shows {milk}, import chose {chosen.get(fam)}'
            checked += 1
    return checked


def fetch_defaults():
    def get(path):
        return subprocess.run(['curl', '-sSL', '--fail', '-A', 'Mozilla/5.0', SITE + path], capture_output=True, text=True, check=True).stdout
    cats = ['/menu/drinks/hot-drinks-', '/menu/drinks/iced-drinks-', '/menu/drinks/frappuccinor-blended-beverages',
            '/menu/drinks/matcha', '/menu/featured']
    ids = []
    for c in cats:
        ids += [i for i in re.findall(r'href="/menu/product/(\d+)"', get(c)) if i not in ids]
    prods = []
    for i in ids:
        h = get(f'/menu/product/{i}').replace('\\"', '"')
        m = re.search(r'"sizes":(\[[^\]]*\]).{0,4000}?"nutritionalData":(\{.*?\}\}),"allergens".{0,200}?"title":"([^"]*)"', h, re.S)
        if not m: continue  # food and bottled drinks: values come from the food booklet
        sizes, nd = json.loads(m[1]), json.loads(m[2])
        val = lambda k: float(re.sub(r'[a-zA-Z]', '', nd[k]['wholeAmount']))
        title = re.sub(r'<[^>]+>', '', json.loads(f'"{m[3]}"'))
        size = (nd.get('servingSize') or {}).get('wholeAmount') or next(s['label'] for s in sizes if s['value'] == i)
        prods.append({'id': i, 'title': title, 'size': size, 'k': val('energy2'), 'p': val('protein'), 'c': val('carbohydrates'), 'f': val('fat')})
    snap = {'source': "Starbucks UK menu pages (each drink's default build, as shown on starbucks.co.uk/menu/product/<id>)",
            'url': SITE + '/menu', 'fetched': '2026-10-10', 'products': prods}
    json.dump(snap, open(SNAP, 'w'), indent=1, ensure_ascii=False)
    print(f'saved {SNAP} ({len(prods)} drinks)')


def main(food_pdf, bev_pdf):
    dropped = []
    out, chosen, fams = drinks(parse_bev(bev_pdf), dropped)
    checked = check_defaults(fams, chosen)
    items = parse_food(food_pdf)
    ftidy = lambda n: FOOD_RENAME.get(tidy(n), tidy(n))
    by_name = {ftidy(i['name']): i for i in items}
    for i in items:
        name = ftidy(i['name'])
        twin = by_name.get(name + ' (Freshly Baked)')
        if twin and all(twin[c] == i[c] for c in FOOD_COLS):
            dropped.append(f'{name} (same as {name} (Freshly Baked))'); continue
        if name in DROP_FOOD:
            dropped.append(f'{name} ({DROP_FOOD[name]})'); continue
        n = 'Starbucks ' + name
        sane(n, i)
        cat = 'drinks' if DRINK.search(name) else 'snacks' if i['section'].startswith('Chocolate, Snacks') else 'fastfood'
        out.append(food(n, i, cat))
    seen = set()
    for f in out:
        assert f['n'].lower() not in seen, f'duplicate name: {f["n"]}'
        seen.add(f['n'].lower())
    body = ',\n'.join('  ' + json.dumps(f, ensure_ascii=False) for f in out)
    ts = ("import type { Food } from '@/core/types'\n\n"
          "/** Starbucks UK menu, per item as Starbucks publishes it (drinks per size and milk; no weights given).\n"
          " *  Autumn 2026 nutrition & allergen booklets (food v17/08/26, beverages v18/09/26), linked from\n"
          " *  https://www.starbucks.co.uk/nutrition. Drinks: the default milk per size, plus oat for the main lattes.\n"
          " *  GENERATED by scripts/import/starbucks.py: don't edit by hand. */\n"
          f"export const STARBUCKS: Food[] = [\n{body}\n]\n")
    open(OUT, 'w').write(ts)
    nd = sum(1 for f in out if f['cat'] == 'drinks')
    print(f'{len(out)} foods written ({nd} drinks, {len(out) - nd} food), {checked} default milks confirmed by the menu pages, {len(dropped)} dropped:')
    for d in dropped: print('  -', d)


if __name__ == '__main__':
    if sys.argv[1:2] == ['--fetch-defaults']:
        fetch_defaults()
    else:
        main(sys.argv[1], sys.argv[2])
