import re, sys
S = sys.argv[1]
TAIL = ("Real-time speed, realistic weight and physics, 35mm lens, shallow depth of field, natural colour grade, no text. "
        "Vertical 9:16 framing. Static camera: no zoom, push-in or pan.")
BODY = ("An ordinary, everyday body with soft, natural muscle tone: not muscular, no defined or bulging muscles, "
        "no visible abs or veins, not a fitness model.")
FRAME = ("Full-body framing: the whole person is in frame from head to feet for the entire clip, with space above the head and below the feet, "
         "so hands, knees and feet are always visible. Never cropped at the waist, knees or ankles.")
def block(who, hair, outfit):
    return (f"Plain minimalist studio, seamless warm off-white walls and floor, soft diffused daylight. In the soft-focus background against the wall: a low black bench and a small rack of black dumbbells, nothing else. {who}, "
            f"realistic skin with natural texture, {hair}. {BODY} Wearing {outfit}, in muted tones with no logos or text, "
            f"and flat training shoes. Calm, focused expression. {TAIL}")
WOMEN = [
  ("W1", "30s, East Asian, medium build", "A woman in her 30s of East Asian heritage, medium natural build", "hair in a low ponytail", "charcoal leggings, a sage-green sports bra and an open cropped tank"),
  ("W2", "50s, Black Caribbean, larger build", "A woman in her 50s of Black Caribbean heritage, larger build", "natural afro tied back", "full-length dark leggings and a fitted long-sleeve top"),
  ("W3", "20s, South Asian, slim build", "A woman in her 20s of South Asian heritage, slim build", "long hair in a low bun", "dark joggers and a fitted plain T-shirt"),
  ("W4", "60s, White European, soft build", "A woman in her 60s of White European heritage, soft average build", "short grey hair", "relaxed stone-coloured trousers and a zip-up training top"),
  ("W5", "40s, Middle Eastern, curvy build, hijab", "A woman in her 40s of Middle Eastern heritage, curvy build", "a fitted sports hijab", "full-length loose-fit dark leggings and a fitted long-sleeve top that covers her hips"),
  ("W6", "30s, Black African, curvy build", "A woman in her 30s of Black African heritage, curvy build", "braids tied back", "charcoal leggings and a fitted plain T-shirt"),
  ("W7", "70s, mixed heritage, slim build", "A woman in her 70s of mixed heritage, slim build", "short white hair", "full-length dark leggings and a fitted long-sleeve top"),
  ("W8", "40s, Latin American, larger build", "A woman in her 40s of Latin American heritage, larger build", "hair in a low ponytail", "dark joggers and a loose plain T-shirt tucked in at the front"),
  ("W9", "20s, White European, pear-shaped build", "A woman in her early 20s of White European heritage, pear-shaped build, fuller hips and thighs with a narrower waist and shoulders", "hair in a low ponytail", "full-length dark leggings and a fitted plain T-shirt"),
  ("W10", "late 30s, White European, apple-shaped build", "A woman in her late 30s of White European heritage, apple-shaped build, carrying weight around her middle with slimmer legs", "shoulder-length hair tied back", "full-length dark leggings and a loose-fitting long-sleeve top")
]
MEN = [
  ("M1", "30s, Black African, medium build", "A man in his 30s of Black African heritage, medium natural build", "short cropped hair", "dark joggers and a fitted plain T-shirt"),
  ("M2", "50s, South Asian, soft stocky build", "A man in his 50s of South Asian heritage, soft stocky build", "short greying hair", "relaxed stone-coloured trousers and a fitted plain T-shirt"),
  ("M3", "20s, East Asian, slim build", "A man in his 20s of East Asian heritage, slim build", "short straight hair", "navy training shorts over dark leggings and a loose vest"),
  ("M4", "60s, White European, larger build", "A man in his 60s of White European heritage, larger build", "a shaved head", "dark joggers and a fitted long-sleeve top"),
  ("M5", "40s, North African, average build", "A man in his 40s of North African heritage, average build", "short curly hair", "navy training shorts and a fitted plain T-shirt"),
  ("M6", "70s, Black Caribbean, slim build", "A man in his 70s of Black Caribbean heritage, slim build", "short grey hair", "relaxed dark trousers and a zip-up training top"),
]
OBJ_NEXT = {"and","for","with","to","up","out","so","at","sit"}
def to_he(t):
    def her(m):
        pre = t[max(0, m.start()-5):m.start()].lower()
        rest = t[m.end():m.end()+20]
        cap = m.group(0)[0].isupper()
        nm = re.match(r"(\s*)([A-Za-z]+)?", rest)
        nxt = (nm.group(2) or "").lower()
        punct = not nm.group(2) or (nm.group(1) == "" )
        if nxt == "walking" and "of" in pre: w = "him"
        elif punct or nxt in OBJ_NEXT: w = "him"
        else: w = "his"
        return w.capitalize() if cap else w
    t = re.sub(r"\b[Hh]erself\b", lambda m: "Himself" if m.group(0)[0]=="H" else "himself", t)
    t = re.sub(r"\b[Hh]er\b", her, t)
    t = re.sub(r"\bShe\b", "He", t); t = re.sub(r"\bshe\b", "he", t)
    t = re.sub(r"\b(has|shows|puts|keeps|leaves) his\b", r"\1 him", t)
    return t
