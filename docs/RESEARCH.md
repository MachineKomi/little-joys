# Little Joys — research and design rationale

## Evidence boundary

The relevant question is not whether an app can “exercise the autistic brain” in a general sense. It is whether a particular child can comfortably control it, enjoy it, and find opportunities for meaningful play and communication. The proposed product has not been tested. Clinical guidance, research on other apps, observed preferences, and engineering documentation inform the design, but none validates this new toybox.

This is a targeted research synthesis, not a systematic review or a clinical treatment plan. The autism sources include UK clinical guidance, professional communication guidance, specialist autism information, and original app trials. The technology sources are browser/platform documentation and the actual existing project. Research checked on 13 September 2026. Source identifiers resolve in `SOURCES.md`.

## 1. Autism, communication, and learning

### Play can be meaningful without becoming a lesson

NICE CG170 recommends developmentally adjusted play-based social-communication approaches involving parents or carers, with responsiveness to the child's communication. Its recommended clinical intervention is delivered by a trained professional; the guidance does not make a parent-created game an equivalent intervention [R01].

**Design interpretation:** make the app a shared object of interest. Allow an adult to follow an action, imitate it, add a natural word, and respond to an invitation. Do not replace play with repeated “What colour is this?” questions. A parent can join without becoming an instructor, and the child can decline shared play without losing access.

### Sensory needs are individual

The National Autistic Society describes differences in sensitivity and sensory processing across senses and situations. A diagnosis alone does not specify whether an individual will prefer more movement, less sound, a particular colour, or a certain visual texture [R03].

**Design interpretation:** choose restrained defaults because the profile is unknown, not because a muted pastel interface is universally right. Make sound and motion independent settings. Preserve clear contrast. Change one variable at a time and use observed comfort rather than an automated “sensory score”. A touchscreen can present visual and auditory feedback; it should not be advertised as providing physical deep pressure or sensory integration therapy.

### Communication does not need to wait for speech

ASHA's early-intervention AAC guidance states that there are no prerequisites for AAC, that AAC does not hinder speech development, and that AAC includes gestures and signs as well as aided approaches. It distinguishes communication access from recreational screen time [R02].

**Design interpretation:** this toy is not an AAC gatekeeper. No word, sign, eye contact, or successful touch sequence is required to unlock play. The family can continue using established communication supports. A future communication feature should complement that system rather than introducing unfamiliar symbols and locations solely because they are easy to implement.

### Engagement is not proof of generalised benefit

In the FindMe randomised trial, 54 autistic children under six used an iPad intervention. Children engaged with it, but the study did not find significant between-group differences in the reported real-world social-communication outcomes [R04].

**Design interpretation:** enjoyment is valuable in its own right, but tapping skill, minutes played, and parental satisfaction should not be presented as evidence that a toy improves everyday communication. Evaluate the interaction being built and separately note any observed use beyond it.

### The evidence is not uniformly negative

The TOBY trial randomised 80 young children, with mean age 3.38 years, to usual intervention or an app-based programme plus usual intervention. It found no group difference on its primary outcome, while reporting differences in several secondary outcomes, including fine motor, visual reception, and words understood. It tested a structured adjunct to intervention, not a free-play bubble or squish toy [R05].

**Design interpretation:** it is reasonable to investigate specific learning opportunities, but not to borrow another product's results as a promise. No daily app “dose” is prescribed here, and a family's recreational play should not become a requirement to complete a therapy curriculum.

### Screen design should not optimise dependence

The AAP's 2026 media recommendations emphasise a child-centred digital environment and the broader context of media use, including what media displaces. Its guidance is not simply a mandate to maximise educational content or time on task [R07].

**Design interpretation:** use this as an alternative within existing recreational screen time, not an argument for adding more. Avoid streaks, escalating rewards, autoplay chains, and guilt-based endings. A brief enjoyable visit can be a successful use. Existing communication-device access should remain distinct from a recreational toy's stopping routine.

## 2. Learning opportunities that can actually be inspected

The following are proposed affordances, not demonstrated effects of this product.

| Opportunity | Concrete design feature | Useful observation | What it does not prove |
|---|---|---|---|
| Contingent cause-and-effect | Touch directly changes the touched object | The child deliberately repeats an action and appears to anticipate its result | Broad cognitive improvement |
| Accessible motor exploration | Large objects, generous hit areas, forgiving partial drags | Fewer apparent missed grabs; purposeful re-grabbing | Improvement in physical fine-motor ability outside the app |
| Spatial relationships | A visible ball can move into and out of a bowl | Interest in reversing the placement or using a similar real object | Understanding every spoken spatial word |
| Shared enjoyment | Independent multi-touch, no forced turns | Child permits or initiates another person's participation | A generalised social-communication gain |
| Communication opportunities | Enjoyable actions remain available while a partner comments | A familiar gesture, sign, vocalisation, or other communicative act occurs in context | That the app caused a language change |
| Choice and control | Consistent toy pictures, reliable pause and selection | Clear approach, rejection, return, or request for a particular toy | A diagnostic or developmental score |

A non-speaking profile does not establish receptive comprehension or intellectual ability. The interface removes avoidable access demands rather than assigning an assumed mental age. The child is not being tested on compliance, eye contact, facial-emotion interpretation, or the suppression of repetitive play.

## 3. Game design and interaction research

### Start with the clearest reported preference

Nintendo's Hello, Mario! and Hello, Yoshi! provide direct-touch character interactions, while Super Simple presents a collection of children's content and games [R08–R10]. These are product precedents, not clinical evidence. The parent's report of actual engagement is more informative for this project's starting point than their general popularity or marketing.

