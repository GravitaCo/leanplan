# Exercise demo video prompts

Prompts for generating Tali's exercise demo clips with Seedance (written for Seedance 2.5).
Every exercise the app shows today is listed below with its prompt, timing and status. Reuse the
same **character and scene block** in every prompt so the same person, outfit and studio appear
in every clip. Once a clip is made, it goes into the app as described in CLAUDE.md, "Exercise
demo videos".

## Status: every exercise in the app

54 exercises appear in a workout, Tali plan workout, lighter day or warm-up; **16 have a clip, 38 still need one.** Generated from the app's data on 8 Oct 2026.

### Still needed

| Exercise (as named in the app) | Kind | Used in |
|---|---|---|
| Calf raise | reps | Legs |
| Leg extension (machine) | reps | Legs |
| Plank | hold | Legs |
| Incline dumbbell press | reps | Push, Tali: Full body C |
| Lateral raise | reps | Push |
| Cable crunch | reps | Pull |
| Chest-supported dumbbell row | reps | Pull |
| Face pull (cable) | reps | Pull, Tali: Full body C |
| Lat pulldown | reps | Pull, Tali: Full body B |
| Seated cable row | reps | Pull, Tali: Full body A |
| Brisk walk | timed (steady pace) | Cardio |
| Chair pose | hold | Tali: Balance & Mobility |
| Dead bug | reps | Tali: Full body A |
| Dumbbell bench press | reps | Tali: Full body A |
| Dumbbell split squat | reps | Tali: Full body C |
| Farmer carry | reps | Tali: Strength & Balance A, Tali: Full body C |
| Goblet squat | reps | Tali: Strength & Balance B, Tali: Full body A |
| Hip thrust | reps | Tali: Full body C |
| Leg curl (machine) | reps | Tali: Full body A |
| Leg press | reps | Tali: Full body B |
| One-arm dumbbell row | reps | Tali: Strength & Balance A, Tali: Strength & Balance B, Tali: Full body C |
| Step-up | reps | Tali: Strength & Balance A |
| Tree pose | hold | Tali: Strength & Balance A, Tali: Balance & Mobility |
| Cat–cow | reps | Lighter: mobility, Tali: Balance & Mobility, Warm-up |
| Easy walk | timed (steady pace) | Lighter: walk |
| Lying hamstring stretch | hold | Lighter: mobility |
| Lying knee rolls | reps | Lighter: mobility |
| Arm circles | reps | Warm-up |
| Band pull-apart | reps | Warm-up |
| Bodyweight squat | reps | Warm-up |
| Hip 90/90 switch | reps | Warm-up |
| Hip circles | reps | Warm-up |
| Inchworm | reps | Warm-up |
| Leg swings | reps | Warm-up |
| Open book | reps | Warm-up |
| Thread the needle | hold | Warm-up |
| Wall slide | reps | Warm-up |
| World's greatest stretch | reps | Warm-up |

### Done (on Bunny)

| Exercise | Kind | Used in | Bunny video |
|---|---|---|---|
| Barbell squat | reps | Legs | `736acf7f…` |
| Romanian deadlift (dumbbell or barbell) | reps | Legs, Tali: Full body B | `9375b37c…` |
| Barbell bench press | reps | Push | `df890da8…` |
| Dumbbell shoulder press (seated) | reps | Push, Tali: Full body B | `29092357…` |
| Triceps rope pushdown (cable) | reps | Push | `db9a8075…` |
| Biceps curl (barbell or dumbbell) | reps | Pull | `ea9ee735…` |
| Bird-dog | reps | Tali: Strength & Balance B | `28383feb…` |
| Incline push-up | reps | Tali: Strength & Balance A, Tali: Strength & Balance B, Warm-up | `0f94c2e0…` |
| Knee to wall | reps | Tali: Balance & Mobility, Warm-up | `e7138db7…` |
| Side plank (knees) | hold | Tali: Strength & Balance B, Tali: Full body B | `8dde7844…` |
| Sit to stand | reps | Tali: Strength & Balance A | `5b34fdf0…` |
| Split squat | reps | Tali: Strength & Balance B, Tali: Balance & Mobility | `31719b54…` |
| Glute bridge | reps | Lighter: mobility, Tali: Strength & Balance A, Warm-up | `ffc84847…` |
| Half-kneeling hip flexor stretch | hold | Lighter: mobility, Tali: Balance & Mobility | `13668949…` |
| March on the spot with arm swings | timed move | Lighter: mobility, Tali: Balance & Mobility, Warm-up | `013b8f18…` |
| Shoulder rolls | reps | Lighter: mobility, Tali: Balance & Mobility, Warm-up | `abbffae3…` |

Run the status list again from the app's data whenever a workout changes; the prompt sections below are grouped by where each move is used.


The **barbell squat** and **barbell bench press** replaced the leg press and chest press in Legs and
Push. The leg press is used again in Tali's Full body B (its prompt is under Legs); the chest press
prompt is kept for when it returns.

**New clips can go straight to Bunny Stream.** The app plays each video's MP4 fallback
(`https://vz-36841ffb-54c.b-cdn.net/<video id>/play_720p.mp4`) with its `thumbnail.jpg` as the
poster, so MP4 fallback must stay switched on in the library. The library refuses requests with no
referrer, so the links don't open on their own but do play inside the app.

