"""Import Pizza Hut Restaurants' UK dine-in nutrition booklet into src/core/data/chains/pizzahut.ts.

Usage:  python3 scripts/import/pizzahut.py path/to/DINE-IN_AIN_Booklet_C3_2026_FINAL_V1.pdf
Needs:  pip install pdfplumber   (dev tool only; the app never runs this)

Pages 10-13 of the booklet are the nutrition tables (the rest is allergens and ingredients).
Two kinds of table:
  - per portion: name, portion weight (g), kcal, protein, carbs, sugar, fat, saturates, salt.
    The weight is published, so it's kept exact and per 100 g is derived from the per-portion
    figures (as for Greggs); a "100 g" portion is Pizza Hut's per-100 g column.
  - pizza: slices per pizza, whole-pizza weight (g), then kcal ... salt per slice. Pizza Hut
    publishes per slice, not a slice weight, so a pizza is one food per slice (`each`).
Each row is checked (kcal vs macros, sugar <= carbs, saturates <= fat). Deterministic: no AI,
no guessing. Re-run on each new booklet and review the diff.
"""
import json, re, sys
import pdfplumber

NUM = re.compile(r'^\d+(?:\.\d+)?$')
PORTION = ['g', 'k', 'p', 'c', 'su', 'f', 'sat', 'salt']
PIZZA = ['slices', 'pizza_g', 'k', 'p', 'c', 'su', 'f', 'sat', 'salt']
HEADER = re.compile(r'^(Average [Ww]eight|Weight of|Number of|Energy per|Product Name|of Portion|Slices per|Portion \(g\)|\(kcal\)|100g \(kcal\)|Weight \(g\))')
SKIP = re.compile(r'^(Pizza Hut Restaurants|Nutrition Information|Page \d+ of)')
# sections that are add-ons, seasonings or plain salad-bar veg rather than something to log on its own
DROP_SUBS = {'Pizza Finishers', 'Ice Cream Factory Toppings', 'Fresh Salad', 'Tabletop Sauces'}
DROP_NAMES = re.compile(r'^Additional .*Sauce$')
# Pizza Hut lists the current tenders and the ones replacing them "From August 2026": the booklet is
# dated July 2026, so from August the new line is the menu; the old one is dropped
FROM_AUG = ' (From August 2026)'
# Tali names for rows whose booklet wording needs its section to make sense (names are stable IDs)
RENAME = {
    ('Dine In Dip Pots', 'Sour Cream'): 'Sour Cream Dip Pot', ('Dine In Dip Pots', 'Hot Honey (60ml)'): 'Hot Honey Dip Pot (60ml)',
    ('Dine In Dip Pots', 'Sweet Chilli Dip (50ml)'): 'Sweet Chilli Dip Pot (50ml)',
    ('Dressings & Dips', 'Sour Cream'): 'Sour Cream (salad bar)',
    ('Ice Cream Factory Toppings', 'Ice Cream Builder Ice Cream'): 'Ice Cream Factory Ice Cream',
    ('Desserts', 'Additional Scoop Vanilla Ice cream'): 'Vanilla Ice Cream Scoop',
    ('Garlic Breadsticks', 'Garlic Breadsticks - Large'): 'Garlic Breadstick (large)',
    ('Garlic Breadsticks', 'Garlic Breadsticks - Small'): 'Garlic Breadstick (small)',
    ('Cheesy Garlic Breadsticks', 'Cheesy Garlic Breadsticks - Large'): 'Cheesy Garlic Breadstick (large)',
    ('Cheesy Garlic Breadsticks', 'Cheesy Garlic Breadsticks - Small'): 'Cheesy Garlic Breadstick (small)',
    ('Take Away Macaroni Cheese', 'Take Away Macaroni Cheese - Classic'): 'Takeaway Macaroni Cheese',
    ('Sides', 'Cheesy Bite Bites'): 'Cheesy Bite Bites', ('Tabletop Sauces', 'Chilli Flakes'): 'Chilli Flakes',
}
KEEP_ICE_CREAM = 'Ice Cream Builder Ice Cream'  # the one Ice Cream Factory row that's a food, not a topping
TAKEAWAY_SUBS = {'Takeaway Cookie Dough': ' (takeaway)', 'Takeaway Dip Pots': ''}
DRINK_SUBS = {'Drinks'}
SAUCE_SUBS = {'Dine In Dip Pots', 'Takeaway Dip Pots', 'Dressings & Dips'}


def split(line):
    toks = line.split()
    nums = []
    while toks and NUM.match(toks[-1]):
        nums.insert(0, float(toks.pop()))
    return ' '.join(toks), nums


def parse(path):
    rows, table, sub, mode, prev = [], None, None, None, None
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages[9:13]:
            for line in (page.extract_text() or '').splitlines():
                line = line.strip()
                if not line or SKIP.match(line): continue
                if HEADER.match(line):
                    if prev is not None: table, prev = prev, None  # the line before a header is the table's title
                    if 'Slice' in line: mode = 'pizza'
                    elif 'Portion' in line or 'portion' in line or '100g' in line: mode = 'portion'
                    continue
                name, nums = split(line)
                if not nums:
                    prev = sub = line; continue
                prev = None
                cols = PIZZA if mode == 'pizza' else PORTION
                assert len(nums) == len(cols), f'{table}/{sub}: {line}'
                rows.append({'table': table, 'sub': sub, 'name': name, 'pizza': mode == 'pizza', **dict(zip(cols, nums))})
    return rows


