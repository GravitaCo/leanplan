"""Import PizzaExpress's England, Wales & Scotland nutrition PDF into src/core/data/chains/pizzaexpress.ts.

Usage:  python3 scripts/import/pizzaexpress.py nutritional_downloads/PizzaExpress-UK-nutrition-2026-09.pdf
Needs:  pip install pdfplumber   (dev tool only; the app never runs this)

Source: the "Nutritionals" PDF under "England, Wales & Scotland" on
https://www.pizzaexpress.com/allergens-and-nutritionals (not the Northern Ireland, Brixton/Finsbury
Park/Earl's Court or Mac & Wings files beside it). Page 1 is the cover (dated), page 2 the contents;
pages 3-24 are tables, one or two per page: a section title, then per portion and per 100 g, each
kcal, kJ, fat, saturates, carbs, sugars, fibre, protein, salt (always in that order; the two-line
column headings wrap differently from page to page, but the figures don't move).

PizzaExpress publishes no portion weights, so every food is per item (`each`): one serving is the
PDF's per-portion line exactly (a whole pizza, a bowl of pasta, a portion of dough balls, one dip
pot, one drink as served). The per-100 g columns are only used to cross-check the per-portion line.
Deterministic: no AI, no guessing. Re-run on each new PDF and review the diff.
"""
import json, re, sys
import pdfplumber

NUMW = re.compile(r'^\d+(?:\.\d+)?$')
COLS = ['k', 'kj', 'f', 'sat', 'c', 'su', 'fib', 'p', 'salt']
N = len(COLS)

# section (as the PDF titles it) -> name prefix and category; None = not kept (reason given)
SECTIONS = {
    'Dough Balls': ('', 'fastfood'), 'Starters': ('', 'fastfood'), 'Sides': ('', 'fastfood'),
    'Pizzas- Classic': ('Classic ', 'fastfood'), 'Pizzas- Romana': ('Romana ', 'fastfood'),
    'Pizzas- Large Classic': ('Large Classic ', 'fastfood'),
    'Al Forno': ('', 'fastfood'), 'Leggera': ('Leggera ', 'fastfood'), 'Salads': ('', 'fastfood'),
    'Dips': ('', 'sauces'), 'Desserts': ('', 'fastfood'), 'Drinks': ('', 'drinks'), 'Hot Drinks': ('', 'drinks'),
    'Piccolo': ('Piccolo ', 'fastfood'), 'Piccolo – Pasta & Salad': ('Piccolo ', 'fastfood'),
    'Piccolo - Pizzas': ('Piccolo ', 'fastfood'), 'Piccolo - Drinks': ('Piccolo ', 'drinks'),
    'Piccolo - Desserts': ('Piccolo ', 'fastfood'),
    # breakfast (airport sites only: Edinburgh & Gatwick)
    'Breakfast eggs': ('', 'fastfood'), 'Cooked Breakfast': ('', 'fastfood'), 'Pancakes & Pastries': ('', 'fastfood'),
    'Pizzas': ('', 'fastfood'), 'Smoothies & Juices': ('', 'drinks'),
}
DROP_SECTIONS = {
    'Extra Toppings': 'pizza add-on topping', 'Piccolo – Extra Toppings': 'pizza add-on topping',
    'Extras': 'breakfast add-on', 'Preserves & Dips': 'breakfast condiment',
}
# the kids' drinks whose own names don't say they're the Piccolo portion
PICCOLO_ONLY = {'Milk', 'Oat Drink'}
# rows whose per-portion line is internally inconsistent: left out rather than guessed
REJECT = {
    ('Drinks', 'Orange Juice'): 'per-portion kcal (86) is twice what its carbs explain (41) and its own kJ (198 = 47 kcal)',
    ('Drinks', 'Passion Fruit Still Lemonade'): 'per-portion sugars (11.2 g) above its carbs (9.4 g)',
    ('Dips', 'Garlic & Herbs dip'): 'fat misprinted on both lines: 1.1 g explains 25 of its 112 kcal',
    ('Piccolo - Desserts', 'Chocolate Brownie'): 'per-portion fat (24.7 g) is the per-100 g figure: its macros make 344 kcal, not 251',
}
# the PDF's wording tidied (names are stable IDs: settle them before shipping)
RENAME = {
    'Dbl Espresso': 'Double Espresso',
    'Simply Sencha: Green Tea': 'Green Tea', 'Refresh: Double Mint': 'Double Mint Tea',
    'Lipton Iced tea peach': 'Lipton Iced Tea Peach',
    'Schweppes Mixer - Soda Water': 'Schweppes Soda Water', 'Schweppes Mixer - Lemonade': 'Schweppes Lemonade',
    'Strawberry Sicilian Lemonade PE': 'Strawberry Sicilian Lemonade',
    'Lemon & Raspberry Cheesecake (Dine Out': 'Lemon & Raspberry Cheesecake (Dine Out)',
    'Sweet & Smoky BBQ (Dine in)': 'Sweet & Smoky BBQ Dip (Dine In)',
}
FIX = [  # spelling and casing in the PDF, applied everywhere
    (r'\bPicollo\b', 'Piccolo'), (r'\bMushorroms\b', 'Mushrooms'), (r'\bAltnerative\b', 'Alternative'),
    (r'MozzAlternative', 'Mozz Alternative'), (r'AlternativeGluten', 'Alternative Gluten'),
    (r'\bGluten Free\b', 'GF'), (r'\bGF Version\b', 'GF'), (r'\(Dine out\)', '(Dine Out)'),
    (r'American cheese', 'American Cheese'), (r'Fudge cake', 'Fudge Cake'), (r'Halloumi bites', 'Halloumi Bites'),
    (r'^The full English: English Breakfast', 'English Breakfast Tea'), (r'^The Earl: Earl Grey', 'Earl Grey Tea'),
    (r'Semi- skimmed', 'Semi-skimmed'), (r'\b1Lt$', '1L'),
    (r'^Piccolo dough balls', 'Piccolo Dough Balls'), (r'\blight Mozz\b', 'Light Mozz'), (r'Parsley spread', 'Parsley Spread'),
    (r' With ', ' with '), (r'\bvegan\b', 'Vegan'),
]
SMALL = {'and', 'with', 'of', 'e', 'ad', 'di', 'in', 'no', 'on'}


