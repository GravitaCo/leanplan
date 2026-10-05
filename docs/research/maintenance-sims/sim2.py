import random, math
exec(open('sim.py').read().split('N=3000')[0])
random.seed(2)
def ema_level(xs,end,alpha=0.1):
    tr=None
    for x in xs[:end]:
        if x is None: continue
        tr = x if tr is None else tr+alpha*(x-tr)
    return tr
def run(slope, band, sch, cyc, method, weeks=26, need=2, N=800):
    flags=[]; 
    for _ in range(N):
        x=series(14+weeks*7, slope_kg_wk=slope, schedule=sch, cycle=cyc)
        ref,_=wmean(x[:14])
        if ref is None: continue
        run_=0; when=None
        for w in range(1,weeks+1):
            end=14+w*7
            if method=='reg':
                r=regfit(x,end,28); lvl=r[0] if r else None
            else:
                lvl=ema_level(x,end)
            if lvl is None: continue
            run_ = run_+1 if lvl>ref*(1+band) else 0
            if run_>=need: when=w; break
        flags.append(when)
    fa=sum(1 for f in flags if f)/len(flags)
    ws=sorted(f for f in flags if f); med=ws[len(ws)//2] if ws else None
    return fa, med
for method in ['reg','ema']:
  for sch in ['daily','3wk','1wk']:
    for band in [0.01,0.015,0.02,0.03]:
        r0=run(0,band,sch,0.0,method); r0c=run(0,band,sch,0.01,method)
        r2=run(0.2,band,sch,0.0,method); r1=run(0.1,band,sch,0.0,method)
        print(f"{method} {sch:5} band {band*100:.1f}%: false flag in 26wk {r0[0]:.2f} (cycle {r0c[0]:.2f}); 0.8kg/mo flagged by wk {r2[1]} ({r2[0]:.2f}); 0.4kg/mo by wk {r1[1]} ({r1[0]:.2f})")