def sane(r):
    n = f"{r['sub']} / {r['name']}"
    assert r['su'] <= r['c'] + 0.2 and r['sat'] <= r['f'] + 0.2, f'sugar/sat above carbs/fat: {n}'
    macro = 4 * r['p'] + 4 * r['c'] + 9 * r['f']
    assert abs(macro - r['k']) <= max(12, 0.15 * r['k']), f'kcal far from macros: {n} {r["k"]} vs {macro:.0f}'
    if not r['pizza']: assert r['k'] <= 9.5 * r['g'], f'more than 9 kcal per g: {n}'


def main(path):
    rows = parse(path)
    out, dropped, seen = [], [], set()
    main_pizzas = {(r['sub'], r['name']) for r in rows if r['pizza'] and r['table'] != 'Buffet Pizzas'}
    for r in rows:
        sane(r)
        n, sub, table = r['name'], r['sub'], r['table']
        why = None
        if sub in DROP_SUBS and n != KEEP_ICE_CREAM: why = 'add-on, seasoning or plain salad veg'
        elif DROP_NAMES.match(n): why = 'dessert add-on'
        elif any(x['name'] == n + FROM_AUG and x['sub'] == sub for x in rows): why = 'replaced by the August 2026 recipe'
        elif r['pizza'] and 'WITHOUT Garlic Sprinkle' in n and sub not in ('Vegan Margherita', 'Vegan Veggie Supreme'):
            why = 'customisation of the Handcrafted pizza (no garlic sprinkle)'
        elif table == 'Buffet Pizzas' and (sub, n) in main_pizzas: why = 'buffet slice of a main-menu pizza'
        if why:
            dropped.append(f'{sub} / {n} ({why})'); continue
        n = n.replace(FROM_AUG, '')
        if r['pizza']:
            pizza = sub.replace('NEW - ', '')
            base = n.replace(' WITHOUT Garlic Sprinkle', '')
            name = f"{'Buffet ' if table == 'Buffet Pizzas' else ''}{pizza} {base} slice"
            # per slice, exactly as published (no slice weight is given)
            ref = {'g': 1, 'k': r['k'], 'p': r['p'], 'c': r['c'], 'f': r['f']}
            f = {'n': name, 'k': r['k'], 'p': r['p'], 'c': r['c'], 'f': r['f'], 'g': 1, 'each': True}
        else:
            name = RENAME.get((sub, n)) or n.replace('NEW - ', '')
            if table == 'Mini & Mega Monster': name = name if name.startswith('Kids ') else 'Kids ' + name
            elif table == 'Buffet Sides' and sub == 'Buffet Pasta': name = 'Buffet ' + name
            elif sub in ('Take Away Macaroni Cheese',): pass
            elif sub in TAKEAWAY_SUBS: name += TAKEAWAY_SUBS[sub]
            name = re.sub(r'^Take Away (.+)$', r'\1 (takeaway)', name)
            name = name.replace(' (30ml PP) (Oval)', ' Pot (takeaway, 30ml)').replace(' (served with ice cream & sauce)', ' with Ice Cream & Sauce')
            P = r['g']
            if P == 100:
                # Pizza Hut's per-100 g column: no portion to derive from
                f = {'n': name, 'k': r['k'], 'p': r['p'], 'c': r['c'], 'f': r['f'], 'g': 100}
            else:
                f = {'n': name, **{m: round(r[m] * 100 / P, 2) for m in 'kpcf'}, 'g': P}
            ref = {'g': P, 'k': r['k'], 'p': r['p'], 'c': r['c'], 'f': r['f']}
        name = 'Pizza Hut ' + f['n']
        f['n'] = name
        assert name not in seen, f'duplicate name: {name}'
        seen.add(name)
        # one serving in the app must be Pizza Hut's own line
        assert round(f['k'] * ref['g'] / (1 if f.get('each') else 100)) == round(r['k']), f'serving kcal mismatch: {name}'
        f['cat'] = 'drinks' if sub in DRINK_SUBS else 'sauces' if sub in SAUCE_SUBS else 'fastfood'
        f['src'] = 'pizzahut-uk'
        f['ref'] = ref
        out.append(f)
    body = json.dumps(out, indent=2, ensure_ascii=False)
    ts = ("import type { Food } from '@/core/types'\n\n"
          "/** Pizza Hut Restaurants UK (dine-in) menu: pizzas per slice as published (`each`); everything\n"
          " *  else per 100 g with `g` = Pizza Hut's own portion weight.\n"
          " *  GENERATED by scripts/import/pizzahut.py from Pizza Hut's dine-in booklet: don't edit by hand. */\n"
          f"export const PIZZAHUT: Food[] = {body}\n")
    open('src/core/data/chains/pizzahut.ts', 'w').write(ts)
    print(f'{len(rows)} rows parsed, {len(out)} foods written, {len(dropped)} dropped:')
    for d in dropped: print('  -', d)


if __name__ == '__main__':
    if sys.argv[1:2] == ['--rows']:
        for r in parse(sys.argv[2]): print(r['table'], '|', r['sub'], '|', r['name'], r['k'])
    else:
        main(sys.argv[1])