**How the app uses each kind of clip.** Rep clips (most of the list) get the tempo counter,
timed from the footage. Holds (a plank, a stretch, a yoga pose) and timed moves (a march) play
with no counter: the hold timer runs over the clip (Design canvas row "Holds"), so a hold clip
only needs the person to stay still in the pose. Cardio clips show a steady pace and have no
counter; they are there to show posture and set-up.

## Tips for a clip that works in the app

- **Vertical 9:16.** The player fills a phone screen.
- **Two full reps.** Video models keep an exact rep count and tempo more reliably over two reps
  than over longer sets. Expect to regenerate a few times to get the count right.
- **Start and end in the same position, with a static camera.** The app loops the clip, so it
  should start and end in the same pose and framing. Otherwise the loop visibly jumps (the bench
  clip's camera push-in does this).
- **No audio needed.** The app plays clips muted, and audio is stripped when a clip is added.
- **Every clip gets re-timed and form-checked.** The on-screen counter uses timings measured from
  each clip, not the tempo written in the prompt, and every clip is checked frame by frame for
  form before it goes in. If a clip is much faster or slower than asked, or the form drifts
  (a rounded back, bouncing, swinging), regenerate it rather than accepting it.
- **Match the app's cue.** Each prompt below follows the form cue the app already shows for that
  exercise, so the video and the text agree.

## Character and scene block (use in every prompt)

The studio, light, camera and tone stay the same in every clip. The demonstrator varies in age,
heritage, build, hair and clothing so people see bodies like their own (Benn, 29 Sept 2026).
**Framing follows the move:** show the whole body, head to feet, when the legs, hips, knees or
floor position matter (a glute bridge, an incline push-up, a hinge); arm and shoulder moves keep
a medium shot, because a vertical frame zoomed out that far makes the person too small (Benn).
**Nobody looks muscular:** ordinary, everyday bodies only, never fitness-model or visibly
defined muscles.

> Plain minimalist studio, seamless warm off-white walls and floor, soft diffused daylight.
> A {gender} in {their} {age}, {heritage} heritage, {build}, realistic skin with natural
> texture, {hair}. An ordinary, everyday body with soft, natural muscle tone: not muscular, no
> defined or bulging muscles, no visible abs or veins, not a fitness model. Wearing {outfit},
> in muted tones with no logos or text, and flat training shoes. Calm, focused expression.
> Real-time speed, realistic weight and physics, 35mm lens, shallow depth of field, natural
> colour grade, no text. Vertical 9:16 framing. Static camera: no zoom, push-in or pan.

- **gender / their:** woman / her, man / his. The exercise prompts are written with "she"; for
  a man, use the "he" version of the prompt.
- **age:** 20s, 30s, 40s, 50s, 60s, 70s
- **heritage:** Black African, Black Caribbean, East Asian, South Asian, Southeast Asian,
  Middle Eastern, North African, Latin American, White European, mixed
- **build:** slim build, medium natural build, soft average build, curvy build, pear-shaped build
  (fuller hips and thighs), apple-shaped build (weight carried around the middle), larger build,
  soft stocky build (no athletic or muscular builds)
- **hair:** low ponytail, short cropped hair, braids tied back, natural afro tied back, short
  grey hair, shaved head, hair in a low bun, a fitted sports hijab
- **outfit (workout-appropriate, fitted enough to show the joints).** Pick one that suits the
  gender chosen:
  - women: charcoal leggings, a sage-green sports bra and an open cropped tank; full-length
    leggings and a fitted long-sleeve top; dark joggers and a fitted plain T-shirt; relaxed
    stone-coloured trousers and a zip-up training top
  - men: dark joggers and a fitted plain T-shirt; navy training shorts and a loose vest;
    full-length leggings under training shorts with a fitted long-sleeve top; relaxed
    stone-coloured trousers and a zip-up training top
  - with the sports hijab (women): full-length leggings and a fitted long-sleeve top

Keep one demonstrator for the whole clip, and vary demonstrators across clips.

**For machine and cable exercises, add:**

> The only equipment in the studio is a single matte black [machine name], clean and modern,
> with no branding or logos.

**End every rep prompt with:**

> Two slow, controlled repetitions, perfect form, no bouncing or swinging. She starts and ends
> in the same position.

Then add the exercise's **timing text**. All rep timings use the same hypertrophy tempo: a slow
lowering of about 3 seconds, a short pause in the stretch, a smooth lift of about 1.5 seconds
and a brief hold at the top. That gives about 6.5 seconds a rep and about 13 seconds for two.
These are typical coaching tempos (judgement calls), not measurements.

---

## Legs

### Leg press (needed: Tali Full body B)

Add the machine line with "45-degree leg press machine".

> Side-on medium-wide shot. She sits in the leg press with her lower back flat against the pad
> and her feet shoulder-width apart in the middle of the platform. She starts with her legs
> almost straight but not locked. She lowers the platform slowly until her knees are bent to
> about 90 degrees, keeping her lower back on the pad, then pushes through the middle of her
> feet to straighten her legs smoothly, stopping just before the knees lock.

Timing text: "2 slow repetitions in about 13 seconds. Each rep is a 3-second lowering to knees
at 90 degrees, a 1-second pause, a 1.5-second press, and a 1-second pause at the top with the
knees soft."

### 2. Romanian deadlift (done: on Bunny)

> Side-on medium-wide shot. She stands tall holding the barbell at hip height with an overhand
> grip, knees softly bent. She hinges at the hips over three seconds, pushing her hips back and
> keeping her back flat and the bar close to her legs. The bar slides down to just below her
> knees, where her hamstrings are deeply stretched. She pauses, then drives her hips forward to
> stand tall, squeezing her glutes at the top.

Timing text: "Starting standing tall with the bar at her hips, 2 slow repetitions in about 13
seconds. Each rep is a 3-second hip hinge down to just below the knees, a 1-second pause in the
hamstring stretch, a 1.5-second drive up, and a 1-second glute squeeze at the top."

Measured from the clip we used: lower 4.5 s (rep 1) and 3.5 s (rep 2), stretch 1 s, lift 1 s,
squeeze 2.5 s.

### 3. Leg extension (needed)

Add the machine line with "seated leg extension machine".

> Side-on medium shot. She sits upright in the leg extension machine, back against the seat,
> holding the side handles, with the pad resting on her lower shins and her knees bent. She
> straightens her legs smoothly until they are almost straight, squeezes the front of her
> thighs at the top, then lowers the pad slowly under control back to the start. No kicking or
> swinging.

Timing text: "2 slow repetitions in about 13 seconds. Each rep is a 1.5-second lift, a 1-second
squeeze at the top, a 3-second lowering, and a 1-second pause at the bottom."

### 4. Calf raise (needed)

The app allows seated or standing. The standing version needs no machine.

> Side-on medium shot framed from the knees down to the floor plus her upper body in view. She
> stands with the balls of her feet on the edge of a low, sturdy step, heels hanging off,
> lightly holding the wall for balance and a dumbbell in the other hand. She rises onto the
> balls of her feet as high as she can, pauses at the top, then lowers slowly until her heels
> drop below the step for a full calf stretch. No bouncing.

Timing text: "2 slow repetitions in about 13 seconds. Each rep is a 1.5-second rise, a 1-second
pause at the top, a 3-second lowering, and a 1-second stretch at the bottom."

### 5. Plank (needed, hold)

> Side-on low shot at floor level. She lies face down on a thin grey mat, then lifts into a
> forearm plank: elbows directly under her shoulders, forearms flat, body in a straight line
> from head to heels, glutes gently squeezed, neck neutral, looking at the floor. She holds the
> position steadily, breathing slowly and calmly. Her hips neither sag nor lift.

Timing text (instead of the rep ending): "She is already in the plank at the start and holds it
without moving for about 20 seconds, breathing slowly. She is still in the same plank at the
end."

---

## Push

### Chest press (for phase 3)

The app allows machine or dumbbell. The dumbbell version uses the studio's flat bench.

> Low side angle. She lies on a flat bench with her feet flat on the floor and her shoulder
> blades pulled back, holding a dumbbell in each hand above her chest, arms almost straight.
> She lowers the dumbbells under control until they are level with her mid-chest, elbows at
> about 45 degrees from her body, then presses them up smoothly, stopping just short of locking
> her elbows.

Timing text: "Starting with the dumbbells pressed up, 2 slow repetitions in about 13 seconds.
Each rep is a 3-second lowering to mid-chest, a 1-second pause, a 1.5-second press, and a
1-second pause at the top."

**Check before use:** the app's cue for this exercise says "Lower under control for ~2
seconds", but the prompt asks for 3 to match the other exercises. Either change the prompt to
2 seconds or update the cue so the video and text agree.

### 7. Incline dumbbell press (needed)

> Low front three-quarter angle. She sits back on a bench set to about 30 degrees, feet flat,
> holding a dumbbell in each hand above her upper chest. She lowers the dumbbells under control
> towards her upper chest, then presses them up and slightly together, stopping just short of
> locking her elbows.

Timing text: "Starting with the dumbbells pressed up, 2 slow repetitions in about 13 seconds.
Each rep is a 3-second lowering, a 1-second pause, a 1.5-second press, and a 1-second pause at
the top."

### 8. Seated dumbbell shoulder press (done: on Bunny)

> Front three-quarter medium shot. She sits on a bench with the back upright, feet flat, holding
> a dumbbell in each hand at ear height, palms facing forward. She presses the dumbbells
> overhead without arching her lower back, ribs kept down, stopping just short of locking her
> elbows, then lowers them slowly back to ear height.

Timing text: "Starting with the dumbbells at ear height, 2 slow repetitions in about 13 seconds.
Each rep is a 1.5-second press, a 1-second pause at the top, a 3-second lowering, and a 1-second
pause at ear height."

### 9. Lateral raise (needed)

> Front medium shot. She stands tall with light dumbbells at her sides, a slight bend in her
> elbows. She raises the dumbbells out to the sides, leading with her elbows, until her arms
> reach shoulder height, pauses, then lowers them slowly back to her sides. Light weight, no
> swinging or shrugging.

Timing text: "2 slow repetitions in about 13 seconds. Each rep is a 1.5-second raise, a 1-second
pause at shoulder height, a 3-second lowering, and a 1-second pause at the bottom."

### 10. Triceps rope pushdown (done: on Bunny, single handle)

Add the machine line with "cable station with a rope attachment at the top".

> Side-on medium shot. She stands facing the cable station, holding the rope with her elbows
> tucked at her sides and bent to about 90 degrees. Keeping her elbows still, she pushes the
> rope down until her arms are straight, spreading the ends slightly apart at the bottom, then
> lets it rise slowly back to the start. Only her forearms move.

Timing text: "2 slow repetitions in about 13 seconds. Each rep is a 1.5-second push down, a
1-second squeeze with the rope spread, a 3-second return, and a 1-second pause at the top."

---

## Pull

### 11. Lat pulldown (needed)

Add the machine line with "lat pulldown machine with a straight bar".

> Side-on three-quarter shot. She sits at the lat pulldown with her thighs under the pad,
> holding the bar overhead with a grip a little wider than her shoulders, arms straight. Leaning
> back slightly, she pulls the bar down to her upper chest, leading with her elbows, squeezes,
> then lets the bar rise slowly until her arms are straight and her back is stretched. No
> yanking or swinging.

Timing text: "Starting with her arms straight overhead, 2 slow repetitions in about 13 seconds.
Each rep is a 1.5-second pull, a 1-second squeeze at the upper chest, a 3-second return, and a
1-second stretch at the top."

### 12. Seated cable row (needed)

Add the machine line with "seated cable row machine with a close-grip handle".

> Side-on medium-wide shot. She sits tall on the seated row with her feet on the platform and a
> slight bend in her knees, holding the handle with her arms straight. She pulls the handle to
> her lower ribs, squeezing her shoulder blades together, then lets her arms extend slowly back
> to the start with her back staying tall. She doesn't rock or heave with her back.

Timing text: "Starting with her arms straight, 2 slow repetitions in about 13 seconds. Each rep
is a 1.5-second pull, a 1-second squeeze, a 3-second return, and a 1-second stretch with arms
straight."

### 13. Chest-supported dumbbell row (needed)

> Side-on medium shot. She lies face down on a bench set to an incline, chest resting on the
> pad, feet on the floor, a dumbbell hanging in each hand with arms straight. She rows the
> dumbbells up towards her hips, squeezing her shoulder blades, then lowers them slowly until
> her arms hang straight. Her chest stays on the pad; no jerking.

Timing text: "Starting with the dumbbells hanging, 2 slow repetitions in about 13 seconds. Each
rep is a 1.5-second row, a 1-second squeeze, a 3-second lowering, and a 1-second hang at the
bottom."

### 14. Face pull (needed)

Add the machine line with "cable station with a rope attachment at head height".

> Side-on three-quarter shot. She stands facing the cable station holding the rope at head
> height with her arms straight. She pulls the rope towards her forehead, elbows high and wide,
> squeezing the backs of her shoulders, then lets it return slowly until her arms are straight.
> Light weight, slow and smooth.

Timing text: "Starting with her arms straight, 2 slow repetitions in about 13 seconds. Each rep
is a 1.5-second pull, a 1-second squeeze, a 3-second return, and a 1-second pause with arms
straight."

### 15. Biceps curl (done: on Bunny)

> Medium shot from the side. She stands tall holding the barbell with an underhand,
> shoulder-width grip, elbows pinned to her sides. She curls the bar up without leaning back,
> squeezes her biceps at the top, then lowers it slowly over three seconds until her arms are
> fully straight and her biceps are visibly stretched. She pauses, then curls again.

Timing text: "2 slow repetitions in about 13 seconds. Each rep is a 1.5-second curl up, a
1-second squeeze at the top, a 3-second lowering to fully straight arms, and a 1-second pause in
the stretch."

Measured from the clip we used: lift 1 s, squeeze 2.5 s, lower 2.5 s, stretch 2.5 s.

### 16a. Cable crunch (needed)

Add the machine line with "cable station with a rope attachment at the top".

> Side-on medium shot. She kneels on a mat facing the cable station, holding the rope beside her
> head. Keeping her hips still, she crunches her ribs down towards her hips, rounding her spine,
> pauses, then uncurls slowly back to upright. The movement comes from her abs, not from sitting
> back on her heels.

Timing text: "2 slow repetitions in about 13 seconds. Each rep is a 1.5-second crunch, a
1-second hold, a 3-second return, and a 1-second pause upright."

### 16b. Dead bug (needed)

> Side-on low shot at floor level. She lies on her back on a thin grey mat, arms pointing
> straight up, hips and knees bent to 90 degrees, lower back pressed gently into the mat. She
> slowly lowers her right arm overhead and straightens her left leg towards the floor without
> touching it, keeping her lower back pressed down, then returns. She repeats on the other side.

Timing text: "2 slow repetitions, one each side, in about 13 seconds. Each rep is a 3-second
lower of the opposite arm and leg, a 1-second pause, a 1.5-second return, and a 1-second pause
in the start position."

---

## Cardio (steady pace, no rep counter)

For these, replace the rep ending with: "She moves at a steady, easy pace the whole time, relaxed
and breathing comfortably, as if she could hold a conversation. The clip loops, so her pace and
position look the same at the start and end." Aim for about 10 to 12 seconds.

### 17a. Brisk walk (needed)

Add the machine line with "treadmill".

> Side-on medium-wide shot. She walks briskly on a level treadmill with an upright posture,
> natural arm swing and a heel-to-toe stride, without holding the handrails.

### 17b. Incline treadmill (needed)

Add the machine line with "treadmill set to a moderate incline".

> Side-on medium-wide shot. She walks at a steady pace up a treadmill set to a moderate incline,
> leaning very slightly forward from the ankles, arms swinging naturally, without holding the
> handrails.

### 17c. Stationary bike (needed)

Add the machine line with "upright stationary bike".

> Side-on medium-wide shot. She rides an upright stationary bike at a steady, moderate cadence.
> The seat is set so her knee is slightly bent at the bottom of each pedal stroke; her back is
> long, shoulders relaxed and hands resting lightly on the handlebars.

### 17d. Cross-trainer (optional)

Add the machine line with "elliptical cross-trainer".

> Side-on medium-wide shot. She moves smoothly on an elliptical cross-trainer, standing tall,
> pushing and pulling the handles in rhythm with her legs.

### 17e. Rower (optional)

Add the machine line with "indoor rowing machine".

> Side-on medium-wide shot. She rows at an easy, steady rhythm with good technique: on the drive
> she pushes with her legs first, then leans back slightly, then pulls the handle to her lower
> ribs; on the way back her arms extend first, then her body tips forward, then her knees bend.
> Back long throughout.

Timing text: "About 4 relaxed strokes in 10 to 12 seconds, with the drive quicker than the
return." (A relaxed rowing rhythm of roughly 20 to 24 strokes a minute is a common easy pace; a
judgement call, not a measurement.)

