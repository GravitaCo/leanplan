# Seedance prompts: library slice C (63 exercises)

Written to the house rules in `docs/exercise-video-prompts.md`. Every prompt below is pasted
**after** the character and scene block from that doc, copied verbatim (not repeated here).

## How the pieces fit

- **Character and scene block:** verbatim from the doc, before every prompt.
- **Machine and cable line:** where a prompt contains "The equipment she uses is a
  single matte black ..., clean and modern, with no branding or logos.", that is the doc's
  add-on with the machine name filled in. I have also used it for the squat rack (barbell
  overhead press), since a rack is large kit that can come out branded.
- **Rep clips** end with the doc's line: "Two slow, controlled repetitions, perfect form, no
  bouncing or swinging. She starts and ends in the same position." Then the timing text. The
  strength timings use the doc's tempo (about 3 s lowering, a short pause, about 1.5 s lift,
  a brief hold). For mobility and pilates moves that have no lowering against a load, I kept the
  same shape and total (about 6.5 s a rep, about 13 s for two) and adapted the phases. These are
  judgement calls, like the doc's own tempos.
- **Hold clips** replace the rep ending, as the doc's plank does. The brief asks for getting into
  the position, a steady hold of about 8 to 10 s, and returning, so every hold uses this pattern:
  "Starting [start position], she moves slowly into [the pose] over about 3 seconds, holds it
  steadily for about 8 to 10 seconds, breathing slowly, then returns slowly to [start position]
  over about 3 seconds. She starts and ends in the same position." That is about 15 s a clip.
  (The doc's plank starts and ends already in the hold and runs about 20 s; that entry is not in
  this slice.)
- **Steady clips** (the `rounds` yoga flows) replace the rep ending with the doc's cardio line:
  "She moves at a steady, easy pace the whole time, relaxed and breathing comfortably, as if she
  could hold a conversation. The clip loops, so her pace and position look the same at the start
  and end." The brief asks for about 8 to 10 s; the doc says 10 to 12 s for cardio. See the
  decisions list: a full round of any of the three flows does not fit 8 to 10 s.
- **One-sided moves** show the left side only, with "(mirror for the right side)" in the notes.
  For side-lying moves, "left side" means her left arm or leg is the one working (she lies on
  her right side).

## Decisions needed before generating

1. **Sun salutations (all three `rounds` entries).** A looping clip has to be a whole round, and
   at one breath per move a round runs well past 8 to 10 s: roughly 12 s for the half sun
   salutation at a brisk 2 s a move, over 20 s for A, and more for B. Choose a longer clip
   (if Seedance allows it) or a different treatment.
2. **Sun salutation B:** the cue doesn't say how she moves from warrior 1 on one side to the
   other, or how the round finishes. The prompt marks those gaps rather than guessing.
