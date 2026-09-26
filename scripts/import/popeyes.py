"""Import Popeyes UK's nutrition page (saved as PDF) into src/core/data/chains/popeyes.ts.

Usage:  python3 scripts/import/popeyes.py "path/to/Nutrition - Popeyes.pdf"
Needs:  pip install pdfplumber   (dev tool only; the app never runs this)

The page is a print of popeyesuk.com/nutrition: one table per category, per serving, with
columns kcal, kJ, protein, carbs, sugar, fat, saturates. Names wrap over several lines around
the numbers, so rows are read from the table's own cell boxes (the first number column's
rectangles): a row is every word inside one cell's height. A cell cut by a page break carries
on at the top of the next page. Popeyes gives no portion weights, so every food is per item
(`each`), exactly as published. Deterministic: no AI, no guessing. Review the diff on each re-run.
"""
import json, re, sys
import pdfplumber

COLS = ['k', 'kj', 'p', 'c', 'su', 'f', 'sat']
NUMW = re.compile(r'^\d{1,3}(?:,\d{3})*(?:\.\d+)?$')
X_NUM = 160  # names sit left of the first number column (x 162)
# counts of one item: kept at the smallest count Popeyes lists, bigger counts dropped as multiples
COUNT = re.compile(r'^(\d+) (?:Piece )?(.+?)$')
# the PDF's own wording where it isn't a clean item name (names are stable IDs: settle them before shipping)
RENAME = {
    '4 Boneless Plain / Kids Nuggets': '4 Boneless Plain', '2 Classic Tenders / Kids Tenders': '2 Classic Tenders', 'Kids Sandwich ketchup': 'Kids Sandwich Ketchup',
    'Chicken Sandwich Classic!': 'Chicken Sandwich Classic',
    'Cajun Fries (Reg)': 'Cajun Fries (regular)', 'Cajun Fries (Large)': 'Cajun Fries (large)',
    'Fries (Reg)': 'Fries (regular)', 'Fries (Large)': 'Fries (large)', 'Fries (Small)': 'Fries (small)',
    'Kids Shake - Chocolate': 'Kids Chocolate Shake', 'Kids Shake - Strawberry': 'Kids Strawberry Shake',
    'Kids Shake - Vanilla': 'Kids Vanilla Shake',
}
# the same product listed twice under two names (identical figures)
SAME = {'Superstack Hot Honey Sandwich': 'Hot Honey Superstack Sandwich'}
# Popeyes' shake kcal run ~20% above what their own protein/carbs/fat explain (every shake, both
# sizes, so it's how they're calculated, not a misread). The published kcal is what customers see
# and what we keep; listed so any new gap still stops the import.
MACRO_GAP = re.compile(r'Shake')
# kJ doesn't match kcal (2364 kJ = 565 kcal, published 545): kcal kept as published
KJ_TYPO = {'Red Bean Creole Vegan Sandwich'}
DRINK_CATS = {'Drinks'}
SAUCE_CATS = {'Dips'}


def num(v):
    return float(v.replace(',', ''))


def parse(path):
    rows, cat = [], None
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages:
            # table text only: the site's nav bar and the print header/footer use other sizes
            ws = [w for w in page.extract_words(extra_attrs=['size']) if not 7.9 < w['size'] < 8.3]
            bands = sorted({(r['top'], r['bottom']) for r in page.rects
                            if 161 <= r['x0'] <= 164 and 221 <= r['x1'] <= 224 and r['bottom'] - r['top'] > 5})
            for i, (top, bot) in enumerate(bands):
                inside = [w for w in ws if top <= (w['top'] + w['bottom']) / 2 < bot]
                if not inside: continue
                names = sorted((w for w in inside if w['x0'] < X_NUM), key=lambda w: (round(w['top']), w['x0']))
                name = ' '.join(w['text'] for w in names)
                if any(w['text'] == 'Energy' for w in inside):  # a category header row
                    cat = ' '.join(w['text'] for w in names if w['text'] not in ('Saturated', 'Acids')); continue
                nums = sorted((w for w in inside if w['x0'] >= X_NUM), key=lambda w: w['x0'])
                if not nums:
                    # a cell cut by the page break: the rest of the previous row's name
                    assert not any(b[0] < top for b in bands if any(b[0] <= (w['top'] + w['bottom']) / 2 < b[1] for w in ws)) and rows, f'empty cell mid-page {page.page_number}: {name!r}'
                    rows[-1]['name'] += ' ' + name; continue
                assert len(nums) == 7 and all(NUMW.match(w['text']) for w in nums), f'bad row {page.page_number}: {name} {[w["text"] for w in nums]}'
                rows.append({'name': name, 'cat': cat, **dict(zip(COLS, (num(w['text']) for w in nums)))})
    for r in rows:
        n = re.sub(r'\s*\*\s*selected restaurants only', '', re.sub(r'\s+', ' ', r['name'])).strip()
        r['name'] = RENAME.get(n, n)
    return rows


