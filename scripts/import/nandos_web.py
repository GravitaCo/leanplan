"""Import Nando's UK menu nutrition into src/core/data/chains/nandos.ts.

Usage:  python3 scripts/import/nandos_web.py            # build from the saved snapshot (offline)
        python3 scripts/import/nandos_web.py --fetch    # refresh the snapshot first (needs network)

Source: the JSON the nandos.co.uk menu page loads (a Gatsby site: /food/menu/page-data/index/
page-data.json), the same data its nutrition cards show. Each item carries
`nutritionalInfo.factsForPortionSizes`: one line per portion size, in the order of the item's
`priceList` (Regular, Large for sides), per portion, grams given in mg. Nando's gives no portion
weights, so every food is per item (`each`), exactly as published. The snapshot keeps only menu
and nutrition fields. Deterministic: no AI, no guessing. Review the diff on each re-run.
"""
import json, re, subprocess, sys

SNAP = 'docs/data/snapshots/nandos-2026-09-25.json'
OUT = 'src/core/data/chains/nandos.ts'
URL = 'https://www.nandos.co.uk/food/menu/page-data/index/page-data.json'

# existing Tali names are stable IDs (learned usuals match by name): keep them
LEGACY = {
    ('1/4 Chicken', ''): "Nando's Quarter Chicken (plain)", ('1/2 Chicken', ''): "Nando's Half Chicken (plain)",
    ('PERi-Salted Chips', 'Regular'): "Nando's Peri-Peri Chips", ('Grilled Chicken Pitta', ''): "Nando's Chicken Pitta",
}
# Nando's wording tidied into an item name (names are stable IDs: settle them before shipping)
RENAME = {
    '1/4 Chicken Breast': 'Quarter Chicken Breast', '1/4 Chicken Leg': 'Quarter Chicken Leg',
    '3 Chicken Wings': 'Chicken Wings (3 pieces)', '4 Boneless Chicken Thighs': 'Boneless Chicken Thighs (4 pieces)',
    'Irn Bru': 'Irn-Bru', "Kid's Cawston Press Apple & Pear": "Cawston Press Apple & Pear (kids)",
    "Kid's Cawston Press Summer Berry": "Cawston Press Summer Berry (kids)", 'Sxollie': 'Sxollie Cider',
}
# bigger counts of an item already kept: dropped as multiples (asserted below)
MULTIPLE = {'Whole Chicken': ('1/4 Chicken', 4), '5 Chicken Wings': ('3 Chicken Wings', 5 / 3),
            '10 Chicken Wings': ('3 Chicken Wings', 10 / 3), '15 Chicken Wings': ('3 Chicken Wings', 5)}
# where Nando's own kJ and kcal disagree (a typo in one of them): the kcal figure is what the
# menu shows customers and what we keep; listed so any new disagreement still stops the import
KJ_TYPO = {'4 Boneless Chicken Thighs', "Kid's Cawston Press Apple & Pear"}
# Nando's own data is self-contradictory for these: dropped, never patched
DROP = {'NIX and KIX Cucumber Mint': 'kcal far from macros (59 vs 75)'}
DROP_SECTIONS = {'Sharing Platters': 'multi-item sharing platter'}
# the Extras section: sauces are kept (logged on their own); the rest are add-ons to a main
SAUCE = re.compile(r'Sauce|PERinaise|Jam|BBQ|Mayonnaise|Drizzle|Gravy|Houmous')
KIDS = {'Mains', 'Dino Sides'}  # Nandinos subsections that are kids' portions of adult items


def fetch():
    out = subprocess.run(['curl', '-sSL', '--fail', '-A', 'Mozilla/5.0', URL], capture_output=True, text=True, check=True).stdout
    menu = json.loads(out)['result']['data']['nandos']['menu']
    keep = ('id', 'displayName', 'subsection', 'restaurantGroup')
    sections = [{'id': s['id'], 'displayName': s['displayName'], 'items': [
        {**{k: it.get(k) for k in keep}, 'priceList': [p['displayName'] for p in it.get('priceList') or []],
         'nutritionalInfo': it['nutritionalInfo']} for it in s['items']]} for s in menu['sections']]
    snap = {'source': "Nando's UK menu (page data loaded by nandos.co.uk/food/menu)", 'url': URL,
            'fetched': '2026-09-25', 'sections': sections}
    json.dump(snap, open(SNAP, 'w'), indent=1, ensure_ascii=False)
    print(f'saved {SNAP}')


def tidy(n):
    n = RENAME.get(n, n)
    n = n.replace('PERi-PERi', 'Peri-Peri').replace('PERinaise', 'Perinaise').replace('PERi-', 'Peri-')
    return re.sub(r'\s+', ' ', n).strip()


def grams(mg):
    return round(mg / 1000, 1)


def sane(n, r, alcohol):
    assert r['k'] < 2500 and max(r['p'], r['c'], r['f']) < 200, f'implausible values: {n}'
    if alcohol: return  # alcohol's kcal aren't in protein/carbs/fat
    macro = 4 * r['p'] + 4 * r['c'] + 9 * r['f']
    assert abs(macro - r['k']) <= max(15, 0.15 * r['k']), f'kcal far from macros: {n} {r["k"]} vs {macro:.0f}'


