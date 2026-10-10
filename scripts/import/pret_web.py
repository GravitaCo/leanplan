"""Import Pret A Manger's UK menu nutrition into src/core/data/chains/pret.ts.

Usage:  python3 scripts/import/pret_web.py            # build from the saved snapshot (offline)
        python3 scripts/import/pret_web.py --fetch    # refresh the snapshot first (needs network)

Source: pret.co.uk's own menu (a Next.js site). Each category page (/en-GB/products/categories/
<slug>) embeds its products in __NEXT_DATA__ with Pret's nutrition table (per 100 g and per
serving) and `averageWeight`, the serving in grams. Barista drinks that come with a choice of
milk carry `variants` on their product page (/en-GB/products/<sku>/x), one nutrition table per
milk and caffeine option. The snapshot keeps only names, sections and nutrition.
Deterministic: no AI, no guessing. Review the diff on each re-run.
"""
import json, re, subprocess, sys

SNAP = 'docs/data/snapshots/pret-2026-10-10.json'
OUT = 'src/core/data/chains/pret.ts'
SITE = 'https://www.pret.co.uk/en-GB'
CATEGORIES = ['hot-drinks', 'hot-food', 'breakfast', 'sandwiches-baguettes-wraps-and-flatbreads', 'cold-drinks',
              'super-plates-salads-and-protein-pots', 'sweet-and-savoury-snacks', 'fruit-and-fruit-pots',
              'little-pret-stars', 'veggie-and-vegan-friendly', 'pret-at-home']
NUTRIENTS = {'Energy (KJ)': 'kj', 'Energy (Kcal)': 'k', 'Protein (g)': 'p', 'Carbohydrates (g)': 'c', 'Fat (g)': 'f', 'Fibre (g)': 'fi'}


# ---------------------------------------------------------------------------------------- fetch

def page(url):
    html = subprocess.run(['curl', '-sSL', '--fail', '-A', 'Mozilla/5.0', url], capture_output=True, text=True, check=True).stdout
    return json.loads(re.search(r'<script id="__NEXT_DATA__"[^>]*>(.*?)</script>', html, re.S).group(1))['props']['pageProps']


def table(rows):
    """Pret's nutrition rows -> {'serv': {k, p, ...}, 'per100': {...}} as published (numbers)."""
    out = {'serv': {}, 'per100': {}}
    for row in rows:
        r = {x['name']: x['value'] for x in row}
        key = NUTRIENTS.get(r['nutrient'])
        if key:
            out['serv'][key], out['per100'][key] = float(r['perServing']), float(r['per100g'])
    return out


def fetch():
    items, order = {}, []
    for cat in CATEGORIES:
        sel = page(f'{SITE}/products/categories/{cat}')['selectedCategory']
        for sub in sel['subcategories'] or [sel]:
            for p in sub.get('products', []):
                if p['sku'] in items: continue
                items[p['sku']] = {'sku': p['sku'], 'name': p['name'].strip(), 'section': f"{sel['name']} / {sub['name'].strip()}",
                                   'type': p['productType']['key'], 'g': p.get('averageWeight'), **table(p['nutritionals'])}
                if p.get('canHaveVariants'):
                    full = page(f"{SITE}/products/{p['sku']}/x")['product']
                    items[p['sku']]['variants'] = [{'sku': v['sku'], 'milk': v['milk'], 'caffeine': v['caffeine'], 'cupSize': v['cupSize'],
                                                    'default': v['defaultVariant'], **table(v['nutritionals'])} for v in full['variants']]
                order.append(p['sku'])
    snap = {'source': 'Pret A Manger UK menu (data embedded in pret.co.uk/en-GB/products pages)',
            'url': f'{SITE}/products', 'fetched': '2026-10-10', 'items': [items[s] for s in order]}
    json.dump(snap, open(SNAP, 'w'), indent=1, ensure_ascii=False)
    print(f'saved {SNAP}: {len(order)} products')


# ---------------------------------------------------------------------------------------- build

