"""Import Chopstix (UK Chinese noodle bar chain) menu nutrition into src/core/data/chains/chopstix.ts.

Usage:  curl -sSL -A 'Mozilla/5.0' -o scripts/import/data/chopstix-2026-09.pdf \\
          https://chopstixnoodles.co.uk/wp-content/uploads/2026/09/NUTRITIONAL-TABLE-V22-SEPT-26.pdf
        python3 scripts/import/chopstix.py scripts/import/data/chopstix-2026-09.pdf
Needs:  pip install pdfplumber   (dev tool only; the app never runs this)

Source: "Nutritional data V22 September 2026", linked from every menu page on chopstixnoodles.co.uk
("Nutritional table (V22 Sept 26)"). The PDF is Chopstix's copyright: it is .gitignored, never
committed. sha256 of the file this was run on:
  4dd4ebcb23915ab0abfc96d8400fcceb64bfb79476540a8d9e41c4b146b376c4

Layout: one row per item and size, "<name> - <size>" then kJ, kcal, fat, saturates, carbohydrate,
sugars, fibre, protein, salt, all per serving. Rotated section labels run down the left margin, so
words left of x = 45 are cropped off. We keep the food (pages 1-2, up to the first soft drink): the
drinks are branded soft drinks the app already has. Chopstix gives no portion weights, so every
food is per item (`each`), exactly as published. A box is a base plus toppings: the "Regular /
Large" topping row is one topping in a regular or large box, as the guide prints it.
Deterministic: no AI, no guessing. Review the diff on each re-run.
"""
import json, re, sys
import pdfplumber

OUT = 'src/core/data/chains/chopstix.ts'
SHA256 = '4dd4ebcb23915ab0abfc96d8400fcceb64bfb79476540a8d9e41c4b146b376c4'
ROW = re.compile(r'^(.+?)\s+(\d+(?:\.\d+)?)\s+(\d+)\s+((?:\d+(?:\.\d+)?\s+){6}\d+(?:\.\d+)?)$')
# published rows that contradict themselves: left out rather than shown wrong (keyed by the PDF's name)
DROP = {
    # 1,243 kJ = 297 kcal, not the 219 shown, and the macros give about 270
    'Panko Chicken Katsu Curry - Small (2 Pieces)': 'kJ, kcal and macros disagree',
    'Panko Chicken Katsu Curry - Regular / Large (2 Pieces)': 'kJ, kcal and macros disagree',
    # saturates (2.8 g) above total fat (0.8 g), and the macros give 33 of the 80 kcal: columns misprinted
    'Katsu Curry Sauce Portion - Small': 'columns misprinted (saturates above fat)',
    'Katsu Curry Sauce Portion - Large': 'columns misprinted (saturates above fat)',
    # 215 kcal shown, but the macros give 170 (and 895 kJ = 214): the kcal isn't explained
    'Pumpkin Katsu Curry': 'kcal well above what the macros explain',
}
# kJ doesn't match kcal, but the kcal shown agrees with the macros: kept (listed so any new
# disagreement still stops the import). Firecracker dip: 199 kJ = 48 kcal, shown 51, macros 47.
KJ_TYPO = {'Firecracker Sauce Dip Pot'}
# the size words as the guide prints them -> how the name says it
SIZE = {
    'TASTER BASE': 'taster', 'TASTER TOPPING': 'taster', 'Small': 'small', 'Regular': 'regular',
    'Large': 'large', 'Regular / Large': 'regular or large box, each topping', 'Topper Pot': 'topper pot',
    'SMALL SIDE': 'small side', 'LARGE SIDE': 'large side',
}
SAUCE = re.compile(r'Dip Pot|Sauce Portion|^(Savoury|Sweet|Spicy) One$', re.I)


def tidy(name):
    name = re.sub(r'\s+NEW$', '', name).strip()
    name = name.replace('PIeces', 'Pieces')
    deal = name.startswith('FLAVOUR SAVOUR ')
    if deal: name = name[len('FLAVOUR SAVOUR '):]
    name = re.sub(r' (\+ DIP|& Dip)$', ' with dip', name)
    # the three box sauces are named only "Savoury One" and so on: say they're sauces
    if name in ('Savoury One', 'Sweet One', 'Spicy One'): name += ' sauce'
    m = re.match(r'^(.+?) - (.+?)(?: \((\d+) Pieces\))?$', name)
    if m and m[2] in SIZE:
        base, size, pcs = m[1], SIZE[m[2]], m[3]
        # a topping's "small" is the topping in a small box
        if size == 'small' and TOPPING.get(base): size = 'small box'
        name = f'{base} ({size}{f", {pcs} pieces" if pcs else ""})'
    elif m:
        name = f'{m[1]} ({m[2].lower()})'
    if deal: name += ', Flavour Saver deal'
    return 'Chopstix ' + name


