"""Import Caffè Nero's GB nutrition & allergen guide into src/core/data/chains/caffenero.ts.

Usage:  python3 scripts/import/caffenero.py caffenero_nutrition_allergens-en_GB.pdf [--dump]
Needs:  pip install pdfplumber   (dev tool only; the app never runs this)

Source: "Allergen, Nutritional & Ingredient Guide (GB)", issued 09/09/26, linked as "Nutrition &
Allergen Guide" from every page of https://www.caffenero.com/uk/menu :
https://caffenerowebsite.blob.core.windows.net/production/data/menus/caffenero_nutrition_allergens-en_GB.pdf
(not the en_IE file beside it). 44 pages: 1-4 allergen grids, 5-21 food (one block per product:
name, ingredients, then per 100 g and per portion columns of kJ, kcal, fat, saturates, carbs,
sugars, fibre, protein, salt, and the portion weight), 22-44 drinks (one row per product, milk
and size: per 100 ml then per product, the same nine columns; no volumes are given).

Food: the per-portion column anchors the values (per 100 g is derived from it, unrounded, and the
portion weight is kept exact), as for Greggs. Drinks: Nero publishes no volumes, so each drink is
per item (`each`), one serving = the per-product line, as for PizzaExpress. The text is read by
position (pdfplumber words), not by text order: the drink pages carry rotated headings that
scramble the plain text. Deterministic: no AI, no guessing. Re-run on each new guide and review
the diff (`--dump` prints every parsed row as JSON).
"""
import json, re, sys
import pdfplumber

ISSUED = '09/09/26'
COLS = ['kj', 'k', 'f', 'sat', 'c', 'su', 'fib', 'p', 'salt']
NUM = re.compile(r'^\d+(?:\.\d+)?$')
MACROS = ('k', 'p', 'c', 'f')


def lines_of(words, tol=3):
    """Group words into lines by their top edge (positions, not the PDF's text order)."""
    out = []
    for w in sorted(words, key=lambda w: (w['top'], w['x0'])):
        if out and abs(out[-1][0]['top'] - w['top']) <= tol:
            out[-1].append(w)
        else:
            out.append([w])
    return [sorted(l, key=lambda w: w['x0']) for l in out]


def text(ws):
    return ' '.join(w['text'] for w in ws)


def bold(w):
    return 'Bold' in w['fontname']


def heading(w):
    return 'CenturyGothic-Bold' in w['fontname']


# ---------------------------------------------------------------- food (pages 5-21)

LABELS = {'KJ': 'kj', 'Kcal': 'k', 'Fat': 'f', 'Sat': 'sat', 'Carbs': 'c', 'Sugar': 'su', 'Fibre': 'fib', 'Protein': 'p', 'Salt': 'salt'}
BODY_PT = 8.6  # ingredient text is set smaller than this; names, labels and figures larger
NOT_NAME = re.compile(r'^\((V|Vg|GF|V, GF|Vg, GF)\)$|^\*?Available at$|^selected stores( only)?$|^\*Vegan products')