# Pret's wording tidied into an item name (names are stable IDs: settle them before shipping)
RENAME = {'Mango & Lime': 'Mango & Lime Fruit Pot', 'Super Fruit': 'Super Fruit Pot', 'Fruit Salad': 'Fruit Salad Pot',
          'Coke Bottle': 'Coca-Cola 500ml', 'Coke Can': 'Coca-Cola 330ml can', 'Choc Bar': 'Chocolate Bar',
          'Soup White Baguette with Butter': 'White Baguette with Butter (for soup)'}
# subsections whose items Pret names without saying what they are ("Coronation Chicken")
SUFFIX = {'Sandwiches': 'Sandwich', 'Super Plates': 'Super Plate'}
# Pret's code for each milk, as named in Tali. A drink's default is the milk in its ingredients list;
# Pret marks its matcha lattes' coconut drink NO_MILK (their ingredients: "Coconut Drink ...").
MILK = {'SEMI_SKIMMED': 'semi-skimmed milk', 'SKIMMED': 'skimmed milk', 'OAT': 'oat drink', 'SOYA': 'soya drink'}
DEFAULT_NO_MILK = {'Matcha Latte': 'coconut drink', 'Iced Matcha Latte': 'coconut drink', 'Americano': 'black',
                   'Filter Coffee': 'black', 'Iced Black Americano': 'black', 'Espresso': 'black'}


def r1(x):
    return round(x + 1e-9, 1)


def sane(r):
    """Pret's own line must hold together: kcal close to 4p + 4c + 9f (+ 2 per g fibre, UK labels)."""
    if max(r['k'], r['p'], r['c'], r['f']) == 0: return 'nothing to log'
    macro = 4 * r['p'] + 4 * r['c'] + 9 * r['f'] + 2 * r.get('fi', 0)
    if abs(macro - r['k']) > max(15, 0.15 * r['k']): return f"kcal far from macros ({r['k']:g} vs {macro:.0f})"
    if abs(r['kj'] - 4.184 * r['k']) > max(10, 0.03 * r['kj']): return f"kJ and kcal disagree ({r['kj']:g} kJ, {r['k']:g} kcal)"


def drink_variants(it):
    """The milk options to keep for a barista drink, and why the others were left out.
    Pret's per-milk tables carry visible copy-paste errors; those are dropped, never patched."""
    keep, dropped = [], []
    vs = [v for v in it['variants'] if v['caffeine'] == 'CAFFEINATED']
    if len(vs) < len(it['variants']): dropped.append('decaf options (the same drink decaffeinated)')
    default = [v for v in vs if v['default']]
    assert len(default) == 1 and default[0]['serv'] == it['serv'], f"default variant isn't the menu card: {it['name']}"
    key = lambda v: tuple(v['serv'].get(m) for m in ('k', 'p', 'c', 'f'))
    semi = next((v for v in vs if v['milk'] == 'SEMI_SKIMMED'), None)
    for v in vs:
        why = None
        if None in key(v):
            why = 'incomplete figures'
        elif v['milk'] == 'NO_MILK' and not v['default']:
            why = 'no milk named: either the black default again or a milk Pret doesn\'t name'
        elif v['milk'] not in MILK and not v['default']:
            why = f"unknown milk {v['milk']}"
        elif any(key(o) == key(v) and o['milk'] != v['milk'] for o in vs if o is not v) and not v['default']:
            why = 'same figures as another milk on this drink (a copy, so the label is unreliable)'
        elif v['milk'] == 'SKIMMED' and semi and semi is not v and v['serv']['p'] and semi['serv']['p'] and \
                v['serv']['f'] / v['serv']['p'] > 0.5 * semi['serv']['f'] / semi['serv']['p']:
            # skimmed milk has ~0.1 g fat per 3.5 g protein, semi-skimmed ~1.7: a "skimmed" line with
            # the semi-skimmed fat-to-protein ratio is the semi-skimmed drink mislabelled
            why = 'skimmed figures carry semi-skimmed fat (fat per g protein not below half the semi-skimmed drink\'s)'
        else:
            why = sane(v['serv'])
        if why: dropped.append(f"{v['milk'].lower()} ({why})")
        else: keep.append(v)
    return keep, dropped


