"""Import Burger King UK's menu nutrition into src/core/data/chains/burgerking.ts.

Usage:  python3 scripts/import/burgerking_web.py            # build from the saved snapshot (offline)
        python3 scripts/import/burgerking_web.py --fetch    # refresh the snapshot first (needs network)

Source: the content service BK's own site (burgerking.co.uk) reads its menu from, a public
Sanity dataset (project czqk28jt, dataset prod_bk_gb). One GROQ query walks the live "BK Menu":
sections -> items, or pickers (size/count choices) -> items. Combos/meals carry no nutrition of
their own and are skipped. The snapshot keeps only menu and nutrition fields.

Each item's `nutrition` block is BK's per-item line (the figure the site shows), with its serving
`weight` in grams where BK gives one. With a weight, per 100 g is derived from BK's per-item
figures and the serving is that exact weight; without one the food is per item (`each`).
Deterministic: no AI, no guessing. Review the diff on each re-run.
"""
import json, re, subprocess, sys, urllib.parse

SNAP = 'docs/data/snapshots/burgerking-2026-09-25.json'
OUT = 'src/core/data/chains/burgerking.ts'
API = 'https://czqk28jt.apicdn.sanity.io/v2021-10-21/data/query/prod_bk_gb?query='
NUT = 'nutrition{calories,proteins,carbohydrates,sugar,fat,saturatedFat,fiber,salt,weight}'
ITEM = f'_type, _id, "name": name.en, {NUT}'
QUERY = ('*[_type=="menu" && name.en=="BK Menu"][0]{_id,_updatedAt,"sections": options[]->{_id,"name":name.en,'
         '"options": options[]->{' + ITEM + ', "options": options[]{"option": option->{' + ITEM + '}}}}}')

# existing Tali names are stable IDs (learned usuals match by name): keep them
LEGACY = {'item_1852': 'Burger King Whopper', 'item_1853': 'Burger King Chicken Royale'}
# BK's own wording tidied into an item name (names are stable IDs: settle them before shipping)
RENAME = {
    '6 Nuggets': 'Chicken Nuggets (6 pieces)', '5pc Halloumi Fries': 'Halloumi Fries (5 pieces)',
    '6 Chilli Cheese Bites*': 'Chilli Cheese Bites (6 pieces)', '9 Onion Rings': 'Onion Rings (9 pieces)',
    '6pc Pringles Sour Cream & Onion Chicken Fries': 'Pringles Sour Cream & Onion Chicken Fries (6 pieces)',
    'Burger Buddies (3pc)': 'Burger Buddies (3 pieces)', 'Ultimate Breakfast sandwich': 'Ultimate Breakfast Sandwich',
    'Side Salad - Caesar Dressing': 'Side Salad with Caesar Dressing', 'King Fusion - Smarties': 'Smarties King Fusion',
    "Large Ben & Jerry's Cookie Dough": "Ben & Jerry's Cookie Dough (large)",
    "Small Ben & Jerry's Cookie Dough": "Ben & Jerry's Cookie Dough (small)",
    "Large Ben & Jerry's Chocolate Fudge Brownie": "Ben & Jerry's Chocolate Fudge Brownie (large)",
    "Small Ben & Jerry's Chocolate Fudge Brownie": "Ben & Jerry's Chocolate Fudge Brownie (small)",
    "Small Ben & Jerry's Caramel Chew Chew": "Ben & Jerry's Caramel Chew Chew (small)",
    'Semi-skimmed Milk': 'Semi-Skimmed Milk', 'BK Flame-Grilled Mayo': 'Flame-Grilled Mayo',
}
# bigger counts of an item already kept: dropped as multiples (asserted below)
MULTIPLE = {
    '9 Nuggets': '6 Nuggets', '20 Nuggets': '6 Nuggets', '8pc Halloumi Fries': '5pc Halloumi Fries',
    '9 Chilli Cheese Bites': '6 Chilli Cheese Bites*', '20 Chilli Cheese Bites': '6 Chilli Cheese Bites*',
    '20 Onion Rings': '9 Onion Rings', 'Burger Buddies (9pc)': 'Burger Buddies (3pc)',
    '9pc Pringles Sour Cream & Onion Chicken Fries': '6pc Pringles Sour Cream & Onion Chicken Fries',
    '20pc Pringles Sour Cream & Onion Chicken Fries': '6pc Pringles Sour Cream & Onion Chicken Fries',
}
# BK's own data is wrong or unusable for these: dropped, never patched
DROP = {
    'Sharebox': 'multi-item sharing box',
    'Bottled Water': 'nothing to log', 'Tea': 'nothing to log (0 kcal)',
    'Ultimate Breakfast Sandwich': 'figures copied from the Bacon and Egg Sandwich at another weight',
    'Bacon and Egg Sandwich': 'fewer kcal than the Bacon Butty it adds egg to (data error)',
    'Sausage and Egg sandwich': 'about half the protein of the Sausage Butty it adds egg to (data error)',
    'Hash Browns': 'per-piece figure (8.3 g) with no piece count on the menu',
    'Ketchup': 'per-gram figure, not a portion',
    '6pc Onion Rings': "carbs copied from the 9-piece line (kcal don't add up)",
    # kcal and macros disagree by far more than rounding: which one is wrong can't be told
    'Spicy Smokehouse Ketchup': 'kcal far from macros (46 vs 8)',
    'Side Salad with Caesar Dressing': 'kcal far from macros (157 vs 319)',
    'Gooey Salted Caramel Cheesecake Bar': 'kcal far from macros (285 vs 234)',
    'Oasis': 'kcal with zero carbs', 'Oasis (large)': 'kcal with zero carbs',
}
DRINKS = 'DRINKS & COFFEE'
SAUCES = 'DIPS'


