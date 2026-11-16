import random, math, statistics as st
random.seed(1)
W0=90.0
def series(days, slope_kg_wk=0.0, s=0.005, phi=0.4, weekly=0.0035, cycle=0.0, schedule='daily'):
    e=random.gauss(0,s); out=[]
    ph=random.random()*28
    for t in range(days):
        e=phi*e+random.gauss(0,s*math.sqrt(1-phi*phi))
        wk=weekly/2*math.cos(2*math.pi*(t%7)/7)   # peak on day 0 (Monday)
        cy=cycle/2*math.cos(2*math.pi*(t+ph)/28)
        true=W0+slope_kg_wk*t/7
        obs=true*(1+e+wk+cy)
        dow=t%7
        keep = (schedule=='daily' and random.random()<0.85) or (schedule=='3wk' and dow in (0,2,4) and random.random()<0.9) or (schedule=='1wk' and dow==0 and random.random()<0.9)
        out.append(round(obs,1) if keep else None)
    return out
def wmean(xs):
    v=[x for x in xs if x is not None]; return (sum(v)/len(v), len(v)) if v else (None,0)
def regfit(xs, end, win):
    pts=[(t,x) for t,x in enumerate(xs[max(0,end-win):end], start=max(0,end-win)) if x is not None]
    if len(pts)<4: return None
    n=len(pts); mt=sum(t for t,_ in pts)/n; mx=sum(x for _,x in pts)/n
    sxx=sum((t-mt)**2 for t,_ in pts); b=sum((t-mt)*(x-mx) for t,x in pts)/sxx
    a=mx-b*mt; res=[x-(a+b*t) for t,x in pts]; se=math.sqrt(sum(r*r for r in res)/(n-2)/sxx)
    return a+b*(end-1), b*7, se*7, n
N=3000
# 1. week-over-week noise of weekly means, slope 0
for sch in ['daily','3wk','1wk']:
    for cyc in [0.0,0.01]:
        d=[]
        for _ in range(N):
            x=series(14,schedule=sch,cycle=cyc); a,_=wmean(x[7:]); b,_=wmean(x[:7])
            if a and b: d.append(a-b)
        d.sort(); p=lambda q:d[int(q*len(d))]
        print(f"wk-vs-wk {sch:5} cycle={cyc}: SD {st.pstdev(d):.2f} kg, P(delta>=+0.5kg) {sum(1 for v in d if v>=0.5)/len(d):.2f}, 90% range {p(.05):+.2f}..{p(.95):+.2f}")
# 2. regression slope SE by window
for sch in ['daily','3wk','1wk']:
    for win in [14,21,28,42]:
        sl=[]
        for _ in range(1500):
            x=series(win,schedule=sch); r=regfit(x,win,win)
            if r: sl.append(r[1])
        print(f"slope noise {sch:5} win={win}d: SD {st.pstdev(sl):.3f} kg/wk -> x7000/7 = {st.pstdev(sl)*1000:.0f} kcal/day")