def label(it, v):
    if v['milk'] == 'NO_MILK':
        return DEFAULT_NO_MILK[it['name']]
    return MILK[v['milk']]


def base_name(it):
    n = re.sub(r'\s+', ' ', it['name']).strip()
    n = RENAME.get(n, n)
    n = re.sub(r"^Pret's |^Pret (?!A )", '', n)
    sub = it['section'].split(' / ')[1]
    if sub in SUFFIX and SUFFIX[sub] not in n: n += ' ' + SUFFIX[sub]
    return n if n.startswith('Pret A ') else 'Pret ' + n  # "Pret A Mango" is already its own name


def main():
    snap = json.load(open(SNAP))
    out, dropped = [], []
    for it in snap['items']:
        name, sec = base_name(it), it['section']
        drink = sec.startswith(('Hot drinks', 'Cold drinks'))
        if not it['serv']:
            dropped.append(f"{it['name']} (Pret gives no nutrition)"); continue
        if 'variants' in it:
            # Pret gives each milk's figure per cup and no weight for it: per item, exactly as published
            keep, why = drink_variants(it)
            dropped += [f"{it['name']}, {w}" for w in why]
            for v in sorted(keep, key=lambda v: not v['default']):
                s = v['serv']
                r = {'k': s['k'], 'p': s['p'], 'c': s['c'], 'f': s['f']}
                n = name + (f' ({label(it, v)})' if len(keep) > 1 else '')
                out.append({'n': n, **r, 'g': 1, 'each': True, 'cat': 'drinks', 'eat': True, 'src': 'pret-uk', 'ref': {'g': 1, **r}})
            continue
        s, h, P = it['serv'], it['per100'], it['g']
        why = sane(s)
        if why:
            dropped.append(f"{it['name']} ({why})"); continue
        assert P and P > 0, f'no serving weight: {it["name"]}'
        # Pret's per-serving line is what customers see: it anchors the values, per 100 is derived
        # from it (unrounded) and Pret's serving weight is kept exact. Its own per-100 column must agree.
        assert abs(h['k'] * P / 100 - s['k']) <= max(4, 0.04 * s['k']), f"per 100 and per serving disagree: {it['name']}"
        per100 = lambda x: round(x * 100 / P, 2)
        f = {'n': name, 'k': per100(s['k']), 'p': per100(s['p']), 'c': per100(s['c']), 'f': per100(s['f']), 'g': P}
        if drink: f['ml'] = True  # Pret weighs drinks in grams; logged as ml (1 g ~ 1 ml), as Greggs' are
        f.update({'cat': 'drinks' if drink else 'fastfood', 'eat': True, 'src': 'pret-uk',
                  'ref': {'g': P, 'k': s['k'], 'p': s['p'], 'c': s['c'], 'f': s['f']}})
        assert round(f['k'] * P / 100) == round(s['k']), f'serving kcal mismatch: {it["name"]}'
        out.append(f)
    names = [f['n'].lower() for f in out]
    dup = {n for n in names if names.count(n) > 1}
    assert not dup, f'duplicate names: {dup}'
    body = json.dumps(out, indent=2, ensure_ascii=False)
    ts = ("import type { Food } from '@/core/types'\n\n"
          "/** Pret A Manger UK menu: per 100 g (per 100 ml for drinks) with `g` Pret's own serving weight;\n"
          " *  barista drinks per cup, one line per milk, as Pret publishes them (no cup weights given).\n"
          f" *  GENERATED by scripts/import/pret_web.py from {SNAP}: don't edit by hand. */\n"
          f"export const PRET: Food[] = {body}\n")
    open(OUT, 'w').write(ts)
    print(f"{len(snap['items'])} menu products, {len(out)} foods written, {len(dropped)} dropped:")
    for d in dropped: print('  -', d)


if __name__ == '__main__':
    if '--fetch' in sys.argv: fetch()
    main()