---

## Squat, bench press and deadlift variants

### Barbell back squat (done: Bunny, one rep)

> Medium-wide shot from a front three-quarter angle. The bar rests across her upper back, her
> feet are shoulder-width apart and her toes slightly turned out. She sits down slowly over
> three seconds, knees tracking over her toes, chest proud and heels planted, until her hips
> drop below knee height. She pauses briefly at the bottom, then drives up smoothly to
> standing.

Timing text: "2 slow repetitions in about 13 seconds. Each rep is a 3-second descent, a 1-second
pause below parallel, a 1.5-second drive up, and a 1-second breath at the top."

### Flat barbell bench press (done: Bunny)

> Low side angle, static camera. She lies on the flat bench with her shoulder blades
> pulled back and down, a slight natural arch, feet flat on the floor and a grip slightly wider
> than her shoulders. She lowers the bar under control over three seconds to her lower chest,
> elbows at about 45 degrees. She pauses lightly with a deep chest stretch and no bounce, then
> presses up smoothly to lockout over her shoulders.

Timing text: "Starting with the bar locked out over her shoulders, 2 slow repetitions in about
13 seconds. Each rep is a 3-second lowering to her lower chest, a 1-second pause without
bouncing, a 1.5-second press up, and a 1-second lockout."

### Conventional deadlift (alternative to the Romanian deadlift)

