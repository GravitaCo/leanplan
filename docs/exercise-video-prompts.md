# Exercise demo video prompts

Prompts for generating Tali's exercise demo clips with Seedance (written for Seedance 2.5).
Every exercise the app shows today is listed below with its prompt, timing and status. Reuse the
same **character and scene block** in every prompt so the same person, outfit and studio appear
in every clip. Once a clip is made, it goes into the app as described in CLAUDE.md, "Exercise
demo videos".

## Status: every exercise in the app (September 2026)

From `src/core/data/workouts.ts`. File names are the ones the clip will get in `public/videos/`.

| # | Workout | Exercise (as named in the app) | Clip file | Status |
|---|---|---|---|---|
| 1 | Legs | Barbell squat | Bunny `736acf7f…` | **done** (1 rep) |
| 2 | Legs | Romanian deadlift (dumbbell or barbell) | `romanian-deadlift.mp4` | **done** |
| 3 | Legs | Leg extension (machine) | `leg-extension.mp4` | needed |
| 4 | Legs | Seated or standing calf raise | `calf-raise.mp4` | needed |
| 5 | Legs | Plank | `plank.mp4` | needed (hold) |
| 6 | Push | Barbell bench press | Bunny `df890da8…` | **done** |
| 7 | Push | Incline dumbbell press | `incline-dumbbell-press.mp4` | needed |
| 8 | Push | Dumbbell shoulder press (seated) | `shoulder-press.mp4` | needed |
| 9 | Push | Lateral raise | `lateral-raise.mp4` | needed |
| 10 | Push | Triceps rope pushdown (cable) | `triceps-pushdown.mp4` | needed |
| 11 | Pull | Lat pulldown | `lat-pulldown.mp4` | needed |
| 12 | Pull | Seated cable row | `seated-cable-row.mp4` | needed |
| 13 | Pull | Chest-supported dumbbell row | `chest-supported-row.mp4` | needed |
| 14 | Pull | Face pull (cable) | `face-pull.mp4` | needed |
| 15 | Pull | Biceps curl (barbell or dumbbell) | `barbell-curl.mp4` | **done** |
| 16a | Pull | Cable crunch (or dead bug): cable crunch | `cable-crunch.mp4` | needed |
| 16b | Pull | Cable crunch (or dead bug): dead bug | `dead-bug.mp4` | needed |
| 17a | Cardio | Brisk walk | `brisk-walk.mp4` | needed (steady pace) |
| 17b | Cardio | Incline treadmill | `incline-treadmill.mp4` | needed (steady pace) |
| 17c | Cardio | Stationary bike | `stationary-bike.mp4` | needed (steady pace) |
| 17d | Cardio | Cross-trainer (in the cardio type list) | `cross-trainer.mp4` | optional |
| 17e | Cardio | Rower (in the cardio type list) | `rower.mp4` | optional |

The **barbell squat** and **barbell bench press** clips are hosted on Bunny Stream. They replaced
the leg press and chest press in Legs and Push for now; those two come back with the exercise
library (workout plan phase 3), and their prompts are kept below for then.

**New clips can go straight to Bunny Stream.** The app plays each video's MP4 fallback
(`https://vz-36841ffb-54c.b-cdn.net/<video id>/play_720p.mp4`) with its `thumbnail.jpg` as the
poster, so MP4 fallback must stay switched on in the library. The library refuses requests with no
referrer, so the links don't open on their own but do play inside the app.

**How the app will use each kind of clip.** Rep clips (most of the list) get the tempo counter
that the curl and deadlift already have. The plank is a hold: until the planned hold timer is
built (workout plan §5.5), it plays without a counter. Cardio clips show a steady pace and have
no counter; they are there to show posture and set-up.

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

> Plain minimalist studio, seamless warm off-white walls and floor, soft diffused daylight.
> Woman in her 30s, medium natural build, realistic skin, low ponytail, charcoal leggings,
> sage-green sports bra, open cropped tank, flat training shoes. Calm, focused expression.
> Real-time speed, realistic weight and physics, 35mm lens, shallow depth of field, natural
> colour grade, no text. Vertical 9:16 framing. Static camera: no zoom, push-in or pan.

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

### Leg press (for phase 3)

Add the machine line with "45-degree leg press machine".

> Side-on medium-wide shot. She sits in the leg press with her lower back flat against the pad
> and her feet shoulder-width apart in the middle of the platform. She starts with her legs
> almost straight but not locked. She lowers the platform slowly until her knees are bent to
> about 90 degrees, keeping her lower back on the pad, then pushes through the middle of her
> feet to straighten her legs smoothly, stopping just before the knees lock.

Timing text: "2 slow repetitions in about 13 seconds. Each rep is a 3-second lowering to knees
at 90 degrees, a 1-second pause, a 1.5-second press, and a 1-second pause at the top with the
knees soft."

### 2. Romanian deadlift (done: `public/videos/romanian-deadlift.mp4`)

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

### 8. Seated dumbbell shoulder press (needed)

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

### 10. Triceps rope pushdown (needed)

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

### 15. Biceps curl (done: `public/videos/barbell-curl.mp4`)

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
