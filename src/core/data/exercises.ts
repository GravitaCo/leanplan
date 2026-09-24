import type { Exercise } from '@/core/types'
import { DEMOS } from './media'

/**
 * The exercise library (workout plan §2.1, §5.3). Static, framework-agnostic, keyed by a stable
 * slug id that is never reused or renamed (`npm run check:exercises` guards it against
 * docs/data/exercise-ids.json).
 *
 * Quality bar (§5.2): every cue covers setup, the movement and the most common mistake, in plain,
 * gender-neutral en-GB. Nothing from the §5.4 "left out on purpose" list. `care` marks body areas
 * an exercise loads a lot, and `gentler` names a library entry for the same slot (§4.0.4); that is
 * preference filtering, never a claim that something is safe for a condition.
 *
 * Entries used by the built-in workouts (`workouts.ts`) carry the built-in cue word for word, so
 * the card and the library say the same thing. Their display names follow the built-ins, because
 * logs match on names; "Leg press" and "Chest press (machine or dumbbell)" are the older built-in
 * names that existing logs carry, so they stay character for character.
 *
 * Equipment lists alternatives (any one will do). `[]` means nothing needed; yoga and pilates
 * floor work lists `mat`.
 */
export const EXERCISES: Exercise[] = [
  // ─── Strength: the built-ins ────────────────────────────────────────────────────────────────
  {
    id: 'back-squat', n: 'Barbell squat', modality: 'strength', log: 'weight-reps',
    equipment: ['barbell'], difficulty: 'advanced', defaultRx: '3 × 10–12',
    pattern: 'squat', primary: 'quads', secondary: ['glutes', 'core'],
    care: ['knees', 'lower-back'], gentler: 'goblet-squat', video: DEMOS.barbellSquat,
    cue: "Bar across your upper back, feet shoulder-width, toes slightly out. Sit down slowly between your heels with your chest up and knees tracking over your toes, as low as you can keep a flat back and heels down. Pause, then push through mid-foot to stand. Don't lock the knees hard at the top.",
  },
  {
    id: 'leg-press', n: 'Leg press', modality: 'strength', log: 'weight-reps',
    equipment: ['machine'], difficulty: 'beginner', defaultRx: '3 × 10–12',
    pattern: 'squat', primary: 'quads', secondary: ['glutes'], care: ['knees'],
    cue: "Feet shoulder-width on the platform. Lower until knees ~90°, keep your lower back on the pad. Push through mid-foot. Don't slam the knees straight at the top.",
  },
  {
    id: 'romanian-deadlift', n: 'Romanian deadlift (dumbbell or barbell)', modality: 'strength', log: 'weight-reps',
    equipment: ['dumbbell', 'barbell'], difficulty: 'intermediate', defaultRx: '3 × 10',
    pattern: 'hinge', primary: 'hamstrings', secondary: ['glutes', 'back'],
    care: ['lower-back'], gentler: 'hip-thrust', video: DEMOS.romanianDeadlift,
    cue: "Soft knees, push hips back, weight stays close to your legs. Feel the hamstring stretch, stand up by squeezing the glutes. Keep the back flat, never rounded.",
  },
  {
    id: 'leg-extension', n: 'Leg extension (machine)', modality: 'strength', log: 'weight-reps',
    equipment: ['machine'], difficulty: 'beginner', defaultRx: '2–3 × 12',
    pattern: 'isolation', primary: 'quads', care: ['knees'],
    cue: "Pad on your lower shins. Straighten the legs smoothly, squeeze the thigh at the top, lower under control. No kicking or swinging.",
  },
  {
    id: 'calf-raise', n: 'Calf raise', modality: 'strength', log: 'weight-reps',
    equipment: ['machine', 'dumbbell', 'bodyweight'], difficulty: 'beginner', defaultRx: '3 × 12–15',
    pattern: 'isolation', primary: 'calves',
    cue: "Push up onto the balls of your feet as high as you can, pause at the top, lower slowly for a full stretch. Don't bounce.",
  },
  {
    id: 'plank', n: 'Plank', modality: 'strength', also: ['calisthenics', 'pilates'], log: 'hold',
    equipment: [], difficulty: 'beginner', defaultRx: '3 × 20–40 sec',
    pattern: 'core', primary: 'core', secondary: ['shoulders'],
    cue: "Elbows under shoulders, straight line from head to heels, squeeze glutes. Stop the set when the hips sag.",
  },
  {
    id: 'barbell-bench-press', n: 'Barbell bench press', modality: 'strength', log: 'weight-reps',
    equipment: ['barbell'], difficulty: 'intermediate', defaultRx: '3 × 10–12',
    pattern: 'horizontal-push', primary: 'chest', secondary: ['triceps', 'shoulders'], video: DEMOS.barbellBench,
    cue: "Shoulder blades back and down, feet flat, grip a little wider than your shoulders. Lower the bar under control to your lower chest, pause lightly without bouncing, then press up to straight arms over your shoulders.",
  },
  {
    id: 'chest-press', n: 'Chest press (machine or dumbbell)', modality: 'strength', log: 'weight-reps',
    equipment: ['machine', 'dumbbell'], difficulty: 'beginner', defaultRx: '3 × 10–12',
    pattern: 'horizontal-push', primary: 'chest', secondary: ['triceps', 'shoulders'],
    cue: "Handles level with mid-chest. Press smoothly, stop just short of locking the elbows. Lower under control for ~2 seconds.",
  },
  {
    id: 'incline-db-press', n: 'Incline dumbbell press', modality: 'strength', log: 'weight-reps',
    equipment: ['dumbbell'], difficulty: 'beginner', defaultRx: '3 × 10–12',
    pattern: 'horizontal-push', primary: 'chest', secondary: ['shoulders', 'triceps'],
    cue: "Bench at ~30°. Lower to the upper chest, press up and slightly together. Control the way down.",
  },
  {
    id: 'db-shoulder-press', n: 'Dumbbell shoulder press (seated)', modality: 'strength', log: 'weight-reps',
    equipment: ['dumbbell'], difficulty: 'beginner', defaultRx: '3 × 10–12',
    pattern: 'vertical-push', primary: 'shoulders', secondary: ['triceps'],
    care: ['shoulders'], gentler: 'landmine-press',
    cue: "Start at ear height. Press up without arching the lower back, keep ribs down. Stop short of failure.",
  },
  {
    id: 'lateral-raise', n: 'Lateral raise', modality: 'strength', log: 'weight-reps',
    equipment: ['dumbbell', 'cable'], difficulty: 'beginner', defaultRx: '2–3 × 12–15',
    pattern: 'isolation', primary: 'shoulders',
    cue: "Slight bend in the elbows, raise to shoulder height leading with the elbows. Light weight, no momentum.",
  },
  {
    id: 'triceps-pushdown', n: 'Triceps rope pushdown (cable)', modality: 'strength', log: 'weight-reps',
    equipment: ['cable'], difficulty: 'beginner', defaultRx: '2–3 × 12–15',
    pattern: 'isolation', primary: 'triceps',
    cue: "Elbows tucked at your sides and still. Push the rope down until the arms are straight, spread it slightly at the bottom. Only the forearms move.",
  },
  {
    id: 'lat-pulldown', n: 'Lat pulldown', modality: 'strength', log: 'weight-reps',
    equipment: ['machine', 'cable'], difficulty: 'beginner', defaultRx: '3 × 10–12',
    pattern: 'vertical-pull', primary: 'back', secondary: ['biceps'],
    cue: "Lean back slightly, pull the bar to your upper chest, lead with the elbows. No yanking or swinging.",
  },
  {
    id: 'seated-cable-row', n: 'Seated cable row', modality: 'strength', log: 'weight-reps',
    equipment: ['cable', 'machine'], difficulty: 'beginner', defaultRx: '3 × 10–12',
    pattern: 'horizontal-pull', primary: 'back', secondary: ['biceps'],
    care: ['lower-back'], gentler: 'chest-supported-row',
    cue: "Sit tall, slight knee bend. Pull the handle to your lower ribs, squeeze the shoulder blades. Don't heave with your back.",
  },
  {
    id: 'chest-supported-row', n: 'Chest-supported dumbbell row', modality: 'strength', log: 'weight-reps',
    equipment: ['dumbbell'], difficulty: 'beginner', defaultRx: '3 × 10',
    pattern: 'horizontal-pull', primary: 'back', secondary: ['biceps', 'shoulders'],
    cue: "Chest on an inclined bench, let the dumbbells hang. Row them to your hips, squeezing the shoulder blades. Keep your chest on the pad, no jerking.",
  },
  {
    id: 'face-pull', n: 'Face pull (cable)', modality: 'strength', log: 'weight-reps',
    equipment: ['cable', 'band'], difficulty: 'beginner', defaultRx: '2–3 × 15',
    pattern: 'horizontal-pull', primary: 'shoulders', secondary: ['back'],
    cue: "Rope at head height. Pull it towards your forehead, elbows high and wide, squeeze the rear shoulders. Light weight, slow.",
  },
  {
    id: 'biceps-curl', n: 'Biceps curl (barbell or dumbbell)', modality: 'strength', log: 'weight-reps',
    equipment: ['barbell', 'dumbbell'], difficulty: 'beginner', defaultRx: '2–3 × 12',
    pattern: 'isolation', primary: 'biceps', secondary: ['forearms'], video: DEMOS.barbellCurl,
    cue: "Elbows pinned to your sides, curl without swinging the body. Lower slowly. Don't let the elbows drift forward.",
  },
  {
    id: 'cable-crunch', n: 'Cable crunch', modality: 'strength', log: 'weight-reps',
    equipment: ['cable'], difficulty: 'beginner', defaultRx: '3 × 12–15',
    pattern: 'core', primary: 'core', care: ['lower-back'], gentler: 'dead-bug',
    cue: "Cable crunch: kneel, crunch the ribs toward the hips, round the spine. Dead bug: lower opposite arm + leg slowly while pressing your lower back into the floor.",
  },
  {
    id: 'dead-bug', n: 'Dead bug', modality: 'strength', also: ['calisthenics', 'pilates'], log: 'reps', perSide: true,
    equipment: [], difficulty: 'beginner', defaultRx: '3 × 6–8 each side',
    pattern: 'core', primary: 'core',
    cue: "Lie on your back with arms reaching up and knees bent over your hips. Breathe out and slowly lower the opposite arm and leg towards the floor, then bring them back and switch. Keep your lower back pressed gently into the floor; if it lifts, don't go as low.",
  },

  // ─── Strength: breadth ──────────────────────────────────────────────────────────────────────
  {
    id: 'goblet-squat', n: 'Goblet squat', modality: 'strength', log: 'weight-reps',
    equipment: ['dumbbell', 'kettlebell'], difficulty: 'beginner', defaultRx: '3 × 10–12',
    pattern: 'squat', primary: 'quads', secondary: ['glutes', 'core'],
    cue: "Hold a dumbbell or kettlebell close to your chest, feet a little wider than your hips. Sit down between your heels, keeping your chest up and knees following your toes, then stand by pushing through your whole foot. Don't let your heels lift or your chest drop towards your knees.",
  },
  {
    id: 'db-split-squat', n: 'Dumbbell split squat', modality: 'strength', log: 'weight-reps', perSide: true,
    equipment: ['dumbbell'], difficulty: 'beginner', defaultRx: '3 × 8–10 each side',
    pattern: 'lunge', primary: 'quads', secondary: ['glutes'],
    cue: "Hold the dumbbells by your sides and take a long stride, back heel lifted. Lower straight down until the back knee is just above the floor, then push up through the front foot. Keep the front knee in line with your toes rather than letting it fall inwards.",
  },
  {
    id: 'hip-thrust', n: 'Hip thrust', modality: 'strength', log: 'weight-reps',
    equipment: ['barbell', 'dumbbell'], difficulty: 'beginner', defaultRx: '3 × 10–12',
    pattern: 'hinge', primary: 'glutes', secondary: ['hamstrings'],
    cue: "Sit with your upper back against a bench, the weight padded across your hips and feet flat. Drive through your heels to lift your hips until your body is level from shoulders to knees, squeeze your glutes, then lower slowly. Keep your chin tucked and ribs down, and don't arch your lower back at the top.",
  },
  {
    id: 'leg-curl', n: 'Leg curl (machine)', modality: 'strength', log: 'weight-reps',
    equipment: ['machine'], difficulty: 'beginner', defaultRx: '2–3 × 10–12',
    pattern: 'isolation', primary: 'hamstrings',
    cue: "Line your knees up with the machine's pivot and set the pad just above your heels. Curl smoothly, pause, then lower slowly. Keep your hips down on the seat or bench rather than lifting them to help.",
  },
  {
    id: 'step-up', n: 'Step-up', modality: 'strength', log: 'weight-reps', perSide: true,
    equipment: ['dumbbell', 'bodyweight'], difficulty: 'beginner', defaultRx: '3 × 8–10 each side',
    pattern: 'lunge', primary: 'quads', secondary: ['glutes'], care: ['knees'], gentler: 'split-squat',
    cue: "Use a sturdy step or bench no higher than your knee, with your whole foot on it. Push through the front heel to stand up tall, then step down slowly with the same leg. Don't push off the back foot to do the work.",
  },
  {
    id: 'db-bench-press', n: 'Dumbbell bench press', modality: 'strength', log: 'weight-reps',
    equipment: ['dumbbell'], difficulty: 'beginner', defaultRx: '3 × 10–12',
    pattern: 'horizontal-push', primary: 'chest', secondary: ['triceps', 'shoulders'],
    cue: "Lie on a flat bench with feet flat and the dumbbells at chest level. Press up until your arms are straight over your shoulders, then lower under control, elbows angled slightly in from your sides. Don't flare the elbows out wide or bang the dumbbells together.",
  },
  {
    id: 'one-arm-db-row', n: 'One-arm dumbbell row', modality: 'strength', log: 'weight-reps', perSide: true,
    equipment: ['dumbbell'], difficulty: 'beginner', defaultRx: '3 × 10 each side',
    pattern: 'horizontal-pull', primary: 'back', secondary: ['biceps'],
    cue: "Rest one hand and knee on a bench with your back flat. Let the dumbbell hang, then row it towards your hip, squeezing the shoulder blade, and lower slowly. Don't twist your body to heave the weight up.",
  },
  {
    id: 'cable-fly', n: 'Cable fly', modality: 'strength', log: 'weight-reps',
    equipment: ['cable'], difficulty: 'beginner', defaultRx: '2–3 × 12–15',
    pattern: 'isolation', primary: 'chest', secondary: ['shoulders'],
    cue: "Set the cables at chest height and take a step forward, elbows softly bent. Bring your hands together in a wide hug, then open back out slowly. Keep it light and don't let your arms travel far behind your body.",
  },
  {
    id: 'overhead-triceps-extension', n: 'Overhead triceps extension', modality: 'strength', log: 'weight-reps',
    equipment: ['dumbbell', 'cable'], difficulty: 'beginner', defaultRx: '2–3 × 10–12',
    pattern: 'isolation', primary: 'triceps', care: ['elbows', 'shoulders'], gentler: 'triceps-pushdown',
    cue: "Sit or stand tall, holding one dumbbell in both hands above your head. Bend the elbows to lower it behind your head, then straighten your arms. Keep elbows pointing forward and ribs down, and don't arch your back to lift more.",
  },
  {
    id: 'hammer-curl', n: 'Hammer curl', modality: 'strength', log: 'weight-reps',
    equipment: ['dumbbell'], difficulty: 'beginner', defaultRx: '2–3 × 10–12',
    pattern: 'isolation', primary: 'biceps', secondary: ['forearms'],
    cue: "Stand tall with dumbbells by your sides, palms facing each other. Curl them up with your elbows still, then lower slowly. Don't swing your body or let the elbows drift forward.",
  },
  {
    id: 'farmer-carry', n: 'Farmer carry', modality: 'strength', log: 'weight-reps',
    equipment: ['dumbbell', 'kettlebell'], difficulty: 'beginner', defaultRx: '3 × 20–30 steps',
    pattern: 'carry', primary: 'forearms', secondary: ['core', 'back'],
    cue: "Bend at the hips and knees to pick up a weight in each hand, then stand tall. Walk with short, steady steps, shoulders down and away from your ears. Don't lean to one side or let the weights swing; put them down with a flat back.",
  },
  {
    id: 'pallof-press', n: 'Pallof press', modality: 'strength', log: 'weight-reps', perSide: true,
    equipment: ['cable', 'band'], difficulty: 'beginner', defaultRx: '3 × 10 each side',
    pattern: 'core', primary: 'core',
    cue: "Stand side-on to a cable or band anchored at chest height, holding the handle at your chest. Press it straight out in front, pause, then bring it back, keeping your body facing forward. The pull tries to twist you; don't let your hips or shoulders turn with it.",
  },
  {
    id: 'kb-swing', n: 'Kettlebell swing', modality: 'strength', log: 'weight-reps',
    equipment: ['kettlebell'], difficulty: 'intermediate', defaultRx: '3 × 10–15',
    pattern: 'hinge', primary: 'glutes', secondary: ['hamstrings', 'core'],
    care: ['lower-back'], gentler: 'hip-thrust',
    cue: "Feet a little wider than hips, kettlebell a step in front. Hinge at your hips with a flat back, hike it back between your legs, then stand up quickly by squeezing your glutes so it floats to chest height. It's a hip hinge, not a squat or an arm lift; don't lean back at the top.",
  },
  {
    id: 'landmine-press', n: 'Landmine press', modality: 'strength', log: 'weight-reps', perSide: true,
    equipment: ['barbell'], difficulty: 'beginner', defaultRx: '3 × 8–10 each side',
    pattern: 'vertical-push', primary: 'shoulders', secondary: ['chest', 'triceps'],
    cue: "Set one end of a barbell in a landmine holder or padded corner. Stand or half-kneel holding the other end at your shoulder, then press it up and forward until your arm is straight, and lower under control. Keep your ribs down and don't lean back to finish the press.",
  },

  // ─── Calisthenics: push-up chain ────────────────────────────────────────────────────────────
  {
    id: 'wall-push-up', n: 'Wall push-up', modality: 'calisthenics', log: 'reps',
    equipment: [], difficulty: 'beginner', defaultRx: '3 × 10–15',
    pattern: 'horizontal-push', primary: 'chest', secondary: ['triceps', 'shoulders'],
    progression: { chain: 'push-up', step: 1 },
    cue: "Stand an arm's length from a wall with hands flat at chest height, a little wider than your shoulders. Bend your elbows to bring your chest towards the wall, then push back. Keep your body in one straight line rather than poking your head forward.",
  },
  {
    id: 'incline-push-up', n: 'Incline push-up', modality: 'calisthenics', log: 'reps',
    equipment: [], difficulty: 'beginner', defaultRx: '3 × 8–12',
    pattern: 'horizontal-push', primary: 'chest', secondary: ['triceps', 'shoulders'],
    progression: { chain: 'push-up', step: 2 },
    cue: "Hands on a sturdy bench, worktop or step, a little wider than your shoulders; holding dumbbell handles keeps your wrists straight. Lower your chest to the edge with elbows angled back, then push away. Keep your hips in line with your shoulders, not sagging or piked up.",
  },
  {
    id: 'push-up', n: 'Push-up', modality: 'calisthenics', log: 'reps',
    equipment: [], difficulty: 'intermediate', defaultRx: '3 × 6–12',
    pattern: 'horizontal-push', primary: 'chest', secondary: ['triceps', 'shoulders', 'core'],
    progression: { chain: 'push-up', step: 3 }, care: ['wrists'], gentler: 'incline-push-up',
    cue: "Hands a little wider than your shoulders, body in a straight line from head to heels (knees down is fine too). Lower your chest towards the floor with elbows angled back, then push up. Stop the set when your hips sag or your head drops.",
  },
  {
    id: 'decline-push-up', n: 'Decline push-up', modality: 'calisthenics', log: 'reps',
    equipment: ['bench'], difficulty: 'intermediate', defaultRx: '3 × 6–10',
    pattern: 'horizontal-push', primary: 'chest', secondary: ['shoulders', 'triceps', 'core'],
    progression: { chain: 'push-up', step: 4 }, care: ['wrists', 'shoulders'], gentler: 'push-up',
    cue: "Feet on a low step or bench, hands on the floor a little wider than your shoulders. Lower your chest towards the floor under control, then push back up. Keep your body straight; don't let your hips sag or your head lead.",
  },

  // ─── Calisthenics: pull-up chain ────────────────────────────────────────────────────────────
  {
    id: 'inverted-row-high', n: 'Inverted row (high bar)', modality: 'calisthenics', log: 'reps',
    equipment: ['barbell', 'machine'], difficulty: 'beginner', defaultRx: '3 × 8–12',
    pattern: 'horizontal-pull', primary: 'back', secondary: ['biceps'],
    progression: { chain: 'pull-up', step: 1 },
    cue: "Set a bar in a rack or Smith machine at about chest height and hold it with straight arms, leaning back with heels on the floor. Pull your chest to the bar, squeezing your shoulder blades, then lower slowly. Keep your body straight rather than bending at the hips.",
  },
  {
    id: 'inverted-row', n: 'Inverted row', modality: 'calisthenics', log: 'reps',
    equipment: ['barbell', 'machine'], difficulty: 'intermediate', defaultRx: '3 × 8–12',
    pattern: 'horizontal-pull', primary: 'back', secondary: ['biceps', 'core'],
    progression: { chain: 'pull-up', step: 2 },
    cue: "Set a bar in a rack or Smith machine at about hip height and hang under it, heels on the floor and body straight. Pull your chest to the bar, then lower all the way with control. Don't let your hips drop or jerk up to reach the bar.",
  },
  {
    id: 'band-assisted-pull-up', n: 'Band-assisted pull-up', modality: 'calisthenics', log: 'reps',
    equipment: ['pull-up-bar'], difficulty: 'intermediate', defaultRx: '3 × 5–8',
    pattern: 'vertical-pull', primary: 'back', secondary: ['biceps'],
    progression: { chain: 'pull-up', step: 3 },
    cue: "Loop a resistance band over the bar and put a knee or foot in it, hands a little wider than your shoulders. Pull your chest towards the bar, leading with the elbows, then lower all the way to straight arms. Don't let the band bounce you out of the bottom.",
  },
  {
    id: 'negative-pull-up', n: 'Negative pull-up', modality: 'calisthenics', log: 'reps',
    equipment: ['pull-up-bar'], difficulty: 'intermediate', defaultRx: '3 × 3–5',
    pattern: 'vertical-pull', primary: 'back', secondary: ['biceps'],
    progression: { chain: 'pull-up', step: 3 },
    cue: "Step up on a sturdy box so your chin is over the bar, hands a little wider than your shoulders. Lift your feet and lower yourself slowly, taking 3 to 5 seconds, until your arms are straight. Step back up for the next rep instead of jumping, and don't just drop.",
  },
  {
    id: 'chin-up', n: 'Chin-up', modality: 'calisthenics', log: 'reps',
    equipment: ['pull-up-bar'], difficulty: 'advanced', defaultRx: '3 × 3–8',
    pattern: 'vertical-pull', primary: 'back', secondary: ['biceps'],
    progression: { chain: 'pull-up', step: 4 },
    cue: "Hang from the bar with palms facing you, hands shoulder-width, shoulders gently pulled down. Pull until your chin passes the bar, then lower all the way to straight arms. Keep your legs still; no swinging or kicking to get up.",
  },
  {
    id: 'pull-up', n: 'Pull-up', modality: 'calisthenics', log: 'reps',
    equipment: ['pull-up-bar'], difficulty: 'advanced', defaultRx: '3 × 3–8',
    pattern: 'vertical-pull', primary: 'back', secondary: ['biceps'],
    progression: { chain: 'pull-up', step: 5 },
    cue: "Hang from the bar with palms facing away, hands a little wider than your shoulders, shoulders gently pulled down. Pull your chest towards the bar, leading with the elbows, then lower all the way with control. No swinging or kicking; if the last reps need it, the set is done.",
  },

  // ─── Calisthenics: squat chain ──────────────────────────────────────────────────────────────
  {
    id: 'sit-to-stand', n: 'Sit to stand', modality: 'calisthenics', log: 'reps',
    equipment: [], difficulty: 'beginner', defaultRx: '3 × 8–12',
    pattern: 'squat', primary: 'quads', secondary: ['glutes'],
    progression: { chain: 'squat', step: 1 },
    cue: "Sit near the front of a sturdy chair with feet flat and hip-width apart. Lean forward slightly and stand up, using your hands only if you need to, then sit back down slowly. Lower with control rather than dropping into the seat.",
  },
  {
    id: 'bodyweight-squat', n: 'Bodyweight squat', modality: 'calisthenics', log: 'reps',
    equipment: [], difficulty: 'beginner', defaultRx: '3 × 12–15',
    pattern: 'squat', primary: 'quads', secondary: ['glutes'],
    progression: { chain: 'squat', step: 2 },
    cue: "Feet shoulder-width, toes slightly out, arms forward for balance. Sit down between your heels as low as you can keep your heels down and back flat, then stand tall. Keep your knees following your toes, not caving inwards.",
  },
  {
    id: 'split-squat', n: 'Split squat', modality: 'calisthenics', log: 'reps', perSide: true,
    equipment: [], difficulty: 'beginner', defaultRx: '3 × 8–12 each side',
    pattern: 'lunge', primary: 'quads', secondary: ['glutes'],
    progression: { chain: 'squat', step: 3 },
    cue: "Take a long stride and rest a hand on a wall or chair for balance if you like, back heel lifted. Lower straight down until the back knee nears the floor, then push up through the front foot. Keep the front knee in line with your toes and don't let the stance get short.",
  },
  {
    id: 'bulgarian-split-squat', n: 'Bulgarian split squat', modality: 'calisthenics', log: 'reps', perSide: true,
    equipment: ['bench'], difficulty: 'intermediate', defaultRx: '3 × 8–10 each side',
    pattern: 'lunge', primary: 'quads', secondary: ['glutes'],
    progression: { chain: 'squat', step: 4 }, care: ['knees'], gentler: 'split-squat',
    cue: "Rest the top of your back foot on a bench and hop the front foot far enough forward that you can lower without the heel lifting. Sink straight down, then push up through the front foot. Don't bounce at the bottom or let the front knee drift inwards.",
  },
  {
    id: 'reverse-lunge', n: 'Reverse lunge', modality: 'calisthenics', log: 'reps', perSide: true,
    equipment: [], difficulty: 'beginner', defaultRx: '3 × 8–10 each side',
    pattern: 'lunge', primary: 'quads', secondary: ['glutes'], care: ['knees'], gentler: 'split-squat',
    cue: "Stand tall, holding a support if you like. Step one foot back and lower until the back knee nears the floor, then push through the front foot to step back in. Keep your body upright and don't let the front knee cave in.",
  },

  // ─── Calisthenics: bridge chain ─────────────────────────────────────────────────────────────
  {
    id: 'glute-bridge', n: 'Glute bridge', modality: 'calisthenics', also: ['mobility'], log: 'reps',
    equipment: [], difficulty: 'beginner', defaultRx: '2 × 10',
    pattern: 'hinge', primary: 'glutes', secondary: ['hamstrings'],
    progression: { chain: 'bridge', step: 1 },
    cue: "Lie on your back with knees bent and feet hip-width, close to your bottom. Press through your heels and lift your hips until they're in line with your knees and shoulders, squeeze your glutes, then lower slowly. Keep your weight on your upper back, not your neck, and don't over-arch at the top.",
  },
  {
    id: 'single-leg-glute-bridge', n: 'Single-leg glute bridge', modality: 'calisthenics', log: 'reps', perSide: true,
    equipment: [], difficulty: 'intermediate', defaultRx: '3 × 8–10 each side',
    pattern: 'hinge', primary: 'glutes', secondary: ['hamstrings'],
    progression: { chain: 'bridge', step: 2 },
    cue: "Lie on your back with knees bent, then lift one foot and straighten or hug that leg. Press through the other heel to lift your hips level, pause, and lower slowly. Keep your hips square; don't let one side drop.",
  },
  {
    id: 'bw-hip-thrust', n: 'Bodyweight hip thrust', modality: 'calisthenics', log: 'reps',
    equipment: ['bench'], difficulty: 'intermediate', defaultRx: '3 × 12–15',
    pattern: 'hinge', primary: 'glutes', secondary: ['hamstrings'],
    progression: { chain: 'bridge', step: 3 },
    cue: "Sit with your upper back against a bench and feet flat, knees bent. Drive through your heels to lift your hips level with your shoulders and knees, squeeze, then lower slowly. Keep your chin tucked and ribs down; don't arch your lower back to get higher.",
  },

  // ─── Calisthenics: dip chain ────────────────────────────────────────────────────────────────
  {
    id: 'assisted-dip', n: 'Assisted dip', modality: 'calisthenics', log: 'reps',
    equipment: ['band', 'machine'], difficulty: 'intermediate', defaultRx: '3 × 6–10',
    pattern: 'vertical-push', primary: 'triceps', secondary: ['chest', 'shoulders'],
    progression: { chain: 'dip', step: 1 }, care: ['shoulders'],
    cue: "Use an assisted dip machine or a band looped across parallel bars, arms straight and shoulders pressed down. Bend your elbows to lower only until your upper arms are about level with the floor, then press back up. Don't sink lower than that or let your shoulders roll forward; stop if the front of the shoulder pinches.",
  },
  {
    id: 'dip', n: 'Dip', modality: 'calisthenics', log: 'reps',
    equipment: ['machine'], difficulty: 'advanced', defaultRx: '3 × 5–8',
    pattern: 'vertical-push', primary: 'triceps', secondary: ['chest', 'shoulders'],
    progression: { chain: 'dip', step: 2 }, care: ['shoulders'], gentler: 'assisted-dip',
    cue: "Support yourself on parallel bars with straight arms and shoulders pressed down, body leaning slightly forward. Lower until your upper arms are about level with the floor, then press up. Don't drop lower than that or bounce out of the bottom; stop if the front of the shoulder pinches.",
  },

  // ─── Calisthenics: side plank chain ─────────────────────────────────────────────────────────
  {
    id: 'side-plank-knees', n: 'Side plank (knees)', modality: 'calisthenics', log: 'hold', perSide: true,
    equipment: [], difficulty: 'beginner', defaultRx: '3 × 15–30 sec each side',
    pattern: 'core', primary: 'core',
    progression: { chain: 'side-plank', step: 1 },
    cue: "Lie on your side with your elbow under your shoulder and knees bent behind you. Lift your hips so your body makes a straight line from head to knees, and hold. Stop when your hips start to drop.",
  },
  {
    id: 'side-plank', n: 'Side plank', modality: 'calisthenics', also: ['pilates'], log: 'hold', perSide: true,
    equipment: [], difficulty: 'intermediate', defaultRx: '3 × 20–40 sec each side',
    pattern: 'core', primary: 'core', secondary: ['shoulders'],
    progression: { chain: 'side-plank', step: 2 },
    cue: "Lie on your side with your elbow under your shoulder and legs straight, feet stacked or staggered. Lift your hips into a straight line from head to heels and hold. Stop the set when your hips sag or roll backwards.",
  },

  // ─── Calisthenics: core ─────────────────────────────────────────────────────────────────────
  {
    id: 'bird-dog', n: 'Bird-dog', modality: 'calisthenics', also: ['pilates', 'mobility'], log: 'reps', perSide: true,
    equipment: [], difficulty: 'beginner', defaultRx: '3 × 6–8 each side',
    pattern: 'core', primary: 'core', secondary: ['glutes'],
    cue: "On hands and knees, hands under shoulders and knees under hips. Slowly reach one arm forward and the opposite leg back until both are level with your body, pause, then return and switch. Keep your back flat and hips level; don't lift the leg so high that your back arches.",
  },
  {
    id: 'hollow-hold', n: 'Hollow hold', modality: 'calisthenics', log: 'hold',
    equipment: [], difficulty: 'intermediate', defaultRx: '3 × 15–30 sec',
    pattern: 'core', primary: 'core',
    cue: "Lie on your back, press your lower back gently into the floor, and lift your head, shoulders and legs a little, arms reaching forward. Hold while breathing steadily. If your lower back lifts off the floor, bend your knees or raise your legs higher.",
  },
  {
    id: 'hanging-knee-raise', n: 'Hanging knee raise', modality: 'calisthenics', log: 'reps',
    equipment: ['pull-up-bar'], difficulty: 'intermediate', defaultRx: '3 × 8–12',
    pattern: 'core', primary: 'core', secondary: ['forearms'],
    cue: "Hang from a bar with straight arms and shoulders gently pulled down. Lift your knees towards your chest, curling your hips up slightly, then lower slowly. Don't swing or use momentum; pause at the bottom to settle between reps.",
  },

  // ─── Cardio: conditioning (no-jump) ─────────────────────────────────────────────────────────
  {
    id: 'step-jacks', n: 'Step jacks', modality: 'cardio', also: ['calisthenics'], log: 'reps',
    equipment: [], difficulty: 'beginner', defaultRx: '3 × 20–30', cardioVariation: 'hiit',
    cue: "Stand tall with arms by your sides. Step one foot out to the side as you raise your arms overhead, then step back in and switch sides. Keep a steady rhythm you can breathe through, and land softly rather than stamping.",
  },
  {
    id: 'mountain-climber', n: 'Mountain climber', modality: 'cardio', also: ['calisthenics'], log: 'reps',
    equipment: [], difficulty: 'intermediate', defaultRx: '3 × 10–20 each side', cardioVariation: 'hiit',
    care: ['wrists'], gentler: 'step-jacks',
    cue: "Start in a high plank, hands under your shoulders; hands on a bench makes it easier. Bring one knee towards your chest, then switch legs, stepping or running at a pace you can control. Keep your hips level with your shoulders rather than piking up or sagging.",
  },
  {
    id: 'squat-thrust', n: 'Squat thrust (no jump)', modality: 'cardio', also: ['calisthenics'], log: 'reps',
    equipment: [], difficulty: 'intermediate', defaultRx: '3 × 6–10', cardioVariation: 'hiit',
    care: ['wrists'], gentler: 'step-jacks',
    cue: "Squat down and place your hands on the floor in front of your feet. Step your feet back one at a time into a plank, step them back in, then stand up tall. Keep it controlled; don't let your hips sag in the plank or rush the steps.",
  },

  // ─── Yoga: poses ────────────────────────────────────────────────────────────────────────────
  {
    id: 'mountain-pose', n: 'Mountain pose', modality: 'yoga', log: 'hold',
    equipment: [], difficulty: 'beginner', defaultRx: '5 slow breaths', targets: ['balance', 'breath'],
    cue: "Stand with feet hip-width, weight spread evenly through both feet, arms relaxed by your sides. Lengthen up through the top of your head, soften your shoulders and breathe slowly. Don't lock your knees or push your chest forward.",
  },
  {
    id: 'downward-dog', n: 'Downward dog', modality: 'yoga', log: 'hold',
    equipment: ['mat'], difficulty: 'beginner', defaultRx: '3–5 slow breaths', targets: ['hamstrings', 'shoulders', 'calves'],
    care: ['wrists', 'shoulders'], gentler: 'dolphin',
    cue: "From hands and knees, spread your fingers with hands shoulder-width, tuck your toes and lift your hips up and back. Bend your knees as much as you need to keep a long, flat back; your heels don't need to touch the floor. Don't round your back to force the legs straight.",
  },
  {
    id: 'dolphin', n: 'Dolphin pose', modality: 'yoga', log: 'hold',
    equipment: ['mat'], difficulty: 'beginner', defaultRx: '3–5 slow breaths', targets: ['shoulders', 'hamstrings'],
    cue: "From hands and knees, lower onto your forearms with elbows under your shoulders. Tuck your toes and lift your hips up and back, knees bent as much as you like. Press gently through your forearms so your head doesn't sink between your shoulders.",
  },
  {
    id: 'childs-pose', n: "Child's pose", modality: 'yoga', log: 'hold',
    equipment: ['mat'], difficulty: 'beginner', defaultRx: '5–10 slow breaths', targets: ['spine', 'hips', 'breath'],
    care: ['knees'],
    cue: "Kneel with big toes together and knees apart, then sit back towards your heels and fold forward, arms reaching ahead or resting by your sides. Rest your forehead on the mat or a cushion and breathe into your back. If your knees or hips complain, put a cushion between your bottom and heels.",
  },
  {
    id: 'cat-cow', n: 'Cat–cow', modality: 'yoga', also: ['mobility'], log: 'rounds',
    equipment: [], difficulty: 'beginner', defaultRx: '8–10 slow rounds', targets: ['spine', 'breath'],
    cue: "On hands and knees, with hands under shoulders and knees under hips. Breathe out and round your back towards the ceiling, then breathe in and let your belly drop gently as you look slightly forward. Move within a comfortable range, not to your limit. If your wrists complain, rest on your forearms.",
  },
  {
    id: 'low-lunge', n: 'Low lunge', modality: 'yoga', log: 'hold', perSide: true,
    equipment: ['mat'], difficulty: 'beginner', defaultRx: '5 slow breaths each side', targets: ['hips'],
    care: ['knees'],
    cue: "Step one foot forward between your hands and lower the back knee onto a folded mat. Keep the front knee over the ankle and let your hips sink gently forward, hands on the front thigh or blocks. Don't let the lower back arch to go deeper.",
  },
  {
    id: 'warrior-2', n: 'Warrior 2', modality: 'yoga', log: 'hold', perSide: true,
    equipment: [], difficulty: 'beginner', defaultRx: '5 slow breaths each side', targets: ['hips', 'balance'],
    cue: "Stand with feet wide, front toes pointing forward and back foot turned slightly in. Bend the front knee over the ankle and reach your arms out at shoulder height, looking over the front hand. Keep the front knee in line with your middle toes, not falling inwards.",
  },
  {
    id: 'triangle', n: 'Triangle pose', modality: 'yoga', log: 'hold', perSide: true,
    equipment: ['yoga-props'], difficulty: 'beginner', defaultRx: '5 slow breaths each side', targets: ['hamstrings', 'hips'],
    cue: "Stand with feet wide, front toes forward, both legs straight but not locked. Reach forward over the front leg, then tip down to rest your hand on your shin or a block, other arm reaching up. Rest on the shin or a block, never pressing on the knee, and don't collapse your chest towards the floor.",
  },
  {
    id: 'chair-pose', n: 'Chair pose', modality: 'yoga', log: 'hold',
    equipment: [], difficulty: 'beginner', defaultRx: '3–5 slow breaths', targets: ['balance'],
    care: ['knees'],
    cue: "Stand with feet together or hip-width. Bend your knees and sit back as if onto a chair, arms reaching up or hands at your chest, weight towards your heels. Don't arch your lower back; keep your ribs soft and your knees behind your toes as much as feels natural.",
  },
  {
    id: 'tree-pose', n: 'Tree pose', modality: 'yoga', log: 'hold', perSide: true,
    equipment: [], difficulty: 'beginner', defaultRx: '5 slow breaths each side', targets: ['balance'],
    cue: "Stand tall near a wall for support if you like. Shift onto one foot and place the other foot on your ankle, calf or inner thigh, hands at your chest or reaching up. Never press the foot against the side of the knee, and let the pose wobble rather than gripping.",
  },
  {
    id: 'bridge-pose', n: 'Bridge pose', modality: 'yoga', log: 'hold',
    equipment: ['mat'], difficulty: 'beginner', defaultRx: '3 × 5 slow breaths', targets: ['hips', 'spine'],
    care: ['neck'],
    cue: "Lie on your back with knees bent and feet hip-width, close to your bottom. Press through your feet to lift your hips and hold, arms long by your sides. Keep your weight on your shoulders and upper back, and don't turn your head while you're up.",
  },
  {
    id: 'sphinx', n: 'Sphinx pose', modality: 'yoga', log: 'hold',
    equipment: ['mat'], difficulty: 'beginner', defaultRx: '5–8 slow breaths', targets: ['spine'],
    cue: "Lie on your front and prop yourself up on your forearms, elbows under your shoulders. Let your chest lift gently while your hips and legs stay heavy on the mat. Keep it easy; if your lower back pinches, lower down or slide your elbows forward.",
  },
  {
    id: 'cobra', n: 'Low cobra', modality: 'yoga', log: 'hold',
    equipment: ['mat'], difficulty: 'beginner', defaultRx: '3 × 3 slow breaths', targets: ['spine'],
    care: ['lower-back'], gentler: 'sphinx',
    cue: "Lie on your front with hands under your shoulders and elbows close to your sides. Lift your chest a little using your back muscles, with only light pressure through your hands and elbows still bent. Don't push up onto straight arms and squeeze into the lower back.",
  },
  {
    id: 'seated-forward-fold', n: 'Seated forward fold (knees bent)', modality: 'yoga', log: 'hold',
    equipment: ['mat'], difficulty: 'beginner', defaultRx: '5–8 slow breaths', targets: ['hamstrings', 'spine'],
    cue: "Sit on a folded blanket with legs out in front and knees bent as much as you need. Lengthen up, then fold forward from your hips, bringing your belly towards your thighs. Don't round forward and pull on your feet to get lower.",
  },
  {
    id: 'supine-twist', n: 'Lying twist', modality: 'yoga', also: ['mobility'], log: 'hold', perSide: true,
    equipment: ['mat'], difficulty: 'beginner', defaultRx: '5 slow breaths each side', targets: ['spine', 'hips'],
    cue: "Lie on your back, hug your knees in, then let them lower to one side, arms out wide. Rest the knees on a cushion if they don't reach the floor, and turn your head gently the other way if that's comfortable. Keep both shoulders on the mat rather than forcing the knees down.",
  },
  {
    id: 'reclined-figure-four', n: 'Reclined figure four', modality: 'yoga', also: ['mobility'], log: 'hold', perSide: true,
    equipment: ['mat'], difficulty: 'beginner', defaultRx: '30–60 sec each side', targets: ['hips'],
    cue: "Lie on your back with knees bent. Cross one ankle over the other knee, flex that foot, then hold behind the lower thigh and draw it gently towards you. Keep your head and shoulders relaxed on the mat, and don't press on the crossed knee.",
  },
  {
    id: 'pigeon', n: 'Pigeon pose', modality: 'yoga', log: 'hold', perSide: true,
    equipment: ['mat', 'yoga-props'], difficulty: 'intermediate', defaultRx: '30–60 sec each side', targets: ['hips'],
    care: ['knees'], gentler: 'reclined-figure-four',
    cue: "From hands and knees, bring one knee forward behind the same wrist, shin angled across the mat, and slide the other leg back. Put a cushion or block under the front hip so your hips stay level, and stay upright or fold forward. Any feeling in the front knee means back off; the reclined figure four works the same area.",
  },
  {
    id: 'legs-up-the-wall', n: 'Legs up the wall', modality: 'yoga', log: 'hold',
    equipment: [], difficulty: 'beginner', defaultRx: '3–5 min', targets: ['breath', 'hamstrings'],
    cue: "Sit side-on to a wall, then lie back as you swing your legs up it, bottom close to the wall or a little away. Let your arms rest and breathe slowly. If your hamstrings pull or your feet tingle, shuffle further from the wall or bend your knees.",
  },
  {
    id: 'rest-pose', n: 'Rest pose (savasana)', modality: 'yoga', log: 'hold',
    equipment: ['mat'], difficulty: 'beginner', defaultRx: '3–5 min', targets: ['breath'],
    cue: "Lie on your back with legs long and arms a little away from your sides, palms up. Let your body feel heavy and your breathing slow down on its own. A cushion under your knees helps if your lower back feels tight; there's nothing to get right here.",
  },

  // ─── Yoga: flows ────────────────────────────────────────────────────────────────────────────
  {
    id: 'half-sun-salutation', n: 'Half sun salutation', modality: 'yoga', log: 'rounds',
    equipment: [], difficulty: 'beginner', defaultRx: '3–5 rounds', targets: ['spine', 'hamstrings', 'breath'],
    cue: "Stand tall, breathe in and reach your arms up, breathe out and fold forward with knees bent. Breathe in to lift halfway with a long back and hands on your shins, breathe out to fold, then breathe in to rise back up. Move with your breath and don't lock your knees in the fold.",
  },
  {
    id: 'sun-salutation-a', n: 'Sun salutation A', modality: 'yoga', log: 'rounds',
    equipment: ['mat'], difficulty: 'intermediate', defaultRx: '3–5 rounds', targets: ['spine', 'hamstrings', 'shoulders', 'breath'],
    care: ['wrists'], gentler: 'half-sun-salutation',
    cue: "Reach up, fold forward, lift halfway, then step back to a plank. Lower with knees down, lift into a low cobra, and press back to downward dog for a few breaths before stepping forward and rising. One breath per move; take the knees down and keep the cobra low rather than rushing.",
  },
  {
    id: 'sun-salutation-b', n: 'Sun salutation B', modality: 'yoga', log: 'rounds',
    equipment: ['mat'], difficulty: 'advanced', defaultRx: '3–5 rounds', targets: ['spine', 'hips', 'shoulders', 'breath'],
    care: ['wrists', 'knees'], gentler: 'sun-salutation-a',
    cue: "Begins with chair pose, then flows like sun salutation A, adding warrior 1 on each side after downward dog. Keep the front knee over the ankle in warrior 1 and take knees down whenever you need. Don't let the pace run ahead of your breath.",
  },

  // ─── Pilates (mat) ──────────────────────────────────────────────────────────────────────────
  {
    id: 'pelvic-curl', n: 'Pelvic curl', modality: 'pilates', log: 'reps',
    equipment: ['mat'], difficulty: 'beginner', defaultRx: '1 × 8–10', targets: ['spine', 'hips'],
    cue: "Lie on your back with knees bent and feet hip-width. Breathe out and tilt your pelvis, then peel your spine off the mat bone by bone until your hips are level with your knees. Roll back down from the top of your back, and don't push up into an arch.",
  },
  {
    id: 'toe-taps', n: 'Toe taps', modality: 'pilates', log: 'reps', perSide: true,
    equipment: ['mat'], difficulty: 'beginner', defaultRx: '2 × 8–10 each side', targets: ['breath'],
    cue: "Lie on your back with knees bent over your hips, shins level with the floor. Breathe out and lower one foot to tap the mat, keeping the knee bent, then bring it back and switch. Keep your lower back settled on the mat; if it lifts, make the movement smaller.",
  },
  {
    id: 'hundred', n: 'The hundred', modality: 'pilates', log: 'reps',
    equipment: ['mat'], difficulty: 'beginner', defaultRx: '5–10 breath cycles', targets: ['breath'],
    care: ['neck'],
    cue: "Lie on your back with knees bent over your hips, arms long by your sides; keep your head down on the mat, or lift it only if your neck is comfortable. Pump your arms in small beats, breathing in for 5 and out for 5. Keep your lower back steady, and lower your head the moment your neck strains.",
  },
  {
    id: 'half-roll-back', n: 'Half roll back', modality: 'pilates', log: 'reps',
    equipment: ['mat'], difficulty: 'beginner', defaultRx: '1 × 6–8', targets: ['spine'],
    progression: { chain: 'roll-up', step: 1 },
    cue: "Sit tall with knees bent and feet flat, hands lightly behind your thighs. Breathe out and curl your tailbone under to roll halfway back, then breathe in and roll up to sitting. Move smoothly and don't let your shoulders hunch up or your feet lift.",
  },
  {
    id: 'roll-up', n: 'Roll-up', modality: 'pilates', log: 'reps',
    equipment: ['mat'], difficulty: 'intermediate', defaultRx: '1 × 5–8', targets: ['spine', 'hamstrings'],
    progression: { chain: 'roll-up', step: 2 }, care: ['lower-back'], gentler: 'half-roll-back',
    cue: "Lie on your back with legs long and arms reaching overhead. Bring your arms forward, curl your head and shoulders up, and peel your spine off the mat to reach towards your feet, then roll back down with control. If you have to throw your arms or jerk up, bend your knees or go back to the half roll back.",
  },
  {
    id: 'single-leg-stretch', n: 'Single-leg stretch', modality: 'pilates', log: 'reps', perSide: true,
    equipment: ['mat'], difficulty: 'beginner', defaultRx: '1 × 8–10 each side', targets: ['breath'],
    cue: "Lie on your back with head down, or lifted if your neck is comfortable. Hug one knee in while the other leg reaches out at a height where your back stays settled, then switch smoothly. Keep your pelvis still rather than rocking side to side.",
  },
  {
    id: 'double-leg-stretch', n: 'Double-leg stretch', modality: 'pilates', log: 'reps',
    equipment: ['mat'], difficulty: 'intermediate', defaultRx: '1 × 6–8', targets: ['breath'],
    care: ['neck'], gentler: 'single-leg-stretch',
    cue: "Lie on your back hugging both knees in, head lifted if comfortable. Breathe in and reach your arms overhead and legs out, then breathe out and circle your arms round to hug your knees back in. Keep your legs high enough that your lower back stays down.",
  },
  {
    id: 'single-leg-circles', n: 'Single-leg circles', modality: 'pilates', log: 'reps', perSide: true,
    equipment: ['mat'], difficulty: 'beginner', defaultRx: '5 each way, each side', targets: ['hips'],
    cue: "Lie on your back with one knee bent and foot flat, the other leg reaching up with a soft knee. Draw small circles with the raised leg, five one way and five the other. Keep the circles small enough that your hips stay still on the mat.",
  },
  {
    id: 'spine-stretch-forward', n: 'Spine stretch forward', modality: 'pilates', log: 'reps',
    equipment: ['mat'], difficulty: 'beginner', defaultRx: '1 × 5–6', targets: ['spine', 'hamstrings'],
    cue: "Sit tall with legs a little wider than hips, knees bent if needed, arms reaching forward. Breathe out and curl forward from the top of your head, one part of the spine at a time, then roll back up to sitting. Don't collapse from the lower back first or reach by rounding your shoulders.",
  },
  {
    id: 'swan-prep', n: 'Swan prep', modality: 'pilates', log: 'reps',
    equipment: ['mat'], difficulty: 'beginner', defaultRx: '1 × 5–6', targets: ['spine'],
    care: ['lower-back'],
    cue: "Lie on your front with hands by your shoulders and elbows close in. Breathe in and lift your head and chest a little, using your back muscles more than your arms, then lower slowly. Keep your hips on the mat and the lift small; don't push up and squeeze into your lower back.",
  },
  {
    id: 'swimming', n: 'Swimming (lying face down)', modality: 'pilates', log: 'reps',
    equipment: ['mat'], difficulty: 'intermediate', defaultRx: '2 × 10–20 kicks', targets: ['spine'],
    cue: "Lie on your front with arms reaching past your head and legs long. Lift your arms and legs just off the mat and flutter them in small, opposite beats. Keep your neck long and your gaze down; don't crank your head or lower back up to lift higher.",
  },
  {
    id: 'side-lying-leg-series', n: 'Side-lying leg series', modality: 'pilates', log: 'reps', perSide: true,
    equipment: ['mat'], difficulty: 'beginner', defaultRx: '1 × 8–10 each side', targets: ['hips'],
    cue: "Lie on your side with your head resting on your lower arm and your body in a straight line. Lift the top leg a little higher than your hip, then lower with control; add small forward and back swings as it gets easier. Keep your hips stacked rather than rolling backwards.",
  },
  {
    id: 'clam', n: 'Clam', modality: 'pilates', also: ['mobility'], log: 'reps', perSide: true,
    equipment: ['mat', 'band'], difficulty: 'beginner', defaultRx: '2 × 12–15 each side', targets: ['hips'],
    cue: "Lie on your side with knees bent and feet together, a band round your thighs if you like. Keep your feet touching and open the top knee like a clam, then close it slowly. Don't let your top hip roll back to open wider.",
  },
  {
    id: 'saw', n: 'Saw', modality: 'pilates', log: 'reps', perSide: true,
    equipment: ['mat'], difficulty: 'beginner', defaultRx: '1 × 4–5 each side', targets: ['spine', 'hamstrings'],
    cue: "Sit tall with legs wider than your hips, knees bent if needed, arms out to the sides. Twist towards one leg, then breathe out and reach your opposite hand towards that little toe, and roll back up. Keep both sitting bones on the mat and don't force the reach.",
  },
  {
    id: 'teaser', n: 'Teaser', modality: 'pilates', log: 'reps',
    equipment: ['mat'], difficulty: 'advanced', defaultRx: '1 × 3–5', targets: ['balance', 'spine'],
    care: ['lower-back'],
    cue: "Lie on your back with knees bent and feet lifted. Reach your arms towards your knees and roll up into a V balance on your sitting bones, then roll down one bone at a time. Keep your knees bent if your back strains, and don't jerk up with momentum.",
  },

  // ─── Mobility ───────────────────────────────────────────────────────────────────────────────
  {
    id: 'march-on-the-spot', n: 'March on the spot with arm swings', modality: 'mobility', log: 'hold',
    equipment: [], difficulty: 'beginner', defaultRx: '1 × 60 sec', targets: ['hips', 'shoulders'],
    cue: "Stand tall and march at an easy pace, swinging your arms loosely. Let your breathing settle. This is a warm-up, not cardio, so keep it relaxed rather than fast.",
  },
  {
    id: 'shoulder-rolls', n: 'Shoulder rolls', modality: 'mobility', log: 'reps',
    equipment: [], difficulty: 'beginner', defaultRx: '10 each way', targets: ['shoulders'],
    cue: "Stand or sit tall with your arms relaxed. Lift your shoulders up to your ears, roll them back and down, then reverse the direction. Keep it slow and smooth, and don't shrug up hard or rush.",
  },
  {
    id: 'lying-knee-rolls', n: 'Lying knee rolls', modality: 'mobility', log: 'reps', perSide: true,
    equipment: [], difficulty: 'beginner', defaultRx: '8 each side', targets: ['spine', 'hips'],
    cue: "Lie on your back with knees bent, feet flat and arms out wide. Let both knees lower slowly to one side, then bring them back through the middle to the other. Keep both shoulders on the mat and only go as far as feels easy. Move slowly, don't let the knees drop.",
  },
  {
    id: 'worlds-greatest-stretch', n: "World's greatest stretch", modality: 'mobility', log: 'reps', perSide: true,
    equipment: [], difficulty: 'beginner', defaultRx: '1 × 4–5 each side', targets: ['hips', 'spine', 'hamstrings'],
    cue: "Step into a long lunge with the back knee down on a mat or lifted, and place both hands inside the front foot. Reach the inside arm up to the ceiling, turning your chest, then bring it back down. Move slowly and turn from your upper back rather than twisting the lower back.",
  },
  {
    id: 'hip-90-90', n: 'Hip 90/90 switch', modality: 'mobility', log: 'reps',
    equipment: [], difficulty: 'beginner', defaultRx: '1 × 6–8 each way', targets: ['hips'],
    care: ['knees'],
    cue: "Sit with both knees bent to one side, front shin across your body and back shin out to the side, hands behind you for support. Lift your knees and rotate them over to the other side, then back. Move within a comfortable range and don't force either knee towards the floor.",
  },
  {
    id: 'open-book', n: 'Open book', modality: 'mobility', log: 'reps', perSide: true,
    equipment: [], difficulty: 'beginner', defaultRx: '1 × 6–8 each side', targets: ['spine', 'chest'],
    cue: "Lie on your side with knees bent and stacked, arms straight out in front, palms together. Open the top arm up and over to the other side, following it with your eyes, then close again. Keep your knees together so the turn comes from your upper back.",
  },
  {
    id: 'half-kneeling-hip-flexor', n: 'Half-kneeling hip flexor stretch', modality: 'mobility', log: 'hold', perSide: true,
    equipment: [], difficulty: 'beginner', defaultRx: '45 sec each side', targets: ['hips'],
    cue: "Kneel on one knee with the other foot in front, and fold the mat under the knee for padding. Tuck your tailbone under, then shift your hips forward until you feel a stretch at the front of the back hip. Keep your body upright and don't arch your lower back to go further. If kneeling is uncomfortable, do it standing in a long stride.",
  },
  {
    id: 'supine-hamstring-stretch', n: 'Lying hamstring stretch', modality: 'mobility', also: ['yoga'], log: 'hold', perSide: true,
    equipment: [], difficulty: 'beginner', defaultRx: '45 sec each side', targets: ['hamstrings'],
    cue: "Lie on your back with both knees bent. Lift one leg and hold behind the thigh, then straighten the knee until you feel a gentle stretch along the back of the leg. Keep your head and lower back on the mat. Don't pull hard or yank the leg towards you.",
  },
  {
    id: 'wall-calf-stretch', n: 'Wall calf stretch', modality: 'mobility', log: 'hold', perSide: true,
    equipment: [], difficulty: 'beginner', defaultRx: '30–45 sec each side', targets: ['calves', 'ankles'],
    cue: "Stand facing a wall with hands on it and one foot stepped back. Keep the back leg straight and heel down, toes pointing forward, and lean in until you feel a stretch in the calf. Don't let the back heel lift or the foot turn out.",
  },
  {
    id: 'knee-to-wall', n: 'Knee to wall', modality: 'mobility', log: 'reps', perSide: true,
    equipment: [], difficulty: 'beginner', defaultRx: '1 × 10 each side', targets: ['ankles'],
    cue: "Face a wall with one foot a few centimetres away from it, holding the wall lightly. Bend the knee towards the wall over your toes while the heel stays down, then back. Move the foot back as it gets easier, and don't let the heel lift or the knee cave inwards.",
  },
  {
    id: 'doorway-chest-stretch', n: 'Doorway chest stretch', modality: 'mobility', log: 'hold',
    equipment: [], difficulty: 'beginner', defaultRx: '30–45 sec', targets: ['chest', 'shoulders'],
    cue: "Stand in a doorway with forearms on the frame, elbows at or just below shoulder height. Step one foot through gently until you feel a stretch across your chest. Keep it mild and your shoulders down; don't lean so far that the front of the shoulder aches.",
  },
  {
    id: 'cross-body-shoulder', n: 'Cross-body shoulder stretch', modality: 'mobility', log: 'hold', perSide: true,
    equipment: [], difficulty: 'beginner', defaultRx: '30 sec each side', targets: ['shoulders'],
    cue: "Stand or sit tall and bring one arm across your chest. Hold it above the elbow with the other hand and draw it gently towards you. Keep the stretching shoulder down away from your ear rather than hunching.",
  },
  {
    id: 'thread-the-needle', n: 'Thread the needle', modality: 'mobility', also: ['yoga'], log: 'hold', perSide: true,
    equipment: [], difficulty: 'beginner', defaultRx: '5 slow breaths each side', targets: ['spine', 'shoulders'],
    cue: "On hands and knees, slide one arm underneath your body, palm up, until that shoulder and the side of your head rest on the mat. Stay for a few breaths, then press back up and switch. Keep your hips over your knees and don't let your weight fall onto your neck.",
  },
  {
    id: 'neck-side-stretch', n: 'Neck side stretch', modality: 'mobility', log: 'hold', perSide: true,
    equipment: [], difficulty: 'beginner', defaultRx: '20–30 sec each side', targets: ['shoulders'],
    care: ['neck'],
    cue: "Sit tall with your shoulders relaxed. Slowly tip one ear towards the same shoulder until you feel a gentle stretch along the side of your neck, then bring your head back up. Keep it gentle: don't pull your head with your hand, roll it in circles or push into any pain.",
  },
  {
    id: 'supported-deep-squat', n: 'Supported deep squat', modality: 'mobility', log: 'hold',
    equipment: [], difficulty: 'beginner', defaultRx: '3 × 20–30 sec', targets: ['hips', 'ankles'],
    care: ['knees'],
    cue: "Hold a door frame, post or sturdy furniture with feet a little wider than your hips. Sit down as low as is comfortable, heels down (a folded mat under them helps), and breathe. Use your hands to stay balanced and don't drop into a depth that hurts your knees.",
  },
  {
    id: 'band-pull-apart', n: 'Band pull-apart', modality: 'mobility', also: ['strength'], log: 'reps',
    equipment: ['band'], difficulty: 'beginner', defaultRx: '2 × 12–15', targets: ['shoulders'],
    cue: "Hold a light band in front of you at shoulder height, hands about shoulder-width, arms straight. Pull the band apart by squeezing your shoulder blades together, then return slowly. Keep your shoulders down and ribs in, and don't arch your back to finish.",
  },
  {
    id: 'leg-swings', n: 'Leg swings', modality: 'mobility', log: 'reps', perSide: true,
    equipment: [], difficulty: 'beginner', defaultRx: '1 × 10 each side', targets: ['hips', 'hamstrings'],
    cue: "Stand side-on to a wall with one hand on it. Swing the outside leg forward and back in a relaxed arc, letting it get a little bigger each time. Stay tall and don't force the height or twist your lower back to swing further.",
  },

  // ─── Cardio ─────────────────────────────────────────────────────────────────────────────────
  {
    id: 'cardio-walk', n: 'Brisk walk', modality: 'cardio', log: 'duration',
    equipment: [], difficulty: 'beginner', defaultRx: '20–30 min', cardioVariation: 'walking', cardioKey: 'Brisk walk',
    cue: "Conversational pace. You can talk but not sing. Build up the minutes before the speed.",
  },
  {
    id: 'cardio-easy-walk', n: 'Easy walk', modality: 'cardio', log: 'duration',
    equipment: [], difficulty: 'beginner', defaultRx: '10–20 min', cardioVariation: 'walking', cardioKey: 'Easy walk',
    cue: "Walk at a relaxed, conversational pace, one where you could chat in full sentences. Outside, indoors or on a flat treadmill all count. No need to speed up to make it 'worth it'. Easy is the point. Stop whenever you've had enough.",
  },
  {
    id: 'cardio-incline-walk', n: 'Incline walk', modality: 'cardio', log: 'duration',
    equipment: [], difficulty: 'beginner', defaultRx: '20–30 min', cardioVariation: 'walking', cardioKey: 'Incline walk 1–5%',
    cue: "On a treadmill or a hill, start with a gentle slope and a pace you can talk at. Stand tall and take natural steps, holding the rails only lightly for balance. If you need to lean on the rails to keep up, lower the incline or the speed.",
  },
  {
    id: 'cardio-run', n: 'Run', modality: 'cardio', log: 'duration',
    equipment: [], difficulty: 'beginner', defaultRx: '20–30 min', cardioVariation: 'running',
    care: ['knees'], gentler: 'cardio-walk',
    cue: "Warm up with a few minutes of walking, then run at a pace where you can still talk; walk-run intervals are a fine way to start. Take short, light steps with your feet landing under you. The usual mistake is going too fast too soon, so build the minutes before the speed.",
  },
  {
    id: 'cardio-cycle', n: 'Cycle (outdoors)', modality: 'cardio', log: 'duration',
    equipment: [], difficulty: 'beginner', defaultRx: '20–40 min', cardioVariation: 'cycling',
    cue: "Wear a helmet and set the saddle so your knee stays slightly bent at the bottom of each pedal stroke. Ride at a steady, conversational effort in a gear that lets your legs spin smoothly. Don't grind a hard gear up hills; change down and keep spinning.",
  },
  {
    id: 'cardio-bike', n: 'Stationary bike', modality: 'cardio', log: 'duration',
    equipment: ['cardio-machine'], difficulty: 'beginner', defaultRx: '20–30 min', cardioVariation: 'cycling', cardioKey: 'Stationary bike',
    cue: "Set the saddle at about hip height so your knee stays slightly bent at the bottom of each stroke. Pedal smoothly at a pace you can talk at, sitting tall with relaxed shoulders. If you're bouncing in the saddle, add a little resistance; if you're grinding, take some off.",
  },
  {
    id: 'cardio-row', n: 'Rowing machine', modality: 'cardio', log: 'duration',
    equipment: ['cardio-machine'], difficulty: 'beginner', defaultRx: '10–20 min', cardioVariation: 'rowing', cardioKey: 'Rower',
    cue: "Strap your feet in and sit tall, arms straight. Push with your legs first, then lean back slightly and draw the handle to your lower ribs; on the way back, arms go first, then body, then knees. The common mistake is pulling with the arms early or rounding your back, so lead with the legs.",
  },
  {
    id: 'cardio-swim', n: 'Swim', modality: 'cardio', log: 'duration',
    equipment: [], difficulty: 'beginner', defaultRx: '20–30 min', cardioVariation: 'swimming',
    cue: "Choose a stroke you're comfortable with and swim where there's a lifeguard. Go at an easy, steady pace, breathing out into the water and resting at the wall whenever you need. Don't hold your breath or race the first lengths; build up the distance gradually.",
  },
  {
    id: 'cardio-cross-trainer', n: 'Cross-trainer', modality: 'cardio', log: 'duration',
    equipment: ['cardio-machine'], difficulty: 'beginner', defaultRx: '20–30 min', cardioVariation: 'elliptical', cardioKey: 'Cross-trainer',
    cue: "Step on with your whole foot on each pedal and hold the handles. Move at a smooth, conversational pace, pushing and pulling the handles lightly while you stand tall. Don't lean on the handles or let your heels lift; add resistance rather than speed if it feels too easy.",
  },
  {
    id: 'cardio-stair', n: 'Stair climber', modality: 'cardio', log: 'duration',
    equipment: ['cardio-machine'], difficulty: 'intermediate', defaultRx: '10–20 min', cardioVariation: 'stair',
    care: ['knees'], gentler: 'cardio-incline-walk',
    cue: "On a stair machine or real stairs, stand tall and place your whole foot on each step. Climb at a steady pace you can talk at, hands resting on the rails only for balance. If you have to lean on the rails to keep up, slow down.",
  },
  {
    id: 'cardio-jump-rope', n: 'Jump rope', modality: 'cardio', log: 'duration',
    equipment: [], difficulty: 'intermediate', defaultRx: '5–10 min', cardioVariation: 'jump-rope',
    care: ['knees'], gentler: 'cardio-walk',
    cue: "Stand on the middle of the rope; the handles should reach about your armpits. Turn the rope with your wrists and make small, soft hops on the balls of your feet, starting with short bursts and rests. Don't jump high or land flat-footed.",
  },
  {
    id: 'cardio-intervals', n: 'Intervals', modality: 'cardio', log: 'duration',
    equipment: ['cardio-machine'], difficulty: 'intermediate', defaultRx: '15–20 min', cardioVariation: 'hiit',
    cue: "On a bike, rower, cross-trainer or walking uphill, warm up for about 5 minutes. Then alternate short efforts that feel hard but controlled, about 30 seconds to start, with a longer easy spell, and finish with a few easy minutes. Hard doesn't mean all-out; keep every effort one you could repeat.",
  },
]

export const EXERCISE_BY_ID: Record<string, Exercise> = Object.fromEntries(EXERCISES.map((e) => [e.id, e]))