A slow lowering with a deep stretch suits the Romanian deadlift (a hip hinge). A conventional
deadlift is normally lowered under control but not slowly, with no stretch at the bottom.

> The barbell rests on the floor over her mid-foot. She hinges down with a flat back, grips
> just outside her shins, braces, and pushes the floor away to stand tall with hips and
> shoulders rising together. She then lowers the bar under control along her legs back to the
> floor, resets and repeats.

As the exercise library grows (calisthenics, yoga, pilates, mobility; workout plan §5.3), each
new exercise gets a prompt here in the same format before its clip is made.

---

## Tali plan workouts

### One-arm dumbbell row (needed)

One side shown (the app says "one side shown, do both"). The studio's flat bench is the only
equipment besides the dumbbell.

> Side-on medium-wide shot. She rests her left hand and left knee on a flat bench, her right
> foot on the floor, her back flat and level like a tabletop, looking at the floor just ahead of
> the bench. A dumbbell hangs from her right hand with her arm straight. She rows the dumbbell up
> towards her right hip, leading with her elbow and squeezing her shoulder blade back, then
> lowers it slowly until her arm hangs straight again. Her shoulders and hips stay square to the
> floor; she doesn't twist her body to heave the weight up. Two slow, controlled repetitions,
> perfect form, no bouncing or swinging. She starts and ends in the same position.