**Design interpretation:** put the strongest hypothesis first: a character whose shape changes at the finger. Offer two different probes rather than dozens of mini-games: discrete popping and sustained object movement. Those mechanics reveal different preferences and access difficulties without requiring a large content pipeline.

### A toy rather than an achievement loop

The proposed action/result/repeat loop is deliberately intrinsic: stretching produces a stretch; moving the ball puts it somewhere; popping removes a bubble. There is no secondary reward currency. This is an original product choice intended to keep the connection between action and outcome clear and prevent a small project from expanding into progression design.

Preserve stable object placement and repeatability within a scene. Do not equate novelty with improvement. A toy that is still enjoyed in exactly the same way should not automatically gain more rules.

### Child-centred iteration is more useful than a universal profile

The original design case study by Fletcher-Watson and colleagues describes participatory development and piloting of an app with young autistic children. It supports involving users and stakeholders in design rather than relying entirely on adult assumptions [R06]. It does not establish this specification's exact hitbox sizes or sensory settings.

**Design interpretation:** use family observations as successive design inputs. Record what happened before explaining why. Change one relevant feature, preserve the stable favourite, and compare the experience informally. This is product development, not a controlled experiment establishing efficacy.

### Large targets and drag alternatives

WCAG's enhanced target-size criterion uses 44 × 44 CSS pixels in its stated conditions; WCAG 2.2 also addresses alternatives to dragging [R22, R23]. These are accessibility standards, not experimental prescriptions for this specific preschool player.

**Design interpretation:** use much larger play objects and generous invisible hit regions, then test their practical usability with the actual tablet and case. Keep direct manipulation as the default because it matches the observed access preference, while offering a parent-selected tap-to-place alternative. Make ordinary app navigation usable with accessible DOM controls.

### Co-play requires input architecture, not a “two-player” label

Pointer Events provide identifiers and capture mechanisms for tracking simultaneous contacts [R11, R12]. A correct multi-touch implementation cannot be built around a single global dragging flag or by discarding non-primary touches.

**Design interpretation:** track up to four pointers and separate contact tracking from ownership of a ball or character region. A resting finger is allowed without globally disabling play. Do not infer which person owns a contact. This makes parallel and shared play possible, without implying that the app teaches turn-taking.

## 4. Systems and delivery research

### Keep the main loop small

The current Maze-o-Puzzle package uses React, Vite, TypeScript, and Vitest, and exposes art and performance tooling [R26]. Its asset directory includes reusable-looking animal filenames, although their exact visual suitability and rights metadata need inspection before reuse [R27].

**Architecture decision:** keep familiar tools, but make a separate small project. React handles the shell; an imperative Canvas2D runtime handles animated objects. This avoids rebuilding a maze's systems or maintaining an enormous catalogue. The choice is based on scope and development simplicity, not a measured comparison of engines.

### Compressed assets are not the whole memory story

Canvas optimisation guidance highlights rendering and asset practices that matter to performance [R13]. For this product, the engineering contract also explicitly counts decoded raster estimates and canvas backing pixels. These estimates are calculations, not observations of Safari's total memory.

**Architecture decision:** use procedural bubbles and deformation, a small number of exported assets, a capped backing resolution, and a scheduler that sleeps when nothing changes. Limit retained pointers, effects, images, and audio. Treat real-device traces as the arbiter of performance.

### Audio and offline support have browser constraints

Web Audio has browser activation and lifecycle considerations [R14]. Service workers have an install/activate/update lifecycle, and WebKit documents storage policy and eviction considerations [R15, R16]. An installed icon alone does not establish that every toy works offline.

**Architecture decision:** sound is deliberately enabled by an adult, with no backlog of missed sounds. Precache the complete small toybox and verify readiness. Keep app versions coherent and never force an update while a child is holding an object. Disclose that a first online load is needed and storage may later be evicted.

### Device testing cannot be simulated away

Apple's specifications identify the target iPad's A12 chip and display; the RAM figure is supplied by the parent [R19]. Vite's build target and Playwright's browser support are separate from testing actual Safari behaviour and performance [R17, R21].

**Architecture decision:** use browser automation for functional and layout failures, but retain a physical iPad launch gate for multi-touch, cold/warm launches, audio, orientation, backgrounding, offline behaviour, and a bounded adult soak. Never label desktop WebKit as a completed iPad test.

### Generate art during development, not play

OpenAI announced ChatGPT Images 2.5 on 8 September 2026, with Flare and Sunburst API variants [R24]. Actual model access and endpoint capabilities should be confirmed in the implementation environment [R25].

**Architecture decision:** use available image tools for original character concepts and small reusable exports. Keep the animation geometry procedural, store the finished files locally, and remove runtime AI from the child's experience. The build remains usable even when an image-generation credential or service is unavailable.

## 5. Confidence and unresolved questions

Confidence is high that a small static toybox is a materially narrower engineering problem than a maze adventure, and that direct touch is the appropriate starting interface given the parent's report. That is an engineering and product judgment, not a measured forecast of development duration or child response.

Confidence is moderate that Squishy Friend is the best first hypothesis. The familiar character identity may contribute to the reported enjoyment, so a new mascot could be less engaging despite similar interaction.

Whether Bubble Pond, Roll & Nest, particular artwork, co-play, or optional SFX are enjoyable remains unknown. The actual iPadOS version, current Safari storage state, case-related edge reach, and achieved performance also remain unverified. Educational transfer is the most uncertain outcome and must not be promised.

The practical next decision is therefore not which curriculum to implement. It is whether a responsive first toy produces comfortable, voluntary play, and what the family's observations suggest changing next.
