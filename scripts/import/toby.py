"""Import Toby Carvery's UK allergen & nutrition guide into src/core/data/chains/toby.ts.

Usage:  python3 scripts/import/toby.py nutritional_downloads/TobyCarvery-UK-allergen-guide-2026-10-10.html.gz
        python3 scripts/import/toby.py --rows <file>    (dump every parsed row, for review)
Needs:  Python 3 only (dev tool; the app never runs this)

Source: Mitchells & Butlers' allergen guide for the Toby Carvery estate,
https://allergens.mbplc.io/AllergenGuideTobyEstate.html (the "smart chef" guide that
tobycarvery.co.uk/menus/carverymenu links to). It is one HTML page, regenerated daily and dated
in its header ("Toby Carvery - 2026-10-10 06:26 | Mitchells & Butlers Plc"). Save it, gzip it
into nutritional_downloads/ and re-run; review the diff.
The saved page is Mitchells & Butlers' copyright and isn't kept in the repo (nutritional_downloads/
ignores it). The page this import used: TobyCarvery-UK-allergen-guide-2026-10-10.html.gz,
sha256 48477471037c04ea1b5503f773f36d55c9a6bb0bd6d835caf3a2a4666dd19671.

Layout: menus (aria-level 2), sections (3) and sub-sections (4); each item is a "recipe-card"
with its name in <b> and a "Per Portion" row: kJ/kcal, fat, saturates, carbohydrate, sugars,
protein, salt. Toby publishes no portion weights, so every food is per item (`each`): one
serving is the guide's per-portion line exactly (a plate, a carvery meat portion, one Yorkshire
pudding, four roast potatoes, one spoonful of a vegetable, one ladle of gravy, one drink).

The same dish appears on several menus. Menus are read in MENUS order; a later row with the
same name and the same figures is the same dish (skipped), one with different figures is a
different portion: it is renamed in RENAME when the guide says what differs, else dropped
and reported. Deterministic: no AI, no guessing.
"""
import gzip, html, json, re, sys

COLS = ['kj', 'k', 'f', 'sat', 'c', 'su', 'p', 'salt']

# menus kept, in priority order (the first menu to name a dish defines it)
MENUS = [
    'Main Menu & Puddings', 'The Deck', 'Rotational Veg Deck', 'Breakfast Menu', 'Hot Drinks',
    'Childrens Menu', 'Toby Meal Deal', 'Snack Menu', 'Buffet Menu', 'Delivery - Breakfast(England)',
    'Hotel', 'Let Toby Host', 'WEDDING - Pearl Package', 'WEDDING - Sapphire Package',
    'WEDDING - Diamond Package', "WEDDING - Children's Package", 'Delivery',
]
DROP_MENUS = {
    "Fuzzy Ed's Funhouse - Fuzzy Eds Sites Only": "soft-play café menu (packaged branded snacks and drinks), not Toby Carvery's own food",
}
KIDS_MENUS = {'Childrens Menu', "WEDDING - Children's Package"}

# rows left out, keyed by the name as the guide prints it (on any menu): why
CARVERY = 'Our Famous Carvery Also refer to individual meats, vegetable deck items, gravy and sauces for additional allergen and dietary information'
REJECT = {
    'EAT LIKE A KING! TRY OUR KING SIZE For An Extra': 'a promotion line: the guide doesn\'t say what the extra is',
    'Sandwiches': 'buffet sandwich platter: the guide doesn\'t say how many sandwiches or which',
    'WHY NOT ADD UNLIMITED TEA OR FILTER COFFEE TO YOUR BREAKFAST': 'a promotion line; the refill figures are kept from the breakfast menu',
    'VE Only Serve': 'the guide doesn\'t say what this is',
    'VE Serve Only Veg': 'the guide doesn\'t say what this is',
    'WK Veg Deck- Depletion (V) (SR)': 'an internal kitchen line, not a dish',
    'Refillable Soft Drinks': 'the guide doesn\'t say which drink (5 kcal fits a diet cola, not a full-sugar one)',
    # the meat-only figure (same as the Mon-Fri average meat portion, kept under that name): logged
    # as "Our Famous Carvery" it would read as the whole plate
    CARVERY: 'meat portion only; kept as "Carvery meat, average portion (Mon–Fri)"',
}