Timing text: "Starting with the dumbbell hanging, 2 slow repetitions on the right side in about
13 seconds. Each rep is a 1.5-second row, a 1-second squeeze at the hip, a 3-second lowering,
and a 1-second hang at the bottom."

### Step-up (needed)

One side shown. A sturdy step or low bench no higher than her knee; she holds a light dumbbell
in each hand (the app also allows bodyweight).

> Side-on medium-wide shot, whole body in frame from head to feet. She stands facing a sturdy
> step no higher than her knee, a light dumbbell hanging in each hand, with her whole right foot
> flat on the step and her left foot on the floor. She pushes through her right heel to stand up
> tall on the step, bringing her left foot up beside it, then slowly lowers her left foot back
> to the floor, keeping her right foot on the step the whole time. She doesn't push off with the
> back foot; her front knee stays in line with her toes. Two slow, controlled repetitions,
> perfect form, no bouncing or swinging. She starts and ends in the same position.

Timing text: "Starting with the right foot on the step and the left foot on the floor, 2 slow
repetitions on the right side in about 13 seconds. Each rep is a 1.5-second step up, a 1-second
stand tall at the top, a 3-second lowering of the left foot to the floor, and a 1-second pause
at the bottom."

### Farmer carry (needed)

A dumbbell in each hand. This is a short walk, not reps: she starts and ends standing still,
so the loop only jumps in where she stands, not in her pose.

> Side-on wide shot, whole body in frame from head to feet, with room for her to walk across
> the frame. She stands tall near the left of the frame, a dumbbell in each hand at her sides,
> shoulders down and away from her ears, ribs down. She walks forward across the studio with
> short, steady steps, about six to eight steps, standing tall, without leaning to either side
> or letting the dumbbells swing. She stops near the right of the frame and stands still and
> tall, the dumbbells still at her sides. No turn.

Timing text: "Starting standing still holding the dumbbells, about 2 seconds standing, about 6
to 8 short, steady steps over 5 to 6 seconds, then about 2 seconds standing still at the end.
About 10 seconds in all."

### Tree pose (needed, hold)

One side shown.