def food_page(pg, last):
    words = pg.extract_words(extra_attrs=['fontname', 'size'])
    lines = lines_of(words)
    # the nutrition panel: its label column ("Kcal", "Fat"...) sits right of the ingredients
    lab = [w for w in words if w['text'] == 'Kcal' and not bold(w)]
    if not lab:
        return []
    lab_x = min(w['x0'] for w in lab)
    # the panel's own words: ingredient text can run up to its label column (sometimes in the
    # same 9.9 pt Calibri), and a page can mix 9 pt Century Gothic and 9.9 pt Calibri panels
    panel = lines_of([w for w in words if w['x0'] >= lab_x - 20 and w['size'] > BODY_PT])
    # column headers "per 100g" / "per portion (g)" give each value column's x
    # (a panel can have the per 100 g column only: the Fruit Scone, whose portion is 100 g)
    heads = [l for l in panel if text(l).startswith('per 100g')]
    # "Portion weight (g)" closes each panel; its label can start left of the others
    ends = sorted((w for w in words if w['text'] == 'Portion' and w['x0'] > pg.width * 0.5 and w['size'] > BODY_PT),
                  key=lambda w: w['top'])
    assert len(heads) == len(ends), f'page {pg.page_number}: {len(heads)} panels but {len(ends)} portion weights'
    blocks = []
    for h, end in zip(heads, ends):
        y0, y1 = h[0]['top'], end['top']
        assert y0 < y1, f'page {pg.page_number}: panel out of order'
        # each column's centre: "per 100g" is the first two words, "per portion (g)" the rest
        x100 = (h[0]['x0'] + h[1]['x1']) / 2
        xpor = (h[2]['x0'] + h[-1]['x1']) / 2 if len(h) > 2 else 1e9
        weight = [w for w in words if abs(w['top'] - y1) < 3 and w['x0'] > lab_x and NUM.match(w['text'])]
        assert len(weight) == 1, f'page {pg.page_number}: portion weight unreadable'
        rows = {'portion': float(weight[0]['text'])}
        for l in panel:
            if not (y0 < l[0]['top'] < y1 - 1) or l[0]['text'] not in LABELS:
                continue
            for v in l[1:]:
                if NUM.match(v['text']):
                    mid = (v['x0'] + v['x1']) / 2
                    col = 'pp' if abs(mid - xpor) < abs(mid - x100) else 'p100'
                    rows.setdefault(col, {})[LABELS[l[0]['text']]] = float(v['text'])
        # the product name: the bold words of the panel's height in the left column
        nm = [w for w in words if heading(w) and BODY_PT < w['size'] < 9.5 and w['x1'] < lab_x * 0.45
              and y0 - 4 <= w['top'] <= y1 + 4]
        name = ' '.join(t for t in (text(l) for l in lines_of(nm)) if not NOT_NAME.match(t))
        blocks.append({'y0': y0, 'name': name, **rows})
    # section titles: big bold words above a "PRODUCT INGREDIENTS" header
    titles = []
    for l in lines:
        if 'PRODUCT' in text(l) and 'INGREDIENTS' in text(l):
            prev = [m for m in lines if m[0]['top'] < l[0]['top'] and heading(m[0]) and m[0]['size'] > 12
                    and not text(m).startswith('Allergen, Nutritional')]
            if prev:
                titles.append((l[0]['top'], text(prev[-1])))
    for b in blocks:
        b['section'] = ([last] + [t for y, t in titles if y < b['y0']])[-1]
    return blocks


# ---------------------------------------------------------------- drinks (pages 22-44)

SIZES = {'Regular', 'Grande', 'Single', 'Double'}
TAGS = re.compile(r'^(MILK|SOYA|OAT|ALMONDS|NONE|EGG|EGGS),?$|^(Vegan|Vegetarian)$')


def drink_page(pg):
    words = pg.extract_words(extra_attrs=['fontname', 'size'])
    lines = lines_of(words, tol=2.5)
    rows, names, sections = [], [], []
    for l in lines:
        nums = [w for w in l if NUM.match(w['text'])]
        cells = [w for w in l if 'Calibri' in w['fontname'] and bold(w) and not NUM.match(w['text'])]
        if len(nums) == 18:
            x0 = nums[0]['x0']
            size = next((w['text'] for w in l if w['text'] in SIZES), None)
            rows.append({'y': l[0]['top'], 'size': size, 'v': [float(w['text']) for w in nums]})
            nm = [w for w in cells if w['x1'] < x0 and w['text'] not in SIZES and not TAGS.match(w['text'])]
        else:
            nm = [w for w in cells if not TAGS.match(w['text']) and w['text'] not in SIZES]
            if text(nm).startswith(('Per 100ml', 'NUTRITIONAL')):
                nm = []
            if heading(l[0]) and l[0]['x0'] < pg.width * 0.2 and not text(l).startswith('PRODUCT'):
                sections.append({'y': l[0]['top'], 'title': text(l), 'nocream': False})
            if sections and 'does not include whipped cream' in text(l):
                sections[-1]['nocream'] = True
        if nm:
            t = text(nm)
            # a name wrapped onto a second line ("Pistachio Latte - Semi Skimmed" / "Milk")
            if names and re.fullmatch(r'(Skimmed )?Milk', t) and l[0]['top'] - names[-1]['y1'] < 20:
                names[-1]['t'] += ' ' + t
                names[-1]['y1'] = l[0]['top']
            else:
                names.append({'t': t, 'y0': l[0]['top'], 'y1': l[0]['top']})
    out = []
    for r in rows:
        n = min(names, key=lambda n: abs((n['y0'] + n['y1']) / 2 - r['y']))
        sec = [s for s in sections if s['y'] < r['y']]
        out.append({'name': re.sub(r'\s+', ' ', re.sub(r'\s*-\s*', ' - ', n['t'])).strip(), 'size': r['size'],
                    'section': sec[-1]['title'] if sec else None, 'nocream': sec[-1]['nocream'] if sec else False,
                    'p100': dict(zip(COLS, r['v'][:9])), 'pp': dict(zip(COLS, r['v'][9:]))})
    return out


def parse(path):
    with pdfplumber.open(path) as pdf:
        assert f'Issued: {ISSUED}' in pdf.pages[0].extract_text(), 'a new guide: check its layout, then update ISSUED'
        food = []
        for pg in pdf.pages[5:21]:  # a section runs on from the page before when no title starts it
            food += food_page(pg, food[-1]['section'] if food else 'PASTRIES')
        drinks = [d for pg in pdf.pages[22:44] for d in drink_page(pg)]
    return food, drinks