# the guide's name -> ours, keyed (name as printed, kcal) where the guide's own wording or
# description says what makes this portion differ from another of the same name
RENAME = {
    ('Ciabatta Garlic Bread (V)', 670): 'Ciabatta Garlic Bread with Cheese',  # "With cheese"
    # the dessert ("served with your choice of sauce") vs the scoop served with a pudding
    ('Dairy Ice Cream (V)', 165): 'Dairy Ice Cream',
    ('Dairy Ice Cream (V)', 112): 'Dairy Ice Cream, with a pudding',
    # the Deck's "Vegan Veg Serve" (no butter glaze)
    ('Carrots (VE) - per spoonful', 24): 'Carrots, vegan serve (1 spoonful)',
    ('Peas (VE) - per spoonful', 64): 'Peas, vegan serve (1 spoonful)',
    ('Green Beans (VE) - per spoonful', 26): 'Green Beans, vegan serve (1 spoonful)',
    ('Spicy Butternut Squash Tart (VE)*', 766): 'Spicy Butternut Squash Tart, vegan',
    ('Weddings Sausage Brioche (VE) Also refer to your choice of sauce for additional allergen & dietary information', 454):
        'Weddings Sausage Brioche, vegan',
    ("Pip's Organic Smoothie (VE)", 79): "Pip's Organic Smoothie, Strawberry, Banana & Purple Carrot (kids)",
    ("Pip's Organic Smoothie (VE)", 101): "Pip's Organic Smoothie, Pineapple & Mango (kids)",
    ('Toast (V)', 425): 'Toast with Jams & Spreads',  # "With a selection of jams & spreads"
    ('Cereal (V)', 223): 'Bowl of Cereal with Milk',  # "Just ask for our selection"; contains milk
    ('Milk (V) - per portion', 147): 'Milk, for cereal',
    # the guide says "per spoonful", but 176 kcal is a bowlful: the name doesn't guess which
    ('Special K (V) - per spoonful', 176): 'Special K',
    ('Jam/Marmalade/Honey Portions (V)', 54): 'Jam, Marmalade or Honey (1 portion)',
}

FIX = [  # spelling and wording in the guide, applied everywhere
    (r'\bCappucino\b', 'Cappuccino'), (r'\bunlimted\b', 'unlimited'), (r'\bDecaff\b', 'Decaf'), (r'’', "'"), (r'˚', ''),
    (r'^Trial ', ''), (r'^Sauce choice - ', ''), (r'^Add fruit compote - ', 'Fruit compote, '), (r'^Add on ', 'Add-on '),
    (r'\bice cream\b', 'Ice Cream'), (r'\bIce cream\b', 'Ice Cream'), (r'Toffee sauce', 'Toffee Sauce'),
    (r'^Alternative replacement Ice Cream only - scoopable Ice Cream$', 'Scoopable Ice Cream (replacement scoop)'),
    (r'^Ben and Jerrys\b', "Ben & Jerry's"), (r'^Kelloggs Coco Pops$', 'Coco Pops'),
    (r'\s+V - Weekend$', ' (weekends)'), (r' - Weekend$', ' (weekends)'), (r'(?: -)? Midweek$', ' (midweek)'),
    (r'^Toby Breakfast Wrap$', 'Breakfast Wrap'), (r'\bCoca Cola\b', 'Coca-Cola'),
    (r'^Toby Carvery Breakfast \(Scottish Sites Only\)$', 'Breakfast (Scottish sites only)'),
    (r'^Delivery hash browns \(quantity 3\)$', 'Hash Browns, 3 (delivery)'),
    (r'^Delivery unlimited (tea|coffee)( \(own cup\))?$', lambda m: f'Unlimited {m[1].capitalize()}{m[2] or ""} (delivery)'),
    (r'^Delivery (Toast|Egg Bap|tomato sauce|Brown Sauce)$', lambda m: f'{m[1][:1].upper()}{m[1][1:]} (delivery)'),
    (r'^Toby Mon - Fri Carvery Meat$', 'Carvery meat, average portion (Mon–Fri)'),
    (r'^Toby Saturday Carvery Meat$', 'Carvery meat, average portion (Saturday)'),
    (r'^Toby Sunday Carvery Meat$', 'Carvery meat, average portion (Sunday)'),
    (r'^Lamb Portion$', 'Roast Lamb'),
    (r'^(Turkey|Beef|Gammon|Pork|Lamb) King Size Portion$', r'Roast \1 (king size)'),
]
# the guide's portion words -> how the name states one serving
PORTION = [
    (r'per spoonful', ' (1 spoonful)'), (r'per slice', ' (1 slice)'), (r'per 4 roasties', ' (4 roasties)'),
    (r'per (pudding|packet|pack|portion)', ''),
]


def clean(s):
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', s))).strip()