> Front-on shot, whole body in frame from head to feet. She stands tall on her left foot with
> her right foot placed flat against the inside of her left calf, well below the knee, right
> knee opening out to the side, hands together at her chest. Her standing leg is long but not
> locked, her hips level, her gaze soft on a point ahead. She holds the pose calmly, breathing
> slowly, with a small, natural wobble rather than gripping. Her foot never presses against the
> side of the knee.

Timing text (instead of the rep ending): "She is already in tree pose at the start and holds it
for about 15 to 20 seconds, breathing slowly, with only a small natural wobble. She is still in
the same pose at the end."

### Goblet squat (needed)

> Front three-quarter medium-wide shot, whole body in frame from head to feet. She stands with
> her feet a little wider than her hips, toes slightly turned out, holding one dumbbell upright
> close to her chest with both hands cupped under the top end. She sits down slowly between her
> heels, chest up, knees following her toes, until her hips are just below her knees or as low
> as she can keep her heels down. She pauses briefly, then stands tall by pushing through her
> whole foot. Her heels stay down and her chest doesn't drop towards her knees. Two slow,
> controlled repetitions, perfect form, no bouncing or swinging. She starts and ends in the
> same position.

Timing text: "Starting standing tall, 2 slow repetitions in about 13 seconds. Each rep is a
3-second descent, a 1-second pause at the bottom, a 1.5-second stand, and a 1-second pause
standing tall."

### Chair pose (needed, hold)

> Side-on three-quarter shot, whole body in frame from head to feet. She stands with her feet
> hip-width apart, bends her knees and sits back as if onto a chair, weight towards her heels,
> arms reaching up alongside her ears. Her ribs stay soft and her lower back isn't arched; her
> knees stay roughly over her ankles, not pushing far past her toes. She holds the position
> steadily, breathing slowly and calmly.

Timing text (instead of the rep ending): "She is already in chair pose at the start and holds it
without moving for about 15 to 20 seconds, breathing slowly. She is still in the same pose at
the end."

### Dumbbell bench press (needed)

The studio's flat bench and a dumbbell in each hand.

> Low side angle, whole body in frame on the bench. She lies on a flat bench with her feet flat
> on the floor, holding a dumbbell in each hand pressed up with her arms straight over her
> shoulders. She lowers the dumbbells under control to chest level, her elbows angled slightly in
> from her sides, not flared out wide, then presses them back up until her arms are straight over
> her shoulders. The dumbbells don't bang together at the top. Two slow, controlled
> repetitions, perfect form, no bouncing or swinging. She starts and ends in the same position.

Timing text: "Starting with the dumbbells pressed up, 2 slow repetitions in about 13 seconds.
Each rep is a 3-second lowering to chest level, a 1-second pause, a 1.5-second press, and a
1-second pause at the top."

### Leg curl (machine) (needed)

Add the machine line with "seated leg curl machine".

> Side-on medium-wide shot, whole body in frame. She sits upright in the seated leg curl
> machine, back against the seat, holding the side handles, with the thigh pad holding her legs
> down. Her knees line up with the machine's pivot and the lower pad rests just above her heels,
> legs almost straight. She curls the pad down and back under the seat smoothly, pauses, then
> lets it return slowly until her legs are almost straight again. Her hips stay down on the seat
> and she doesn't lift or rock to help. Two slow, controlled repetitions, perfect form, no
> bouncing or swinging. She starts and ends in the same position.

Timing text: "Starting with her legs almost straight, 2 slow repetitions in about 13 seconds.
Each rep is a 1.5-second curl, a 1-second pause, a 3-second return, and a 1-second pause with
legs almost straight."

### Dumbbell split squat (needed)

One side shown. A dumbbell in each hand.

> Side-on medium-wide shot, whole body in frame from head to feet. She stands tall in a long
> stride, right foot forward and flat, left foot behind with the heel lifted, a dumbbell hanging
> at each side. She lowers straight down until her back knee is just above the floor, front
> shin roughly upright, then pushes up through her front foot to the start. Her front knee stays
> in line with her toes rather than falling inwards, and her body stays upright. Her feet don't
> move between reps. Two slow, controlled repetitions, perfect form, no bouncing or swinging.
> She starts and ends in the same position.

Timing text: "Starting at the top of the split stance, 2 slow repetitions on the right side in
about 13 seconds. Each rep is a 3-second lowering, a 1-second pause with the back knee just
above the floor, a 1.5-second push up, and a 1-second pause at the top."

### Hip thrust (needed)

The studio's flat bench, one dumbbell held across the hips on a soft pad.

> Side-on medium-wide shot, whole body in frame. She sits on the floor with her upper back
> against the long side of a flat bench, knees bent and feet flat, hip-width apart. A dumbbell
> rests across her hips on a soft pad, held steady with both hands. She drives through her heels
> to lift her hips until her body is level from shoulders to knees, shins roughly upright,
> squeezes her glutes, then lowers her hips slowly until they are just above the floor. Her chin
> stays tucked and her ribs down; she doesn't arch her lower back at the top. Two slow,
> controlled repetitions, perfect form, no bouncing or swinging. She starts and ends in the
> same position.

Timing text: "Starting with her hips lowered just above the floor, 2 slow repetitions in about
13 seconds. Each rep is a 1.5-second lift, a 1-second glute squeeze at the top, a 3-second
lowering, and a 1-second pause at the bottom."

---

## Mobility and lighter days

These move slowly and smoothly, about 5 to 6 seconds a rep, and never push to the end of the
range. Replace "Two slow, controlled repetitions" with the wording given where it differs.

### Cat–cow (needed)