def entries(path):
    txt = open(path).read()
    parts = re.split(r"(?m)^### ", txt)[1:]
    out = []
    for p in parts:
        lines = p.split("\n"); title = lines[0].strip()
        body = [l for l in lines[1:] if not l.startswith("## ") and not l.startswith("# ")]
        prompt, meta, cur = [], [], None
        for l in body:
            s = l.strip()
            if s.startswith(">"): prompt.append(s.lstrip("> ").rstrip()); continue
            if s.startswith("- Prompt"): continue
            if s.startswith("- "): meta.append(s[2:]); continue
            if s and meta and not s.startswith("---"): meta[-1] += " " + s
        out.append((title, " ".join(x for x in prompt if x), meta))
    return out
ALL = entries(f"{S}/prompts-a.md") + entries(f"{S}/prompts-b.md") + entries(f"{S}/prompts-c.md")
def write(fn, cast, he):
    f = open(fn, "w")
    who = "men" if he else "women"
    f.write(f"# Tali exercise video prompts: copy and paste ({who})\n\n")
    f.write("How to use: copy one demonstrator block from Step 1, then copy an exercise prompt from Step 2 and paste it on the end. "
            "Keep the same demonstrator for both reps of a clip. Change demonstrator between clips.\n\n")
    if he: f.write("The exercise prompts in this file say \"he\" and \"his\". Use them only with the men's blocks.\n\n")
    else: f.write("The exercise prompts in this file say \"she\" and \"her\". Use them only with the women's blocks.\n\n")
    f.write("## Step 1: demonstrator blocks\n\n")
    for cid, label, w, h, o in cast:
        f.write(f"### {cid}: {label}\n\n```text\n{block(w, h, o)}\n```\n\n")
    f.write("## Step 2: exercise prompts\n\nThe first 28 are the moves in Tali's three plans: make these first.\n\n")
    for i, (title, prompt, meta) in enumerate(ALL):
        if i == 28: f.write("---\n\nThe rest of the library.\n\n")
        f.write(f"### {i+1}. {title}\n\n")
        for m in meta:
            if m.startswith(("Clip file", "Equipment")): f.write(f"- {to_he(m) if he else m}\n")
        if "sun-salutation-b" in title: f.write("\n**Draft: don't generate yet.** The moves between sides and the ending are still open (see notes).\n")
        if prompt and not prompt.startswith("Not written"):
            p = to_he(prompt) if he else prompt
            f.write(f"\n```text\n{p}\n```\n\n")
        else: f.write("\nNo prompt yet (see notes).\n\n")
        for m in meta:
            if not m.startswith(("Clip file", "Equipment")): f.write(f"- {to_he(m) if he else m}\n")
        f.write("\n")
    f.close()
write(f"{S}/tali-video-prompts-women.md", WOMEN, False)
write(f"{S}/tali-video-prompts-men.md", MEN, True)
print(len(ALL), sum(1 for e in ALL if not e[1]))
