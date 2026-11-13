// Lists which exercises have a demo clip, for docs/video-prompts/STATUS.md.
import { EXERCISES } from '@/core/data/exercises'
import { WORKOUTS, SWAPS } from '@/core/data/workouts'
import { TALI_WORKOUTS } from '@/core/data/taliWorkouts'
import { WARMUP_LISTS } from '@/core/data/warmups'
const s = (o: unknown) => JSON.stringify(o)
const wk = s(WORKOUTS) + s(SWAPS), tw = s(TALI_WORKOUTS), wu = s(WARMUP_LISTS)
const used = (e: any) => [wk.includes(`"${e.n}"`) || wk.includes(`"${e.id}"`) ? 'workout' : '', tw.includes(`"${e.id}"`) || tw.includes(`"${e.n}"`) ? 'plan' : '', wu.includes(`"${e.id}"`) ? 'warm-up' : ''].filter(Boolean).join(', ')
const bunny = (e: any) => (e.video?.src.match(/net\/([0-9a-f]{8})/) || [])[1] || ''
const done = EXERCISES.filter((e: any) => e.video), todo = EXERCISES.filter((e: any) => !e.video)
const row = (e: any) => `| ${e.n} | \`${e.id}\` | ${(e.equipment || []).join(', ') || 'none'} | ${used(e) || '-'} | ${bunny(e)} |`
const head = '| Exercise | id | Equipment | Seen in | Bunny |\n|---|---|---|---|---|'
const seen = todo.filter((e: any) => used(e)), rest = todo.filter((e: any) => !used(e))
const out = (`## In the app (${done.length})\n\n${head}\n${done.map(row).join('\n')}\n\n## Still needed, seen in a workout, plan or warm-up (${seen.length})\n\n${head}\n${seen.map(row).join('\n')}\n\n## Still needed, library only (${rest.length})\n\n${head}\n${rest.map(row).join('\n')}`)
// Rewrites the generated part of docs/video-prompts/STATUS.md (below the marker) from the app's data.
import { readFileSync, writeFileSync } from 'node:fs'
const file = 'docs/video-prompts/STATUS.md', mark = '<!-- generated below: npm run video:status -->'
const doc = readFileSync(file, 'utf8')
writeFileSync(file, doc.slice(0, doc.indexOf(mark) + mark.length) + '\n\n' + out + '\n')
console.log(`${file}: ${done.length} in the app, ${seen.length + rest.length} still needed`)
