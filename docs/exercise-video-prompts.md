# Exercise demo video prompts

Prompts for generating Tali's exercise demo clips with Seedance (written for Seedance 2.5).
Reuse the same **character and scene block** in every prompt so the same person, outfit and
studio appear in every clip. Once a clip is made, it goes into the app as described in
CLAUDE.md, "Exercise demo videos".

## Tips for a clip that works in the app

- **Vertical 9:16.** The player fills a phone screen. The first two clips came out as
  vertical footage inside black side bars, which we cropped off; asking for 9:16 saves that
  step.
- **Two full reps.** Video models keep an exact rep count and tempo more reliably over two
  reps than over longer sets. Expect to regenerate a few times to get the count right.
- **Start and end in the same position.** The app loops the clip, so it should start and end
  in the same pose (for example standing tall with the bar at the hips). Otherwise the loop
  visibly jumps.
- **No audio needed.** The app plays clips muted, and audio is stripped when a clip is added.
- **Every clip gets re-timed.** The on-screen counter uses timings measured from each clip,
  not the tempo written in the prompt, so it's accurate even when the model drifts. If a clip
  comes out much faster or slower than asked, regenerate it rather than accepting it.

## Character and scene block (use in every prompt)

> Plain minimalist studio, seamless warm off-white walls and floor, soft diffused daylight.
> Woman in her 30s, medium natural build, realistic skin, low ponytail, charcoal leggings,
> sage-green sports bra, open cropped tank, flat training shoes. Calm, focused expression.
> Real-time speed, realistic weight and physics, 35mm lens, shallow depth of field, natural
> colour grade, no text. Vertical 9:16 framing.

End each prompt with:

> Two slow, controlled repetitions, three-second lowering phase, brief pause at the deepest
> stretch, smooth lift, perfect form. She starts and ends in the same position.

## Exercise prompts

Add the relevant paragraph between the scene block and the ending line.

### 1. Barbell back squat

> Medium-wide shot from a front three-quarter angle. The bar rests across her upper back, her
> feet are shoulder-width apart and her toes slightly turned out. She sits down slowly over
> three seconds, knees tracking over her toes, chest proud and heels planted, until her hips
> drop below knee height. She pauses briefly at the bottom, then drives up smoothly to
> standing.

Timing text: "She performs 2 slow repetitions in about 13 seconds. Each rep is a 3-second
descent, a 1-second pause below parallel, a 1.5-second drive up, and a 1-second breath at the
top."

### 2. Standing barbell curl (done: `public/videos/barbell-curl.mp4`)

> Medium shot from the side. She stands tall holding the barbell with an underhand,
> shoulder-width grip, elbows pinned to her sides. She curls the bar up without leaning back,
> squeezes her biceps at the top, then lowers it slowly over three seconds until her arms are
> fully straight and her biceps are visibly stretched. She pauses, then curls again.

Timing text: "She performs 2 slow repetitions in about 13 seconds. Each rep is a 1.5-second
curl up, a 1-second squeeze at the top, a 3-second lowering to fully straight arms, and a
1-second pause in the stretch."

Measured from the clip we used: lift 1 s, squeeze 2.5 s, lower 2.5 s, stretch 2.5 s.

### 3. Flat barbell bench press

> Low side angle, then a slow push-in. She lies on the flat bench with her shoulder blades
> pulled back and down, a slight natural arch, feet flat on the floor and a grip slightly wider
> than her shoulders. She lowers the bar under control over three seconds to her lower chest,
> elbows at about 45 degrees. She pauses lightly with a deep chest stretch and no bounce, then
> presses up smoothly to lockout over her shoulders.

Timing text: "Starting with the bar locked out over her shoulders, she performs 2 slow
repetitions in about 13 seconds. Each rep is a 3-second lowering to her lower chest, a
1-second pause without bouncing, a 1.5-second press up, and a 1-second lockout."

### 4. Barbell Romanian deadlift (done: `public/videos/romanian-deadlift.mp4`)

> Side-on medium-wide shot. She stands tall holding the barbell at hip height with an overhand
> grip, knees softly bent. She hinges at the hips over three seconds, pushing her hips back and
> keeping her back flat and the bar close to her legs. The bar slides down to just below her
> knees, where her hamstrings are deeply stretched. She pauses, then drives her hips forward to
> stand tall, squeezing her glutes at the top.

Timing text: "Starting standing tall with the bar at her hips, she performs 2 slow
repetitions in about 13 seconds. Each rep is a 3-second hip hinge down to just below the
knees, a 1-second pause in the hamstring stretch, a 1.5-second drive up, and a 1-second glute
squeeze at the top."

Measured from the clip we used: lower 4.5 s (rep 1) and 3.5 s (rep 2), stretch 1 s, lift 1 s,
squeeze 2.5 s.

A slow lowering with a deep stretch suits the Romanian deadlift (a hip hinge). A conventional
deadlift is normally lowered under control but not slowly, with no stretch at the bottom. If a
conventional version is ever needed:

> The barbell rests on the floor over her mid-foot. She hinges down with a flat back, grips
> just outside her shins, braces, and pushes the floor away to stand tall with hips and
> shoulders rising together. She then lowers the bar under control along her legs back to the
> floor, resets and repeats.

## Natural timings (for reference)

A hypertrophy rep at this tempo takes about 6 to 7 seconds: roughly 3 s lowering, 1 s pause in
the stretch, 1.5 s lifting and 1 s reset at the top. These are typical coaching tempos, not
measurements of any particular person.

| Exercise | Per rep | 2 reps, from position | 3 reps, from position |
|---|---|---|---|
| Squat | ~6.5 s | ~13 s | ~20 s |
| Curl | ~6.5 s | ~13 s | ~20 s |
| Bench press | ~6.5 s | ~13 s | ~20 s |
| Romanian deadlift | ~6.5 s | ~13 s | ~20 s |

"From position" means the clip starts with her already set up (bar on her back, bar locked out
on the bench, and so on) and ends on the last rep, with no walk-in or re-racking.