# ---------------------------------------------------------------- choosing and naming

# food section -> category (anything else is 'fastfood')
FOOD_CAT = {'BISCUITS & SNACKS': 'snacks', 'CRISPS': 'snacks', 'POPCORN': 'snacks', 'YOGURTS & GRANOLA POT': 'dairy',
            'FRUIT POTS': 'fruit'}
EXTRA_CAT = {'Raspberry Jam': 'sauces', 'Strawberry Jam': 'sauces', 'Cinnamon': 'sauces', "Rodda's Cornish Clotted Cream": 'dairy'}
# rows whose figures contradict themselves: left out rather than guessed
REJECT = {
    'Lakeland Butter': 'per-portion fat (5.7 g in a 6 g pat) explains 51 kcal, not the 45 printed; per 100 g says 80 g fat',
    'Marshmallows': 'no fat figure published',
    'Egg, Mushroom & Tomato Ciabatta': 'per-portion kcal (394) disagrees with its own kJ (1464 = 350 kcal), its macros and the per-100 g line (348)',
}
# the guide's wording tidied (names are stable IDs: settle them before shipping)
RENAME = {'Butternut Squash & Pesto Seeded Panini (VG)': 'Butternut Squash & Pesto Seeded Panini',
          'Smoky Three Bean Wrap (Airport Stores Only)': 'Smoky Three Bean Wrap (airport stores)',
          'Tim’s Raspberry Yogurt': "Tim's Raspberry Yogurt", 'Tim’s Vanilla Yogurt': "Tim's Vanilla Yogurt",
          'Mango & Passionfruit': 'Mango & Passionfruit Booster', 'Sicilian Lemon': 'Sicilian Lemon Spritz',
          'Banoffee Matcha': 'Banoffee Matcha Latte', 'Iced Banoffee Matcha': 'Iced Banoffee Matcha Latte',
          'Strawberry Milkshake Whipped Cream': 'Strawberry Milkshake with Whipped Cream',
          'Iced Spiced PecanLatte': 'Iced Spiced Pecan Latte',
          'Espresso & Caramel Luxury Frappe Crème': 'Espresso & Caramel Frappe Crème'}
MILKS = {'Semi Skimmed Milk': 'semi-skimmed milk', 'Semi Skimmed': 'semi-skimmed milk', 'Skimmed Milk': 'skimmed milk',
         'Whole Milk': 'whole milk', 'Soya': 'soya', 'Coconut': 'coconut', 'Oat': 'oat', 'Almond': 'almond'}
# Drinks kept: every size in the drink's standard milk, plus oat for the core milk coffees. The
# standard milk is the one the guide lists first (semi-skimmed for most; whole milk for the flat
# white, cortado, luxury frappes and milkshakes), unless the guide's own description names another.
STANDARD = {'Cinnamon Roll Latte': 'oat', 'Iced Blueberry Muffin Matcha': 'oat',  # "served with oat as standard"
            'Tiramisu Iced Latte': 'whole milk'}  # "made with foamed whole milk"
OAT_TOO = {'Latte', 'Cappuccino', 'Flat White', 'Iced Latte', 'Matcha Latte'}
# drinks with a milk choice that also come black (kept: the black Americano is the standard)
BLACK = {'Americano - Black': 'Americano'}


def rnd(x):
    return int(x) if float(x).is_integer() else round(x, 2)


def ref_of(v, g):
    return {'g': g, 'k': rnd(v['k']), 'p': rnd(v['p']), 'c': rnd(v['c']), 'f': rnd(v['f'])}


def consistent_portion(b):
    """The per-100 g column times the portion weight gives the per-portion kcal (within 4%)."""
    if not b.get('p100') or not b.get('pp'):
        return True
    exp = b['p100']['k'] * b['portion'] / 100
    return abs(exp - b['pp']['k']) <= max(4, 0.04 * exp)