> Side-on low shot, whole body in frame on a thin grey mat. She is on her hands and knees, hands
> under her shoulders and knees under her hips, back flat. Breathing out, she slowly rounds her
> back up towards the ceiling, letting her head drop gently. Breathing in, she lets her belly
> drop gently and looks slightly forward. Then she returns to a flat back. She moves within a
> comfortable range, never to her limit. Two slow, smooth rounds with the breath, no jerking.
> She starts and ends in the same position, with a flat back.

Timing text: "Starting with a flat back, 2 slow rounds in about 12 seconds. Each round is a
2.5-second breath out into the rounded back, a 2.5-second breath in into the gentle dip, and a
1-second return to a flat back."

### Lying hamstring stretch (needed, hold)

One side shown.

> Side-on low shot at floor level, whole body in frame on a thin grey mat. She lies on her back
> with her left knee bent and left foot flat. Her right leg is lifted, both hands holding behind
> her right thigh, and her right knee is straightened just enough to feel a gentle stretch along
> the back of the leg, not forced straight. Her head and lower back stay relaxed on the mat. She
> holds the stretch calmly, breathing slowly, without pulling the leg towards her.

Timing text (instead of the rep ending): "She is already in the stretch at the start and holds
it without moving for about 15 to 20 seconds, breathing slowly. She is still in the same
stretch at the end."

### Lying knee rolls (needed)

The app's cue moves through the middle to the other side, so this clip shows one roll each way
(like the dead bug), not one side only.

> Overhead three-quarter shot from the foot end, whole body in frame on a thin grey mat. She
> lies on her back with her knees bent together, feet flat, and her arms out wide on the mat.
> She lets both knees lower slowly to her right, only as far as feels easy, both shoulders
> staying on the mat, then brings them back up through the middle and lowers them slowly to her
> left, then back to the middle. Her knees never drop or flop. Two slow, smooth repetitions, one
> each side, no bouncing or swinging. She starts and ends in the same position, knees upright.

Timing text: "Starting with the knees upright, 2 slow repetitions, one each side, in about 12
seconds. Each rep is a 2.5-second lowering to the side, a 1-second pause, and a 2.5-second
return to the middle."

### Easy walk (needed)

Add the machine line with "treadmill". Use the cardio section's ending instead of the rep
ending.

> Side-on medium-wide shot, whole body in frame. She walks at a relaxed, easy pace on a level
> treadmill, upright and loose, arms swinging naturally, without holding the handrails. Her
> face is calm, as if she could chat in full sentences. She moves at a steady, easy pace the
> whole time, relaxed and breathing comfortably. The clip
> loops, so her pace and position look the same at the start and end.

Timing text: "A steady, relaxed walk for 10 to 12 seconds, noticeably slower and looser than the
brisk walk, about 1.5 to 2 steps a second."

---

## Warm-up moves

Warm-up moves are gentler than the library versions: slow and smooth, about 5 to 6 seconds a
rep unless noted, always within a comfortable range and never forced to the end of it. Each
prompt follows the warm-up cue (`WARMUP_CUES`) as well as the library cue.

### Leg swings (needed)

One side shown. A swing is a pendulum, so it can't be slowed to 5 to 6 seconds without looking
unnatural; each swing is relaxed rather than slow.

> Side-on medium-wide shot, whole body in frame from head to feet. She stands tall, side-on to
> the studio wall, her left hand resting on it. She swings her right leg forward and back in a
> relaxed, loose arc from the hip, the second swing a little bigger than the first, staying
> within a comfortable range. Her upper body stays tall and her lower back doesn't twist; she
> doesn't kick for height. Two relaxed, controlled swings, forward and back, no forcing. She
> starts and ends in the same position, standing on both feet.

Timing text: "Starting standing on both feet, 2 relaxed swings on the right leg in about 7
seconds. Each swing is about 3 seconds forward and back, with a brief settle back to standing at
the end."

### Bodyweight squat (needed)

> Front three-quarter medium-wide shot, whole body in frame from head to feet. She stands with
> her feet about shoulder-width apart, toes slightly turned out, arms reaching forward for
> balance. She sits her hips back and down between her heels, heels down and back flat, then
> stands tall. The first squat is shallow and the second a little deeper, still within a
> comfortable range. Her knees follow her toes and don't cave inwards. Two slow, smooth
> repetitions, no bouncing. She starts and ends in the same position.

Timing text: "Starting standing tall, 2 slow repetitions in about 11 seconds. Each rep is a
2.5-second descent, a brief pause, a 2-second stand, and a 1-second pause standing tall."

### World's greatest stretch (needed)

One side shown.

> Side-on three-quarter shot, whole body in frame on a thin grey mat. She is in a long lunge,
> right foot forward, left knee down on the mat, both hands on the floor inside her right foot.
> She slowly reaches her right arm up towards the ceiling, turning her chest open to the right
> and following her hand with her eyes, then brings the hand back down inside her foot. The turn
> comes from her upper back, not a twist of her lower back, and only as far as is comfortable.
> Two slow, smooth repetitions, no forcing. She starts and ends in the same position.

Timing text: "Starting in the lunge with both hands down, 2 slow repetitions on the right side
in about 12 seconds. Each rep is a 2.5-second reach up, a 1-second pause, and a 2.5-second
return."

### Hip circles (needed)

One circle each way makes the two reps.

