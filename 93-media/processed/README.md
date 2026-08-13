# Processed icons

Generated from the client-supplied originals in `93-media/` — do not hand-edit
these, regenerate them if the source art changes.

**Why this folder exists:** the original PNGs have a fully opaque black square
canvas behind the rounded badge (not a transparent background). Electron/macOS/
Windows all apply their own automatic icon-corner rounding on top of app icons,
so a second rounding on top of the badge's own already-rounded corners left a
black halo/border visible in the dock, taskbar, and window icon.

**What changed:** the four corner regions (flood-filled from each corner PNG
edge, matching near-black pixels only — the badge's interior dark tones are
left untouched since the bright gold ring border stops the fill) are keyed to
fully transparent. Everything else is pixel-identical to the original.

Regenerate with:

```python
# see the flood-fill script used for this — ask the session that produced
# this folder, or reimplement: transparent out any pixel connected to a PNG
# corner with RGB <= ~18 (near-black), leaving the badge itself untouched.
```