def sane(r):
    n = r['name']
    assert r['sat'] <= r['f'] + 0.05 and r['su'] <= r['c'] + 0.2, f'sat/sugar above fat/carbs: {n}'
    if n not in KJ_TYPO:
        assert abs(r['kj'] - 4.184 * r['k']) <= max(8, 0.03 * r['kj']), f'kJ/kcal disagree: {n}'
    if MACRO_GAP.search(n): return
    macro = 4 * r['p'] + 4 * r['c'] + 9 * r['f']
    assert abs(macro - r['k']) <= max(15, 0.15 * r['k']), f'kcal far from macros: {n} {r["k"]} vs {macro:.0f}'


def main(path):
    rows = parse(path)
    by = {r['name']: r for r in rows}
    # counted items ('6 Hot Wings'): keep the smallest count Popeyes lists for each
    counted = {}
    for r in rows:
        m = COUNT.match(r['name'])
        if m: counted.setdefault(m[2].rstrip('s'), []).append((int(m[1]), r))
    smallest = {b: min(v, key=lambda x: x[0]) for b, v in counted.items()}
    out, dropped, seen = [], [], set()
    for r in rows:
        sane(r)
        n = r['name']
        if 'Ireland Only' in n:
            dropped.append(f'{n} (Republic of Ireland only)'); continue
        if n in SAME:
            t = by[SAME[n]]
            assert all(t[c] == r[c] for c in COLS), f'{n} is not the same as {SAME[n]}'
            dropped.append(f'{n} (same as {SAME[n]})'); continue
        m = COUNT.match(n)
        if m:
            base, cnt = m[2].rstrip('s'), int(m[1])
            low, one = smallest[base]
            if cnt != low:
                # really a multiple of the kept count, not a different recipe
                assert abs(r['k'] - one['k'] * cnt / low) <= max(3, 0.03 * r['k']), f'{n} is not a multiple of {one["name"]}'
                dropped.append(f'{n} (multiple of {one["name"]})'); continue
            name = f'{base} piece' if cnt == 1 and 'Piece' in n else base if cnt == 1 else f'{m[2]} ({cnt} pieces)'
        else:
            name = n
        # sizes: 'Large Oreo Shake' -> 'Oreo Shake (large)'
        s = re.match(r'^(Large|Small) (.+)$', name)
        if s: name = f'{s[2]} ({s[1].lower()})'
        if r['cat'] in SAUCE_CATS and 'Dip' not in name: name += ' Dip'
        name = 'Popeyes ' + name
        assert name not in seen, f'duplicate name: {name}'
        seen.add(name)
        cat = 'drinks' if r['cat'] in DRINK_CATS else 'sauces' if r['cat'] in SAUCE_CATS else 'fastfood'
        ref = {'k': r['k'], 'p': r['p'], 'c': r['c'], 'f': r['f']}
        # per item, exactly as published: one serving (1 item) is Popeyes' own line
        f = {'n': name, **ref, 'g': 1, 'each': True, 'cat': cat, 'src': 'popeyes-uk', 'ref': {'g': 1, **ref}}
        assert round(f['k'] * f['g']) == round(r['k']), f'serving kcal mismatch: {n}'
        out.append(f)
    body = json.dumps(out, indent=2, ensure_ascii=False)
    ts = ("import type { Food } from '@/core/types'\n\n"
          "/** Popeyes UK menu, per item as Popeyes publishes it (no portion weights given).\n"
          " *  GENERATED by scripts/import/popeyes.py from popeyesuk.com/nutrition: don't edit by hand. */\n"
          f"export const POPEYES: Food[] = {body}\n")
    open('src/core/data/chains/popeyes.ts', 'w').write(ts)
    print(f'{len(rows)} rows parsed, {len(out)} foods written, {len(dropped)} dropped:')
    for d in dropped: print('  -', d)


if __name__ == '__main__':
    if sys.argv[1:2] == ['--rows']:
        for r in parse(sys.argv[2]): print(r['cat'], '|', r['name'], [r[c] for c in COLS])
    else:
        main(sys.argv[1])