> Front-on medium-wide shot, whole body in frame from head to feet. She stands with her feet
> hip-width apart, knees soft, hands on her hips. She draws one slow, smooth circle with her
> hips in one direction, then one in the other direction, keeping her upper body tall and the
> circles within a comfortable range, never pushing to the edge. Two slow, smooth circles, no
> jerking. She starts and ends in the same position, hips centred.

Timing text: "Starting with the hips centred, 2 slow circles in about 11 seconds: one circle
clockwise in about 5.5 seconds, then one anticlockwise in about 5.5 seconds."

### Hip 90/90 switch (needed)

> Front three-quarter shot, whole body in frame on a thin grey mat. She sits with both knees
> bent to her right, right shin across in front of her body and left shin out to the side, hands
> on the mat behind her for support, chest tall. She lifts her knees and slowly rotates them over
> to the left, ending with her shins in the mirror position, then rotates them back to the
> right. She moves within a comfortable range and doesn't force either knee down to the floor.
> Two slow, smooth repetitions, over and back, no forcing. She starts and ends in the same
> position.

Timing text: "Starting with both knees to the right, 2 slow repetitions in about 12 seconds.
Each rep is a 2.5-second switch to the left, a brief pause, a 2.5-second switch back, and a
brief pause."

### Arm circles (needed)

Circles are quicker than the other warm-up moves; two each way keeps the clip short.

> Front-on medium shot, from the hips up. She stands tall with her arms straight out to the
> sides at shoulder height, palms down. She draws two small, smooth circles forwards with her
> arms, the second a little bigger, then two small circles backwards. Her shoulders stay down
> and away from her ears, and the circles stay within a comfortable range. Slow and smooth, no
> flinging. She starts and ends in the same position, arms out to the sides.

Timing text: "Starting with the arms out to the sides, 2 circles forwards then 2 backwards in
about 10 seconds, each circle about 2.5 seconds."

### Band pull-apart (needed)

A light resistance band, no handles.

> Front three-quarter medium shot, from the hips up. She stands tall holding a light resistance
> band in front of her at shoulder height, hands about shoulder-width apart, arms straight. She
> pulls the band apart by drawing her shoulder blades together until her arms are out to the
> sides, then lets it return slowly to the start. Her shoulders stay down and her ribs in; she
> doesn't arch her back to finish. Light and within a comfortable range. Two slow, controlled
> repetitions, perfect form, no bouncing or swinging. She starts and ends in the same position.

Timing text: "Starting with the band in front at shoulder height, 2 slow repetitions in about 11
seconds. Each rep is a 2-second pull apart, a 1-second squeeze, and a 2.5-second return."

### Open book (needed)

One side shown.

> Overhead three-quarter shot, whole body in frame on a thin grey mat. She lies on her left
> side, head resting on the mat, knees bent and stacked together in front of her, both arms
> straight out in front at shoulder height, palms together. She slowly opens her top (right)
> arm up and over towards the other side, following her hand with her eyes so her chest turns
> to the ceiling, only as far as is comfortable, then closes it back to the start. Her knees
> stay together so the turn comes from her upper back. Two slow, smooth repetitions, no
> forcing. She starts and ends in the same position.

Timing text: "Starting with the palms together, 2 slow repetitions on the right side in about
12 seconds. Each rep is a 2.5-second opening, a 1-second pause, and a 2.5-second close."

### Wall slide (needed)

> Front three-quarter medium shot, from mid-thigh up. She stands with her back against the
> studio wall, feet a small step forward, her arms bent in a goalpost shape with the backs of
> her upper arms and hands against the wall. She slides her arms up the wall as far as is
> comfortable, then slowly back down, gently drawing her shoulder blades down. Her ribs stay
> down and her back doesn't arch away from the wall to reach higher. Two slow, controlled
> repetitions, perfect form, no bouncing or swinging. She starts and ends in the same position.

Timing text: "Starting in the goalpost shape, 2 slow repetitions in about 11 seconds. Each rep
is a 2-second slide up, a brief pause, and a 3-second slide down."

### Thread the needle (needed)

One side shown. Threads through, rests there a few seconds, and returns: a flowing version of
the hold.

> Side-on three-quarter low shot, whole body in frame on a thin grey mat. She is on her hands and
> knees, hands under her shoulders, knees under her hips. She slowly slides her right arm
> underneath her body towards the left, palm up, until her right shoulder and the side of her
> head rest gently on the mat. She pauses there for a few breaths, hips staying over her knees
> and no weight on her neck, then presses back up through her left hand to hands and knees.
> Two slow, smooth repetitions, no forcing. She starts and ends in the same position.

Timing text: "Starting on hands and knees, 2 slow repetitions on the right side in about 16
seconds. Each rep is a 2.5-second thread through, a 3-second pause resting on the shoulder, and
a 2.5-second return to hands and knees."

### Inchworm (needed)

A long move, so the clip runs to about 20 seconds.

> Side-on medium-wide shot, whole body in frame from head to feet, with room on the floor in
> front of her. She stands tall, then bends her knees and places her hands on the floor in front
> of her feet. She walks her hands forward slowly, only as far as is comfortable, to about a
> straight-arm plank with her shoulders over her hands and her hips level, not sagging. Then she
> walks her hands back towards her feet, bending her knees as much as she needs, and rolls up
> slowly to standing tall. Her feet stay in place. Two slow, controlled repetitions, no
> bouncing. She starts and ends in the same position, standing tall.

Timing text: "Starting standing tall, 2 slow repetitions in about 20 seconds. Each rep is a
2-second bend to the floor, a 3-second walk out, a 1-second pause, a 3-second walk back, and a
1-second roll up to standing."
