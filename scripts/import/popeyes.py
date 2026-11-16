"""Import Popeyes UK's nutrition feed into src/core/data/chains/popeyes.ts.

Usage:  python3 -I scripts/import/popeyes.py feed.json 2026-11-15
        (feed.json: the JSON popeyesuk.com/nutrition loads, saved; the date it was fetched)

The page (an Angular app) loads FEED below: {data: [{id, name, recipe_category, nutrition:
{kcal, kJ, fats, saturated_fats, carbohydrates, sugar, protein, salt, sodium, fibre}}], page,
pages}. Figures are per item as sold; Popeyes gives no portion weights, so every food is per item
(`each`). The page shows kcal whole and grams to 0.1 (rounded half up), and that is what we store,
so one serving in the app equals the line a customer reads. Every count is its own food
("Popeyes Boneless Plain (10 pieces)"), exactly as listed.

Names are stable IDs (logs and usuals match by name), so the importer reads the current
popeyes.ts first: a product that is still listed keeps its name; one Popeyes renamed with the same
figures keeps ours and gets the new name as an alias (`aka`); one no longer listed is kept
unchanged in a dated block, never deleted. Deterministic: no AI, no network, no guessing. It prints
what was added, changed, renamed and dropped from the site: review that on every re-run.
"""
import json, re, sys
from datetime import date
from decimal import Decimal, ROUND_HALF_UP

FEED = ('https://app-allergenplatform-prod-westeurope-001.azurewebsites.net/api/recipes/get-information'
        '?pagination%5Bpage%5D=0&pagination%5BpageSize%5D=500&allergens=false&nutrition=true')
OUT = 'src/core/data/chains/popeyes.ts'
FIELDS = {'k': 'kcal', 'kj': 'kJ', 'p': 'protein', 'c': 'carbohydrates', 'su': 'sugar', 'f': 'fats', 'sat': 'saturated_fats'}
COUNT = re.compile(r'^(\d+) (Piece )?(.+?)$')
# the feed's own wording where it isn't a clean item name (names are stable IDs: settle them before shipping)
RENAME = {
    '4 Boneless Plain / Kids Nuggets': '4 Boneless Plain', '2 Classic Tenders / Kids Tenders': '2 Classic Tenders',
    'Kids Sandwich ketchup': 'Kids Sandwich Ketchup', 'Chicken Sandwich Classic!': 'Chicken Sandwich Classic',
    'Cajun Fries (Reg)': 'Cajun Fries (regular)', 'Cajun Fries (Large)': 'Cajun Fries (large)',
    'Fries (Reg)': 'Fries (regular)', 'Fries (Large)': 'Fries (large)', 'Fries (Small)': 'Fries (small)',
    'Kids Shake - Chocolate': 'Kids Chocolate Shake', 'Kids Shake - Strawberry': 'Kids Strawberry Shake',
    'Kids Shake - Vanilla': 'Kids Vanilla Shake',
    'Oasis Summer Fruits Regular': 'Oasis Summer Fruits', 'Oasis Summer Fruits Large': 'Large Oasis Summer Fruits',
}
# a published name kept as an alias of the food it's folded into
KIDS_AKA = {'4 Boneless Plain / Kids Nuggets': 'Kids Nuggets', '2 Classic Tenders / Kids Tenders': 'Kids Tenders'}
# Popeyes renamed these with identical figures: our name stays (stable ID), theirs becomes an alias
RENAMED = {'Classic Shatter Crunch Wrap': 'Classic Chicken Wrap', 'Spicy Shatter Crunch Wrap': 'Spicy Chicken Wrap'}
# the same product listed twice under two names (identical figures): the second is an alias
SAME = {'Superstack Hot Honey Sandwich': 'Hot Honey Superstack Sandwich'}
# Popeyes' shake kcal run ~20% above what their own protein/carbs/fat explain (every shake, both
# sizes, so it's how they're calculated, not a misread). The published kcal is what customers see
# and what we keep; listed so any new gap still stops the import.
MACRO_GAP = re.compile(r'Shake')
# the sugar-free Red Bulls run the other way: kcal ~20-25% under 4 kcal/g of carbs, because part of
# their carbs is sugar alcohol (polyols, 2.4 kcal/g; sugar is 8-13 g of 14-19 g). Kept as published.
POLYOL = re.compile(r'^Red Bull Zero ')
# kJ counts fibre at 2 kcal/g (Reg. 1169/2011 Annex XIV: about 2370 kJ) while the kcal leaves fibre
# out, so the two disagree by design, not by a typo. The 545 kcal is kept as published.
KJ_WITH_FIBRE = {'Red Bean Creole Vegan Sandwich'}
DRINK_CATS = {'Drinks'}
SAUCE_CATS = {'Dips'}
# file order (ties in search keep database order): the chicken first, breakfast last
ORDER = ['Signature Louisiana Chicken', 'Tenders', 'Boneless', 'Hot Wings', 'Sandwiches', 'Signature Wraps', 'Sides', 'Dips', 'Drinks', 'Whipz', 'Breakfast']