3. **Chest press:** the cue says "Lower under control for ~2 seconds", so this prompt uses 2 s
   (the doc's prompt asked for 3 s and flagged the mismatch). The cue also says "Handles" and the
   library position is `seated`, which suggest the machine; the doc's prompt, reused here, is the
   dumbbell version on a flat bench. Pick one.
4. **Kettlebell swing:** a swing can't follow the slow tempo, and the doc's ending line says "no
   swinging". This entry has its own ending and timing.
5. **Suitcase carry** is logged as `weight-reps` but has no reps. The clip shows one pick-up,
   a short walk and a set-down instead of two reps.
6. **Cable crunch:** the library cue also includes the dead bug text ("Dead bug: lower opposite
   arm + leg..."). This clip is the cable crunch only; the cue text may want splitting.
7. **The hundred and swimming** are beat-based, not rep-based; see their notes for how "two reps"
   is defined.

---

## Mobility

### Neck side stretch (`neck-side-stretch`)
- Clip file: `neck-side-stretch.mp4` · Type: hold
- Equipment in scene: a plain low bench to sit on
- Prompt (paste after the character and scene block):
  > Front medium shot, head and shoulders to hips. She sits tall on a plain low bench, feet flat,
  > hands resting on her thighs, shoulders relaxed and head level. She slowly tips her left ear
  > towards her left shoulder until she feels a gentle stretch along the right side of her neck,
  > without lifting the shoulder, turning her face or using her hand. She then brings her head
  > back up to level. Starting sitting tall with her head level, she moves slowly into the
  > stretch over about 3 seconds, holds it steadily for about 8 to 10 seconds, breathing slowly,
  > then returns slowly to level over about 3 seconds. She starts and ends in the same position.
- Form check: her shoulder hikes up towards the ear; her hand pulls on her head; her head rolls
  or turns rather than tipping sideways.
- Notes: one side only (left ear down). (mirror for the right side)

### Open book (`open-book`)
- Clip file: `open-book.mp4` · Type: rep
- Equipment in scene: none (floor)
- Prompt (paste after the character and scene block):
  > Overhead-angled three-quarter shot from in front of her. She lies on her right side on the
  > floor, knees bent and stacked, arms straight out in front of her chest at shoulder height,
  > palms together. She opens her top (left) arm up and over to the other side, following her
  > hand with her eyes and turning her chest towards the ceiling, then closes it back over to
  > meet the other palm. Her knees stay together and still the whole time, so the turn comes from
  > her upper back. Two slow, controlled repetitions, perfect form, no bouncing or swinging. She
  > starts and ends in the same position. 2 slow repetitions in about 13 seconds. Each rep is a
  > 2.5-second opening, a 1-second pause with the arm open, a 2-second close, and a 1-second
  > pause with palms together.
- Form check: her knees separate or the top knee slides back; her head doesn't follow the hand;
  she flings the arm rather than moving slowly.
- Notes: left arm opening, lying on the right side. (mirror for the right side)

### Lying hamstring stretch (`supine-hamstring-stretch`)
- Clip file: `supine-hamstring-stretch.mp4` · Type: hold
- Equipment in scene: a thin grey mat
- Prompt (paste after the character and scene block):
  > Side-on low shot at floor level. She lies on her back on a thin grey mat with both knees bent
  > and feet flat. She lifts her left leg, holds behind the thigh with both hands, then gently
  > straightens the knee until she feels a mild stretch along the back of the leg. Her head and
  > lower back stay on the mat and she doesn't pull the leg towards her. Starting lying with both
  > knees bent, she moves slowly into the stretch over about 3 seconds, holds it steadily for
  > about 8 to 10 seconds, breathing slowly, then bends the knee and lowers the foot back to the
  > mat over about 3 seconds. She starts and ends in the same position.
- Form check: her head or lower back lifts off the mat; she yanks the leg in with her arms;
  she holds the shin or foot instead of behind the thigh.
- Notes: one side only (left leg). (mirror for the right side)

### Supported deep squat (`supported-deep-squat`)
- Clip file: `supported-deep-squat.mp4` · Type: hold
- Equipment in scene: a plain door frame set into the studio wall; a folded grey mat on the floor
- Prompt (paste after the character and scene block):
  > Side-on medium-wide shot. She stands in a plain door frame, holding its sides at chest height,
  > feet a little wider than her hips and heels on a folded grey mat. She sits down slowly, using
  > her hands only for balance, to a deep squat that looks comfortable, heels down, chest lifted,
  > and breathes. She then stands back up slowly, still holding the frame. Starting standing tall
  > holding the frame, she moves slowly into the squat over about 3 seconds, holds it steadily for
  > about 8 to 10 seconds, breathing slowly, then returns slowly to standing over about 3 seconds.
  > She starts and ends in the same position.
- Form check: her heels lift off the mat; she drops or bounces into the bottom; she hangs her
  weight off the frame instead of balancing lightly.
- Notes: the cue allows a door frame, post or sturdy furniture; I picked a door frame as the
  cleanest fit in the plain studio.

### Thread the needle (`thread-the-needle`)
- Clip file: `thread-the-needle.mp4` · Type: hold
- Equipment in scene: a thin grey mat
- Prompt (paste after the character and scene block):
  > Front three-quarter low shot at floor level. She is on hands and knees on a thin grey mat,
  > hands under shoulders, knees under hips. She slides her left arm underneath her body towards
  > the right, palm up, until her left shoulder and the left side of her head rest on the mat.
  > Her hips stay over her knees and her weight doesn't fall onto her neck. She stays for a few
  > slow breaths, then presses back up to hands and knees. Starting on hands and knees, she moves
  > slowly into the stretch over about 3 seconds, holds it steadily for about 8 to 10 seconds,
  > breathing slowly, then returns slowly to hands and knees over about 3 seconds. She starts and
  > ends in the same position.
- Form check: her hips shift back or sideways off her knees; her head takes her weight or her
  neck bends sharply; the arm is jammed through palm down.
- Notes: one side only (left arm threading). (mirror for the right side)

### Wall calf stretch (`wall-calf-stretch`)
- Clip file: `wall-calf-stretch.mp4` · Type: hold
- Equipment in scene: the studio wall
- Prompt (paste after the character and scene block):
  > Side-on medium-wide shot. She stands facing the studio wall with both hands flat on it at
  > shoulder height and her left foot stepped back, toes pointing forward. Keeping her back leg
  > straight and her back heel on the floor, she bends the front knee and leans in until she
  > feels a stretch in her left calf, then eases back. Starting upright with her feet in the
  > split stance, she moves slowly into the stretch over about 3 seconds, holds it steadily for
  > about 8 to 10 seconds, breathing slowly, then returns slowly to upright over about 3 seconds.
  > She starts and ends in the same position.
- Form check: her back heel lifts; her back foot turns out; her back knee bends.
- Notes: one side only (left calf, left foot back). (mirror for the right side)

### World's greatest stretch (`worlds-greatest-stretch`)
- Clip file: `worlds-greatest-stretch.mp4` · Type: rep
- Equipment in scene: a thin grey mat
- Prompt (paste after the character and scene block):
  > Front three-quarter medium-wide shot at low height. She is in a long lunge on a thin grey
  > mat, left foot forward, right knee down on the mat, both hands flat on the floor inside her
  > left foot. She reaches her left arm up to the ceiling, turning her chest to open towards the
  > left and following her hand with her eyes, then brings the hand back down beside the other.
  > She moves slowly and the turn comes from her upper back; her hips stay square and low. Two
  > slow, controlled repetitions, perfect form, no bouncing or swinging. She starts and ends in
  > the same position. Starting in the lunge with both hands down, 2 slow repetitions in about 13
  > seconds. Each rep is a 2.5-second reach up, a 1-second pause with the arm pointing at the
  > ceiling, a 2-second return, and a 1-second pause with both hands down.
- Form check: her hips twist or rise as she turns; the front knee drifts inwards; she swings
  the arm up fast.
- Notes: left foot forward, left arm reaching. The clip starts already in the lunge; stepping
  into it isn't shown so the loop stays clean. The cue allows the back knee down or lifted; I
  chose down. (mirror for the right side)

## Pilates

### Clam (`clam`)
- Clip file: `clam.mp4` · Type: rep
- Equipment in scene: a thin grey mat; a light, plain dark grey loop band
- Prompt (paste after the character and scene block):
  > Front three-quarter low shot at floor level. She lies on her right side on a thin grey mat,
  > head resting on her lower arm, knees bent and feet together, a light loop band round her
  > thighs just above the knees. Keeping her feet touching and her top hip stacked over the
  > bottom one, she opens her top (left) knee like a clam, then closes it slowly. Her top hip
  > doesn't roll back to open wider. Two slow, controlled repetitions, perfect form, no bouncing
  > or swinging. She starts and ends in the same position. 2 slow repetitions in about 13
  > seconds. Each rep is a 1.5-second opening, a 1-second pause at the top, a 3-second close,
  > and a 1-second pause with the knees together.
- Form check: her top hip rolls backwards; her feet come apart; the knee snaps shut.
- Notes: the band is optional in the cue ("if you like"); drop it if it makes the clip harder
  to get right. (mirror for the right side)

### Double-leg stretch (`double-leg-stretch`)
- Clip file: `double-leg-stretch.mp4` · Type: rep
- Equipment in scene: a thin grey mat
- Prompt (paste after the character and scene block):
  > Side-on low shot at floor level. She lies on her back on a thin grey mat, hugging both knees
  > in towards her chest, head and shoulders lifted slightly off the mat. She breathes in and
  > reaches her arms long overhead and her legs out at a diagonal, high enough that her lower
  > back stays down on the mat. She then breathes out, circles her arms out to the sides and
  > round, and hugs her knees back in. Two slow, controlled repetitions, perfect form, no
  > bouncing or swinging. She starts and ends in the same position. Starting hugging her knees,
  > 2 slow repetitions in about 13 seconds. Each rep is a 1.5-second reach out, a 1-second hold
  > at full reach, a 3-second arm circle back to hugging the knees, and a 1-second pause.
- Form check: her lower back arches off the mat as the legs reach; her legs drop too low; her
  head is jerked forward by the neck.
- Notes: the cue says "head lifted if comfortable"; I've shown it lifted. A head-down version
  may be the safer default demo; your call.

### Half roll back (`half-roll-back`)
- Clip file: `half-roll-back.mp4` · Type: rep
- Equipment in scene: a thin grey mat
- Prompt (paste after the character and scene block):
  > Side-on wide shot at low height. The whole body is in frame from head to feet, because the legs and hips matter in this move. She sits tall on a thin grey mat, knees bent, feet flat,
  > hands resting lightly behind her thighs. She breathes out and curls her tailbone under,
  > rolling halfway back into a C-curve, then breathes in and rolls back up to sitting tall. She
  > moves smoothly; her shoulders stay relaxed and her feet stay on the mat. Two slow, controlled
  > repetitions, perfect form, no bouncing or swinging. She starts and ends in the same position.
  > Starting sitting tall, 2 slow repetitions in about 13 seconds. Each rep is a 3-second roll
  > back, a 1-second pause halfway, a 1.5-second roll up, and a 1-second pause sitting tall.
- Form check: her feet lift off the mat; her shoulders hunch up to her ears; she leans back
  with a straight spine instead of curling.

### The hundred (`hundred`)
- Clip file: `hundred.mp4` · Type: rep
- Equipment in scene: a thin grey mat
- Prompt (paste after the character and scene block):
  > Side-on low shot at floor level. She lies on her back on a thin grey mat with her head down,
  > knees bent over her hips and shins level with the floor, arms long by her sides and hovering
  > just above the mat. She pumps her straight arms up and down in small, quick beats, breathing
  > in for five beats and out for five beats. Her lower back stays steady on the mat and her head
  > stays down. Two slow, controlled repetitions, perfect form, no bouncing or swinging. She
  > starts and ends in the same position. Two full breath cycles in about 10 to 12 seconds: each
  > cycle is five small arm beats breathing in and five breathing out, then her arms settle back
  > to still.
- Form check: her lower back lifts or rocks; the beats are big swings from the shoulder rather
  than small pumps; her head lifts and strains.
- Notes: here one "repetition" is one breath cycle of ten beats; the doc's tempo doesn't apply.
  The cue lets people lift the head if their neck is comfortable; the clip shows the head down,
  which the cue leads with.

### Pelvic curl (`pelvic-curl`)
- Clip file: `pelvic-curl.mp4` · Type: rep
- Equipment in scene: a thin grey mat
- Prompt (paste after the character and scene block):
  > Side-on low shot at floor level. She lies on her back on a thin grey mat, knees bent, feet
  > flat and hip-width apart, arms long by her sides. She breathes out, tilts her pelvis, then
  > peels her spine off the mat bone by bone until her hips are level with her knees, making a
  > straight line from shoulders to knees with no arch. She then rolls back down from the top of
  > her back, one part at a time, until her tailbone touches the mat. Two slow, controlled
  > repetitions, perfect form, no bouncing or swinging. She starts and ends in the same position.
  > 2 slow repetitions in about 14 seconds. Each rep is a 2.5-second peel up, a 1-second pause at
  > the top, a 3-second roll down, and a 0.5-second pause on the mat.
- Form check: she lifts in one flat block rather than peeling; her hips rise above the line of
  her knees and her back arches; her knees splay apart.

### Roll-up (`roll-up`)
- Clip file: `roll-up.mp4` · Type: rep
- Equipment in scene: a thin grey mat
- Prompt (paste after the character and scene block):
  > Side-on low shot at floor level. She lies on her back on a thin grey mat, legs long and
  > together, arms reaching overhead. She brings her arms forward, curls her head and shoulders
  > up, and peels her spine off the mat to reach towards her feet, then rolls back down with
  > control, one part of her spine at a time, until her arms are overhead again. Her legs stay
  > on the mat and she never throws her arms or jerks up. Two slow, controlled repetitions,
  > perfect form, no bouncing or swinging. She starts and ends in the same position. 2 slow
  > repetitions in about 15 seconds. Each rep is a 2.5-second roll up, a 1-second reach towards
  > her feet, a 3-second roll down, and a 1-second pause with arms overhead.
- Form check: her legs lift off the mat; she jerks or throws her arms to get up; she sits up
  with a flat back rather than peeling through the spine.
- Notes: the cue's easier options (knees bent, or the half roll back) are not shown.

### Saw (`saw`)
- Clip file: `saw.mp4` · Type: rep
- Equipment in scene: a thin grey mat
- Prompt (paste after the character and scene block):
  > Front medium-wide shot at low height. She sits tall on a thin grey mat, legs wider than her
  > hips, knees slightly bent, arms reaching out to the sides at shoulder height. She twists
  > towards her left leg, then breathes out and reaches her right hand towards her left little
  > toe, only as far as is easy, then rolls back up and untwists to face forward. She repeats to
  > the right. Both sitting bones stay on the mat. Two slow, controlled repetitions, perfect
  > form, no bouncing or swinging. She starts and ends in the same position. 2 slow repetitions,
  > one each side, in about 13 seconds. Each rep is a 1.5-second twist, a 2-second reach, a
  > 1-second pause, and a 2-second roll back up to face forward.
- Form check: a sitting bone lifts as she twists; she bounces or forces the reach; her arms
  drop well below shoulder height.
- Notes: the cue doesn't say whether to alternate sides; I've alternated, as is usual for this
  move. If the app means one side per set, show the left twice and mirror.

### Side-lying leg series (`side-lying-leg-series`)
- Clip file: `side-lying-leg-series.mp4` · Type: rep
- Equipment in scene: a thin grey mat
- Prompt (paste after the character and scene block):
  > Front low shot at floor level. She lies on her right side on a thin grey mat, head resting
  > on her lower arm, body in one straight line from head to feet, hips stacked. She lifts her
  > top (left) leg a little higher than her hip, then lowers it with control. Her hips stay
  > stacked and don't roll backwards. Two slow, controlled repetitions, perfect form, no bouncing
  > or swinging. She starts and ends in the same position. 2 slow repetitions in about 13
  > seconds. Each rep is a 1.5-second lift, a 1-second pause at the top, a 3-second lowering, and
  > a 1-second pause with the legs together.
- Form check: her top hip rolls back; the leg swings up well past hip height; her body bends
  at the waist out of a straight line.
- Notes: the cue's "small forward and back swings" progression isn't shown; it could be a
  second clip. (mirror for the right side)

### Single-leg circles (`single-leg-circles`)
- Clip file: `single-leg-circles.mp4` · Type: rep
- Equipment in scene: a thin grey mat
- Prompt (paste after the character and scene block):
  > Low shot at floor level from beyond her feet, angled slightly to the side. She lies on her
  > back on a thin grey mat, right knee bent with the foot flat, left leg reaching up towards the
  > ceiling with a soft knee, arms long by her sides. She draws one small, slow circle with the
  > raised leg, then one small circle the other way. The circles stay small enough that her hips
  > stay still on the mat. Two slow, controlled repetitions, perfect form, no bouncing or
  > swinging. She starts and ends in the same position. 2 slow circles, one each direction, in
  > about 12 seconds. Each circle takes about 5 seconds, with a 1-second pause with the leg
  > pointing up after each.
- Form check: her hips rock or lift with the circle; the circles are large and swinging; her
  standing foot lifts.
- Notes: the app asks for five circles each way; the clip shows one each way. (mirror for the
  right side)

### Single-leg stretch (`single-leg-stretch`)
- Clip file: `single-leg-stretch.mp4` · Type: rep
- Equipment in scene: a thin grey mat
- Prompt (paste after the character and scene block):
  > Side-on low shot at floor level. She lies on her back on a thin grey mat with her head down,
  > hugging both knees in. She reaches her right leg out at a height where her lower back stays
  > settled on the mat while she keeps her left knee hugged in, then switches smoothly so the
  > left leg reaches out and the right knee comes in. She then brings the left leg back to hug
  > both knees. Her pelvis stays still and doesn't rock side to side. Two slow, controlled
  > repetitions, perfect form, no bouncing or swinging. She starts and ends in the same position.
  > 2 slow repetitions, one each side, in about 10 seconds: a 2-second reach of the right leg, a
  > 1-second hold, a 2-second smooth switch, a 1-second hold, a 2-second return to both knees
  > in, and a 1-second pause.
- Form check: her pelvis rocks from side to side; the reaching leg drops so low her back
  arches; the switch is jerky.
- Notes: the cue allows the head lifted if the neck is comfortable; the clip shows it down.

### Spine stretch forward (`spine-stretch-forward`)
- Clip file: `spine-stretch-forward.mp4` · Type: rep
- Equipment in scene: a thin grey mat
- Prompt (paste after the character and scene block):
  > Side-on wide shot at low height. The whole body is in frame from head to feet, because the legs and hips matter in this move. She sits tall on a thin grey mat, legs a little wider than
  > her hips, knees slightly bent, arms reaching forward at shoulder height. She breathes out and
  > curls forward from the top of her head, one part of her spine at a time, then rolls back up
  > to sitting tall, stacking her spine from the bottom up. Her shoulders stay relaxed; she
  > doesn't collapse from the lower back first or reach by rounding her shoulders. Two slow,
  > controlled repetitions, perfect form, no bouncing or swinging. She starts and ends in the same
  > position. Starting sitting tall, 2 slow repetitions in about 13 seconds. Each rep is a
  > 3-second curl forward, a 1-second pause, a 2-second roll up, and a 0.5-second pause sitting
  > tall.
- Form check: she tips forward from the hips with a flat back; she slumps from the lower back
  first; her shoulders hunch forward to reach further.

### Swan prep (`swan-prep`)
- Clip file: `swan-prep.mp4` · Type: rep
- Equipment in scene: a thin grey mat
- Prompt (paste after the character and scene block):
  > Side-on low shot at floor level. She lies on her front on a thin grey mat, forehead down,
  > hands by her shoulders and elbows close to her sides, legs long. She breathes in and lifts
  > her head and chest a little, using her back muscles more than her arms, then lowers slowly.
  > Her hips stay on the mat and the lift stays small. Two slow, controlled repetitions, perfect
  > form, no bouncing or swinging. She starts and ends in the same position. 2 slow repetitions
  > in about 13 seconds. Each rep is a 1.5-second lift, a 1-second pause, a 3-second lowering,
  > and a 1-second pause with the forehead down.
- Form check: she pushes up with straight arms; her hips lift off the mat; her head cranks
  back instead of staying in line with her spine.

### Swimming (lying face down) (`swimming`)
- Clip file: `swimming.mp4` · Type: rep
- Equipment in scene: a thin grey mat
- Prompt (paste after the character and scene block):
  > Side-on low shot at floor level. She lies on her front on a thin grey mat, arms reaching
  > past her head and legs long, forehead just off the mat and gaze down. She lifts her arms and
  > legs just off the mat, flutters them in four small, opposite beats (right arm with left leg,
  > then left arm with right leg), then lowers them back to the mat. Her neck stays long and her
  > gaze stays down. Two slow, controlled repetitions, perfect form, no bouncing or swinging. She
  > starts and ends in the same position. 2 repetitions in about 13 seconds. Each rep is a
  > 1.5-second lift, four small beats in about 2 seconds, a 2-second lowering, and a 1-second
  > rest on the mat.
- Form check: she cranks her head up to look forward; she lifts high by arching her lower
  back; the beats are big kicks rather than small flutters.
- Notes: the cue gives no beat count and no reps. To fit the "two reps" rule I defined a rep as
  lift, four beats, lower. In a real set people usually stay up for longer; a single longer
  bout may suit the move better.

### Teaser (`teaser`)
- Clip file: `teaser.mp4` · Type: rep
- Equipment in scene: a thin grey mat
- Prompt (paste after the character and scene block):
  > Side-on low shot at floor level. She lies on her back on a thin grey mat, knees bent and
  > feet lifted so her shins are level with the floor, arms long by her sides. She reaches her
  > arms towards her knees and rolls up smoothly, one part of her spine at a time, into a V
  > balance on her sitting bones with her knees still bent, then rolls back down one bone at a
  > time. She never jerks up with momentum. Two slow, controlled repetitions, perfect form, no
  > bouncing or swinging. She starts and ends in the same position. 2 slow repetitions in about
  > 15 seconds. Each rep is a 2-second roll up, a 1.5-second balance, a 3-second roll down, and
  > a 1-second pause lying down.
- Form check: she throws her arms or rocks to get up; her back rounds and collapses in the V
  instead of lifting tall; her feet drop to the mat.

### Toe taps (`toe-taps`)
- Clip file: `toe-taps.mp4` · Type: rep
- Equipment in scene: a thin grey mat
- Prompt (paste after the character and scene block):
  > Side-on low shot at floor level. She lies on her back on a thin grey mat, head down, arms
  > long by her sides, knees bent over her hips and shins level with the floor. She breathes out
  > and lowers her right foot to tap the mat lightly, keeping that knee bent at the same angle,
  > then brings it back up and repeats with the left. Her lower back stays settled on the mat.
  > Two slow, controlled repetitions, perfect form, no bouncing or swinging. She starts and ends
  > in the same position. 2 slow repetitions, one each side, in about 13 seconds. Each rep is a
  > 3-second lowering to a light tap, a 1-second pause, a 1.5-second return, and a 1-second
  > pause with both shins level.
- Form check: her lower back lifts off the mat as the foot lowers; the knee straightens to
  reach the floor; the foot drops and bounces off the mat.

## Strength

### Band lat pulldown (`band-lat-pulldown`)
- Clip file: `band-lat-pulldown.mp4` · Type: rep
- Equipment in scene: a plain closed door in the studio wall with a plain fabric door anchor at
  the top; a plain dark grey long resistance band
- Prompt (paste after the character and scene block):
  > Side-on three-quarter shot. A plain dark grey resistance band is anchored over the top of a
  > closed plain door with a door anchor. She kneels upright on the floor facing the door,
  > holding one end of the band in each hand, arms reaching up in front of her. She pulls her
  > elbows down towards her ribs until her hands reach her shoulders, chest up, then lets her
  > arms rise slowly back up. She doesn't lean back or swing to pull. Two slow, controlled
  > repetitions, perfect form, no bouncing or swinging. She starts and ends in the same position.
  > Starting with her arms reaching up, 2 slow repetitions in about 13 seconds. Each rep is a
  > 1.5-second pull, a 1-second squeeze with hands at her shoulders, a 3-second return, and a
  > 1-second stretch at the top.
- Form check: she leans back or rocks to pull; her chest drops as the elbows come down; the
  band snaps back up instead of being lowered slowly.
- Notes: the band and anchor must look plain with no branding. The cue also allows a sturdy
  beam; I chose the door.

### Band overhead press (`band-overhead-press`)
- Clip file: `band-overhead-press.mp4` · Type: rep
- Equipment in scene: a plain dark grey long resistance band
- Prompt (paste after the character and scene block):
  > Front three-quarter medium shot. She stands on the middle of a plain dark grey resistance
  > band with feet hip-width, holding one end in each hand at her shoulders, palms forward. She
  > presses her hands straight up until her arms are straight beside her ears, then lowers them
  > slowly back to her shoulders. Her ribs stay down and her bottom stays tucked in; she doesn't
  > lean back to finish the press. Two slow, controlled repetitions, perfect form, no bouncing or
  > swinging. She starts and ends in the same position. Starting with her hands at her shoulders,
  > 2 slow repetitions in about 13 seconds. Each rep is a 1.5-second press, a 1-second pause at
  > the top, a 3-second lowering, and a 1-second pause at the shoulders.
- Form check: her lower back arches and ribs flare at the top; she leans back; her hands press
  forward of her head instead of straight up.

### Band pull-through (`band-pull-through`)
- Clip file: `band-pull-through.mp4` · Type: rep
- Equipment in scene: a sturdy plain matte black upright post; a plain dark grey long resistance
  band looped round its base
- Prompt (paste after the character and scene block):
  > Side-on medium-wide shot. A plain dark grey resistance band is looped round the base of a
  > sturdy matte black post behind her. She stands facing away from the post, feet a little
  > wider than hip-width, with the band running forward between her legs and both hands holding
  > it in front of her hips. She pushes her hips back with a flat back, letting the band draw her
  > hands back through her legs until she feels a stretch in her hamstrings, then stands tall by
  > squeezing her glutes. Her arms just hold on and she doesn't lean back at the top. Two slow,
  > controlled repetitions, perfect form, no bouncing or swinging. She starts and ends in the
  > same position. Starting standing tall, 2 slow repetitions in about 13 seconds. Each rep is a
  > 3-second hinge back, a 1-second pause in the stretch, a 1.5-second drive up, and a 1-second
  > glute squeeze standing tall.
- Form check: her back rounds as she hinges; she squats down instead of pushing the hips back;
  she leans back or pulls with her arms at the top.

### Band seated row (`band-row`)
- Clip file: `band-row.mp4` · Type: rep
- Equipment in scene: a plain dark grey long resistance band
- Prompt (paste after the character and scene block):
  > Side-on medium shot at low height. She sits tall on the floor with her legs out and knees
  > slightly bent, the middle of a plain dark grey resistance band looped round her feet, an end
  > in each hand and arms straight. She pulls her hands to her lower ribs, squeezing her shoulder
  > blades together, then lets her arms straighten slowly. She stays sitting upright and doesn't
  > rock back to pull. Two slow, controlled repetitions, perfect form, no bouncing or swinging.
  > She starts and ends in the same position. Starting with her arms straight, 2 slow repetitions
  > in about 13 seconds. Each rep is a 1.5-second pull, a 1-second squeeze, a 3-second return,
  > and a 1-second stretch with arms straight.
- Form check: she rocks her body back to pull; she slumps and rounds her back; her shoulders
  shrug up as she pulls.

### Barbell overhead press (`barbell-overhead-press`)
- Clip file: `barbell-overhead-press.mp4` · Type: rep
- Equipment in scene: a squat rack behind her; a barbell with light plates
- Prompt (paste after the character and scene block):
  > The equipment she uses is a single matte black squat rack with a barbell, clean and
  > modern, with no branding or logos. Side-on medium shot. She stands a step in front of the
  > rack with feet hip-width, the bar resting on the front of her shoulders, hands just wider
  > than shoulder-width. Braced, ribs down and glutes tight, she presses the bar straight up,
  > moving her head back a little to let it pass and forward once it's overhead, until her arms
  > are straight with the bar over her mid-foot. She then lowers it under control to her
  > shoulders. She doesn't lean back or bend her knees to drive it up. Two slow, controlled
  > repetitions, perfect form, no bouncing or swinging. She starts and ends in the same position.
  > Starting with the bar on her shoulders, 2 slow repetitions in about 13 seconds. Each rep is a
  > 1.5-second press, a 1-second pause overhead, a 3-second lowering, and a 1-second pause at the
  > shoulders.
- Form check: she leans back and arches her lower back; she dips her knees to push the bar;
  the bar travels forward around her face instead of straight up.
- Notes: taking the bar out of the rack isn't shown, so the loop stays clean.

### Cable crunch (`cable-crunch`)
- Clip file: `cable-crunch.mp4` · Type: rep
- Equipment in scene: a cable station with a rope attachment at the top; a thin grey mat
- Prompt (paste after the character and scene block):
  > The equipment she uses is a single matte black cable station with a rope attachment
  > at the top, clean and modern, with no branding or logos. Side-on medium shot. She kneels on a
  > mat facing the cable station, holding the rope beside her head. Keeping her hips still, she
  > crunches her ribs down towards her hips, rounding her spine, pauses, then uncurls slowly back
  > to upright. The movement comes from her abs, not from sitting back on her heels. Two slow,
  > controlled repetitions, perfect form, no bouncing or swinging. She starts and ends in the same
  > position. 2 slow repetitions in about 13 seconds. Each rep is a 1.5-second crunch, a 1-second
  > hold, a 3-second return, and a 1-second pause upright.
- Form check: she sits back onto her heels instead of crunching; her arms pull the rope down
  rather than staying fixed by her head; her back stays flat rather than rounding.
- Notes: wording reused from the doc (16a). The library cue for this id also holds the dead bug
  text; this clip is the cable crunch only.

### Cable fly (`cable-fly`)
- Clip file: `cable-fly.mp4` · Type: rep
- Equipment in scene: a dual cable station with single handles set at chest height
- Prompt (paste after the character and scene block):
  > The equipment she uses is a single matte black dual cable station with single
  > handles set at chest height, clean and modern, with no branding or logos. Front three-quarter
  > medium-wide shot. She stands between the two cables, one step forward, holding a handle in
  > each hand with her arms open wide and elbows softly bent. She brings her hands together in
  > front of her chest in a wide hugging arc, then opens back out slowly, stopping before her
  > arms travel far behind her body. Light weight. Two slow, controlled repetitions, perfect form,
  > no bouncing or swinging. She starts and ends in the same position. Starting with her arms
  > open, 2 slow repetitions in about 13 seconds. Each rep is a 1.5-second hug in, a 1-second
  > squeeze with hands together, a 3-second opening, and a 1-second pause with arms open.
- Form check: her arms travel well behind her body at the open position; her elbows bend and
  straighten so it becomes a press; she leans or rocks forward to bring the handles in.

### Calf raise (`calf-raise`)
- Clip file: `calf-raise.mp4` · Type: rep
- Equipment in scene: a low, sturdy step; one dumbbell; the studio wall
- Prompt (paste after the character and scene block):
  > Side-on wide shot. The whole body is in frame from head to feet, because the legs and hips matter in this move. She
  > stands with the balls of her feet on the edge of a low, sturdy step, heels hanging off,
  > lightly holding the wall for balance and a dumbbell in the other hand. She rises onto the
  > balls of her feet as high as she can, pauses at the top, then lowers slowly until her heels
  > drop below the step for a full calf stretch. No bouncing. Two slow, controlled repetitions,
  > perfect form, no bouncing or swinging. She starts and ends in the same position. 2 slow
  > repetitions in about 13 seconds. Each rep is a 1.5-second rise, a 1-second pause at the top,
  > a 3-second lowering, and a 1-second stretch at the bottom.
- Form check: she bounces at the bottom; she doesn't rise fully onto the balls of her feet;
  she leans on the wall to lift herself.
- Notes: wording reused from the doc (4), the standing version.

### Chest press (machine or dumbbell) (`chest-press`)
- Clip file: `chest-press.mp4` · Type: rep
- Equipment in scene: a flat bench; two dumbbells
- Prompt (paste after the character and scene block):
  > Low side angle. She lies on a flat bench with her feet flat on the floor and her shoulder
  > blades pulled back, holding a dumbbell in each hand above her chest, arms almost straight.
  > She lowers the dumbbells under control until they are level with her mid-chest, elbows at
  > about 45 degrees from her body, then presses them up smoothly, stopping just short of locking
  > her elbows. Two slow, controlled repetitions, perfect form, no bouncing or swinging. She
  > starts and ends in the same position. Starting with the dumbbells pressed up, 2 slow
  > repetitions in about 11 seconds. Each rep is a 2-second lowering to mid-chest, a 1-second
  > pause, a 1.5-second press, and a 1-second pause at the top.
- Form check: she locks her elbows out hard at the top; her elbows flare out to 90 degrees;
  the dumbbells drop fast or bounce at the chest.
- Notes: the doc's wording, with the lowering changed from 3 s to 2 s to match the cue ("Lower
  under control for ~2 seconds"). The cue's "handles" and the `seated` position suggest the
  machine version; if you want that instead, use the machine line with "seated chest press
  machine" and have her sit upright with the handles level with her mid-chest.

### Dumbbell bent-over row (`db-bent-over-row`)
- Clip file: `db-bent-over-row.mp4` · Type: rep
- Equipment in scene: two dumbbells
- Prompt (paste after the character and scene block):
  > Side-on wide shot. The whole body is in frame from head to feet, because the legs and hips matter in this move. She stands holding a dumbbell in each hand, knees soft, hinged forward
  > from her hips so her body is at about 45 degrees, back flat, the weights hanging under her
  > shoulders. She rows the dumbbells towards her hips, squeezing her shoulder blades together,
  > then lowers them slowly until her arms hang straight. Her back stays flat and her body stays
  > still; she doesn't stand up to heave the weight. Two slow, controlled repetitions, perfect
  > form, no bouncing or swinging. She starts and ends in the same position. Starting hinged with
  > the dumbbells hanging, 2 slow repetitions in about 13 seconds. Each rep is a 1.5-second row,
  > a 1-second squeeze, a 3-second lowering, and a 1-second hang at the bottom.
- Form check: her back rounds; her torso rises towards standing as she rows; the weights are
  jerked up.
- Notes: the clip starts already in the hinge; hinging into it isn't shown.

### Dumbbell Bulgarian split squat (`db-bulgarian-split-squat`)
- Clip file: `db-bulgarian-split-squat.mp4` · Type: rep
- Equipment in scene: a flat bench; two dumbbells
- Prompt (paste after the character and scene block):
  > Side-on medium-wide shot. She stands tall holding a dumbbell in each hand at her sides, the
  > top of her right foot resting on a flat bench behind her, left foot far enough forward that
  > its heel stays down at the bottom. She lowers straight down until her back knee nears the
  > floor, then pushes up through her left foot to stand tall. Her front knee tracks over her
  > toes and doesn't drift inwards. Two slow, controlled repetitions, perfect form, no bouncing or
  > swinging. She starts and ends in the same position. 2 slow repetitions in about 13 seconds.
  > Each rep is a 3-second descent, a 1-second pause with the back knee just above the floor, a
  > 1.5-second drive up, and a 1-second pause at the top.
- Form check: her front heel lifts at the bottom; her front knee drifts inwards; the back knee
  bangs the floor.
- Notes: left leg working (in front). (mirror for the right side)

### Dumbbell pullover (`db-pullover`)
- Clip file: `db-pullover.mp4` · Type: rep
- Equipment in scene: a flat bench; one dumbbell
- Prompt (paste after the character and scene block):
  > Low side angle. She lies along a flat bench, head supported, feet flat on the floor, holding
  > one light dumbbell in both hands above her chest with elbows softly bent. She lowers it slowly
  > back over her head in an arc, only as far as her ribs stay down and her shoulders are
  > comfortable, then pulls it back up over her chest. She doesn't arch her back to reach further.
  > Two slow, controlled repetitions, perfect form, no bouncing or swinging. She starts and ends
  > in the same position. Starting with the dumbbell over her chest, 2 slow repetitions in about
  > 13 seconds. Each rep is a 3-second lowering, a 1-second pause, a 1.5-second pull back over
  > the chest, and a 1-second pause at the top.
- Form check: her lower back arches and ribs flare as the weight goes back; her elbows bend
  and straighten so it becomes a triceps extension; she lowers too far and fast.
- Notes: the cue also allows the floor for a shorter range; the clip uses the bench.

### Single-leg Romanian deadlift (dumbbell) (`db-sl-rdl`)
- Clip file: `db-sl-rdl.mp4` · Type: rep
- Equipment in scene: one dumbbell; the studio wall
- Prompt (paste after the character and scene block):
  > Side-on medium-wide shot. She stands on her left leg, knee soft, a short step from the studio
  > wall with the fingertips of her left hand resting lightly on it for balance, holding a
  > dumbbell in her right hand. She hinges at her hips, reaching her right leg straight back and
  > letting the weight travel down close to her standing leg, back flat and hips square, only as
  > far as she can go without twisting. She then stands up by squeezing her left glute. Two slow,
  > controlled repetitions, perfect form, no bouncing or swinging. She starts and ends in the same
  > position. Starting standing tall on one leg, 2 slow repetitions in about 13 seconds. Each rep
  > is a 3-second hinge down, a 1-second pause in the stretch, a 1.5-second drive up, and a
  > 1-second glute squeeze at the top.
- Form check: her hips open or twist towards the ceiling; her back rounds; the dumbbell drifts
  away from her standing leg.
- Notes: standing on the left leg, dumbbell in the right hand. The cue allows a wall or chair;
  I chose the wall. (mirror for the right side)

### Hammer curl (`hammer-curl`)
- Clip file: `hammer-curl.mp4` · Type: rep
- Equipment in scene: two dumbbells
- Prompt (paste after the character and scene block):
  > Side-on three-quarter medium shot. She stands tall with a dumbbell by each side, palms facing
  > each other. She curls both dumbbells up with her elbows still at her sides, keeping her palms
  > facing each other, then lowers them slowly until her arms are straight. She doesn't swing her
  > body or let her elbows drift forward. Two slow, controlled repetitions, perfect form, no
  > bouncing or swinging. She starts and ends in the same position. 2 slow repetitions in about 13
  > seconds. Each rep is a 1.5-second curl up, a 1-second squeeze at the top, a 3-second lowering
  > to straight arms, and a 1-second pause at the bottom.
- Form check: she swings her body or leans back; her elbows drift forward; her palms rotate to
  face up.

### Kettlebell swing (`kb-swing`)
- Clip file: `kb-swing.mp4` · Type: rep
- Equipment in scene: one kettlebell
- Prompt (paste after the character and scene block):
  > Side-on medium-wide shot with clear space around her. She stands with feet a little wider than
  > her hips, a kettlebell on the floor a step in front. She hinges at her hips with a flat back,
  > grips the bell and hikes it back between her thighs, keeping it above knee height. She stands
  > up quickly by squeezing her glutes so the bell floats up to chest height; her arms just hold
  > on and don't lift. She lets it fall back into the next hinge rather than squatting to meet it,
  > and she doesn't lean back at the top. After the second swing she lets it swing back once more
  > and sets it down in front of her with a flat back, then stands tall. Two controlled swings,
  > perfect form. She starts and ends in the same position. Starting standing behind the bell, the
  > clip is about 10 seconds: a 2-second set-up and hike, two swings of about 1.5 to 2 seconds
  > each, and a 2 to 3-second park and stand.
- Form check: she squats down with bent knees to meet the bell instead of hinging; she lifts
  the bell with her arms or leans back at the top; her back rounds on the hike or the set-down.
- Notes: a swing is ballistic, so the doc's slow tempo and the "no bouncing or swinging" ending
  don't apply; the ending line and timing here are my own, and the swing timing is a judgement
  call. Clear space matters on screen as well as in the cue.

### Landmine press (`landmine-press`)
- Clip file: `landmine-press.mp4` · Type: rep
- Equipment in scene: a barbell with one end in a floor landmine holder and a light plate on the
  free end
- Prompt (paste after the character and scene block):
  > Side-on three-quarter medium shot. One end of a matte black barbell sits in a floor landmine
  > holder, with a light plate on the other end. She stands in a staggered stance facing the
  > holder, holding the free end of the bar at her left shoulder in her left hand. She presses it
  > up and forward until her arm is straight, then lowers it under control back to her shoulder.
  > Her ribs stay down and she doesn't lean back to finish the press. Two slow, controlled
  > repetitions, perfect form, no bouncing or swinging. She starts and ends in the same position.
  > Starting with the bar at her shoulder, 2 slow repetitions in about 13 seconds. Each rep is a
  > 1.5-second press, a 1-second pause with the arm straight, a 3-second lowering, and a 1-second
  > pause at the shoulder.
- Form check: she leans back or arches to finish; her torso twists as she presses; the bar is
  dropped back to the shoulder fast.
- Notes: left arm pressing, standing. The cue allows half-kneeling and doesn't say one arm or
  two, or which foot is forward; I chose one arm, standing, with a staggered stance. Check this
  matches the app's intent. (mirror for the right side)

### Overhead triceps extension (`overhead-triceps-extension`)
- Clip file: `overhead-triceps-extension.mp4` · Type: rep
- Equipment in scene: one dumbbell
- Prompt (paste after the character and scene block):
  > Side-on medium shot. She stands tall holding one dumbbell in both hands above her head, arms
  > straight. She bends her elbows to lower the dumbbell behind her head, elbows pointing forward,
  > then straightens her arms to lift it back up. Her ribs stay down and she doesn't arch her
  > back. Two slow, controlled repetitions, perfect form, no bouncing or swinging. She starts and
  > ends in the same position. Starting with the dumbbell overhead, 2 slow repetitions in about 13
  > seconds. Each rep is a 3-second lowering behind the head, a 1-second pause in the stretch, a
  > 1.5-second press up, and a 1-second pause at the top.
- Form check: her elbows flare out wide; her lower back arches and ribs flare; her upper arms
  swing forward and back instead of staying still.
- Notes: the cue allows sitting or standing, and the library lists a cable option; the clip is
  the standing dumbbell version.

### Pallof press (`pallof-press`)
- Clip file: `pallof-press.mp4` · Type: rep
- Equipment in scene: a cable station with a single handle at chest height
- Prompt (paste after the character and scene block):
  > The equipment she uses is a single matte black cable station with a single handle
  > set at chest height, clean and modern, with no branding or logos. Front medium-wide shot, the
  > cable station at the side of the frame. She stands side-on to the cable station, which is on
  > her left, feet hip-width, knees soft, holding the handle in both hands at the middle of her
  > chest. She presses it straight out in front, pauses with her arms straight, then brings it
  > back to her chest. Her body keeps facing forward; her hips and shoulders don't turn towards
  > the cable. Two slow, controlled repetitions, perfect form, no bouncing or swinging. She starts
  > and ends in the same position. Starting with the handle at her chest, 2 slow repetitions in
  > about 13 seconds. Each rep is a 1.5-second press out, a 2-second hold with arms straight, a
  > 2-second return, and a 1-second pause at the chest.
- Form check: her shoulders or hips rotate towards the cable; her hands drift off the midline
  towards the anchor; she leans away from the cable.
- Notes: cable on her left. The cue also allows a band; the clip uses the cable. Timing is a
  judgement call (no lowering phase). (mirror for the right side)

### Standing dumbbell shoulder press (`standing-db-press`)
- Clip file: `standing-db-press.mp4` · Type: rep
- Equipment in scene: two dumbbells
- Prompt (paste after the character and scene block):
  > Front three-quarter medium shot. She stands with feet hip-width, a dumbbell in each hand at
  > her shoulders, palms facing forward. Stomach braced and glutes squeezed, she presses the
  > weights up until her arms are straight, then lowers them slowly back to her shoulders. Her
  > ribs stay down and she doesn't lean back to finish a rep. Two slow, controlled repetitions,
  > perfect form, no bouncing or swinging. She starts and ends in the same position. Starting with
  > the dumbbells at her shoulders, 2 slow repetitions in about 13 seconds. Each rep is a
  > 1.5-second press, a 1-second pause at the top, a 3-second lowering, and a 1-second pause at
  > the shoulders.
- Form check: she leans back and her lower back arches; she dips her knees to drive up; the
  dumbbells drop fast to the shoulders.
- Notes: the cue allows palms forward or towards each other; the clip shows palms forward.

### Straight-arm pulldown (`straight-arm-pulldown`)
- Clip file: `straight-arm-pulldown.mp4` · Type: rep
- Equipment in scene: a cable station with a straight bar attachment at the top
- Prompt (paste after the character and scene block):
  > The equipment she uses is a single matte black cable station with a straight bar
  > attachment at the top, clean and modern, with no branding or logos. Side-on medium shot. She
  > stands facing the cable station, feet hip-width, holding the bar at shoulder height with her
  > arms straight and a soft bend at the elbows. She sweeps her hands down in an arc to her
  > thighs, keeping her arms straight, then lets them rise slowly back to shoulder height. Her
  > ribs stay down and her body stays still; her elbows don't bend into a pushdown. Two slow,
  > controlled repetitions, perfect form, no bouncing or swinging. She starts and ends in the same
  > position. Starting with the bar at shoulder height, 2 slow repetitions in about 13 seconds.
  > Each rep is a 1.5-second sweep down, a 1-second squeeze at the thighs, a 3-second return, and
  > a 1-second pause at shoulder height.
- Form check: her elbows bend and straighten, making it a triceps pushdown; she rocks her body
  forward to pull; her ribs flare as the bar rises.
- Notes: the cue says "the handle or band ends"; a straight bar is my pick of handle. The band
  version isn't shown.

### Suitcase carry (`suitcase-carry`)
- Clip file: `suitcase-carry.mp4` · Type: rep (see notes)
- Equipment in scene: one kettlebell
- Prompt (paste after the character and scene block):
  > Side-on wide shot with room for her to walk across the frame. She stands tall with a
  > kettlebell on the floor beside her left foot. She bends at her hips and knees with a flat back
  > to pick it up in her left hand and stands tall. She walks four short, steady steps forward,
  > turns round and walks four steps back, keeping her shoulders level and her body upright; she
  > doesn't lean away from the weight or let it swing. She then sets it down beside her left foot
  > with a flat back and stands tall. Perfect form, no bouncing or swinging. She starts and ends
  > in the same position. The clip is about 13 seconds: a 2-second pick-up, about 9 seconds of
  > steady walking including the turn, and a 2-second set-down.
- Form check: she leans away from the weight or her shoulders tilt; the kettlebell swings as
  she walks; her back rounds on the pick-up or set-down.
- Notes: logged as `weight-reps` but a carry has no reps, so the clip is one carry rather than
  two reps. The turn is the riskiest part for the model; if it keeps going wrong, a front-on
  shot of her walking towards the camera, with no turn, would suit a non-looping clip instead.
  The cue allows a dumbbell or kettlebell; I chose the kettlebell. Left hand carrying.
  (mirror for the right side)

### Trap-bar deadlift (`trap-bar-deadlift`)
- Clip file: `trap-bar-deadlift.mp4` · Type: rep
- Equipment in scene: a trap bar with plates
- Prompt (paste after the character and scene block):
  > Side-on medium-wide shot. She stands inside a matte black trap bar resting on the floor, feet
  > hip-width with the handles in line with the middle of her feet. She has bent her hips and
  > knees to grip the handles, chest up and back flat. She pushes the floor away to stand tall,
  > then lowers the bar the same way under control back to the floor, and resets. Her back stays
  > flat the whole time. Two slow, controlled repetitions, perfect form, no bouncing or swinging.
  > She starts and ends in the same position. Starting gripping the handles with the bar on the
  > floor, 2 repetitions in about 12 seconds. Each rep is a 1.5-second lift, a 1-second pause
  > standing tall, a 2.5-second controlled lowering to the floor, and a 1-second reset with the
  > bar on the floor.
- Form check: her back rounds as she lifts or lowers; her hips shoot up before her chest; the
  bar is dropped or bounced off the floor.
- Notes: like the doc's conventional deadlift, this is lowered under control but not slowly, so
  the lowering is 2.5 s rather than 3 s (a judgement call). The clip starts already gripping
  the bar, so the loop stays clean.

## Yoga

### Bridge pose (`bridge-pose`)
- Clip file: `bridge-pose.mp4` · Type: hold
- Equipment in scene: a thin grey mat
- Prompt (paste after the character and scene block):
  > Side-on low shot at floor level. She lies on her back on a thin grey mat, knees bent, feet
  > hip-width and close to her bottom, arms long by her sides, palms down. She presses through her
  > feet to lift her hips and holds, her weight on her shoulders and upper back, head still and
  > facing the ceiling. She then lowers her hips back to the mat. Starting lying with knees bent,
  > she moves slowly into the bridge over about 3 seconds, holds it steadily for about 8 to 10
  > seconds, breathing slowly, then returns slowly to the mat over about 3 seconds. She starts and
  > ends in the same position.
- Form check: her head turns while her hips are up; her weight rolls onto her neck; her knees
  splay out wide.

### Child's pose (`childs-pose`)
- Clip file: `childs-pose.mp4` · Type: hold
- Equipment in scene: a thin grey mat
- Prompt (paste after the character and scene block):
  > Side-on low shot at floor level. She kneels upright on a thin grey mat, big toes together and
  > knees apart. She sits back towards her heels and folds forward, arms reaching ahead on the
  > mat, and rests her forehead on the mat, breathing into her back. She then walks her hands back
  > and rises to kneeling upright. Starting kneeling upright, she moves slowly into the pose over
  > about 3 seconds, holds it steadily for about 8 to 10 seconds, breathing slowly, then returns
  > slowly to kneeling upright over about 3 seconds. She starts and ends in the same position.
- Form check: her knees are together so her chest can't fold between them; her forehead hovers
  and her neck strains; she rushes in or out.
- Notes: the cue allows arms ahead or by the sides, and a cushion for knees or hips; the clip
  shows arms ahead, no cushion.

### Low cobra (`cobra`)
- Clip file: `cobra.mp4` · Type: hold
- Equipment in scene: a thin grey mat
- Prompt (paste after the character and scene block):
  > Side-on low shot at floor level. She lies on her front on a thin grey mat, forehead down,
  > hands under her shoulders and elbows close to her sides, legs long. She lifts her chest a
  > little using her back muscles, with only light pressure through her hands and her elbows
  > still bent, then lowers back down. Starting lying flat, she moves slowly into the low cobra
  > over about 3 seconds, holds it steadily for about 8 to 10 seconds, breathing slowly, then
  > returns slowly to the mat over about 3 seconds. She starts and ends in the same position.
- Form check: she pushes up onto straight arms; her head cranks back; her elbows flare out
  wide.

### Dolphin pose (`dolphin`)
- Clip file: `dolphin.mp4` · Type: hold
- Equipment in scene: a thin grey mat
- Prompt (paste after the character and scene block):
  > Side-on low shot at floor level. She starts on hands and knees on a thin grey mat, lowers onto
  > her forearms with elbows under her shoulders, tucks her toes and lifts her hips up and back
  > with her knees bent. She presses gently through her forearms so her head doesn't sink between
  > her shoulders. She then lowers her knees and comes back up to hands and knees. Starting on
  > hands and knees, she moves slowly into the pose over about 3 seconds, holds it steadily for
  > about 8 to 10 seconds, breathing slowly, then returns slowly to hands and knees over about 3
  > seconds. She starts and ends in the same position.
- Form check: her head sinks between her shoulders; her elbows slide out wider than her
  shoulders; she forces her legs straight and rounds her back.
- Notes: the cue says "knees bent as much as you like"; the clip shows them bent.

### Downward dog (`downward-dog`)
- Clip file: `downward-dog.mp4` · Type: hold
- Equipment in scene: a thin grey mat
- Prompt (paste after the character and scene block):
  > Side-on low shot at floor level. She is on hands and knees on a thin grey mat, hands
  > shoulder-width with fingers spread. She tucks her toes and lifts her hips up and back, knees
  > bent enough to keep her back long and flat, heels lifted off the floor. She then lowers her
  > knees back to hands and knees. Starting on hands and knees, she moves slowly into downward dog
  > over about 3 seconds, holds it steadily for about 8 to 10 seconds, breathing slowly, then
  > returns slowly to hands and knees over about 3 seconds. She starts and ends in the same
  > position.
- Form check: her back rounds as she pushes the legs straight; her heels are forced down at
  the cost of a flat back; her hands creep or her fingers bunch together.

### Half sun salutation (`half-sun-salutation`)
- Clip file: `half-sun-salutation.mp4` · Type: steady
- Equipment in scene: none
- Prompt (paste after the character and scene block):
  > Side-on medium-wide shot, full body. She stands tall, arms by her sides. She breathes in and
  > reaches her arms up, breathes out and folds forward with her knees bent, breathes in and lifts
  > halfway with a long back and her hands on her shins, breathes out and folds again, then
  > breathes in to rise back up with her arms overhead and lowers them to her sides. Each move
  > follows one breath; her knees never lock in the fold. She moves at a steady, easy pace the
  > whole time, relaxed and breathing comfortably, as if she could hold a conversation. The clip
  > loops, so her pace and position look the same at the start and end. One full round in about
  > 12 seconds, roughly 2 seconds per move, starting and ending standing tall with arms by her
  > sides.
- Form check: her knees lock straight in the fold; her back rounds in the halfway lift; the
  moves run ahead of the breath.
- Notes: a full round doesn't fit the 8 to 10 s the brief asks for; 12 s is already a brisk
  breath. Lowering the arms at the end is my addition, so the loop closes where it began.

### Legs up the wall (`legs-up-the-wall`)
- Clip file: `legs-up-the-wall.mp4` · Type: hold
- Equipment in scene: the studio wall
- Prompt (paste after the character and scene block):
  > Side-on low shot at floor level, the studio wall at one side of the frame. She sits side-on
  > to the wall, one hip close to it. She lies back as she swings her legs up the wall, her bottom
  > close to the wall, arms resting by her sides, and breathes slowly. She then bends her knees,
  > rolls onto her side and comes back up to sitting side-on to the wall. Starting sitting
  > side-on to the wall, she moves slowly into the pose over about 3 seconds, holds it steadily
  > for about 8 to 10 seconds, breathing slowly, then returns slowly to sitting over about 3
  > seconds. She starts and ends in the same position.
- Form check: she swings her legs up fast; her lower back lifts off the floor; she tenses her
  shoulders or neck instead of resting.
- Notes: the cue doesn't describe how to come out. Rolling onto the side is my choice; it is a
  gentle, common way out, but check it. The 3-second entry and exit are tight for this move;
  the model may need longer.

### Low lunge (`low-lunge`)
- Clip file: `low-lunge.mp4` · Type: hold
- Equipment in scene: a thin grey mat, folded under the back knee
- Prompt (paste after the character and scene block):
  > Side-on low shot at floor level. She starts on hands and knees on a thin grey mat. She steps
  > her left foot forward between her hands and lowers her right knee onto a folded part of the
  > mat, then brings her hands onto her front thigh. Her front knee stays over her ankle and her
  > hips sink gently forward without her lower back arching. She then brings her hands back down
  > and steps the left foot back to hands and knees. Starting on hands and knees, she moves slowly
  > into the lunge over about 3 seconds, holds it steadily for about 8 to 10 seconds, breathing
  > slowly, then returns slowly to hands and knees over about 3 seconds. She starts and ends in
  > the same position.
- Form check: her front knee pushes past her ankle; her lower back arches to sink deeper; her
  back knee is on the bare floor rather than the folded mat.
- Notes: left foot forward. The cue doesn't state the starting position; hands and knees is my
  choice, since stepping "forward between your hands" implies it. The cue allows blocks; not
  shown. (mirror for the right side)

### Mountain pose (`mountain-pose`)
- Clip file: `mountain-pose.mp4` · Type: hold
- Equipment in scene: none
- Prompt (paste after the character and scene block):
  > Front medium-wide shot, full body. She stands relaxed, then settles into mountain pose: feet
  > hip-width, weight spread evenly through both feet, arms relaxed by her sides. She lengthens up
  > through the top of her head, softens her shoulders and breathes slowly. Her knees are soft,
  > not locked, and her chest isn't pushed forward. She then relaxes out of it. Starting standing
  > relaxed, she moves slowly into the pose over about 3 seconds, holds it steadily for about 8 to
  > 10 seconds, breathing slowly, then relaxes slowly back to standing over about 3 seconds. She
  > starts and ends in the same position.
- Form check: her knees lock back; she pushes her chest forward and arches; her shoulders rise
  and tense.
- Notes: the change between "relaxed" and "mountain" is subtle, so the in and out may barely
  read on screen. A clip that simply holds the pose may be enough; your call.

### Pigeon pose (`pigeon`)
- Clip file: `pigeon.mp4` · Type: hold
- Equipment in scene: a thin grey mat; one plain grey yoga block
- Prompt (paste after the character and scene block):
  > Front three-quarter low shot at floor level. She starts on hands and knees on a thin grey mat,
  > a plain grey yoga block beside her. She brings her left knee forward towards her left wrist
  > and lets her left foot rest near her right hip, so her shin sits at a gentle angle rather than
  > straight across the mat, and flexes the front foot. She slides her right leg straight back and
  > settles her left hip onto the block so her hips stay level. She stays upright on her hands.
  > She then tucks her back toes, lifts her hips and brings her right knee forward back to hands
  > and knees. Starting on hands and knees, she moves slowly into the pose over about 3 seconds,
  > holds it steadily for about 8 to 10 seconds, breathing slowly, then returns slowly to hands
  > and knees over about 3 seconds. She starts and ends in the same position.
- Form check: her front shin is pulled straight across the mat; her hips tip over to one side
  with no support under the front hip; her front foot is floppy rather than flexed.
- Notes: left leg in front. The cue doesn't say how to come out; the exit is my choice. The
  3-second entry is tight for a pose with this many steps and the model may need longer. The
  forward-fold option is not shown. (mirror for the right side)

### Reclined figure four (`reclined-figure-four`)
- Clip file: `reclined-figure-four.mp4` · Type: hold
- Equipment in scene: a thin grey mat
- Prompt (paste after the character and scene block):
  > Side-on low shot at floor level. She lies on her back on a thin grey mat with both knees bent
  > and feet flat. She crosses her left ankle over her right knee and flexes the left foot, then
  > lifts her right foot, holds behind her right thigh with both hands and draws it gently
  > towards her. Her head and shoulders stay relaxed on the mat and she doesn't press on the
  > crossed knee. She then lowers the right foot and uncrosses. Starting lying with both knees
  > bent, she moves slowly into the stretch over about 3 seconds, holds it steadily for about 8 to
  > 10 seconds, breathing slowly, then returns slowly to both feet flat over about 3 seconds. She
  > starts and ends in the same position.
- Form check: she presses down on the crossed knee; her head and shoulders lift off the mat;
  the crossed foot is floppy rather than flexed.
- Notes: stretching the left hip (left ankle crossed). (mirror for the right side)

### Rest pose (savasana) (`rest-pose`)
- Clip file: `rest-pose.mp4` · Type: hold
- Equipment in scene: a thin grey mat
- Prompt (paste after the character and scene block):
  > Side-on low shot at floor level. She sits on a thin grey mat with her knees bent, then lies
  > back and lets her legs slide long, arms a little away from her sides, palms up. Her body looks
  > heavy and relaxed and her breathing slows. She then bends her knees, rolls onto her side and
  > presses up to sitting. Starting sitting, she moves slowly into the pose over about 3 seconds,
  > rests steadily for about 8 to 10 seconds, breathing slowly, then returns slowly to sitting
  > over about 3 seconds. She starts and ends in the same position.
- Form check: she looks tense or fidgets; her palms face down or her arms are pinned to her
  sides; she sits straight up with a jerk instead of rolling to the side.
- Notes: the cue doesn't say how to get in or out; lying back from sitting and rolling to the
  side to come up are my choices. The optional cushion under the knees is not shown.

### Seated forward fold (knees bent) (`seated-forward-fold`)
- Clip file: `seated-forward-fold.mp4` · Type: hold
- Equipment in scene: a thin grey mat; a folded plain blanket
- Prompt (paste after the character and scene block):
  > Side-on low shot at floor level. She sits on a folded plain blanket on a thin grey mat, legs
  > out in front with her knees bent, hands resting on her shins. She lengthens up, then folds
  > forward from her hips, bringing her belly towards her thighs, back long. She doesn't round
  > forward or pull on her feet to get lower. She then rises back to sitting tall. Starting
  > sitting tall, she moves slowly into the fold over about 3 seconds, holds it steadily for about
  > 8 to 10 seconds, breathing slowly, then returns slowly to sitting tall over about 3 seconds.
  > She starts and ends in the same position.
- Form check: she rounds her back to reach down; she pulls on her feet; her knees are forced
  straight.

### Sphinx pose (`sphinx`)
- Clip file: `sphinx.mp4` · Type: hold
- Equipment in scene: a thin grey mat
- Prompt (paste after the character and scene block):
  > Side-on low shot at floor level. She lies on her front on a thin grey mat, forehead resting on
  > her stacked hands. She props herself up on her forearms, elbows under her shoulders, and lets
  > her chest lift gently while her hips and legs stay heavy on the mat. She then lowers back
  > down. Starting lying flat, she moves slowly into the pose over about 3 seconds, holds it
  > steadily for about 8 to 10 seconds, breathing slowly, then returns slowly to the mat over
  > about 3 seconds. She starts and ends in the same position.
- Form check: her hips lift off the mat; her shoulders sink up round her ears; her head
  cranks back.
- Notes: the start with forehead on her hands is my choice; the cue doesn't give one.

### Sun salutation A (`sun-salutation-a`)
- Clip file: `sun-salutation-a.mp4` · Type: steady
- Equipment in scene: a thin grey mat
- Prompt (paste after the character and scene block):
  > Side-on wide shot, full body, the whole mat in frame. She stands tall at the front of a thin
  > grey mat. She reaches up, folds forward, lifts halfway, then steps back to a plank. She lowers
  > with her knees down, lifts into a low cobra, and presses back to downward dog for one breath,
  > then steps forward and rises back to standing. One breath per move, knees down to lower and
  > the cobra kept low. She moves at a steady, easy pace the whole time, relaxed and breathing
  > comfortably, as if she could hold a conversation. The clip loops, so her pace and position
  > look the same at the start and end. One full round, about 2 seconds per move, starting and
  > ending standing tall at the front of the mat.
- Form check: her hips sag in the plank or as she lowers; she pushes up into a high cobra on
  straight arms; she rushes ahead of her breath.
- Notes: **decision needed.** This is about 20 to 25 s even at a brisk 2 s a move, well past
  the brief's 8 to 10 s and possibly past what Seedance can generate in one clip. The cue says
  "a few breaths" in downward dog; I cut that to one for length. The cue doesn't say whether she
  folds again after stepping forward before rising; the prompt leaves it as "steps forward and
  rises".

### Sun salutation B (`sun-salutation-b`)
- Clip file: `sun-salutation-b.mp4` · Type: steady
- Equipment in scene: a thin grey mat
- Prompt (paste after the character and scene block), **draft, gaps marked**:
  > Side-on wide shot, full body, the whole mat in frame. She stands tall at the front of a thin
  > grey mat. She bends her knees and sinks into chair pose, arms reaching up, then folds forward,
  > lifts halfway and steps back to a plank. She lowers with her knees down, lifts into a low
  > cobra and presses back to downward dog. She steps her left foot forward into warrior 1, front
  > knee over the ankle, arms reaching up. [TRANSITION TO THE OTHER SIDE: not defined by the cue.]
  > She takes warrior 1 with her right foot forward. [RETURN TO STANDING: not defined by the cue.]
  > One breath per move, knees down whenever she needs. She moves at a steady, easy pace the whole
  > time, relaxed and breathing comfortably, as if she could hold a conversation. The clip loops,
  > so her pace and position look the same at the start and end. One full round, starting and
  > ending standing tall at the front of the mat.
- Form check: her front knee pushes past her ankle in warrior 1; her hips sag in the plank;
  the pace runs ahead of the breath.
- Notes: **not ready to generate.** The cue says warrior 1 is added "on each side after downward
  dog" but not how she moves from one side to the other (for example back through plank and
  downward dog) or how the round ends. Those need confirming before this prompt is used. It is
  also far longer than 8 to 10 s. Left side first is my choice.

### Lying twist (`supine-twist`)
- Clip file: `supine-twist.mp4` · Type: hold
- Equipment in scene: a thin grey mat
- Prompt (paste after the character and scene block):
  > Overhead-angled shot from beyond her feet. She lies on her back on a thin grey mat, hugging
  > her knees in. She stretches her arms out wide at shoulder height and lets her knees lower
  > slowly to her left, turning her head gently to the right. Both shoulders stay on the mat;
  > she doesn't force the knees down. She then brings her knees back to the middle. Starting
  > hugging her knees, she moves slowly into the twist over about 3 seconds, holds it steadily for
  > about 8 to 10 seconds, breathing slowly, then returns slowly to the middle and hugs her knees
  > over about 3 seconds. She starts and ends in the same position.
- Form check: her far shoulder lifts off the mat; she pushes her knees down with her hand;
  her knees drop fast.
- Notes: knees to the left. The optional cushion under the knees isn't shown. (mirror for the
  right side)

