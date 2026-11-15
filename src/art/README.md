# Character asset manifest

Drop files here; they are picked up automatically at build time (no code changes).
`.webp` wins over `.png` if both exist. Anything missing falls back to the procedural SVG art in `src/art.ts`.

**Status:**
- **Portraits:** all 14 expressions are painted raster art, each with `_talk1` and `_blink` frames (42 WebP files, 853×1280, transparent).
- **Sprites:** still the procedural SVG fallback.

**Provenance of the portraits:** generated in Nov 2026 with OpenAI image generation (gpt-image, via the Codex CLI's built-in image tool on the project owner's ChatGPT account). They are not traced or converted from the SVG art.
- **Bases:** each one was generated on flat #00FF00. Hensen's other expressions and every Kevin and Rachel image used an earlier generation as a style and identity reference. Alice's master was generated from a reference photo supplied by the project owner (face likeness; hair, outfit and pose were specified in the prompt). Her other three expressions used that master. The photo is not shipped.
- **Talk/blink frames:** each is an edit of its base that changes only the mouth or the eyes. The edit is aligned to the base, colour-matched, and only a feathered patch around the mouth or eyes is pasted back, so the rest of the frame is pixel-identical.
- **Finishing:** chroma-keyed to alpha with despill, framed (Rachel is zoomed 1.12× so her head size matches), and exported as WebP.
- **Licence:** OpenAI's Terms of Use assign ownership of outputs to the user. No stock or third-party art is used.
- **Likeness:** Hensen is a parody likeness of a real person. Keep it clearly comedic. Alice is a stylized likeness of the person in the owner-supplied reference photo; make sure that person has consented before publishing.

Regenerating a frame means redoing that whole set (base + `_talk1` + `_blink`), or the frames stop lining up.

## Style bible (applies to every file)

- Street Fighter III / Alpha-inspired: bold dark ink outline (`#141417`), strong silhouette, dynamic poses.
- Modern painterly shading: soft brush texture, one warm key light from upper left, cool rim light from behind.
- Realistic anatomy, 7–7.5 heads tall (sprites may compress to ~6 for readability). Average or slim builds. **No** bulky muscles, oversized limbs, chibi or generic anime faces, or photorealism.
- Exaggerate expression and pose, never physique.
- Transparent background, no ground shadow (the game draws its own).

## Portraits (dialogue): `portrait_<id>_<emotion>[_variant].png`

Waist-up bust, **2:3** (853×1280 shipped; the SVG fallback is 500×600), head near the top centre, same framing and scale across every character.
Each expression has up to four frames. They must be pixel-aligned (same canvas, same pose); only the mouth or eyes change:

| Suffix | Content |
|--------|---------|
| *(none)* | base: the expression's own mouth, eyes open |
| `_talk1` | mouth mid-word (opened, or half-closed if the base is already open) |
| `_talk2` | optional second mouth; when missing, talking alternates base and `_talk1` |
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
| rachel | `neutral` | office small talk | polite, slightly tired smile |
| rachel | `friendly` | warmer follow-up | wink, soft smile |
| alice | `smile` | pleasant first line | calm, composed, polite closed-mouth smile, hand on lapel |
| alice | `wink` | warm/intrigued | wink, soft smile, head tilt, hand near chin |
| alice | `dramatic` | challenges Hensen | confident smirk, pointing at the viewer, hair in motion |
| alice | `villain` | betrayal reveal | **same outfit**. Narrowed eyes, sinister smirk, shadow over the upper face, purple/magenta under-light and rim light |

## Sprites (in-game): `sprite_<id>.png`

One horizontal strip, frames side by side, each **128×192** (2:3), character facing **right**, feet on the bottom edge at the same x in every frame. The game mirrors frames for left-facing.
Frame order must match `ANIMS` in `src/art.ts`:

| id | Strip (frame count) | Frames in order |
|----|---------------------|-----------------|
| hensen | 1280×192 (10) | idle ×2 · walk ×4 · talk ×2 · shocked ×2 |
| kevin | 1152×192 (9) | idle ×2 · run ×4 · stumble ×1 · panic ×2 |
| alice | 1280×192 (10) | idle ×2 · walk ×4 · talk ×2 · dramatic ×1 · villain ×1 |
| rachel | 1024×192 (8) | idle ×2 · walk ×4 · talk ×2 |

Simplified shapes and flat 2-tone shading, the same outfit, hair and palette as the portraits. They must read at ~100 px tall.
Idle = a subtle breathing pair; walk and run = contact, pass, contact, pass; talk = a hand gesture with open and closed mouth.

## Character sheets

**Hensen Juang (`hensen`)**: CEO and protagonist. Closely resembles Jensen Huang: age and facial structure, short swept-back salt-and-pepper hair. Signature black leather jacket, black tee, dark trousers, plain dark shoes, a small Njidion-green (`#76b900`) pin. Average-to-fit build.
Palette: jacket `#141417` / sheen `#4a4a55`, tee `#25252b`, skin `#e2b48a`.

**Kevin (`kevin`)**: the office spy. Ordinary, slightly suspicious. Slim. Muted blue-gray shirt `#8fa3ba`, slate tie `#46566b`, gray trousers `#3d4452`, employee badge on a lanyard, round glasses, neat brown hair, a manila folder.

**Alice (`alice`)**: love interest and the true final boss. A Chinese woman in her early thirties, stylized likeness of the owner-supplied reference photo. Luxury-corporate, elegant, mysterious. Polished shoulder-length dark-brown lob `#3a2219` with a side part. Tailored ivory double-breasted blazer `#ece4d6` with gold buttons, black silk blouse buttoned to the collarbone, black trousers, gold drop earrings and a gold watch. Office-appropriate, nothing revealing; her appeal is posture, gaze and poise.
She never changes outfit; the reveal is only expression, pose and lighting (purple/magenta under-light and rim, deep shadows, arms crossed).

**Rachel (`rachel`)**: quiet engineering coworker, a background NPC (inherits the earlier Alice art). Rose blazer `#b9506f`, ivory blouse `#f6efe7`, charcoal trousers `#2e2e3c`, long auburn hair `#b8442f`, green eyes.

## Example generation prompt (adapt per row)

> Fighting-game character portrait in the style of Street Fighter III and Alpha official art, bold black ink outlines, painterly cel shading with soft brush texture, cinematic rim lighting. Waist-up bust, 3/4 view, realistic proportions, not muscular. {character sheet line}. Expression: {prompt notes}. Flat pure #00FF00 background (keyed to alpha afterwards), 2:3 portrait, consistent framing.

Record the tool and licence in **Provenance** above whenever art is added.

`njidion_logo.png` is the company logo (title screen, favicon, office and hallway walls). Replace the file to change it everywhere.
