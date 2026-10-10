"""Import Costa Coffee UK's in-store allergen & nutrition guide into src/core/data/chains/costa.ts.

Usage:  python3 -I scripts/import/costa.py scripts/import/data/costa-autumn-2026-ani-guide.pdf
        python3 -I scripts/import/costa.py --rows <pdf>     (every parsed row, for review)
Needs:  pip install pypdf   (dev tool only; the app never runs this)

Source: "INFORMATION FOR CUSTOMERS IN UK COSTA STORES", Autumn 2026 (code 75375/CCAUTUMN26POS),
86 pages. Pages 1-28 are allergens only; the nutrition tables start where a page says "Nutrition
per 100g/ml". Each row is a product name, then the per-100 g/ml figures, the portion weight (g or
ml), then the same figures per portion: kJ, kcal, fat, saturates, carbs, sugars, [fibre,] protein,
salt. Food pages carry fibre, drink pages don't, and the Superfuzion tea page adds three vitamin
columns; the columns are read from each page's own header. Costa's guide is the source because
costa.co.uk refuses this environment; cite it with https://www.costa.co.uk/nutrition.
The guide is Costa's copyright and isn't kept in the repo: download it from that page (or ask
Benn, who supplied it on 10 Oct 2026) into scripts/import/data/. The file this import used:
COS1152775375_Autumn_ANI_Guide_lowres_V3.pdf, sha256
6b9930fb19c44f48b0878c1a3feb2e200d45acfde1262d5b9c889f7853ecbfff.

Costa publishes a portion weight for every line, so (as with Greggs) one serving is that exact
portion and per 100 is derived from the per-portion figures, unrounded: one serving in the app is
Costa's per-portion line. Drinks are as served with the milk named (semi-skimmed is Costa's
standard). Deterministic: no AI, no guessing. Re-run on each new guide and review the diff.
"""
import json, logging, re, sys
from pypdf import PdfReader

logging.getLogger('pypdf').setLevel(logging.ERROR)  # the guide's fonts and boxes are noisy, not wrong

NUMW = re.compile(r'^\d+(?:\.\d+)?$')
MILKS = {'SEMI-SKIMMED MILK': 'semi-skimmed', 'OAT DRINK': 'oat', 'WHOLE MILK': 'whole', 'SKIMMED MILK': 'skimmed',
         'SOYA DRINK': 'soya', 'COCONUT DRINK': 'coconut'}
SIZES = {'SMALL', 'MEDIUM', 'LARGE', 'SINGLE', 'DOUBLE'}
SERVICE = {'IN STORE': 'in store', 'EAT IN': 'in store', 'TAKE AWAY': 'take away', 'TAKEAWAY': 'take away'}
# the second half of a wrapped name: never a row on its own (a wrapped first half ends in a space)
CONT = re.compile(r'^(- |(\S+ )?(MILK|DRINK) - |COFFEE - |ADDED |\(NO |MARSHMALLOW - |WHIP - )')

# Drinks kept: Costa's everyday (all-year) hot and iced coffees, teas and chocolates, every size
# and service (in store or take away) the guide lists, with its standard semi-skimmed milk; oat for the
# lattes and flat white, the drinks most often ordered with it. Left out: the other four milks,
# the seasonal and limited lines (Maple Hazel, Sweet Ube, Spanish, the frappé,
# whipped and fruit-drink ranges, which change every few weeks) and kids' babyccinos.
DRINKS = {
    'LATTE': ('Latte', ('semi-skimmed', 'oat')), 'SIGNATURE LATTE': ('Signature Latte', ('semi-skimmed', 'oat')),
    'FLAT WHITE': ('Flat White', ('semi-skimmed', 'oat')),
    'ICED LATTE': ('Iced Latte', ('semi-skimmed', 'oat')),
    'CAPPUCCINO': ('Cappuccino', ('semi-skimmed',)), 'MOCHA': ('Mocha', ('semi-skimmed',)),
    'CORTADO': ('Cortado', ('semi-skimmed',)), 'ESPRESSO MACCHIATO': ('Espresso Macchiato', ('semi-skimmed',)),
    'AMERICANO': ('Americano', None), 'FLAT BLACK': ('Flat Black', None), 'ICED AMERICANO BLACK': ('Iced Americano', None),
    'ICED WHITE AMERICANO': ('Iced White Americano', ('semi-skimmed',)),
    'ICED CAPPUCCINO': ('Iced Cappuccino', ('semi-skimmed',)), 'ICED MOCHA': ('Iced Mocha', ('semi-skimmed',)),
    'HOT CHOCOLATE': ('Hot Chocolate', ('semi-skimmed',)), 'CHAI LATTE': ('Chai Latte', ('semi-skimmed',)),
    'ICED CHAI LATTE': ('Iced Chai Latte', ('semi-skimmed',)),
    'MATCHA LATTE': ('Matcha Latte', ('semi-skimmed',)), 'ICED MATCHA LATTE': ('Iced Matcha Latte', ('semi-skimmed',)),
    'HIGH PROTEIN LATTE': ('High Protein Latte', ('semi-skimmed',)),
    'HIGH PROTEIN ICED LATTE': ('High Protein Iced Latte', ('semi-skimmed',)),
    'ENGLISH BREAKFAST TEA': ('English Breakfast Tea (no milk)', None),
}
# "Drinks Extras and Ingredients" kept as add-ons (one pump, shot or topping as Costa portions it)
EXTRAS = re.compile(r'SYRUP|SAUCE|^WHIPPING CREAM$|^LIGHT WHIP$|^MARSHMALLOW$|^PROTEIN POWDER$')
EXTRA_PAGES = range(84, 87)
# the guide's wording tidied (names are stable IDs: settle them before shipping)
SMALL_WORDS = {'and', 'with', 'of', 'in', 'or', 'no', 'au', 'aux'}
KEEP_UPPER = {'BLT', 'GF'}