### Triangle pose (`triangle`)
- Clip file: `triangle.mp4` · Type: hold
- Equipment in scene: none
- Prompt (paste after the character and scene block):
  > Front medium-wide shot, full body. She stands with her feet wide, left toes pointing to her
  > left, back foot turned slightly in, both legs straight but not locked, arms out at shoulder
  > height. She reaches forward over her left leg, then tips down to rest her left hand on her
  > shin, right arm reaching up towards the ceiling, chest open to the side. She never presses on
  > her knee and her chest doesn't collapse towards the floor. She then rises back up to standing
  > with arms out. Starting standing wide with arms out, she moves slowly into the pose over about
  > 3 seconds, holds it steadily for about 8 to 10 seconds, breathing slowly, then returns slowly
  > to standing over about 3 seconds. She starts and ends in the same position.
- Form check: her hand presses on the knee joint; her chest rolls down towards the floor; her
  front knee locks back.
- Notes: left leg in front. The cue says "front toes forward" but not what the back foot
  does, or that the arms start out at shoulder height; I've added both from standard practice,
  so check them. A block is allowed; the clip uses the shin. (mirror for the right side)

### Warrior 2 (`warrior-2`)
- Clip file: `warrior-2.mp4` · Type: hold
- Equipment in scene: none
- Prompt (paste after the character and scene block):
  > Front medium-wide shot, full body. She stands with her feet wide, left toes pointing to her
  > left and back foot turned slightly in. She bends her left knee over her ankle, knee in line
  > with her middle toes, and reaches her arms out at shoulder height, looking over her left
  > hand. She then straightens the front leg and lowers her arms. Starting standing wide with
  > legs straight and arms by her sides, she moves slowly into the pose over about 3 seconds,
  > holds it steadily for about 8 to 10 seconds, breathing slowly, then returns slowly to the
  > start over about 3 seconds. She starts and ends in the same position.
- Form check: her front knee falls inwards past her big toe; the knee pushes past her ankle;
  her torso leans over the front leg.
- Notes: left leg in front. (mirror for the right side)

---

Count: 63 prompts written (39 rep, 21 hold, 3 steady), 19 of them one-sided (left side shown, mirror note
added); 1 of them (sun salutation B) is a draft, not ready to generate until its gaps are confirmed.