def split(line):
    toks = line.split()
    i = len(toks)
    while i and NUMW.match(toks[i - 1]): i -= 1
    # a name can end in a number ("Peroni Nastro Azzurro 0.0"): a row is at most 18 figures
    i = max(i, len(toks) - 2 * N)
    return ' '.join(toks[:i]), [float(t) for t in toks[i:]]


def parse(path):
    rows, bad = [], []
    with pdfplumber.open(path) as pdf:
        cover = pdf.pages[0].extract_text() or ''
        for page in pdf.pages[2:]:
            section, pending = None, ''
            breakfast = page.page_number >= 21
            for line in (page.extract_text() or '').splitlines():
                line = line.strip()
                if not line: continue
                if line.startswith('PER PORTION'): pending = ''; continue
                if line.startswith('Breakfast: Airport'): continue
                if line.startswith('(kcal)'): continue
                if ' Energy' in line and '(kcal)' not in line and not NUMW.match(line.split()[-1]):
                    section = (pending + ' ' + line[:line.index(' Energy')]).strip(); pending = ''
                    continue
                name, nums = split(line)
                if not nums:
                    pending = (pending + ' ' + line).strip(); continue
                name = (pending + ' ' + name).strip(); pending = ''
                if len(nums) != 2 * N:
                    bad.append((section, name, f'{len(nums)} figures instead of {2 * N}')); continue
                rows.append({'section': section, 'name': name, 'page': page.page_number, 'breakfast': breakfast,
                             **dict(zip(COLS, nums[:N])), 'h': dict(zip(COLS, nums[N:]))})
    date = re.search(r'(January|February|March|April|May|June|July|August|September|October|November|December) (20\d\d)', cover)
    assert date and 'England, Wales & Scotland' in cover, 'not the England, Wales & Scotland PDF'
    return rows, bad, f'{date[1]} {date[2]}'


def sane(r, key):
    n = f"{r['section']} / {r['name']}"
    assert r['sat'] <= r['f'] + 0.2 and r['su'] <= r['c'] + 0.2, f'sat/sugar above fat/carbs: {n}'
    assert r['k'] < 2500 and max(r['p'], r['c'], r['f']) < 250, f'implausible values: {n}'
    assert abs(r['kj'] - 4.184 * r['k']) <= max(10, 0.03 * r['kj']), f'kJ/kcal disagree: {n} {r["kj"]} vs {r["k"]}'
    # UK labels count fibre at 2 kcal/g
    macro = 4 * r['p'] + 4 * r['c'] + 9 * r['f'] + 2 * r['fib']
    assert abs(macro - r['k']) <= max(15, 0.15 * r['k']), f'kcal far from macros: {n} {r["k"]} vs {macro:.0f}'
    # the per-portion line and the per-100 g line must imply one portion weight. Where they don't,
    # the per-100 g line must be the misprint (its own kcal and macros disagree): the per-portion
    # line, which is what's kept, has just passed that check. Otherwise the row stops the import.
    h = r['h']
    if r['k'] >= 40 and h['k'] >= 20:
        w = r['k'] / h['k']
        off = [m for m in ('p', 'c', 'f') if r[m] >= 3 and abs(r[m] - h[m] * w) > max(1.5, 0.15 * r[m])]
        if off:
            hm = 4 * h['p'] + 4 * h['c'] + 9 * h['f'] + 2 * h['fib']
            assert abs(hm - h['k']) > max(8, 0.06 * h['k']), f'per-portion and per-100 g disagree ({off}): {n}'
            return f'{n}: per-100 g line misprinted ({h["k"]:.0f} kcal vs {hm:.0f} from its macros); per-portion kept'


