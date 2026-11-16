import random, math, statistics as st
exec(open('sim.py').read().split('N=3000')[0])
random.seed(3)
for sch in ['daily','3wk','1wk']:
    for win in [28,42,56]:
        sl=[];ch=[]
        for _ in range(1500):
            x=series(win,schedule=sch); r=regfit(x,win,win)
            if r: sl.append(r[1])
        print(f"{sch:5} win={win}d: slope SD {st.pstdev(sl):.3f} kg/wk = {st.pstdev(sl)*1000:.0f} kcal/day at 7000 kcal/kg; 4-wk change SD {st.pstdev(sl)*4:.2f} kg")
# adaptive estimate total SE: intake CV 0.28, mean 2000
for win,logged,sch,slsd in [(28,20,'daily',0.112),(28,20,'3wk',0.134),(42,30,'daily',0.059),(42,30,'3wk',0.072),(56,40,'3wk',0.05)]:
    ie=0.28*2000/math.sqrt(logged); se=math.sqrt(ie**2+(slsd*1000)**2)
    print(f"adaptive {win}d, {logged} logged, {sch}: intake SE {ie:.0f}, total SE {se:.0f}, 90% +/- {1.645*se:.0f} kcal")
print('prior Mifflin +/-15% of 2000 as ~80% interval -> SD', round(300/1.28))