# Search aliases people type (never shown). Brand-prefixed, so an exact-alias match ("popeyes
# chicken" ranks first) never takes over a plain query like "nuggets" or "fried chicken"; their
# words still match those queries, after foods whose own name matches. Food words only: a short
# word such as "on", "the" or "of" would match whole here but only inside words elsewhere
# ("b|on|e"), and search then drops every other food ("chicken on the bone" listed only Popeyes).
# 'Popeyes chicken' and the 'fried chicken' aliases go on the plain chicken (every count) and the
# chicken sandwiches and wraps only, so those all fit in the 50 results ahead of the flavoured counts
CHICKEN = 'Popeyes chicken'
def aliases(cat, base, flavour_plain, name):
    a = []
    if cat == 'Signature Louisiana Chicken':
        a += [CHICKEN, 'Popeyes fried chicken', 'Popeyes chicken pieces']
    elif cat == 'Tenders':
        a += [CHICKEN, 'Popeyes fried chicken strips'] if flavour_plain else []
        a += ['Popeyes chicken tenders', 'Popeyes chicken strips', 'Popeyes strips']
    elif cat == 'Boneless':
        a += [CHICKEN, 'Popeyes fried chicken bites'] if flavour_plain else []
        a += ['Popeyes nuggets', 'Popeyes bites', 'Popeyes chicken nuggets', 'Popeyes chicken bites', 'Popeyes boneless chicken']
    elif cat == 'Hot Wings':
        a += [CHICKEN, 'Popeyes fried chicken wings'] if flavour_plain else []
        a += ['Popeyes wings', 'Popeyes chicken wings']
    elif cat in ('Sandwiches', 'Signature Wraps') and 'Chicken' in name and 'Kids' not in name:
        kind = 'wrap' if 'Wrap' in name else 'sandwich'
        a += [CHICKEN, f'Popeyes fried chicken {kind}', f'Popeyes chicken {kind}'] + (['Popeyes chicken burger'] if kind == 'sandwich' else [])
    return a


def r0(x): return float(Decimal(str(x)).quantize(Decimal('1'), ROUND_HALF_UP))
def r1(x): return float(Decimal(str(x)).quantize(Decimal('0.1'), ROUND_HALF_UP))


def read_feed(path):
    d = json.load(open(path, encoding='utf-8'))
    assert isinstance(d, dict) and isinstance(d.get('data'), list), 'not the nutrition feed'
    assert d.get('pages') in (1, None), f"feed has {d.get('pages')} pages: fetch them all"
    rows = []
    for x in d['data']:
        n = x['nutrition']
        raw = re.sub(r'\s+', ' ', str(x['name'])).strip()
        clean = re.sub(r'\s*\*\s*selected restaurants only', '', raw, flags=re.I).strip()
        r = {'raw': clean, 'name': RENAME.get(clean, clean), 'cat': str(x['recipe_category']).strip()}
        for k, src in FIELDS.items():
            v = n[src]
            assert isinstance(v, (int, float)) and not isinstance(v, bool) and v >= 0, f'bad {src} for {raw}: {v!r}'
            r[k] = float(v)
        rows.append(r)
    return rows


def sane(r):
    n = r['name']
    assert r['sat'] <= r['f'] + 0.05 and r['su'] <= r['c'] + 0.2, f'sat/sugar above fat/carbs: {n}'
    if n not in KJ_WITH_FIBRE:
        assert abs(r['kj'] - 4.184 * r['k']) <= max(8, 0.03 * r['kj']), f'kJ/kcal disagree: {n}'
    if MACRO_GAP.search(n): return
    if POLYOL.search(n):
        assert r['su'] < r['c'] and r['k'] <= 4 * (r['p'] + r['c']) + 9 * r['f'], f'not explained by polyols: {n}'
        return
    macro = 4 * r['p'] + 4 * r['c'] + 9 * r['f']
    assert abs(macro - r['k']) <= max(15, 0.15 * r['k']), f'kcal far from macros: {n} {r["k"]} vs {macro:.0f}'