def main():
    snap = json.load(open(SNAP))
    rows = []  # (section, item, size label, facts)
    for s in snap['sections']:
        for it in s['items']:
            fs = it['nutritionalInfo']['factsForPortionSizes']
            sizes = [p for p in it['priceList'] if p in ('Regular', 'Large')]
            if len(fs) > 1:
                assert sizes and len(sizes) == len(fs) or s['displayName'] == 'Drinks', f'sizes unclear: {it["displayName"]}'
            rows.append((s, it, fs, sizes))
    out, dropped, kept = [], [], {}
    for s, it, fs, sizes in rows:
        n, sec, grp = it['displayName'], s['displayName'], it['restaurantGroup']
        if grp and grp != 'Scotland':
            # Northern Ireland, trial and delivery-only listings: the GB menu's own line is kept
            dropped.append(f'{n} ({grp} listing)'); continue
        if not fs:
            dropped.append(f"{n} (Nando's gives no nutrition)"); continue
        if sec in DROP_SECTIONS or n in DROP:
            dropped.append(f'{n} ({DROP_SECTIONS.get(sec) or DROP[n]})'); continue
        if it['subsection'] == 'Wine':
            # several glass sizes, but the figures aren't tied to a size in the data (their order varies)
            dropped.append(f'{n} (wine: figures not tied to a glass size)'); continue
        if sec == 'Extras' and not SAUCE.search(n):
            dropped.append(f'{n} (add-on)'); continue
        if len(fs) > 1 and not sizes:
            dropped.append(f'{n} (sizes unclear)'); continue
        labels = sizes if len(fs) > 1 else ['']
        for label, f in zip(labels, fs):
            r = {'k': f['energyKcal'], 'p': grams(f['proteinMg']), 'c': grams(f['totalCarbsMg']), 'f': grams(f['fatMg'])}
            if n not in KJ_TYPO:
                assert abs(f['energyKj'] - 4.184 * r['k']) <= max(8, 0.03 * f['energyKj']), f'kJ/kcal disagree: {n}'
            if r['k'] == 0 and not any(r.values()):
                dropped.append(f'{n} (nothing to log)'); continue
            alcohol = (f['alcoholByVolumePercent'] or 0) > 0.5
            sane(n, r, alcohol)
            if n in MULTIPLE:
                base, x = MULTIPLE[n]
                one = next(o for o in out if o['_raw'] == (base, ''))
                assert abs(r['k'] - one['k'] * x) <= max(3, 0.03 * r['k']), f'{n} is not a multiple of {base}'
                dropped.append(f'{n} (multiple of {base})'); continue
            base = tidy(n) + (' (kids)' if it['subsection'] in KIDS else '')
            name = LEGACY.get((n, label)) or "Nando's " + base + (f' ({label.lower()})' if label else '')
            # the same food listed twice (kids' desserts and drinks, Fino Pitta with thighs)
            twin = kept.get((re.sub(r' \(kids\)$', '', name), tuple(r.values())))
            if twin:
                dropped.append(f'{n} (same as {twin})'); continue
            assert name not in {x['n'] for x in out}, f'duplicate name: {name}'
            kept[(name, tuple(r.values()))] = name
            cat = 'drinks' if sec == 'Drinks' or re.search(r'Cawston|Cordial', n) else 'sauces' if sec == 'Extras' else 'fastfood'
            food = {'n': name, **r, 'g': 1, 'each': True, 'cat': cat, 'src': 'nandos-uk', 'ref': {'g': 1, **r}, '_raw': (n, label)}
            # per item, exactly as published: one serving (1 item) is Nando's own line
            assert round(food['k'] * food['g']) == round(f['energyKcal']), f'serving kcal mismatch: {n}'
            out.append(food)
    # the half chicken is two quarters: kept only because it's a long-standing Tali food
    half = next(x for x in out if x['_raw'] == ('1/2 Chicken', ''))
    quarter = next(x for x in out if x['_raw'] == ('1/4 Chicken', ''))
    assert half['k'] == 2 * quarter['k'], 'half chicken is not two quarters'
    for x in out: del x['_raw']
    missing = set(LEGACY.values()) - {x['n'] for x in out}
    assert not missing, f'legacy foods not found in the menu: {missing}'
    out.sort(key=lambda f: 0 if f['n'] in LEGACY.values() else 1)
    body = json.dumps(out, indent=2, ensure_ascii=False)
    ts = ("import type { Food } from '@/core/types'\n\n"
          "/** Nando's UK menu, per item as Nando's publishes it (no portion weights given).\n"
          f" *  GENERATED by scripts/import/nandos_web.py from {SNAP}: don't edit by hand. */\n"
          f"export const NANDOS: Food[] = {body}\n")
    open(OUT, 'w').write(ts)
    print(f'{len(rows)} menu listings, {len(out)} foods written, {len(dropped)} dropped:')
    for d in dropped: print('  -', d)


if __name__ == '__main__':
    if '--fetch' in sys.argv: fetch()
    main()
