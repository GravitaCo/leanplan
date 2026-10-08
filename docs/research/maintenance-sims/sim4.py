import random, math
exec(open('sim.py').read().split('N=3000')[0])
random.seed(4)
rate=-0.0075*W0  # kg/wk true, on target
for sch in ['daily','3wk','1wk']:
    a=b=n=0
    for _ in range(3000):
        x=series(28,slope_kg_wk=rate,schedule=sch)
        m1,_=wmean(x[21:28]); m0,_=wmean(x[14:21])
        if m1 and m0:
            pct=(m0-m1)/m0*100; n+=1; a+= (pct<0.55 or pct>0.95)
        r=regfit(x,28,28)
        if r: pct2=-r[1]/W0*100; b+=(pct2<0.55 or pct2>0.95)
    print(f"{sch}: spec 3.3 (wk vs wk) wrong suggestion {a/n:.0%}; 28-day regression with same tolerance {b/3000:.0%}")
    # wider tolerance on regression
    c=0
    for _ in range(3000):
        x=series(28,slope_kg_wk=rate,schedule=sch); r=regfit(x,28,28)
        if r: pct2=-r[1]/W0*100; c+=(pct2<0.75-0.35 or pct2>0.75+0.35)
    print(f"   28-day regression, tolerance +/-0.35%: wrong {c/3000:.0%}")