# the dated source the current listed figures came from: a food that leaves the site keeps its
# figures and cites this. Before the next re-import, add a source for the 15 Nov 2026 feed
# (popeyes-uk-2026-11) to sources.ts and point this at it.
PREVIOUS_SRC = 'popeyes-uk-2026-09'
assert f"'{PREVIOUS_SRC}':" in open('src/core/data/sources.ts', encoding='utf-8').read(), f'{PREVIOUS_SRC} missing from sources.ts'

BLOCK = re.compile(r'^(?:/\*\* (?P<doc>.*?) \*/\n)?(?:export )?const (?P<v>\w+): Food\[\] = (?P<json>\[\n.*?^\])$', re.M | re.S)
GONE_DOC = re.compile(r'No longer on popeyesuk\.com, (\d{4}-\d{2}-\d{2})')


def read_current():
    """The foods popeyes.ts holds now: (listed on the site, {date: foods no longer listed})."""
    try: ts = open(OUT, encoding='utf-8').read()
    except FileNotFoundError: return [], {}
    listed, gone = [], {}
    for m in BLOCK.finditer(ts):
        foods = json.loads(m['json'])
        g = GONE_DOC.search(m['doc'] or '')
        if g: gone.setdefault(g[1], []).extend(foods)
        else: listed.extend(foods)
    assert listed, f'could not read {OUT}'
    return listed, gone


def build(rows):
    by = {r['name']: r for r in rows}
    out, dropped, extra_aka, seen = [], [], {}, set()
    for r in rows:
        n = r['name']
        if 'Ireland Only' in n:
            dropped.append(f'{n} (Republic of Ireland only)'); continue
        sane(r)
        if n in SAME:
            t = by[SAME[n]]
            assert all(t[c] == r[c] for c in FIELDS), f'{n} is not the same as {SAME[n]}'
            extra_aka.setdefault(SAME[n], []).append(f'Popeyes {n}')
            dropped.append(f'{n} (same as {SAME[n]}: kept as an alias)'); continue
        m = COUNT.match(n)
        plain = r['cat'] in ('Signature Louisiana Chicken', 'Tenders') or n.endswith(('Boneless Plain', ' Hot Wings')) and not re.search(r'Cajun|Garlic|Ghost|Honey', n)
        if m:
            cnt, piece, base = int(m[1]), m[2], m[3]
            single = re.sub(r's$', '', base)
            # 1 of an item: '1 Piece Signature Louisiana Chicken' -> 'Signature Louisiana Chicken piece', '1 Classic Tender' -> 'Classic Tender'
            name = f'{single} piece' if cnt == 1 and piece else single if cnt == 1 else f'{base} ({cnt} pieces)'
        else:
            base, name = n, n
        # sizes: 'Large Oreo Shake' -> 'Oreo Shake (large)'
        s = re.match(r'^(Large|Small) (.+)$', name)
        if s: name = f'{s[2]} ({s[1].lower()})'
        if r['cat'] in SAUCE_CATS and 'Dip' not in name: name += ' Dip'
        name = 'Popeyes ' + RENAMED.get(name, name)
        assert name not in seen, f'duplicate name: {name}'
        seen.add(name)
        aka = aliases(r['cat'], base, plain, name)
        if n in RENAMED: aka.append(f'Popeyes {n}')
        if r['raw'] in KIDS_AKA: aka.append(f'Popeyes {KIDS_AKA[r["raw"]]}')
        cat = 'drinks' if r['cat'] in DRINK_CATS else 'sauces' if r['cat'] in SAUCE_CATS else 'fastfood'
        ref = {'k': r0(r['k']), 'p': r1(r['p']), 'c': r1(r['c']), 'f': r1(r['f'])}
        # per item, exactly as the page shows it: one serving (1 item) is Popeyes' own line
        f = {'n': name, **ref, 'g': 1, 'each': True, 'cat': cat, 'src': 'popeyes-uk', 'ref': {'g': 1, **ref}}
        if aka: f['aka'] = aka
        assert round(f['k'] * f['g']) == round(ref['k']), f'serving kcal mismatch: {n}'
        out.append((r['cat'], cnt if m else 0, r['name'], f))
    for k, a in extra_aka.items():
        f = next(x[3] for x in out if x[3]['n'] == 'Popeyes ' + k)
        f['aka'] = f.get('aka', []) + a
    unknown = {c for c, *_ in out} - set(ORDER)
    assert not unknown, f'new categories, place them in ORDER: {unknown}'
    # category order, then the feed's own order with counts ascending (4, 6, 8, 10, not 10, 12, 4)
    idx = {id(x): i for i, x in enumerate(out)}
    def key(x):
        base = COUNT.match(x[2])[3] if COUNT.match(x[2]) else x[2]
        first = min(idx[id(y)] for y in out if (COUNT.match(y[2])[3] if COUNT.match(y[2]) else y[2]).rstrip('s') == base.rstrip('s'))
        return (ORDER.index(x[0]), first, x[1])
    return [x[3] for x in sorted(out, key=key)], dropped