def title(s):
    out = []
    for i, w in enumerate(s.lower().split()):
        up = w.upper()
        if up.strip('(),') in KEEP_UPPER: out.append(up)
        elif i and w in SMALL_WORDS: out.append(w)
        else: out.append(re.sub(r"(^|[-(/])([a-z])", lambda m: m[1] + m[2].upper(), w))
    s = ' '.join(out).replace("’S", "’s").replace("'S", "'s")
    # a bracketed note reads as a note: "(Bag)" -> "(bag)", as other chains write sizes
    return re.sub(r'\(([^)]*)\)', lambda m: f'({m[1].lower()})', s)


def num(t):
    v = float(t)
    return int(v) if v.is_integer() else v


def pages(path):
    r = PdfReader(path)
    cover = r.pages[0].extract_text() or ''
    assert 'INFORMATION FOR CUSTOMERS IN UK COSTA STORES' in cover and '75375/CCAUTUMN26POS' in cover, 'not the Autumn 2026 UK guide'
    return [(i + 1, p.extract_text() or '') for i, p in enumerate(r.pages)]


def parse(path):
    rows, bad = [], []
    for pno, text in pages(path):
        if 'Nutrition per 100g/ml' not in text: continue
        cols = ['kj', 'k', 'f', 'sat', 'c', 'su'] + (['fib'] if 'Fibre' in text else []) + ['p', 'salt'] \
            + (['zinc', 'vitc', 'b6'] if 'Zinc' in text else [])
        n = len(cols)
        pending = ''
        for raw in text.splitlines():
            line = raw.strip()
            # figures the PDF splits ("0 .08") or glues to the name ("TAKE AWAY125")
            line = re.sub(r'(?<=\d) \.(?=\d)', '.', line)
            line = re.sub(r'\b(IN STORE|EAT IN|TAKE AWAY|TAKEAWAY|MEDIUM)(?=\d)', r'\1 ', line)
            toks = line.split()
            i = len(toks)
            while i and NUMW.match(toks[i - 1]): i -= 1
            name, nums = ' '.join(toks[:i]), toks[i:]
            if not name: continue  # the page number
            if not nums:
                # a name wrapped onto the next line ends in a space; section labels don't
                pending = f'{pending} {line}'.strip() if raw.endswith(' ') and line.isupper() else ''
                continue
            if pending:
                name = f'{pending} {name}'
            elif CONT.match(name):
                bad.append((pno, name, 'second half of a wrapped name with no first half')); continue
            pending = ''
            name = re.sub(r'\s+', ' ', name).replace('*', '').strip()
            if len(nums) == n:  # per-100 line only (garnishes): no portion published
                bad.append((pno, name, 'no per-portion figures')); continue
            if len(nums) != 2 * n + 1:
                bad.append((pno, name, f'{len(nums)} figures instead of {2 * n + 1}')); continue
            v = list(map(num, nums))
            rows.append({'page': pno, 'name': name, 'h': dict(zip(cols, v[:n])), 'portion': v[n], **dict(zip(cols, v[n + 1:]))})
    return rows, bad


def sane(r):
    n = f"p{r['page']} {r['name']}"
    assert r['sat'] <= r['f'] + 0.3 and r['su'] <= r['c'] + 0.3, f'sat/sugar above fat/carbs: {n}'
    assert r['k'] < 1500 and max(r['p'], r['c'], r['f']) < 200, f'implausible values: {n}'
    assert abs(r['kj'] - 4.184 * r['k']) <= max(8, 0.03 * r['kj']), f'kJ/kcal disagree: {n} {r["kj"]} vs {r["k"]}'
    macro = 4 * r['p'] + 4 * r['c'] + 9 * r['f'] + 2 * r.get('fib', 0)
    assert abs(macro - r['k']) <= max(15, 0.15 * r['k']), f'kcal far from macros: {n} {r["k"]} vs {macro:.0f}'
    # the per-100 line should imply the same portion weight. Where it doesn't, the per-portion
    # line (what's kept, and has just passed its own checks) stands and the row is reported
    h = r['h']
    if h['k'] >= 20 and r['k'] >= 20 and abs(h['k'] * r['portion'] / 100 - r['k']) > max(4, 0.06 * r['k']):
        return f"{n}: {r['k']:.0f} kcal per {r['portion']:g} portion, but {h['k']:.0f} kcal/100 makes {h['k'] * r['portion'] / 100:.0f}"


