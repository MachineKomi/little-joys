# Art provenance

## Squishy Friend concept v1

- Asset: `reference/squishy-friend-concept-v1.png`
- Stable ID: `squishy-friend-concept-v1`
- Created: 2026-09-13.
- Tool: available built-in OpenAI image generation, `image_gen__imagegen`; one new-image call, no references supplied.
- Model: the tool response did not expose an exact model identifier. No API model alias or endpoint was selected or invented.
- Capability evidence: generation completed successfully through the callable built-in tool. Its response contained `image_url` and `output_hint`; no model field. Current official image guide was checked during implementation: <https://developers.openai.com/api/docs/guides/image-generation>.
- Input provenance: original text brief from `docs/ASSETS.md`, Prompt A, reproduced exactly below. No private family information, transcripts, photographs, source art, or existing game assets were included in the generation request.
- Format: PNG, 1254 x 1254 pixels, RGB without alpha, 1,192,201 encoded bytes. Approximate RGBA decoded allocation would be 6,290,064 bytes; this is a calculation, not browser memory measurement.
- SHA-256: `dc51632540bd0ec2a2f0e3640893767a0512682d2802f890fe029f62dd51c1aa`.
- Use: development visual reference only; keep outside `public` and `dist`. The source exceeds the 1024-pixel runtime edge limit and is not a runtime export.
- Selection status: inspected and selected by the implementation agent as a useful reference within the authorised original-art task. This is not a claim of separate owner visual approval or observed player preference.

### Exact prompt

Create an original friendly squishable creature for a direct-touch children's software toy. One front-facing rounded jelly-like character with a simple oval or pear-shaped body, soft teal colour, warm apricot cheeks, two clear dark oval eyes, and a small content smile. The character should feel tactile, funny, inviting, and premium, like a beautifully illustrated soft toy. Use a strong clean silhouette, broad simple colour areas, restrained soft shading, and no fine texture noise. No arms holding objects, no clothes, no props, no words, no scenery, no other characters, no photographic realism, no resemblance to an existing Nintendo character. Keep every important facial feature well inside the body boundary so an implementation can move it during local stretching. Plain neutral background. This is a reference for a procedural deformable character, not a request for a sprite sheet.

### Visual inspection and translation

The generated image shows one mint/teal rounded pear-like creature, two broad dark oval eyes with ivory highlights, apricot cheeks, and a small content crescent smile. Features are well inside the body. There are no words, clothing, held objects, other characters, or elaborate scenery. The neutral background is opaque, as requested; this was not a transparent-output request.

The image adds a crown curl and two small toe lobes. These are reference details rather than required separate geometry. The procedural implementation should retain the readable face, broad colour areas, and soft shading while simplifying appendages into a stable body outline. A restrained dark teal outline can strengthen contrast against the quiet background. Keep local deformation and feature anchors procedural; do not stretch this bitmap as a substitute for the mechanic. The broad highlights can be rendered with simple clipped gradients rather than a texture.

No existing mascot reference or third-party game artwork was supplied. Visual inspection found no obvious copied character identity, but this is not a legal originality search. No Maze-o-Puzzle asset was reused for this concept.

## Runtime artwork boundary

Procedural toy geometry and any platform icon exports must be listed in the runtime asset manifest with their actual source modules, dimensions where applicable, bytes, and hashes. This reference file is intentionally excluded from runtime budgets and precaching. Generation is a completed development step; running, building, and deploying the application must not invoke a model or require an image API key.
# Runtime mascot sprite refinement — 13 September 2026

Source: `reference/squishy-friend-sprite-v2.png`. Generated using the built-in OpenAI image-generation tool, referencing only the original project concept above. The tool exposed no model selector/backend identifier. The runtime derivative is `public/assets/friend.webp`, 768 × 768 with inspected genuine alpha. Source masters never ship. The owner requested purpose-generated painted sprites; this sprite is builder-selected for the preview, not a claim of a family preference or playtest result.

Exact sanitized prompt:

> Use case: stylized-concept. Asset type: finished transparent game character sprite for Little Joys. Use the attached original Little Joys concept as character identity reference. Repaint the single teal squishy creature as a premium hand-painted storybook game sprite: affectionate wide-set dark oval eyes with creamy highlights, apricot soft cheeks, small content curved smile, adorable plump pear/jelly silhouette with a tiny integrated curl on the crown. Broad light and colour masses, beautiful authored material shading, soft squashy translucent-gumdrop feel, rich mint-to-teal volume, clean locally coloured dark contours. Make eyes a little larger and particularly endearing. Keep all face features comfortably inset so the whole texture can be locally warped by fingers. No separate limbs, no toes sticking out, no props or clothing, no ground shadow, no scenery, no text, no framing. Strong readable silhouette and lovely polished rendering; avoid vector-flat shapes, generic airbrush or shiny plastic toy photography, tiny speckle texture, excessive glints. True transparent RGBA background around the isolated character, not a checkerboard or white background. Front-facing, square canvas, whole silhouette visible with 12% transparent padding all sides. Maintain neutral content expression. No likeness to any existing franchise character.

Visual review: the result retains small toe lobes despite the prompt; they are accepted for this preview and included in the forgiving pickup envelope. Local texture warping was inspected in the actual game. Alpha is real, not a painted background. Production exports are independently budgeted and hashed in the asset manifest.

## Penguin Bounce mascot — 13 September 2026

- Stable ID: `penguin`.
- Source: `art/reference/penguin-source-v1.png`, 1254 × 1254 RGBA PNG, 1,075,204 bytes, SHA-256 `63e3713dc103341face267e004779bd6a9e4cd3c372b35c5285a21bb62ac7b14`.
- Runtime derivative: `public/assets/penguin.webp`, 512 × 512 RGBA WebP, 27,914 bytes, SHA-256 `972d2c1c28d968ef2644762f543ed53fdf851eb349c5b8b10d1d47cc7ead6e72`. Its RGBA allocation estimate is 1,048,576 bytes; this is not a browser-memory measurement.
- Generation: one built-in OpenAI `image_gen__imagegen` new-image call with no image references. The exact neutral product prompt is preserved in `art/SPRITE-PROMPTS.md`. No account information, personal context, external character reference, or third-party asset was supplied.
- Model reporting: the tool request/response exposes no selectable backend model identifier. The source C2PA metadata separately labels its software agent `gpt-image`, version `2.0`; this is recorded as embedded provenance, not an inferred API model alias or a claim of access to any other model version.
- Selection: owner-approved original artwork for the fourth toy. The mascot is scenery or a visual badge; interactive geometry remains procedural.

### Export and metadata inspection

Export recipe: load the source PNG with Sharp; apply no crop; resize to 512 × 512 with `fit: "contain"` and transparent background `{ r: 0, g: 0, b: 0, alpha: 0 }`; encode WebP with `{ quality: 84, alphaQuality: 100, effort: 6 }`. Keep the default metadata-stripping behavior. The recipe is also in `art/source-manifest.json`. This export is deterministic image processing and makes no generation or network request.

PNG chunk inspection found image data plus a C2PA manifest. Readable manifest fields contain provider attribution, content credentials, asset identifiers, certificate data, and timestamps. No account-name, contact, credential, or local-path field was found. The source has no EXIF, XMP, IPTC, or ICC payload. Its original C2PA attribution is preserved in the art source. The derivative contains genuine alpha and no EXIF, XMP, IPTC, or ICC payload; source provenance stays outside the runtime asset.

### Visual review

The original and 512-pixel derivative were inspected. The penguin has a complete rounded deep-teal plush silhouette, cream face and belly, coral beak and feet, two small wings, readable dark eyes, and comfortable transparent padding. Its soft material shading is consistent with the existing painted toy art. No words, watermark, extra character, scenery, or ground shadow is visible. Most interior alpha values are 252 or 253 as generated; the export retains them. Final rendering on the procedural board is reviewed during integration. No observed player preference or enjoyment is claimed by this selection.