def parse(path):
    raw = (gzip.open if path.endswith('.gz') else open)(path, 'rt', encoding='utf-8').read()
    date = re.search(r'Toby Carvery -\s*(20\d\d)-(\d\d)-(\d\d)', raw)
    assert date and re.search(r'Mitchells (?:&|&amp;) Butlers', raw), 'not the Toby Carvery allergen guide'
    tok = re.compile(r'aria-level="(\d)"[^>]*>(.*?)</p>|<div class="recipe-card">(.*?)</div>\s*</td>', re.S)
    cur, rows, bad = {2: '', 3: '', 4: ''}, [], []
    for m in tok.finditer(raw):
        if m.group(1):
            lv = int(m.group(1)); cur[lv] = clean(m.group(2))
            for k in range(lv + 1, 5): cur[k] = ''
            continue
        card = m.group(3)
        name = clean(re.search(r'<b>(.*?)</b>', card, re.S).group(1))
        desc = clean(re.sub(r'<div class="nutrition".*', '', card, flags=re.S))
        nut = re.search(r'Per Portion:.*?</tr>', card, re.S)
        base = {'menu': cur[2], 'section': cur[3], 'sub': cur[4], 'name': name, 'desc': desc}
        if not nut:
            bad.append((base, 'no nutrition published')); continue
        cells = [clean(c) for c in re.findall(r'<td.*?</td>', nut.group(0), re.S)]
        e = re.fullmatch(r'([\d.]+)\s*KJ\s*/\s*([\d.]+)\s*Kcal', cells[0], re.I)
        g = [re.fullmatch(r'([\d.]+)\s*g', c) for c in cells[1:]]
        if not e or len(g) != 6 or not all(g):
            bad.append((base, f'unreadable figures {cells}')); continue
        rows.append({**base, **dict(zip(COLS, [float(e[1]), float(e[2])] + [float(x[1]) for x in g]))})
    months = 'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split()
    return rows, bad, f'{months[int(date[2]) - 1]} {date[1]}', f'{date[1]}-{date[2]}-{date[3]}'


def problem(r):
    """Why the per-portion line can't be trusted, or None."""
    if r['sat'] > r['f'] + 0.2: return f"saturates ({r['sat']:g} g) above fat ({r['f']:g} g)"
    if r['su'] > r['c'] + 0.2: return f"sugars ({r['su']:g} g) above carbs ({r['c']:g} g)"
    # The guide's kJ column is unreliable (Black Americano: 218 kJ beside 11 kcal and macros worth
    # 8 kcal; roast turkey: 981 kJ beside 322 kcal and macros worth 329). The app shows kcal, so
    # kcal is checked against the macros instead, and kJ is ignored.
    # Toby publishes no fibre: allow 15% (or 15 kcal) for it and for rounding
    mk = 4 * r['p'] + 4 * r['c'] + 9 * r['f']
    if abs(mk - r['k']) > max(15, 0.15 * r['k']):
        return f"{r['k']:g} kcal, but its protein, carbs and fat make {mk:.0f}"
    return None


def category(r, name):
    where = ' / '.join([r['section'], r['sub']]).lower()
    if re.search(r'hot drinks|coffee|^tea\b|/ tea|drinks|decaf|syrups|milk choices|unlimited refills', where) and 'sauce' not in where:
        return 'drinks'
    # a sauce, gravy or spread on its own (not "Gammon & Mustard" or "Yorkie & Gravy")
    if re.search(r'sauce|gravy|jams|spreads', where) or (
            re.search(r'\b(gravy|sauce|mustard|ketchup|jam|marmalade|honey|butter)\b(?: \([^)]*\))*$', name, re.I)
            and not re.search(r'&|,', name.split(' (')[0])):
        return 'sauces'
    return 'fastfood'


def tidy(r):
    n = tidy_base(r)
    if 'choice of bread' in r['name']: n += ' (filling only)'  # "refer to your choice of bread"
    elif r['sub'] == 'Bread Choice' and 'Wrap' not in n: n += ' (sandwich bread)'
    if r['menu'].startswith('Delivery') and 'delivery' not in n.lower(): n += ' (delivery)'
    return n


def tidy_base(r):
    n = r['name']
    n = re.split(r'\s+(?:Also refer|Please also refer|Please see|Please refer|Refer to)\b', n)[0]
    portion = ''
    for pat, rep in PORTION:
        m = re.search(r'\s*-?\s*' + pat + r'\s*$', n, re.I)
        if m: n, portion = n[:m.start()], rep; break
    n = re.sub(r'\s*\((?:V|VE)\)\s*', ' ', n)
    n = re.sub(r'[*†®™]', '', n)
    n = re.sub(r'\s+', ' ', n).strip(' -')
    for a, b in FIX: n = re.sub(a, b, n)
    return n[:1].upper() + n[1:] + portion


