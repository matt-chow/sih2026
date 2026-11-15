# Character asset manifest

Drop files here; they are picked up automatically at build time (no code changes).
`.webp` wins over `.png` if both exist. Anything missing falls back to the procedural SVG art in `src/art.ts`.

**Status:** every character currently renders with the procedural SVG fallback. No illustrated raster art has been made yet. The files below are what the artist (or an image-generation pass) needs to produce.

## Style bible (applies to every file)

- Street Fighter III / Alpha-inspired: bold dark ink outline (`#141417`), strong silhouette, dynamic poses.
- Modern painterly shading: soft brush texture, one warm key light from upper left, cool rim light from behind.
- Realistic anatomy, 7–7.5 heads tall (sprites may compress to ~6 for readability). Average or slim builds. **No** bulky muscles, oversized limbs, chibi or generic anime faces, or photorealism.
- Exaggerate expression and pose, never physique.
- Transparent background, no ground shadow (the game draws its own).

## Portraits (dialogue): `portrait_<id>_<emotion>[_variant].png`

Waist-up bust, **500×600** (5:6), head centred near (250, 250), same framing and scale across every file of a character.
Each expression has up to four frames. They must be pixel-aligned (same canvas, same pose); only the mouth or eyes change:

| Suffix | Content |
|--------|---------|
| *(none)* | base: mouth closed, eyes open |
| `_talk1` | mouth half open |
| `_talk2` | mouth open |
| `_blink` | eyes closed, mouth as base |

Missing variants fall back to the base frame (the portrait still bobs while talking, but its mouth stays still).

| id | emotion | Use | Prompt notes |
|----|---------|-----|--------------|
| hensen | `neutral` | confident default | relaxed half-smile, chin up, arms loose |
| hensen | `smug` | joking at desks | eyes closed, smirk, one eyebrow up |
| hensen | `shocked` | finds the blueprints | eyes wide, mouth agape, sweat drops, hands to head |
| hensen | `determined` | starts the chase | brows down, jaw set, leaning forward, fist raised |
| hensen | `love` | meets Alice | stunned, blushing, starry eyes, hand on chest |
| hensen | `defeated` | ending card | tears, slumped shoulders, wobbly mouth |
| kevin | `nervous` | caught at desk | forced smile, sweat, clutching a folder to his chest |
| kevin | `panic` | bolts | eyes wide, mouth open, glasses askew |
| alice | `smile` | pleasant first line | composed, polite smile |
| alice | `wink` | warm/affectionate | wink, soft smile, head tilt |
| alice | `dramatic` | challenges Hensen | confident smirk, pointing at the viewer, hair in motion |
| alice | `villain` | betrayal reveal | **same outfit**. Narrowed eyes, sharp grin, shadow over the upper face, red under-light, green rim light |

## Sprites (in-game): `sprite_<id>.png`

One horizontal strip, frames side by side, each **128×192** (2:3), character facing **right**, feet on the bottom edge at the same x in every frame. The game mirrors frames for left-facing.
Frame order must match `ANIMS` in `src/art.ts`:

| id | Strip (frame count) | Frames in order |
|----|---------------------|-----------------|
| hensen | 1280×192 (10) | idle ×2 · walk ×4 · talk ×2 · shocked ×2 |
| kevin | 1152×192 (9) | idle ×2 · run ×4 · stumble ×1 · panic ×2 |
| alice | 1280×192 (10) | idle ×2 · walk ×4 · talk ×2 · dramatic ×1 · villain ×1 |

Simplified shapes and flat 2-tone shading, the same outfit, hair and palette as the portraits. They must read at ~100 px tall.
Idle = a subtle breathing pair; walk and run = contact, pass, contact, pass; talk = a hand gesture with open and closed mouth.

## Character sheets

**Hensen Juang (`hensen`)**: CEO and protagonist. Closely resembles Jensen Huang: age and facial structure, short swept-back salt-and-pepper hair. Signature black leather jacket, black tee, dark trousers, plain dark shoes, a small NGIDIA-green (`#76b900`) pin. Average-to-fit build.
Palette: jacket `#141417` / sheen `#4a4a55`, tee `#25252b`, skin `#e2b48a`.

**Kevin (`kevin`)**: the office spy. Ordinary, slightly suspicious. Slim. Muted blue-gray shirt `#8fa3ba`, slate tie `#46566b`, gray trousers `#3d4452`, employee badge on a lanyard, round glasses, neat brown hair, a manila folder.

**Alice (`alice`)**: love interest and the final spy. Elegant and composed. Smart-casual: rose blazer `#b9506f`, ivory blouse `#f6efe7`, charcoal trousers `#2e2e3c`, small gold earrings, long auburn hair `#b8442f`, green eyes.
Likeness: there is no reference image for Alice in this repo, so do not invent likeness-specific details. Use the provided reference when one exists.
She never changes outfit; the reveal is only expression, pose and lighting.

## Example generation prompt (adapt per row)

> Fighting-game character portrait in the style of Street Fighter III and Alpha official art, bold black ink outlines, painterly cel shading with soft brush texture, cinematic rim lighting. Waist-up bust, 3/4 view, realistic proportions, not muscular. {character sheet line}. Expression: {prompt notes}. Transparent background, 500×600, centred, consistent framing.

Check the image tool's licence terms before shipping, and record the tool and licence here. No third-party art is used today.
