"""Import everyday UK home-cooking ingredients from CoFID 2021 into src/core/data/ingredients.ts.

Usage:  python3 scripts/import/cofid-ingredients.py path/to/cofid.json
Input:  CoFID 2021 proximates as JSON rows {code, name, k, p, c, f, ...}, all per 100 g
        (exported from the "1.3 Proximates" sheet of the CoFID workbook).
Writes: src/core/data/ingredients.ts          (INGREDIENTS: Food[])
        docs/data/food-audit-2026-09-ingredients.json  (the audit records check-foods locks to)

Deterministic: every food below is a hand-picked CoFID code with a Tali name that states its
form, a category, a default serving and the cooking-fat flag. Values are copied exactly as
CoFID gives them (kcal whole, macros to 0.1 g, Tr/N as 0). A code whose energy CoFID leaves
blank (N) is refused, never estimated. Names must not clash with src/core/data/foods.ts, and a
code the base database already cites is refused so the same food isn't listed twice.
Re-run after a CoFID update and review the diff; the output must pass `npm run check:foods`.
"""
import json, math, re, sys

# (code, Tali name, cat, default serving g, cook)
# cook = plain food usually cooked in fat (gets the one cooking-fat question when logged)
FOODS = [
    # ---- Beef, raw
    ('18-508', 'Beef mince, extra lean (about 5% fat), raw', 'meat', 125, True),
    ('18-469', 'Beef mince, standard (about 15% fat), raw', 'meat', 125, True),
    ('18-077', 'Beef, diced (stewing steak), raw', 'meat', 150, True),
    ('18-007', 'Beef braising steak, raw', 'meat', 150, True),
    ('18-065', 'Beef sirloin steak, raw', 'meat', 200, True),
    ('18-471', 'Beef rump steak, raw', 'meat', 200, True),
    ('18-017', 'Beef fillet steak, raw', 'meat', 170, True),
    ('18-085', 'Beef topside joint, raw', 'meat', 150, False),
    ('18-013', 'Beef brisket, raw', 'meat', 150, False),
    ('18-415', 'Liver, ox, raw', 'meat', 100, True),
    # ---- Chicken (CoFID has no raw breast/thigh/drumstick rows: light meat = breast, dark
    #      meat = thigh and drumstick, leg quarter = thigh and drumstick with skin)
    ('18-290', 'Chicken breast, raw, skinless', 'meat', 150, True),
    ('18-289', 'Chicken thigh or drumstick, raw, skinless', 'meat', 150, True),
    ('18-293', 'Chicken thigh or drumstick, raw, with skin', 'meat', 150, True),
    ('18-294', 'Chicken thigh or drumstick, raw, with skin, weighed with bone', 'meat', 200, True),
    ('18-335', 'Chicken drumstick, roasted, with skin', 'meat', 100, False),
    ('18-336', 'Chicken drumstick, roasted, with skin, weighed with bone', 'meat', 150, False),
    ('18-319', 'Chicken thigh, casseroled, skinless', 'meat', 150, False),
    ('18-297', 'Chicken, whole, raw, with skin', 'meat', 150, False),
    ('18-298', 'Chicken, whole, raw, with skin, weighed with bone', 'meat', 250, False),
    ('18-411', 'Chicken liver, raw', 'meat', 100, True),
    # ---- Turkey and duck, raw
    ('18-349', 'Turkey breast, raw, skinless', 'meat', 150, True),
    ('18-348', 'Turkey thigh or drumstick, raw, skinless', 'meat', 150, True),
    ('18-352', 'Turkey, whole, raw, with skin', 'meat', 150, False),
    ('18-489', 'Duck, raw, skinless', 'meat', 150, True),
    ('18-371', 'Duck, raw, with skin and fat', 'meat', 150, False),
    # ---- Pork, raw
    ('18-529', 'Pork, diced, raw, lean', 'meat', 150, True),
    ('18-606', 'Pork mince (10% fat), raw', 'meat', 125, True),
    ('18-522', 'Pork loin steak, raw', 'meat', 150, True),
    ('18-536', 'Pork loin chop, raw', 'meat', 150, True),
    ('18-537', 'Pork loin chop, raw, weighed with bone', 'meat', 180, True),
    ('18-510', 'Pork tenderloin (fillet), raw', 'meat', 150, True),
    ('18-554', 'Pork shoulder steak, raw', 'meat', 150, True),
    ('18-557', 'Pork belly slices, raw', 'meat', 150, False),
    ('18-514', 'Pork leg joint, raw', 'meat', 150, False),
    ('18-609', 'Pork spare ribs, raw', 'meat', 150, False),
    ('19-497', 'Bacon, back rashers, raw', 'meat', 50, False),
    ('19-646', 'Bacon, back rashers, fat trimmed, raw', 'meat', 50, False),
    ('19-016', 'Bacon, streaky rashers, raw', 'meat', 40, False),
    ('19-510', 'Pork sausage, raw', 'meat', 57, True),
    ('19-658', 'Pork sausage, reduced fat, raw', 'meat', 57, True),
    ('19-656', 'Beef sausage, raw', 'meat', 57, True),
    # ---- Lamb, raw
    ('18-481', 'Lamb mince, raw', 'meat', 125, True),
    ('18-182', 'Lamb, diced (stewing), raw', 'meat', 150, True),
    ('18-170', 'Lamb shoulder, raw', 'meat', 150, False),
    ('18-476', 'Lamb loin chop, raw', 'meat', 120, True),
    ('18-497', 'Lamb loin chop, raw, weighed with bone', 'meat', 150, True),
    ('18-166', 'Lamb, rack of, raw', 'meat', 150, False),
    ('18-161', 'Lamb neck fillet, raw', 'meat', 150, True),
    ('18-413', 'Liver, lamb, raw', 'meat', 100, True),
    # ---- Fish and seafood, raw
    ('16-356', 'Salmon fillet, raw (farmed)', 'fish', 130, True),
    ('16-360', 'Salmon fillet, raw (wild)', 'fish', 130, True),
    ('16-372', 'Cod fillet, raw', 'fish', 140, True),
    ('16-375', 'Haddock fillet, raw', 'fish', 140, True),
    ('16-492', 'Smoked haddock fillet, raw', 'fish', 140, False),
    ('16-378', 'Pollock fillet, raw', 'fish', 140, True),
    ('16-070', 'Hake fillet, raw', 'fish', 140, True),
    ('16-383', 'Coley fillet, raw', 'fish', 140, True),
    ('16-381', 'Plaice fillet, raw', 'fish', 140, True),
    ('16-154', 'Tilapia, raw', 'fish', 140, True),
    ('16-395', 'Rainbow trout fillet, raw', 'fish', 130, True),
    ('16-393', 'Mackerel fillet, raw', 'fish', 120, True),
    ('16-399', 'Tuna steak, raw', 'fish', 140, True),
    ('16-387', 'King prawns, raw', 'fish', 100, True),
    ('16-389', 'King prawns, cooked', 'fish', 100, False),
    ('16-263', 'Squid, raw', 'fish', 100, True),
    ('16-497', 'Mussels, raw', 'fish', 100, False),
    ('16-420', 'Pink salmon, canned in brine, drained', 'fish', 100, False),
    ('16-417', 'Tuna, canned in sunflower oil, drained', 'fish', 100, False),
    ('16-448', 'Anchovies, canned in oil, drained', 'fish', 10, False),
    # ---- Eggs
    ('12-939', 'Egg yolk, raw', 'eggs', 17, False),
    # ---- Rice, dry and cooked
    ('11-861', 'White rice, long grain, uncooked', 'grains', 75, False),
    ('11-863', 'White rice, easy cook, uncooked', 'grains', 75, False),
    ('11-857', 'Basmati rice, white, uncooked', 'grains', 75, False),
    ('11-866', 'Basmati rice, brown, uncooked', 'grains', 75, False),
    ('11-867', 'Basmati rice, brown, boiled', 'grains', 180, False),
    ('11-868', 'Brown rice, wholegrain, uncooked', 'grains', 75, False),
    ('11-874', 'Thai jasmine (fragrant) rice, uncooked', 'grains', 75, False),
    ('11-875', 'Thai jasmine (fragrant) rice, boiled', 'grains', 180, False),
    ('11-878', 'Risotto rice (arborio), uncooked', 'grains', 75, False),
    ('11-872', 'Wild rice, uncooked', 'grains', 75, False),
    # ---- Pasta, noodles and grains, dry
    ('11-716', 'Pasta, dried, uncooked', 'grains', 75, False),
    ('11-722', 'Spaghetti, dried, boiled', 'grains', 180, False),
    ('11-718', 'Wholewheat pasta, dried, uncooked', 'grains', 75, False),
    ('11-715', 'Egg pasta, dried, uncooked', 'grains', 75, False),
    ('11-726', 'Fresh egg pasta, uncooked', 'grains', 125, False),
    ('11-450', 'Fresh pasta, boiled', 'grains', 180, False),
    ('11-719', 'Egg noodles, dried, uncooked', 'grains', 60, False),
    ('11-724', 'Egg noodles, medium, boiled', 'grains', 180, False),
    ('11-901', 'Couscous, dry', 'grains', 60, False),
    ('14-843', 'Quinoa, uncooked', 'grains', 60, False),
    ('11-904', 'Bulgur wheat, uncooked', 'grains', 60, False),
    ('11-002', 'Pearl barley, uncooked', 'grains', 60, False),
    ('11-003', 'Pearl barley, boiled', 'grains', 150, False),
    ('11-903', 'Semolina, uncooked', 'grains', 30, False),
    ('11-006', 'Buckwheat groats, uncooked', 'grains', 60, False),
    # ---- Flour and baking
    ('11-886', 'Plain flour, white', 'grains', 30, False),
    ('11-888', 'Self-raising flour, white', 'grains', 30, False),
    ('11-887', 'Strong white bread flour', 'grains', 30, False),
    ('11-889', 'Wholemeal flour', 'grains', 30, False),
    ('11-1045', 'Cornflour', 'grains', 10, False),
    ('11-896', 'Gram (chickpea) flour', 'grains', 30, False),
    ('11-021', 'Rice flour', 'grains', 30, False),
    ('17-355', 'Baking powder', 'sauces', 4, False),
    ('17-379', 'Yeast, dried', 'sauces', 7, False),
    ('12-545', 'Cocoa powder', 'sauces', 10, False),
    ('17-491', 'Plain chocolate (for cooking)', 'snacks', 25, False),
    ('14-873', 'Desiccated coconut', 'fats', 10, False),
    ('17-060', 'Sugar, brown (soft)', 'sauces', 4, False),
    ('17-061', 'Sugar, demerara', 'sauces', 4, False),
    ('17-062', 'Icing sugar', 'sauces', 10, False),
    ('17-065', 'Golden syrup', 'sauces', 20, False),
    # ---- Pulses, dried
    ('13-657', 'Red lentils, dried, uncooked', 'eggs', 60, False),
    ('13-658', 'Red lentils, boiled', 'eggs', 150, False),
    ('13-089', 'Green or brown lentils, dried, uncooked', 'eggs', 60, False),
    ('13-141', 'Split peas, dried, uncooked', 'eggs', 60, False),
    ('13-142', 'Split peas, boiled', 'eggs', 150, False),
    ('13-074', 'Chickpeas, dried, uncooked', 'eggs', 60, False),
    ('13-109', 'Red kidney beans, dried, uncooked', 'eggs', 60, False),
    ('13-070', 'Butter beans, dried, uncooked', 'eggs', 60, False),
    ('13-663', 'Butter beans, boiled', 'eggs', 120, False),
    ('13-086', 'Haricot beans, dried, uncooked', 'eggs', 60, False),
    ('13-062', 'Black-eyed beans, dried, uncooked', 'eggs', 60, False),
    ('13-063', 'Black-eyed beans, boiled', 'eggs', 120, False),
    ('13-106', 'Pinto beans, dried, uncooked', 'eggs', 60, False),
    ('13-098', 'Mung dal, dried, uncooked', 'eggs', 60, False),
    # ---- Pulses, canned (drained)
    ('13-670', 'Chickpeas, canned, drained', 'eggs', 120, False),
    ('13-660', 'Red kidney beans, canned, drained', 'eggs', 120, False),
    ('13-559', 'Butter beans, canned, drained', 'eggs', 120, False),
    ('13-666', 'Cannellini beans, canned, drained', 'eggs', 120, False),
    ('13-665', 'Haricot beans, canned, drained', 'eggs', 120, False),
    ('13-535', 'Baked beans, reduced sugar and salt', 'eggs', 200, False),
    ('13-108', 'Refried beans', 'eggs', 100, False),
    # ---- Peas
    ('13-527', 'Peas, frozen, uncooked', 'veg', 80, False),
    ('13-536', 'Peas, frozen, boiled', 'veg', 80, False),
    ('13-438', 'Garden peas, fresh, raw', 'veg', 80, False),
    ('13-439', 'Garden peas, fresh, boiled', 'veg', 80, False),
    ('13-564', 'Garden peas, canned, drained', 'veg', 80, False),
    ('13-562', 'Marrowfat peas, canned, drained', 'veg', 80, False),
    ('13-563', 'Mushy peas, canned', 'veg', 80, False),
    ('13-122', 'Mange-tout, raw', 'veg', 80, True),
    ('13-143', 'Sugar snap peas, raw', 'veg', 80, True),
    # ---- Potatoes, raw
    ('13-489', 'Potatoes, raw (old, peeled)', 'potato', 200, False),
    ('13-618', 'New potatoes, raw', 'potato', 200, False),
    ('13-463', 'Sweet potato, raw, peeled', 'potato', 200, False),
    # ---- Vegetables, raw
    ('13-342', 'Shallots, raw', 'veg', 30, True),
    ('13-351', 'Spring onions, bulbs only, raw', 'veg', 15, False),
    ('13-890', 'Ginger, fresh', 'veg', 5, False),
    ('13-317', 'Red chilli, fresh', 'veg', 10, False),
    ('13-316', 'Green chilli, fresh', 'veg', 10, False),
    ('13-318', 'Green pepper, raw', 'veg', 80, True),
    ('13-526', 'Yellow pepper, raw', 'veg', 80, True),
    ('13-448', 'Carrots, young, raw', 'veg', 80, False),
    ('13-509', 'White cabbage, raw', 'veg', 80, False),
    ('13-190', 'Red cabbage, raw', 'veg', 80, False),
    ('13-510', 'Green cabbage, raw', 'veg', 80, False),
    ('13-187', 'Chinese leaf (Chinese cabbage), raw', 'veg', 80, False),
    ('13-348', 'Spring greens, raw', 'veg', 80, False),
    ('13-521', 'Baby spinach, raw', 'veg', 30, False),
    ('13-458', 'Spinach, frozen, boiled', 'veg', 80, False),
    ('13-223', 'Swiss chard, raw', 'veg', 80, False),
    ('13-174', 'Purple sprouting broccoli, raw', 'veg', 80, False),
    ('13-064', 'Broad beans, raw', 'veg', 80, False),
    ('13-112', 'Runner beans, raw', 'veg', 80, False),
    ('13-426', 'Beansprouts, raw', 'veg', 80, True),
    ('13-622', 'Sweetcorn kernels, raw', 'veg', 80, False),
    ('13-623', 'Corn on the cob, raw, weighed with core', 'veg', 150, False),
    ('13-300', 'Okra, raw', 'veg', 80, True),
    ('13-241', 'Fennel, raw', 'veg', 80, False),
    ('13-219', 'Celeriac, raw', 'veg', 80, False),
    ('13-359', 'Swede, raw', 'veg', 80, False),
    ('13-389', 'Turnip, raw', 'veg', 80, False),
    ('13-164', 'Beetroot, raw', 'veg', 80, False),
    ('13-326', 'Pumpkin, raw', 'veg', 100, False),
    ('13-274', 'Marrow, raw', 'veg', 100, False),
    ('13-656', 'Radishes, raw', 'veg', 30, False),
    ('13-669', 'Watercress, raw', 'veg', 20, False),
    ('13-293', 'Oyster mushrooms, raw', 'veg', 80, True),
    ('13-294', 'Shiitake mushrooms, dried', 'veg', 10, False),
    ('13-153', 'Globe artichoke, raw', 'veg', 80, False),
    ('13-394', 'Water chestnuts, raw', 'veg', 30, False),
    ('13-245', 'Gherkins', 'veg', 20, False),
    ('13-543', 'Mixed vegetables, frozen, boiled', 'veg', 80, False),
    ('14-386', 'Avocado, flesh only', 'fruit', 75, False),
    ('14-277', 'Lemon juice, fresh', 'fruit', 15, False),
    ('14-279', 'Lime juice, fresh', 'fruit', 15, False),
    ('13-531', 'Tomato purée', 'veg', 15, False),
    # ---- Herbs, dried (CoFID leaves energy blank for most ground spices; see the summary)
    ('13-884', 'Mixed herbs, dried', 'sauces', 1, False),
    ('13-805', 'Basil, dried', 'sauces', 1, False),
    ('13-806', 'Bay leaves, dried', 'sauces', 1, False),
    ('13-818', 'Coriander leaves, dried', 'sauces', 1, False),
    ('13-825', 'Dill, dried', 'sauces', 1, False),
    ('13-835', 'Marjoram, dried', 'sauces', 1, False),
    ('13-837', 'Mint, dried', 'sauces', 1, False),
    ('13-845', 'Parsley, dried', 'sauces', 1, False),
    ('13-882', 'Rosemary, dried', 'sauces', 1, False),
    ('13-854', 'Sage, dried', 'sauces', 1, False),
    ('13-858', 'Tarragon, dried', 'sauces', 1, False),
    ('13-883', 'Thyme, dried', 'sauces', 1, False),
    # ---- Spices, ground
    ('13-876', 'Curry powder', 'sauces', 2, False),
    ('13-829', 'Garam masala', 'sauces', 2, False),
    ('13-847', 'Cayenne pepper, ground', 'sauces', 2, False),
    ('13-832', 'Ginger, ground', 'sauces', 2, False),
    ('13-830', 'Garlic powder', 'sauces', 3, False),
    ('13-590', 'Onions, dried', 'sauces', 5, False),
    ('13-852', 'Saffron', 'sauces', 1, False),
    # ---- Herbs, fresh
    ('13-804', 'Basil, fresh', 'veg', 5, False),
    ('13-888', 'Coriander, fresh', 'veg', 5, False),
    ('13-844', 'Parsley, fresh', 'veg', 5, False),
    ('13-836', 'Mint, fresh', 'veg', 5, False),
    ('13-887', 'Chives, fresh', 'veg', 5, False),
    ('13-824', 'Dill, fresh', 'veg', 5, False),
    ('13-892', 'Rosemary, fresh', 'veg', 2, False),
    ('13-893', 'Thyme, fresh', 'veg', 2, False),
    ('13-853', 'Sage, fresh', 'veg', 2, False),
    ('13-857', 'Tarragon, fresh', 'veg', 2, False),
    ('13-821', 'Curry leaves, fresh', 'veg', 2, False),
    # ---- Seasonings, stock and cupboard sauces
    ('17-367', 'Salt', 'sauces', 1, False),
    ('17-681', 'Chicken stock, ready-made (liquid)', 'sauces', 250, False),
    ('17-680', 'Stock pot / stock gel, as sold', 'sauces', 28, False),
    ('17-724', 'Gravy granules, dry', 'sauces', 10, False),
    ('17-723', 'Worcestershire sauce', 'sauces', 5, False),
    ('17-339', 'Vinegar (malt, cider or wine)', 'sauces', 15, False),
    ('17-365', 'Mustard, wholegrain', 'sauces', 10, False),
    ('17-362', 'Mustard powder', 'sauces', 3, False),
    ('17-720', 'Curry paste', 'sauces', 30, False),
    ('17-623', 'Pesto, red', 'sauces', 20, False),
    ('17-314', 'Horseradish sauce', 'sauces', 15, False),
    ('17-707', 'Mint sauce', 'sauces', 15, False),
    ('17-719', 'Chilli sauce', 'sauces', 15, False),
    ('17-629', 'Stir-fry sauce', 'sauces', 50, False),
    ('14-889', 'Coconut milk, canned', 'sauces', 100, False),
    ('14-890', 'Coconut milk, reduced fat, canned', 'sauces', 100, False),
    ('14-844', 'Sesame seeds', 'fats', 10, False),
    # ---- Fats and oils
    ('17-661', 'Butter, unsalted', 'dairy', 10, False),
    ('17-655', 'Butter, spreadable', 'dairy', 10, False),
    ('17-640', 'Ghee (butter)', 'fats', 10, False),
    ('17-010', 'Lard', 'fats', 10, False),
    ('17-487', 'Beef dripping', 'fats', 10, False),
    ('17-041', 'Rapeseed oil (tbsp ~14g)', 'fats', 14, False),
    ('17-045', 'Sunflower oil (tbsp ~14g)', 'fats', 14, False),
    ('17-040', 'Groundnut (peanut) oil (tbsp ~14g)', 'fats', 14, False),
    ('17-043', 'Sesame oil (tsp ~5g)', 'fats', 5, False),
    # ---- Dairy for cooking
    ('12-333', 'Whipping cream', 'dairy', 30, False),
    ('12-337', 'Extra thick cream', 'dairy', 30, False),
    ('12-336', 'Creme fraiche, half fat', 'dairy', 30, False),
    ('12-490', 'Mascarpone', 'dairy', 30, False),
    ('12-176', 'Ricotta', 'dairy', 50, False),
    ('12-174', 'Quark', 'dairy', 50, False),
]