def main(path):
    rows, bad, date, day = parse(path)
    out, dropped, by_name = [], [f"{b['menu']} / {b['name']} ({why})" for b, why in bad], {}
    menus = {r['menu'] for r in rows}
    unknown = menus - set(MENUS) - set(DROP_MENUS)
    assert not unknown, f'new menu(s) in the guide, add to MENUS or DROP_MENUS: {unknown}'
    for menu, why in DROP_MENUS.items():
        if menu in menus: dropped.append(f'{menu}: whole menu ({why})')
    rows.sort(key=lambda r: MENUS.index(r['menu']) if r['menu'] in MENUS else 99)  # stable: guide order within a menu
    for r in rows:
        if r['menu'] in DROP_MENUS: continue
        where = f"{r['menu']} / {r['name']}"
        if r['name'] in REJECT:
            dropped.append(f"{where} ({REJECT[r['name']]})"); continue
        short = RENAME.get((r['name'], r['k']), tidy(r))
        cat = category(r, short)
        if r['k'] == 0 and r['p'] == r['c'] == r['f'] == 0 and cat != 'drinks':
            # "Our Famous Carvery", "Vegetarian", "Seasonal Sponge": a heading that points to its parts
            dropped.append(f'{where} (0 kcal placeholder: the guide refers to the parts)'); continue
        why = problem(r)
        if why:
            dropped.append(f'{where} ({why})'); continue
        figs = (r['k'], r['p'], r['c'], r['f'])
        name = 'Toby Carvery ' + short
        # a children's-menu dish is marked (kids) unless it's the main menu's dish exactly
        if r['menu'] in KIDS_MENUS and not re.search(r'\b(mini|kids?|child\'?s?|children\'s)\b', short, re.I):
            same = by_name.get(name.lower())
            if not (same and same[0] == figs): name += ' (kids)'
        prev = by_name.get(name.lower())
        if prev:
            if prev[0] != figs:
                dropped.append(f"{where} ({r['k']:g} kcal; {prev[1]} gives the same name {prev[0][0]:g} kcal)")
            continue
        by_name[name.lower()] = (figs, f"{r['menu']} / {r['name']}")
        # per item, exactly as published: one serving (1 item) is the guide's per-portion line
        ref = {'g': 1, 'k': r['k'], 'p': r['p'], 'c': r['c'], 'f': r['f']}
        f = {'n': name, 'k': r['k'], 'p': r['p'], 'c': r['c'], 'f': r['f'], 'g': 1, 'each': True,
             'cat': cat, 'eat': True, 'src': 'toby-uk', 'ref': ref}
        assert round(f['k'] * f['g']) == round(r['k']) and all(f[m] * f['g'] == r[m] for m in 'pcf'), f'serving mismatch: {name}'
        out.append(f)
    body = json.dumps(out, indent=1, ensure_ascii=False)
    body = re.sub(r'\n\s+(?=[^\s{])', ' ', body).replace('\n  }', ' }')  # one food per line
    ts = ("import type { Food } from '@/core/types'\n\n"
          f"/** Toby Carvery UK menu, {date} (Mitchells & Butlers' allergen guide dated {day}): per item as\n"
          " *  Toby publishes it (one serving = the per-portion line: a plate, a carvery meat portion, one\n"
          " *  Yorkshire pudding, 4 roast potatoes, one spoonful of a vegetable, one drink). No portion weights\n"
          " *  are published. Build a carvery plate from the meats, Yorkshires, potatoes, veg and gravy.\n"
          " *  GENERATED by scripts/import/toby.py from the guide: don't edit by hand. */\n"
          f"export const TOBY: Food[] = {body}\n")
    open('src/core/data/chains/toby.ts', 'w').write(ts)
    print(f'Guide dated {day}: {len(rows) + len(bad)} rows parsed, {len(out)} foods written, {len(dropped)} dropped:')
    for d in dropped: print('  -', d)


if __name__ == '__main__':
    if sys.argv[1:2] == ['--rows']:
        rows, bad, date, day = parse(sys.argv[2])
        for r in rows: print(r['menu'], '|', r['section'], '|', r['sub'], '|', r['name'], [r[c] for c in COLS])
        for b, why in bad: print('BAD', b['menu'], '|', b['name'], why)
    else:
        main(sys.argv[1])
