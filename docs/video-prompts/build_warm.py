import sys
S=sys.argv[1]
src=open(f"{S}/build.py").read().split("ALL = entries(")[0]
ns={}; exec(src, ns)
ALL=ns['entries'](f"{S}/prompts-warmup.md")
def write(fn, cast, he):
    f=open(fn,"w"); who="men" if he else "women"
    f.write(f"# Tali warm-up video prompts: copy and paste ({who})\n\nHow to use: copy one demonstrator block from Step 1, then copy a warm-up prompt from Step 2 and paste it on the end. Change demonstrator between clips.\n\n## Step 1: demonstrator blocks\n\n")
    for cid,label,w,h,o in cast: f.write(f"### {cid}: {label}\n\n```text\n{ns['block'](w,h,o)}\n```\n\n")
    f.write("## Step 2: warm-up prompts\n\n")
    for i,(t,p,meta) in enumerate(ALL):
        f.write(f"### {i+1}. {t}\n\n")
        for m in meta:
            if m.startswith(("Clip file","Equipment")): f.write(f"- {ns['to_he'](m) if he else m}\n")
        f.write(f"\n```text\n{ns['to_he'](p) if he else p}\n```\n\n")
        for m in meta:
            if not m.startswith(("Clip file","Equipment")): f.write(f"- {ns['to_he'](m) if he else m}\n")
        f.write("\n")
write(f"{S}/tali-warmup-prompts-women.md", ns['WOMEN'], False)
write(f"{S}/tali-warmup-prompts-men.md", ns['MEN'], True)
print(len(ALL))
