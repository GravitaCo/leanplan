# Copy-paste video prompts

The prompt lists Benn uses to generate Tali's demo clips (Seedance). The house rules behind them
are in `docs/exercise-video-prompts.md`.

**To use:** open a list, copy one demonstrator block (Step 1), then copy an exercise or warm-up
prompt (Step 2) and paste it on the end.

- `tali-video-prompts-women.md`, `tali-video-prompts-men.md`: the 153 library exercises without a
  clip (the 28 moves in Tali's plans first).
- `tali-warmup-prompts-women.md`, `tali-warmup-prompts-men.md`: the 19 warm-up moves.

**To change them:** edit the sources, not the lists, then rebuild.

- Exercise prompts: `prompts-a.md` (plan moves), `prompts-b.md`, `prompts-c.md`;
  warm-up prompts: `prompts-warmup.md`. All are written with "she"; the men's lists are converted.
- Demonstrators, the scene block, the background props and the "not muscular" line: `build.py`
  (`WOMEN`, `MEN`, `block`).
- Rebuild from this folder: `python3 build.py "$PWD" && python3 build_warm.py "$PWD"`.
