# Little Joys — art and asset pipeline

## 1. Art direction

Create a small, coherent family of **soft, tactile, cheerful original toys**. Use rounded silhouettes, readable dark outlines, restrained shading, and a limited palette. A warm cream background with teal, apricot, and lavender accents is a proposed starting direction, not a statement about sensory preferences. Colour is never the sole signal of an object's state.

The background should stay visually quiet while the interactive object has strong local contrast. Avoid tiny texture noise, photographic skin, startling teeth, distressed faces, visual clutter, flashing highlights, and elaborate scenery. Do not turn “gentle” into washed-out or unattractive art. The creature can be funny and characterful without speaking or performing idle attention-seeking animations.

The key quality test is how the object feels when touched. A gorgeous static portrait that cannot deform is not a finished Squishy Friend.

## 2. What needs art, and what should stay procedural

| Asset | First-version approach | Runtime export |
|---|---|---|
| Squishy Friend concept | Generate one approved original mascot reference | Development reference, not necessarily shipped |
| Squishy Friend body | Procedural contour based on the approved design | Code; no large bitmap mesh required |
| Face features | Simple vector/procedural shapes following deformation | Code, or tiny inspected assets |
| Toybox tiles | Capture approved in-app toys into consistent tile artwork; optional generated accents | Three 256–512 px images |
| Bubble and ripple | Canvas primitives | Code |
| Ball | Canvas shape with simple static shading | Code; optional small texture only if visibly useful |
| Bowl | Procedural back/rim or two consistent art layers | At most two 512 px images |
| App icon | Original mascot, simplified silhouette | 192, 512, and 180 px PNG exports |
| SFX | At most one short owned/original sound per toy; silence is valid | Local files or tightly bounded synthesis |

Do not require every visible pixel to come from a generated image. Code is the right asset format for interactive geometry. Limit the first version to eight unique source raster assets before platform icon sizes; fewer is better. Include raster copies of icons in the audited size budget.

## 3. Generation capability check

OpenAI's 8 September 2026 announcement identifies Images 2.5 Flare and Sunburst [R24]. The implementation agent must inspect its actual image tool/API access and current official endpoint schema before invoking it [R25]. Do not invent an API alias or assume every model supports identical sizes, transparency options, reference inputs, or editing parameters.

Prefer the available fast illustration-capable option for first concepts; use a precision option only for a specific visible problem. Record the actual model identifier, prompt, reference provenance, and generation date. Neither model access nor successful generation has been established by this document.

Generate assets as a development task, inspect them, then commit/export the approved outputs. `npm run build` and Vercel deployment must not call an image model, spend credits, or need an API key. Keep any credential outside public files and client-prefixed environment variables.

## 4. Standalone generation prompts

These are text briefs for the implementation agent's available image tool. They are not API request schemas. Use approved references only when that tool supports them.

### Prompt A — mascot concept

Create an original friendly squishable creature for a direct-touch children's software toy. One front-facing rounded jelly-like character with a simple oval or pear-shaped body, soft teal colour, warm apricot cheeks, two clear dark oval eyes, and a small content smile. The character should feel tactile, funny, inviting, and premium, like a beautifully illustrated soft toy. Use a strong clean silhouette, broad simple colour areas, restrained soft shading, and no fine texture noise. No arms holding objects, no clothes, no props, no words, no scenery, no other characters, no photographic realism, no resemblance to an existing Nintendo character. Keep every important facial feature well inside the body boundary so an implementation can move it during local stretching. Plain neutral background. This is a reference for a procedural deformable character, not a request for a sprite sheet.

### Prompt B — bowl reference or layers

Create a single friendly toy bowl for a simple touch game in which a large ball can be placed in and taken out. Use a wide shallow opening, a low front rim, a clearly readable inner space, rounded edges, warm apricot material, a clean dark outline, and restrained soft illustration shading. Front three-quarter view, almost straight-on, with no dramatic perspective. The opening must be broad and unobstructed; a ball resting inside must remain mostly visible. No patterns, words, other objects, hands, scenery, dramatic shadows, or reflections. Match the supplied approved toy style reference if available. Isolate the bowl on a plain background, or true transparency when supported. The back and front rim will be separated and inspected before use.

### Prompt C — app icon

Create a clean original app icon using the approved squishy creature as the only subject. Keep the same character identity, face proportions, and colours. A large readable content face and a soft rounded silhouette occupy the central area, with generous safe padding for platform icon masks. Simple warm cream background, teal creature, restrained apricot accents. Strong silhouette that still reads at a small size. No letters, title, badges, small decorations, extra characters, gradients with intense contrast, or facial expression of surprise. Square composition. Do not imitate an existing app's branding.

### Prompt D — optional coherent tile accents

Create three separate minimal illustration accents for a toy selector in the approved Little Joys style: one soft curved squish mark, one simple translucent bubble cluster of three, and one large ball resting in a shallow bowl. Each illustration has one clear central silhouette, generous blank space, consistent soft shading and line thickness, and no text, scenery, sparkles, characters, or decorative frame. These are supplementary accents; actual toy previews must remain recognisable and match the implemented objects. Produce separate assets rather than a baked-in screen layout.

Prefer actual render captures for the toy tiles: generated tiles that depict mechanics the app does not contain create misleading affordances.

## 5. Selective reuse from Maze-o-Puzzle

The inspected repository's `public/assets` directory contains these candidate files [R27]:

```text
public/assets/animal-bunny.png
public/assets/animal-duckling-v1.png
public/assets/animal-capybara-v1.png
public/assets/animal-fox.png
```

Their filenames and presence were verified, but their dimensions, alpha quality, exact appearance, and provenance were not visually audited in this research. Treat them as candidates, not approved production assets. They may be useful for later reveal toys or style references, rather than being appropriate deformable bodies.

The owner has authorised reuse of owned work. At implementation time, verify each selected file's provenance and any third-party restrictions; record the source path and content hash. Copy only selected runtime derivatives into the new project. Do not link the game to the entire asset directory or modify the source repository. Nintendo and Super Simple artwork must not be extracted as a shortcut.

## 6. Export and validation

Export runtime files at their needed display resolution; source masters do not belong in `public`. Prefer WebP or PNG according to the actual transparency and quality needs. All raster edges are at most 1024 pixels; typical assets should be 256–512 pixels. Check visual sharpness at the capped device-pixel ratio rather than retaining huge originals by default.

Where transparent output is requested, inspect the alpha channel. A painted checkerboard is not transparency. If the selected endpoint does not provide true alpha, use an available removal/cutout process and inspect edges on both light and dark backgrounds. Never silently ship a white rectangle around an supposedly isolated object.

Maintain `asset-manifest.json` with stable IDs, path, width, height, encoded byte count, approximate decoded bytes, alpha presence, content hash, and a source/provenance label. For a procedural asset, record the relevant code module rather than fictitious image dimensions.

The audit must reject oversized exports, missing files, duplicate unused large assets, and private/source-only files in the production output. Visual review must check silhouettes, bowl layering, character consistency, and whether a nested ball remains visible. Do not mark an asset “approved” because generation succeeded.

If image generation is unavailable, complete all interactions with attractive procedural artwork, label the art status accurately, and keep the build runnable. Do not block functional delivery on a nonexistent image tool or claim that placeholder artwork was generated.