def fmt_date(iso): return f'{date.fromisoformat(iso).day} {date.fromisoformat(iso):%b %Y}'


def main(path, fetched):
    date.fromisoformat(fetched)
    rows = read_feed(path)
    foods, dropped = build(rows)
    old, gone = read_current()
    old_by = {f['n']: f for f in old}
    for fs in gone.values(): old_by.update({f['n']: f for f in fs})
    new_names = {f['n'] for f in foods}
    # anything listed before and missing now: kept unchanged, dated the first time it's missed
    newly_gone = [f for f in old if f['n'] not in new_names]
    if newly_gone: gone.setdefault(fetched, []).extend(newly_gone)
    gone = {d: [f for f in fs if f['n'] not in new_names] for d, fs in gone.items()}
    gone = {d: fs for d, fs in sorted(gone.items()) if fs}
    # figures unchanged, but cited to the import they came from (the listed foods cite the new feed)
    for fs in gone.values():
        for f in fs:
            if f['src'] == 'popeyes-uk': f['src'] = PREVIOUS_SRC
    back = [f['n'] for f in foods if f['n'] in old_by and f['n'] not in {x['n'] for x in old}]

    added = [f['n'] for f in foods if f['n'] not in old_by]
    changed = []
    for f in foods:
        o = old_by.get(f['n'])
        if not o: continue
        d = [f'{m} {o.get(m)} -> {f[m]}' for m in ('k', 'p', 'c', 'f') if o.get(m) != f[m]]
        if d: changed.append(f"{f['n']}: {', '.join(d)}")

    def dump(v, fs, doc=None, export=False):
        head = f'/** {doc} */\n' if doc else ''
        return f"{head}{'export ' if export else ''}const {v}: Food[] = {json.dumps(fs, indent=2, ensure_ascii=False)}\n"
    blocks = [dump('LISTED', foods, f'On popeyesuk.com/nutrition, fetched {fetched}.')]
    for d, fs in gone.items():
        blocks.append(dump(f"GONE_{d.replace('-', '_')}", fs,
                           f'No longer on popeyesuk.com, {d} ({fmt_date(d)}): kept unchanged, never deleted, because logs and '
                           'usuals match foods by name. Figures as Popeyes last published them.'))
    names = ['LISTED'] + [f"GONE_{d.replace('-', '_')}" for d in gone]
    ts = ("import type { Food } from '@/core/types'\n\n"
          "// Popeyes UK menu, per item as Popeyes publishes it (no portion weights given).\n"
          "// GENERATED by scripts/import/popeyes.py from the popeyesuk.com/nutrition feed: don't edit by hand.\n\n"
          + '\n'.join(blocks)
          + f"\nexport const POPEYES: Food[] = [{', '.join('...' + n for n in names)}]\n")
    open(OUT, 'w', encoding='utf-8').write(ts)

    print(f'{len(rows)} feed rows, {len(foods)} foods listed, {sum(len(v) for v in gone.values())} kept as no longer listed, {len(dropped)} rows not imported')
    print(f'\nadded ({len(added)}):'); [print('  +', n) for n in added]
    print(f'\nchanged ({len(changed)}):'); [print('  ~', c) for c in changed]
    print(f'\nrenamed by Popeyes, kept ours with their name as an alias ({len(RENAMED)}):')
    for k, v in RENAMED.items(): print(f'  = Popeyes {v}  (aka Popeyes {k})')
    print(f'\nremoved from the site, kept unchanged ({len(newly_gone)} new this run):'); [print('  -', f['n']) for f in newly_gone]
    if back: print(f'\nback on the site ({len(back)}):'); [print('  ^', n) for n in back]
    print(f'\nnot imported ({len(dropped)}):'); [print('  x', d) for d in dropped]


if __name__ == '__main__':
    if len(sys.argv) != 3: sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