HEADER = """import type { Food } from '@/core/types'

/** Everyday UK cooking ingredients (raw meat and fish, dry staples, pulses, herbs, spices,
 *  seasonings and cooking basics), per 100 g, values exactly as UK CoFID 2021 gives them.
 *  GENERATED by scripts/import/cofid-ingredients.py: don't edit by hand, edit the script. */
export const INGREDIENTS: Food[] = """


def num(v):
    """CoFID value as a number: Tr (trace) and N/null (not measured) count as 0."""
    return 0.0 if v in (None, 'Tr', 'N', '') else float(v)


def r1(x):
    """Round to 0.1 exactly as check-foods does (Math.round(x * 10) / 10)."""
    return math.floor(x * 10 + 0.5) / 10


def main(path):
    cofid = {r['code']: r for r in json.load(open(path))}
    base = open('src/core/data/foods.ts').read()
    base_names = {n.lower() for n in re.findall(r'"n": "([^"]*)"', base)}
    base_codes = set(re.findall(r'"src": "cofid:([^"]*)"', base))
    out, audit, seen, codes = [], [], set(), set()
    for code, name, cat, g, cook in FOODS:
        r = cofid.get(code)
        assert r, f'{code} not in CoFID'
        assert r['k'] not in (None, 'N', 'Tr'), f'{code} {r["name"]}: CoFID gives no energy value'
        key = name.lower()
        assert key not in seen and key not in base_names, f'duplicate name: {name}'
        assert code not in codes, f'code used twice: {code}'
        assert code not in base_codes, f'{code} is already in foods.ts'
        seen.add(key); codes.add(code)
        k, p, c, f = num(r['k']), num(r['p']), num(r['c']), num(r['f'])
        food = {'n': name, 'k': math.floor(k + 0.5), 'p': r1(p), 'c': r1(c), 'f': r1(f), 'g': g, 'cat': cat}
        if cook: food['cook'] = True
        food['src'] = f'cofid:{code}'
        out.append(food)
        audit.append({'n': name, 'ref': {'source': 'CoFID', 'code': code, 'name': r['name'], 'k': k, 'p': p, 'c': c, 'f': f},
                      'status': 'new', 'serving_g': g})
    open('src/core/data/ingredients.ts', 'w').write(HEADER + json.dumps(out, indent=2, ensure_ascii=False) + '\n')
    open('docs/data/food-audit-2026-09-ingredients.json', 'w').write(json.dumps(audit, indent=1, ensure_ascii=False) + '\n')
    print(f'{len(out)} ingredients written')
    by = {}
    for x in out: by[x['cat']] = by.get(x['cat'], 0) + 1
    print('  ' + ', '.join(f'{k} {v}' for k, v in sorted(by.items())))


if __name__ == '__main__':
    main(sys.argv[1])
