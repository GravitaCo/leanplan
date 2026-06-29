# Tali subagents

Project-scoped Claude Code subagents. Each `.md` file = one agent (frontmatter + system
prompt). They're committed so the whole team/repo shares the same specialists.

| Agent | Owns | Posture |
|-------|------|---------|
| `nutrition-db` | Food database, meals/recipes, nutrition maths | Sourced, sanity-checked macros |
| `fitness-workouts` | Workout templates, exercises, cues, programming | Safe, evidence-based, no gym-bro |
| `security-data` | RLS, auth/OAuth, sync, Supabase schema | Skeptical, protective |
| `ship-critic` | Pre-ship gate — challenges every change | Adversarial, read-only |

## How to use them
- **Auto-delegation**: just describe the task; Claude routes to the matching agent based on
  its `description`. ("Add 20 UK breakfast foods" → `nutrition-db`.)
- **Explicit**: ask for one by name. ("Have ship-critic review this before I push.")
- **Parallel**: independent tasks can run several agents at once.

## The ship workflow (convention)
The three domain agents **build/propose but never push** — pushing is Benn's call
(`commit/push only when asked`). Before anything goes live, run **`ship-critic`**: it
reviews the diff against intent, verifies it runs, checks Tali's hard constraints, and
returns **SHIP / SHIP WITH FIXES / DON'T SHIP**. Nothing merges to `main` (which
auto-deploys to tali.fit) until it passes. `ship-critic` is read-only on purpose — it
judges, it can't quietly fix a thing to make it pass.

## Editing an agent
Edit the file's system prompt or frontmatter (`name`, `description`, `tools`, `model`).
Omitting `tools` inherits all tools (incl. MCP); listing them restricts the agent.
`model: inherit` uses the session model.