def fetch():
    out = subprocess.run(['curl', '-sS', '--fail', API + urllib.parse.quote(QUERY)], capture_output=True, text=True, check=True).stdout
    menu = json.loads(out)['result']
    snap = {'source': 'Burger King UK menu (Sanity dataset prod_bk_gb, read by burgerking.co.uk)',
            'fetched': '2026-09-25', 'query': QUERY, 'menu': menu}
    json.dump(snap, open(SNAP, 'w'), indent=1, ensure_ascii=False)
    print(f'saved {SNAP}')


def items(menu):
    """(item, first section name, sections it appears in), each item once, in menu order."""
    seen = {}
    for s in menu['sections']:
        for o in s['options']:
            if not o or o['_type'] == 'combo': continue
            cands = [o] if o['_type'] == 'item' else [x['option'] for x in o.get('options') or [] if x.get('option')]
            for it in cands:
                if it['_type'] != 'item': continue
                if it['_id'] in seen: seen[it['_id']][2].add(s['name']); continue
                seen[it['_id']] = [it, s['name'], {s['name']}]
    return list(seen.values())


def tidy(n):
    n = re.sub(r'\s+', ' ', n.replace('®', '')).strip().replace('WHOPPER', 'Whopper')
    n = RENAME.get(n, n)
    m = re.match(r'^(Regular|Large|Small) (.+)$', n)
    return f'{m[2]} ({m[1].lower()})' if m else n


def sane(n, k, p, c, f):
    assert k < 1500 and max(p, c, f) < 200, f'implausible values: {n}'
    macro = 4 * p + 4 * c + 9 * f
    assert abs(macro - k) <= max(15, 0.15 * k), f'kcal far from macros: {n} {k} vs {macro:.0f}'


def main():
    menu = json.load(open(SNAP))['menu']
    rows = items(menu)
    by = {re.sub(r'\s+', ' ', it['name']).strip(): it for it, _, _ in rows}
    out, dropped, seen = [], [], set()
    for it, sec, secs in rows:
        raw = re.sub(r'\s+', ' ', it['name']).strip()
        nut = it['nutrition'] or {}
        vals = [nut.get(x) for x in ('calories', 'proteins', 'carbohydrates', 'fat')]
        if raw in DROP or tidy(raw) in DROP:
            dropped.append(f"{raw} ({DROP.get(raw) or DROP[tidy(raw)]})"); continue
        if any(v is None for v in vals):
            dropped.append(f'{raw} (BK gives no full kcal/protein/carbs/fat)'); continue
        k, p, c, f = vals
        if raw in MULTIPLE:
            one = by[MULTIPLE[raw]]['nutrition']
            cnt = lambda s: int(re.search(r'(\d+)', s)[1])
            x = cnt(raw) / cnt(MULTIPLE[raw])
            assert abs(k - one['calories'] * x) <= max(3, 0.03 * k), f'{raw} is not a multiple of {MULTIPLE[raw]}'
            dropped.append(f'{raw} (multiple of {MULTIPLE[raw]})'); continue
        sane(raw, k, p, c, f)
        name = LEGACY.get(it['_id']) or 'Burger King ' + tidy(raw)
        assert name not in seen, f'duplicate name: {name}'
        seen.add(name)
        cat = 'drinks' if DRINKS in secs else 'sauces' if SAUCES in secs else 'fastfood'
        ref = {'k': k, 'p': p, 'c': c, 'f': f}
        W = nut.get('weight')
        if W:
            # BK's per-item line anchors the values: per 100 g derived from it, serving kept exact
            for dp in (2, 4):
                food = {'n': name, **{m: round(v * 100 / W, dp) for m, v in ref.items()}, 'g': W}
                s = {m: food[m] * W / 100 for m in ref}
                if round(s['k']) == round(k) and all(abs(s[m] - ref[m]) <= 0.1 for m in 'pcf'): break
            else:
                raise AssertionError(f'serving mismatch: {raw}')
            food['ref'] = {'g': W, **ref}
        else:
            # per item, exactly as published: one serving (1 item) is BK's own line
            food = {'n': name, **ref, 'g': 1, 'each': True, 'ref': {'g': 1, **ref}}
        assert round(food['k'] * food['g'] / (1 if food.get('each') else 100)) == round(k), f'serving kcal mismatch: {raw}'
        food['cat'] = cat; food['src'] = 'bk-gb'; food['ref'] = food.pop('ref')
        out.append(food)
    missing = set(LEGACY.values()) - seen
    assert not missing, f'legacy foods not found in the menu: {missing}'
    out.sort(key=lambda f: 0 if f['n'] in LEGACY.values() else 1)
    body = json.dumps(out, indent=2, ensure_ascii=False)
    ts = ("import type { Food } from '@/core/types'\n\n"
          "/** Burger King UK menu, per item as BK publishes it (per 100 g with BK's serving weight where given).\n"
          f" *  GENERATED by scripts/import/burgerking_web.py from {SNAP}: don't edit by hand. */\n"
          f"export const BURGERKING: Food[] = {body}\n")
    open(OUT, 'w').write(ts)
    print(f'{len(rows)} menu items, {len(out)} foods written, {len(dropped)} dropped:')
    for d in dropped: print('  -', d)


if __name__ == '__main__':
    if '--fetch' in sys.argv: fetch()
    main()