def split_drink(name):
    """'LATTE - OAT DRINK - SMALL - TAKE AWAY' -> ('LATTE', 'oat', 'small', 'take away')."""
    parts = [p.strip() for p in name.split(' - ')]
    fam, milk, size, serv = [], None, None, None
    for p in parts:
        if p in MILKS: milk = MILKS[p]
        elif p in SIZES: size = p.lower()
        elif p in SERVICE: serv = SERVICE[p]
        else: fam.append(p)
    return ' - '.join(fam), milk, size, serv


def food(r, name, cat):
    P = r['portion']
    f = {'n': name, **{m: num(str(round(r[m] * 100 / P, 2))) for m in ('k', 'p', 'c', 'f')}, 'g': P}
    if cat == 'drinks' or (cat == 'sauces' and 'SYRUP' in r['name']): f['ml'] = True
    f['cat'] = cat; f['eat'] = True; f['src'] = 'costa-uk'
    f['ref'] = {'g': P, 'k': r['k'], 'p': r['p'], 'c': r['c'], 'f': r['f']}
    # one serving (the published portion) reproduces Costa's line
    assert round(f['k'] * P / 100) == round(r['k']) and all(abs(f[m] * P / 100 - r[m]) <= 0.05 for m in 'pcf'), f'serving mismatch: {name}'
    return f


def main(path):
    rows, bad = parse(path)
    out, dropped, seen = [], [f'p{p} {n} ({why})' for p, n, why in bad], set()
    drinks, notes = {}, []
    for r in rows:
        note = sane(r)
        n, pno = r['name'], r['page']
        if pno <= 32:  # food (cakes, sandwiches, toasties, pastries, snacks)
            f = food(r, 'Costa ' + title(n), 'fastfood')
        elif pno in EXTRA_PAGES and EXTRAS.search(n) and 'SUGAR FREE' in n:
            # 0-1 kcal a pump, with sweetener (polyol) carbs that kcal and carbs can't both match
            dropped.append(f'p{pno} {n} (sugar-free syrup: {r["k"]:g} kcal a pump)'); continue
        elif pno in EXTRA_PAGES and EXTRAS.search(n):
            f = food(r, 'Costa ' + title(n) + ' (drink add-on)', 'sauces')
        else:
            fam, milk, size, serv = split_drink(n)
            if fam not in DRINKS or (DRINKS[fam][1] and milk not in DRINKS[fam][1]) or (not DRINKS[fam][1] and milk):
                continue
            label = ', '.join(x for x in (size, serv) if x)
            base = DRINKS[fam][0] + (f', {milk}' if milk else '')
            f = food(r, f'Costa {base}' + (f' ({label})' if label else ''), 'drinks')
            drinks.setdefault(fam, []).append(f['n'])
        if note: notes.append(note)
        assert f['n'].lower() not in seen, f'duplicate name: {f["n"]}'
        seen.add(f['n'].lower())
        out.append(f)
    missing = set(DRINKS) - set(drinks)
    assert not missing, f'drinks not found in the guide: {missing}'
    body = json.dumps(out, indent=1, ensure_ascii=False)
    body = re.sub(r'\{\n\s+', '{ ', body)
    body = re.sub(r',\n\s+(?="[a-z]+":)', ', ', body)
    body = re.sub(r'\n\s*\}', ' }', body)
    ts = ("import type { Food } from '@/core/types'\n\n"
          "/** Costa Coffee UK menu, Autumn 2026, per 100 g (per 100 ml for drinks and syrups); `g` is Costa's own\n"
          " *  portion and `ref` its per-portion line. Drinks are as served with the milk named.\n"
          " *  GENERATED by scripts/import/costa.py from Costa's in-store allergen & nutrition guide: don't edit by hand. */\n"
          f"export const COSTA: Food[] = {body}\n")
    open('src/core/data/chains/costa.ts', 'w').write(ts)
    print(f'{len(rows) + len(bad)} rows parsed, {len(out)} foods written ({sum(map(len, drinks.values()))} drinks), {len(dropped)} rows dropped:')
    for d in dropped: print('  -', d)
    print('Per-100 line disagrees with the portion (per-portion line kept, it passes its own checks):')
    for d in notes: print('  -', d)


if __name__ == '__main__':
    if sys.argv[1:2] == ['--rows']:
        rows, bad = parse(sys.argv[2])
        for r in rows: print(r['page'], '|', r['name'], '|', r['portion'], r['k'], r['p'], r['c'], r['f'])
        for b in bad: print('BAD', b)
    else:
        main(sys.argv[1])