def tidy(name, section):
    n = RENAME.get(name, name)
    for a, b in FIX: n = re.sub(a, b, n)
    n = re.sub(r'^Dolcetti\s*-?\s*(.+?) Excluding [Hh]ot [Dd]rink(?: option)?$', r'Dolcetti \1 (without hot drink)', n)
    n = re.sub(r'\s*[-–]\s*1 Scoop$', ' (1 scoop)', n)
    n = re.sub(r'\s*-\s*(poached|fried|scrambled) eggs$', r' (\1 eggs)', n)
    n = re.sub(r' - (with salad|no salad)(?: \(Dine Out\))?$', lambda m: f" ({m[1]}{', Dine Out' if 'Dine Out' in m[0] else ''})", n)
    n = re.sub(r' - [Ww]ith (Semi-skimmed Milk|Oat Drink) \(5cl\)$', lambda m: f' with {m[1].lower()} (5cl)', n)
    if n != 'Oat Drink': n = re.sub(r'\s*[-–]?\s*Oat Drink$', ' (oat drink)', n)
    if section == 'Dips':
        n = ' '.join(w if w in SMALL or not w[:1].islower() else w[:1].upper() + w[1:] for w in n.split())
    return n[:1].upper() + n[1:]


def main(path):
    rows, bad, date = parse(path)
    out, dropped, seen, keys, notes = [], [f'{s} / {n} ({why})' for s, n, why in bad], set(), {}, []
    for r in rows:
        sec, raw = r['section'], r['name']
        key = (sec, raw)
        if key in REJECT:
            dropped.append(f'{sec} / {raw} ({REJECT[key]})'); continue
        if sec in DROP_SECTIONS:
            dropped.append(f'{sec} / {raw} ({DROP_SECTIONS[sec]})'); continue
        note = sane(r, key)
        if note: notes.append(note)
        assert sec in SECTIONS, f'unknown section: {sec}'
        if key in keys:
            # the same name twice in one table with different figures: can't tell which dish it is
            assert keys[key] != r['k'], f'exact duplicate row: {sec} / {raw}'
            dropped.append(f'{sec} / {raw} ({r["k"]:.0f} kcal; second row of that name in the table, the first says {keys[key]:.0f})'); continue
        keys[key] = r['k']
        prefix, cat = SECTIONS[sec]
        n = tidy(raw, sec)
        if prefix == 'Piccolo ' and sec == 'Piccolo - Drinks' and n not in PICCOLO_ONLY: prefix = ''
        if n.startswith('Piccolo'): prefix = ''
        if sec == 'Smoothies & Juices' and n.endswith('uice'): n = n[:-5] + 'Juice (breakfast)'
        name = f'PizzaExpress {prefix}{n}'
        assert name.lower() not in seen, f'duplicate name: {name}'
        seen.add(name.lower())
        # per item, exactly as published: one serving (1 item) is PizzaExpress's own per-portion line
        ref = {'g': 1, 'k': r['k'], 'p': r['p'], 'c': r['c'], 'f': r['f']}
        f = {'n': name, 'k': r['k'], 'p': r['p'], 'c': r['c'], 'f': r['f'], 'g': 1, 'each': True,
             'cat': cat, 'src': 'pizzaexpress-uk', 'ref': ref}
        assert round(f['k'] * f['g']) == round(r['k']) and all(f[m] * f['g'] == r[m] for m in 'pcf'), f'serving mismatch: {name}'
        out.append(f)
    body = json.dumps(out, indent=2, ensure_ascii=False)
    ts = ("import type { Food } from '@/core/types'\n\n"
          f"/** PizzaExpress UK (England, Wales & Scotland) menu, {date}: per item as PizzaExpress publishes it\n"
          " *  (one serving = the per-portion line: a whole pizza, a dish, one dip pot, one drink as served).\n"
          " *  PizzaExpress gives no portion weights. Breakfast items are airport sites only (Edinburgh, Gatwick).\n"
          " *  GENERATED by scripts/import/pizzaexpress.py from PizzaExpress's nutrition PDF: don't edit by hand. */\n"
          f"export const PIZZAEXPRESS: Food[] = {body}\n")
    open('src/core/data/chains/pizzaexpress.ts', 'w').write(ts)
    print(f'PDF dated {date}: {len(rows) + len(bad)} rows parsed, {len(out)} foods written, {len(dropped)} dropped:')
    for d in dropped: print('  -', d)
    print('Per-100 g misprints (per-portion line kept, it passes its own checks):')
    for d in notes: print('  -', d)


if __name__ == '__main__':
    if sys.argv[1:2] == ['--rows']:
        rows, bad, date = parse(sys.argv[2])
        for r in rows: print(r['page'], r['section'], '|', r['name'], [r[c] for c in COLS])
        for b in bad: print('BAD', b)
    else:
        main(sys.argv[1])