TOPPING = {}


def rows(path):
    out = []
    with pdfplumber.open(path) as pdf:
        for page in pdf.pages[:2]:
            text = page.crop((45, 0, page.width, page.height)).extract_text() or ''
            for line in text.splitlines():
                line = line.strip()
                if re.match(r'^(Pepsi|Diet Pepsi|7Up|Tango|Red Bull|Cherry|Lime|Strawberry|Vanilla)\b', line):
                    return out
                m = ROW.match(line)
                if not m: continue
                nums = [float(x) for x in [m[2], m[3], *m[4].split()]]
                out.append({'raw': m[1].strip(), 'kj': nums[0], 'k': nums[1], 'f': nums[2], 'sat': nums[3],
                            'c': nums[4], 'sug': nums[5], 'fib': nums[6], 'p': nums[7], 'salt': nums[8]})
    return out


def sane(r):
    if re.sub(r'\s+NEW$', '', r['raw']) not in KJ_TYPO:
        assert abs(r['kj'] - 4.184 * r['k']) <= max(8, 0.03 * r['kj']), f"kJ/kcal disagree: {r['raw']}"
    assert r['sat'] <= r['f'] + 1e-9 and r['sug'] <= r['c'] + 1e-9, f"part above its whole: {r['raw']}"
    macro = 4 * r['p'] + 4 * r['c'] + 9 * r['f']
    assert abs(macro - r['k']) <= max(15, 0.15 * r['k']), f"kcal far from macros: {r['raw']} {r['k']} vs {macro:.0f}"


def main(path):
    import hashlib
    digest = hashlib.sha256(open(path, 'rb').read()).hexdigest()
    assert digest == SHA256, f'not the guide this importer was checked against (sha256 {digest}): review, then update SHA256'
    rs = rows(path)
    for r in rs:
        m = re.match(r'^(?:FLAVOUR SAVOUR )?(.+?) - Regular / Large', r['raw'])
        if m: TOPPING[m[1]] = True
    out, skipped, seen = [], [], set()
    for r in rs:
        raw = re.sub(r'\s+NEW$', '', r['raw'])
        if raw in DROP:
            skipped.append(f"{raw} ({DROP[raw]})"); continue
        sane(r)
        n = tidy(r['raw'])
        assert n.lower() not in seen, f'duplicate name: {n}'
        seen.add(n.lower())
        cat = 'sauces' if SAUCE.search(raw) else 'snacks' if re.search(r'Prawn Cracker|Fortune Cookie|Baonut', raw) else 'fastfood'
        ref = {'g': 1, 'k': r['k'], 'p': r['p'], 'c': r['c'], 'f': r['f']}
        f = {'n': n, 'k': r['k'], 'p': r['p'], 'c': r['c'], 'f': r['f'], 'g': 1, 'each': True,
             'cat': cat, 'eat': True, 'src': 'chopstix-uk', 'ref': ref}
        out.append(f)
    assert len(out) >= 80, f'only {len(out)} rows parsed: has the layout changed?'
    body = ',\n'.join('  ' + json.dumps(f, ensure_ascii=False) for f in out)
    ts = ("import type { Food } from '@/core/types'\n\n"
          "/** Chopstix UK menu (food, not soft drinks), per item as Chopstix publishes it (no portion weights given).\n"
          " *  GENERATED by scripts/import/chopstix.py from the V22 September 2026 nutrition table: don't edit by hand. */\n"
          f"export const CHOPSTIX: Food[] = [\n{body},\n]\n")
    open(OUT, 'w', encoding='utf-8').write(ts)
    print(f'{len(rs)} rows parsed, {len(out)} foods written, {len(skipped)} skipped:')
    for d in skipped: print('  -', d)


if __name__ == '__main__':
    if sys.argv[1:2] == ['--rows']:
        for r in rows(sys.argv[2]): print(r)
    else:
        main(sys.argv[1])