def food_items(food, skipped):
    out = []
    for b in food:
        base = re.sub(r'^NEW ', '', b['name']).rstrip('*').strip()
        if base in REJECT:
            skipped.append(f'{base}: {REJECT[base]}'); continue
        m = re.fullmatch(r'Porridge made with (?:Alpro Barista )?(.+)', base)
        base = f'Porridge ({MILKS[m[1]]})' if m else RENAME.get(base, base)
        f = {'n': 'Caffè Nero ' + base}
        P, pp, h = b['portion'], b.get('pp'), b.get('p100')
        assert pp or h, base
        if pp and not consistent_portion(b):
            # the portion weight disagrees with the per-100 g column: one item is Nero's
            # per-portion line exactly, and no weight is claimed
            f.update({'k': rnd(pp['k']), 'p': rnd(pp['p']), 'c': rnd(pp['c']), 'f': rnd(pp['f']), 'g': 1, 'each': True})
            f['ref'] = ref_of(pp, 1)
            skipped.append(f'{base}: portion weight ({P:g} g) disagrees with the per-100 g column, so logged per item')
        elif pp:
            # the per-portion line anchors the values: per 100 g derived from it, portion kept exact
            f.update({k: round(pp[k] * 100 / P, 2) for k in MACROS})
            f['g'] = rnd(P)
            f['ref'] = ref_of(pp, rnd(P))
            assert round(f['k'] * P / 100) == round(pp['k']), base
        else:
            # per 100 g only (Fruit Scone): its portion is 100 g
            f.update({k: rnd(h[k]) for k in MACROS})
            f['g'] = rnd(P)
            f['ref'] = ref_of(h, 100)
        sec = b['section']
        f['cat'] = EXTRA_CAT.get(base, 'snacks') if sec == 'EXTRAS' else FOOD_CAT.get(sec, 'fastfood')
        out.append(f)
    return out


def drink_items(drinks):
    rows = []
    for d in drinks:
        name = d['name']
        name, milk = (BLACK[name], None) if name in BLACK else (name.split(' - ') + [None])[:2]
        name = RENAME.get(name.strip(), name.strip())
        milk = MILKS[milk.strip()] if milk else None
        rows.append({**d, 'base': name, 'milk': milk})
    # a drink listed twice in the same milk and size: once as served with whipped cream, once without
    seen = {}
    for r in rows:
        seen.setdefault((r['base'], r['milk'], r['size']), []).append(r)
    for twins in seen.values():
        if len(twins) == 2:
            a, b = twins
            assert a['nocream'] != b['nocream'], twins
            (a if not a['nocream'] else b)['base'] += ' with Whipped Cream'
        else:
            assert len(twins) == 1, twins
    # each drink's standard milk: the first one it is listed with
    first = {}
    for r in rows:
        key = re.sub(' with Whipped Cream$', '', r['base'])
        if r['milk'] and key not in first:
            first[key] = r['milk']
    out = []
    for r in rows:
        key = re.sub(' with Whipped Cream$', '', r['base'])
        std = STANDARD.get(key, first.get(key))
        if r['milk'] and not (r['milk'] == std or (r['milk'] == 'oat' and key in OAT_TOO)):
            continue
        n = 'Caffè Nero ' + r['base'] + (' ' + r['size'] if r['size'] else '') + (f" ({r['milk']})" if r['milk'] else '')
        pp = r['pp']
        out.append({'n': n, 'k': rnd(pp['k']), 'p': rnd(pp['p']), 'c': rnd(pp['c']), 'f': rnd(pp['f']), 'g': 1, 'each': True,
                    'cat': 'drinks', 'ref': ref_of(pp, 1)})
    return out


def main(path):
    food, drinks = parse(path)
    skipped = []
    items = food_items(food, skipped) + drink_items(drinks)
    names = [f['n'] for f in items]
    assert len(names) == len(set(names)), 'duplicate names'
    for f in items:  # field order: eat and src, then ref last
        f['eat'] = True
        f['src'] = 'nero-uk'
        f['ref'] = f.pop('ref')
    body = ',\n'.join('  ' + json.dumps(f, ensure_ascii=False, separators=(', ', ': ')) for f in items)
    ts = ("import type { Food } from '@/core/types'\n\n"
          "/** Caffè Nero UK (GB) menu, from its Allergen, Nutritional & Ingredient Guide issued 9 Sep 2026.\n"
          " *  Food: per 100 g derived from Nero's per-portion line, `g` its portion weight (a few are per item,\n"
          " *  where the printed weight disagrees with the per-100 g column). Drinks: per item (`each`), one per\n"
          " *  size, in the drink's standard milk (plus oat for the core milk coffees); Nero gives no volumes.\n"
          " *  GENERATED by scripts/import/caffenero.py from the guide PDF: don't edit by hand. */\n"
          f"export const CAFFENERO: Food[] = [\n{body}\n]\n")
    open('src/core/data/chains/caffenero.ts', 'w').write(ts)
    print(f'{len(food)} food and {len(drinks)} drink rows parsed, {len(items)} foods written '
          f'({sum(1 for f in items if f["cat"] != "drinks")} food, {sum(1 for f in items if f["cat"] == "drinks")} drinks)')
    for s in skipped:
        print('  -', s)


if __name__ == '__main__':
    if '--dump' in sys.argv:
        for x in sum(parse(sys.argv[1]), []):
            print(json.dumps(x, ensure_ascii=False))
    else:
        main(sys.argv[1])
