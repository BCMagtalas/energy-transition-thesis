# Changelog

## v5.8.1 — Real 3D depth in wind & coal
- The structures read flat because rotors faced the camera (2D pinwheels) and the coal plant was viewed head-on. Gave each turbine a distinct yaw so its rotor is seen at a varied 3/4 angle (genuine 3D volume), swung the coal camera to a 3/4 vantage so the round cooling towers, multi-faced boiler, and receding stacks show their depth, and increased the camera orbit on both (wind 0.08→0.16, coal 0.10→0.18) so the parallax reveals the three-dimensionality as it moves.

## v5.8.0 — Immersive wind & coal; removed the scattered glow-dots
- Two changes from feedback. (1) The luminous vertex nodes placed at every joint (turbine bases, cooling-tower rims, boiler vent, pipe junctions) read as scattered clutter — removed them, keeping only the meaningful accents: each turbine's rotor hub and the stacks' red hazard beacons. (2) Made 01/02 immersive instead of a diorama viewed from across a stage: added a per-scene wide-angle field of view (wind 62°, coal 58°), dropped the camera low and moved it into the scene looking upward so the structures loom overhead, gave wind a dominant foreground turbine with the rest of the farm receding into closer fog, and brought the coal camera in so the plant looms and its plumes soar up the full frame. Stronger dolly for a "moving through it" feel.

## v5.7.5 — Wind & coal matched to the premium density of the other scenes
- The two ground scenes read as less premium than the globe/solar/particle heroes because they were sparser — thin line-art, empty space, dull scattered dots — versus the others' dense particles, intricate wireframe, and glowing vertex nodes. Closed the gap: added a distant **starfield** to both for atmospheric depth; added **glowing vertex nodes** (the globe's signature accent) at the structural joints — turbine bases in wind; cooling-tower rims, boiler vent, and pipe junctions in coal; and made the particles **denser and more luminous** (wind drifting motes 210→370 total and brighter; coal plume per-emitter 150→220 with brighter, more saturated amber). Both now hold their own next to the other three.

## v5.7.4 — Coal plant reads as one facility, not scattered structures
- The cooling towers, boiler house, and stacks were evenly spread across the frame with big gaps and nothing linking them, so they read as three separate objects. Unified them into a single interconnected complex: clustered the structures tightly (towers left, boiler centre, stacks right beside the boiler), sat them all on a **shared foundation pad** whose footprint outlines the plant site, and ran **connecting pipes** between the boiler↔stacks (flue duct), boiler↔cooling towers, and tower↔tower. Now reads as one power plant.

## v5.7.3 — Coal boiler back into the wireframe language
- v5.7.2 over-corrected: the opaque boiler read as a flat black cut-out that clashed with the glowing see-through towers/stacks. Rendered it as glowing wireframe again — with a faint translucent teal fill for a hint of volume — so it matches the rest of the scene while its now-clean stepped geometry (hall + block + vent) still reads as a building. Also made the plumes a touch fuller (denser, slightly larger/brighter) so they read as smoke columns rather than thin dotted lines.

## v5.7.2 — Coal scene: solid boiler, filled centre, pollution plumes
- Critical-review fixes. (1) Boiler house rebuilt as one coherent, **opaque** stepped structure (main hall + boiler block + vent stack) so it reads as a solid building — the previous two see-through boxes clipped through each other and the grid. (2) A central plume now vents from the boiler so the middle of the frame isn't dead (plumes span left/centre/right). (3) The two cooling towers are spaced apart so both silhouettes read instead of fusing. (4) Smokestacks widened, spaced apart, and the red hazard bands restored (not just beacon dots). (5) Emissions retuned from sparse gold glitter to dense, soft, columnar, sooty-amber plumes that widen as they climb — reads as pollution, not fireworks. Also tightened the camera orbit (0.2→0.13) to keep the composition centred.

## v5.7.1 — Rebalanced the wind farm composition
- The turbines were bunching to the left/right edges with a hollow upper-centre, worsened by the new camera orbit swinging the farm sideways at its extremes. Rebalanced the layout with left/centre/right anchors up front (added a mid turbine to fill the middle) and tightened the wind camera orbit (0.2→0.12) and dolly (0.7→0.5) so the farm stays centred across the whole move. Verified balanced at multiple orbit phases.

## v5.7.0 — Cinematic pass on all five hero scenes
- The heroes were static tableaux that only rotated. Added real motion & depth. (1) Cinematic camera: a slow continuous orbit + dolly + vertical rise around each scene's look-target (tuned per scene via a new `motion` field), so near objects sweep past far ones — genuine parallax and depth. Reduced-motion holds the camera still. (2) Wind: gold energy-flow streams now spin off each turbine hub and flow downwind, tying the particulate to the turbines ("generation") instead of drifting independently; the blades also power up — spooling from rest to full speed over ~1.3 s on each appearance (analytic ramp, always completes). (3) Atmosphere: a wide low horizon-glow band adds depth behind the wind and coal scenes. (4) Nudged the tall near turbine left of the caption column so it no longer runs behind the text.
- Verified in-browser: camera parallax confirmed across frames, energy streams read, globe/particles gain a dynamic turntable presence; production build + tsc clean, 12 audit checks pass.

## v5.6.4 — Solar panels no longer clip the sun or each other
- The panels were scattered at random positions in a box while the whole field rotated around the world origin (with the sun off to one side), so rotation dragged panels through the sun and random placement let them overlap. Reworked without a physics engine: panels are now placed on an even Fibonacci-sphere shell **around the sun**, the field is parented **to the sun** so its slow rotation is a rigid orbit (constant distance to the sun, constant spacing between panels), and each panel only tumbles in place + drifts radially along its own spoke (clamped clear of the sun). Even spacing + rigid rotation = no intersections, ever. Also reads better as an array orbiting the sun.

## v5.6.3 — Solar panels read as panels from any angle
- The solar (04) panels had the PV cell-grid on only their top face, so a panel that tumbled to show its back or underside became a featureless grey slab — half the field looked like floating concrete. Put the PV glass on both broad faces and slimmed the panel with a darker, less obtrusive edge frame, so each one reads as a solar panel however it rotates. (The field is a stylised floating array, not a physics sim — panels tumble and bob by design; only the texturing was at fault.)

## v5.6.2 — Brisker hero cadence
- Hero scenes now advance every 5 s (was 7 s), with a slightly quicker caption crossfade (in 0.24 s / out 0.14 s, was 0.3 / 0.18). The 3D motion speed is bumped to match — 1.25× at normal (was 1×), and reduced-motion scaled proportionally to 0.7× (was 0.55×) so it stays calm but never feels stalled.

## v5.6.1 — Wind & coal: craft pass on the abstract scenes
- Acting on a critical review of v5.6.0. Five fixes: (1) turbines no longer read as spiders — blades are now filled tapered ribbons (ShapeGeometry) with bright edge outlines instead of single lines from a glowing node, and the hub node is smaller with a solid nacelle pod; the firefly-ish gold blade-tip orbs are gone. (2) Removed the coal "Saturn ring" pulses that read as a ringed planet/UFO. (3) Both background halos are now a core-less soft glow (new `makeSoftGlow`) offset from centre, so they read as ambient light, not a flat disc. (4) The boiler house is now a solid dark mass with bright edges + structural ribs instead of two empty wireframe crates. (5) Tighter compositions — a clearer near→far wind farm with no hard edge-crop, balanced coal layout.
- Verified in-browser at full opacity: turbines read unmistakably as turbines, coal reads as a wireframe plant venting rising carbon with no ringed-planet artifact; production build + tsc clean, 12 audit checks pass.

## v5.6.0 — Wind & coal restyled to match the abstract hero set
- Photoreal primitives were losing to the abstract heroes (globe, floating panels, rising particles) and clashing with them. Rebuilt 01/02 in the same visual language instead: glowing wireframe structures + luminous nodes/motes/rings, bloom-lit, so all five heroes now read as one deliberate set.
- Wind (01): six turbines as glowing mint wireframe (edge-line towers/nacelles/airfoil blades) with bright hub **nodes** and gold blade-tip motes, spinning, over drifting mint+gold "wind" motes and a central mint halo — echoing the globe's wire+nodes and the particle scene's motes.
- Emissions (02): a wireframe plant (hyperboloid cooling towers, boiler house, stacks) in cool mint-teal line, venting **rising warm amber/gold carbon motes** (additive, luminous — no more cotton-ball smoke), with blinking red hazard **nodes** and expanding amber pulse **rings** at each stack, over a warm carbon halo. Warm palette marks it as "the problem" while the wireframe keeps it in-family.
- Both are steady loops. Verified in-browser at full opacity: both render as glowing abstract constructs coherent with scenes 03–05; production build clean, one live canvas, 12 audit checks pass.

## v5.5.0 — Wind & coal: dark bloom-lit stage + near-photoreal geometry
- Converted the two remaining bright scenes to the dark, glowing, bloom-lit aesthetic of the globe/solar/particle heroes, so all five now share one cinematic world (new `darkStage` helper: near-black grid floor, faint emerald grid lines, per-scene sky gradient + fog, a central glow the structures rim against). Bloom raised to match (wind 0.7, coal 0.6) so the pale structures glow softly against the night.
- Redesigned both plants to look almost real. Wind (01): a night wind farm of six turbines with tapered towers, capsule nacelles, coned hubs, and genuinely tapered/twisted airfoil blades (ExtrudeGeometry from a chord-tapered shape), rim-lit by a soft moon glow. Coal (02): hyperboloid cooling towers (LatheGeometry profile — wide base, pinched waist, flared rim) venting light steam, a stepped boiler house with a service duct, and banded smokestacks topped by blinking red hazard beacons trailing dark smoke, all warmed from below by a furnace ember glow. Steam vs. smoke are one vertex-coloured particle system.
- Both are now steady, reliable loops (no fragile timed assembly/decommission), matching the other three scenes' behaviour. Verified in-browser at full opacity: both render dark and premium with correct geometry; production build clean, one live canvas, 12 audit checks pass.

## v5.4.2 — Bright scenes: substantial render-quality upgrade
- The bright wind/coal scenes looked flat and muddy next to the bloom-lit dark scenes. Root causes fixed: heavy fog desaturating everything (34–82 → light 46–120, far-horizon only); flat fill-only lighting (added a directional key light + lowered hemisphere fill, so white structures now get real form and gradients); blurry cloud "blobs" (replaced with a few small, crisp, high, subtle clouds); low contrast (cleaner saturated sky, crisper emerald grid); dead-matte materials (turbines and plant now have light sheen/metalness so the key light sculpts them).
- Coal decommission no longer leaves a bare grid: permanent foundation pads remain where each structure stood (reads as a cleared/decommissioned site), and the teardown is delayed so the operating plant leads the shot. Verified the wind scene renders crisp with real form; coal shares the same environment/materials. Build + 12 audit checks pass.

## v5.4.1 — Bright scenes: faster sequences, higher contrast
- Root cause of "too slow / not visible": the site inherits the OS Reduce-Motion setting, which ran every scene at 16% — fine for loops but leaving the timed wind-assembly and coal-decommission sequences permanently half-finished. Raised the reduced-motion factor 0.16 → 0.55 and compressed both sequences (wind assembly ~2.7 s, coal decommission ~3.6 s) so they complete within the display window at any speed.
- Visibility: turbines and plant structures were near-white on a pale sky; retoned to mid-grey so they read clearly, and moved the coal-plant camera closer / lower so the plant fills the frame. Smoke made denser before it fades. Solar rechecked — unchanged, reads well; now tumbles more visibly at the higher reduced-motion speed. Verified: full-speed assembly and decommission complete on screen, one live canvas, zero console errors, no overflow; build + 12 audit checks pass.

## v5.4.0 — Wind & emissions reimagined as bright build-up / teardown sequences
- Per a detailed brief, rebuilt both on a shared bright "digital landscape" (soft blue→mint sky, stylised puffy clouds, pale emerald grid floor, matte hemisphere daylight — no dark themes), tuned toward the site's emerald palette for coherence. Wind (01): a foreground turbine self-assembles — foundation, then tower segments drop and stack guided by holographic emerald-cyan lines, nacelle drops with a brief translucent "x-ray" revealing gears before solidifying, blades attach, then it spins in sync with a background wind farm. Emissions (02): a coal plant (two hollow cooling towers, boiler building, banded smokestacks) runs with billowing smoke that fades as it powers down, then decommissions component-by-component — each retracts into the ground in sequence — leaving a cleared site, under a slow pan.
- Strengthened the hero caption scrim (from-black/55 → /70) so white captions stay legible over the bright scenes; lowered per-scene bloom and softened clouds so nothing blooms into orbs. Verified: full-speed assembly and decommission both play correctly, all five scenes cycle with one live canvas (clean disposal), zero console errors, no overflow desktop or mobile; build + 12 audit checks pass.

## v5.3.0 — Wind & emissions rebuilt as grounded cinematic scenes
- The floating-field treatment read poorly for these two (turbines cramped inside the wireframe sphere; stacks looked suspended with smoke trailing upward). Replaced both with grounded, legible compositions. Wind (01): a wind farm receding to the horizon — six turbines on a fog-blended ground plane at staggered depths (near large, far small), blades spinning at varied rates, faint wind streaks drifting left-to-right, warm dawn sun low behind for rim-lit silhouettes. Emissions (02): four upright smokestacks on a dark industrial ground at staggered depths, thick smoke billowing straight up and spreading/drifting downwind as it rises, sharp-blinking red aircraft beacons, warm polluted haze at the horizon. No wireframe spheres. Verified: all five scenes cycle with one live canvas (clean disposal), zero console errors, no mobile overflow; build + 12 audit checks pass.

## v5.2.0 — Wind & emissions scenes rebuilt as floating 3D fields (cohesive hero set)
- Extended the solar scene's floating-field language to the two remaining ground-planted scenes so all five heroes share one aesthetic. Wind (01): 7 turbines dispersed through dawn air at varied depths/angles, blades spinning, bobbing and drifting for parallax around a glowing sun inside a faint wireframe sphere. Emissions (02): 5 smokestacks adrift in a smoggy dusk, each trailing its own rising smoke stream (smoke parented to the stack so it follows the drift), staggered red beacons, gentle sway + parallax, warm haze glow + wireframe sphere. Cooperation (globe) and net-zero (particle ascent) already used orbital/floating 3D and are unchanged. Removed the now-unused ground-plane helper. Verified: all five scenes cycle with exactly one live canvas (clean disposal), zero console errors, no mobile overflow; build + 12 audit checks pass.

## v5.1.0 — Solar scene rebuilt as a floating 3D panel field
- Replaced the tidy ground-grid solar array with a dispersed, tumbling panel field in 3D space (per user reference): 16 photovoltaic panels scattered across a wide volume at varied sizes (depth cue), each slowly tumbling on its own axes and bobbing, with the whole field drifting for parallax. A glowing sun sits at the centre inside a faint wireframe geodesic sphere the panels orbit; PV faces catch blue light while edge-on/back faces read aluminium-grey — matching the reference's mix. Airy warm sky; per-scene bloom retuned so only the sun and glints bloom. Verified: full-speed render matches the reference, zero console errors, one live canvas (clean disposal), no mobile overflow; build + 12 audit checks pass.

## v5.0.4 — Model inspector no longer covers the diagram (desktop split view)
- On desktop the evidence inspector overlaid the right third of the SEM diagram — hiding the AE/ES outcome nodes and the β5/β6 paths, and often the very node just clicked — contradicting the page's "keeping the full model visible" promise. It is now a master–detail split: selecting a node/coefficient shrinks the diagram to the left (1266px → ~914px at 1332w, all seven nodes still visible) and docks the 340px inspector beside it, covering nothing. Closing returns the diagram to full width. Mobile keeps the overlay (no room to split) with the diagram behind it. Zero overflow in both states; build + 12 audit checks pass.

## v5.0.3 — Mobile audit and optimization
- Fixed the interactive SEM diagram on phones: Model and Pathways rendered the landscape diagram in a tall desktop-sized panel, so it fit-to-width into a tiny strip with 70–75% empty void above it. On mobile the diagram now sits in a right-sized fixed-height box (Model 264px with room for the zoom controls; Pathways 200px, no controls) directly under its heading — no void, ~2× larger diagram. The desktop-only "⌘/Ctrl + wheel" hint is hidden on touch. Desktop layout unchanged (behind `lg:` breakpoints; SEM still fills at 480px).
- Conclusion action buttons (Print / CSV / Copy / Return) enlarged to a 40px touch target on mobile, kept at the compact 32px on desktop for the one-viewport fit.
- Verified: zero horizontal overflow on all 7 pages at 375px; desktop zero overflow on all 7 pages at 1332×665; build + 12 audit checks pass.

## v5.0.2 — Repository renamed
- Repo renamed to BCMagtalas/energy-transition-thesis; the site now lives at https://bcmagtalas.github.io/energy-transition-thesis/ (canonical/OG/sitemap/README updated). GitHub redirects the old repo URL; the old Pages URL does not redirect, so share the new link.

## v5.0.1 — Published
- Deployed to GitHub Pages: https://bcmagtalas.github.io/net-zero-sem-atlas/ (repo BCMagtalas/net-zero-sem-atlas; auto-deploys on every push to main via GitHub Actions). Canonical/OG/sitemap URLs now point at the live address. Live site verified: title, header byline, hero, and WebGL scenes all rendering over HTTPS.

## v5.0.0 — Final release audit
- **Robustness**: theme persistence hardened against Safari private browsing, where `localStorage.setItem` throws — previously this would have crashed the theme effect into the error boundary; the theme now still applies and simply doesn't persist.
- **Full-spectrum verification (all passing)**: production build + 12 structural audit checks; zero source hygiene issues (no console.log/TODO); 20-point functional/data/a11y suite (header + hero attribution, theme round-trip, keyboard-opened inspector + Escape, pathway tabs, Evidence headline and 7/9/19 data-row counts with all three negative estimates, 12 glossary entries, sample bars summing to 120, 3 noopener thesis links, 7-page print route, one h1 per view, aria landmarks/live regions, document lang); zero vertical/horizontal overflow on all 7 pages in both themes at 1332×665 and 1920×960 (18px adaptive root) and zero horizontal overflow at 375px mobile with the header byline truncating safely; all five WebGL scenes cycled with exactly one live canvas remaining (renderer/composer disposal verified); the production bundle served via vite preview runs with zero console errors, confirming dev-console entries were stale HMR artifacts.
- Remaining pre-publish item (unchanged): replace `https://example.com/` placeholders in index.html, robots.txt, and sitemap.xml with the live deployment URL.

## v4.9.7 — Methods relaid to match Evidence's dashboard shape
- The three-column Methods grid had the same imbalance Evidence had: the 12-entry glossary towered while Workflow and Sample stretched with empty bottoms. Methods is now two matched cards (Analytical workflow | Sample composition, 276px each at 1332×665) with the SEM glossary as a full-width band beneath — 12 entries flowing across four columns, three rows tall. The two data-heavy pages now share one coherent layout grammar. Zero overflow on all seven pages; build + 12 audit checks pass.

## v4.9.6 — CR/AVE spacing; glossary covers fit indices and CR/AVE
- Reliability rows: "CR .726 · AVE .570" ran together; the two metrics are now separate right-aligned segments with a clear gap.
- SEM glossary extended from 8 to 12 entries: two grouped fit-index definitions (RMSEA/CFI/TLI/χ²/df with their thresholds; GFI/AGFI/NFI), plus Composite Reliability (≥ .70) and Average Variance Extracted (≥ .50) — every acronym used on the Evidence page is now defined. Evidence and Methods both still fit one viewport; build + 12 audit checks pass.

## v4.9.5 — Evidence headline states the finding
- "Evidence at conference-poster scale / …summarized in one screen" was self-referential filler. The page now leads with its takeaway: "All nine hypothesized paths are supported", sub "Fit is mixed — four of seven indices meet thresholds — and the two-indicator RA construct warrants caution." Poster convention: headlines state findings, not formats. Zero overflow; build + 12 audit checks pass.

## v4.9.4 — Evidence relaid: three matched cards + full-width respecification
- The previous four-column arrangement could not balance (Respecification's 19 rows always towered or left ragged card bottoms). Evidence is now the classic results-dashboard shape at every desktop width: Model fit, Structural paths, and Reliability as three equal-height cards (332/332/332 at 1920), with Respecification as a full-width panel beneath whose rows flow across four columns (~5 rows tall; legend merged into its header line). Verified: perfectly symmetric page centering (129px top/bottom at 1920×960), zero overflow on all seven pages at 1332×665 and 1920×960; the width-specific 2xl variants were removed — one layout serves all desktop widths.

## v4.9.3 — Evidence cards top-aligned (no more vacant card interiors)
- At 1280–1535px widths the four Evidence panels stretched to the height of the tallest (Respecification, 19 rows), leaving large empty interiors in the other three cards. The grid now top-aligns (`items-start`): each card hugs its content and varied heights read as intentional. A trial of lowering the double-wide Respecification tier to 1440px wrapped its rows and was reverted — that tier stays at ≥1536px, where it is verified clean (two internal columns, near-equal card heights at 1920×960). Zero overflow on all pages at 1332×665, 1460×800, and 1920×960.

## v4.9.2 — Site header banner is now the author byline
- The top-bar brand (leaf tile + "Net Zero SEM Atlas") was replaced with the author identity, visible on every page: Bordeaux graduation-cap tile, "Bernie Calderon Magtalas", and "Waseda University · Graduate School of Asia-Pacific Studies" (school segment hidden on very narrow screens; text truncates safely). The hero's attribution card collapsed into a slim byline under the abstract — "Bernie Calderon Magtalas · Student ID 4022R349 · Adviser: Prof. Atsushi Kato" — which also keeps the attribution in the print poster (the app header is excluded from print). All pages fit one viewport; build + 12 audit checks pass.

## v4.9.1 — Attribution card replaces the hero banner
- The "Interactive academic poster" pill banner at the top of the hero was replaced by the author/Waseda attribution card, making who-and-where the lead element (thesis-title-page convention). The poster descriptor remains as a slim kicker line above the title, and the duplicate mid-hero card was removed — netting extra breathing room. Overview fits one viewport (overflow 0); build + 12 audit checks pass.

## v4.9.0 — Hero attribution unified; motion tuned to Emil Kowalski's craft bar
- **Hero attribution redesigned as one card** (was two disjoint blocks): graduation-cap tile anchoring three lines in thesis-title-page order — author + student ID, Waseda University (Bordeaux) + graduate school, adviser. Unambiguous and scannable; Overview still fits one viewport.
- **Animation review** (per the installed `review-animations` skill / Emil Kowalski standards) found and fixed: four `transition-all` instances (Button, bento cards, hero progress dots, pathway tabs) → explicit property lists; all Motion tweens were running on Framer's default ease-in-out → strong ease-out `cubic-bezier(0.23, 1, 0.32, 1)`; hero stagger 140ms → 80ms (30–80ms guideline); Framer `x`/`y`/`scale` shorthands (main-thread) → full `transform` strings (hardware-accelerated — entrances run while the WebGL scene initializes); exits now faster than enters (toast 220→150ms, inspector 250→180ms, captions 300→180ms); buttons gained 150ms ease-out press feedback (`active:scale-[0.98]`).
- Verified: GPU transform matrices observed mid-entrance, inspector enter/exit clean, zero overflow on all pages, build + 12 audit checks pass.

## v4.8.2 — Author/adviser attribution disambiguated
- "Adviser: Prof. Atsushi Kato · Student ID: 4022R349" on one line could read as the adviser's ID. The student ID is now bound to the author's name ("Bernie Calderon Magtalas · Student ID 4022R349") with the adviser on a separate line. Overview still fits one viewport (overflow 0).

## v4.8.1 — Waseda University given visual prominence
- New `--waseda` token in Waseda's official Bordeaux (#9e1b32 light / #ef8fa0 dark; 7.2–7.8:1 contrast on both themes). The header brand line now shows "Waseda University" in bold Bordeaux, and the hero gained a dedicated affiliation card — a Bordeaux graduation-cap tile beside "Waseda University" in bold serif with the Graduate School line beneath — sitting alongside the author details. Hero spacing tightened slightly so the Overview still fits one 1332×665 viewport (verified overflow 0).

## v4.8.0 — Framer Motion across the whole interface
- Replaced the CSS-keyframe entrance system (`.rise` classes, now deleted) with Framer Motion throughout: page headers and every section/panel animate in with a shared fade-rise + stagger; bento cards stagger per card.
- New motion behaviors that CSS could not express: a shared-layout nav pill that springs between the active menu items (`layoutId`); the SEM evidence inspector slides in *and out* (`AnimatePresence` exit animations); the toast enters and exits with scale+fade; the mobile menu animates open/closed; hero scene captions cross-fade on scene change (`mode="wait"`); pathway narrative content slides in when switching tabs.
- All motion runs under the existing `MotionConfig reducedMotion="user"`, so OS-level reduced-motion preferences disable transform animation globally. Entrances use time-based `animate` (not in-view triggers), so the print route still reaches final state.
- Verified live: nav pill present, inspector opens/exits cleanly, toast animates, pathway swap captured mid-transition (opacity 0.44 → 1), zero overflow on all seven pages, production build + 12 audit checks pass.

## v4.7.0 — Adaptive type scale
- The root font size now steps up where the viewport has measured slack: 16px base (laptops, preserves the one-viewport fit), 17px at ≥1600×850, 18px at ≥1900×950 — a 6–12.5% proportional increase of the entire rem-based type system on large screens. Fine-print classes converted from fixed `text-[11px]` to `text-[0.6875rem]` so they participate in the scaling (≈12.4px on large screens). Verified zero overflow on all seven pages at 1332×665 (16px), 1650×870 (17px), and 1920×960 (18px).

## v4.6.1 — Type-size floor raised
- Eliminated all 10px text (respecification legend, CR/AVE annotations, numbered badges) → 11px minimum; Methods fact cards and Background objective chips raised 11px → 12px where the layout budget allowed. Rendered font scale on the densest page (Evidence) is now 11 / 12 / 14 / 18 / 30px. All seven pages still fit a 1332×665 viewport with zero overflow.

## v4.6.0 — Final visualization audit
- **Favicon/app icons regenerated**: the entire icon set (16/32/180/192/512) still carried the pre-rebuild crimson "BM" mark; replaced with the emerald leaf tile matching the header brand.
- **Wind scene lighting consistency**: the sun glow sat on the left horizon while the key light came from the right; the sun now sits low on the right horizon in agreement with the light direction, with the nearest turbine overlapping its glow for depth.
- **Emissions beacons de-synchronized**: the four stack beacons shared one material and pulsed in perfect unison; each now has its own material and phase for staggered, natural pulsing.
- **Dark-theme contrast measured**: all token pairs ≥ 8.1:1 (body text 16.6:1) — beyond AA, mostly AAA. Light theme ≥ 4.5:1 on all measured pairs after the v4.5.0 primary fix.
- Full-speed visual review of all five scenes; regression sweep (7 pages × zero overflow, zero console errors); production build and 12-point structural audit pass.

## v4.5.1 — Solar panels now face the sun
- The tracker panels were tilted toward the viewer — i.e., away from the sun behind the array. They now tilt back toward the sun, pitching steeply while it sits low on the horizon and flattening toward horizontal as it climbs, with the camera raised slightly so the PV faces remain visible from above throughout.

## v4.5.0 — Publication-readiness audit
- **Accessibility fix**: light-theme primary darkened #059669 → #047857 (emerald-700). Small primary-colored text (kickers, links, formulas) was 3.55:1 against the background — below WCAG AA; now 5.16:1, and white-on-primary button text improved from ~3:1 to 5.48:1. Dark theme was already passing (all measured pairs ≥ 4.5:1; body text 13.1:1).
- **Web manifest** still carried the old crimson identity (`theme_color #8f0d3f`, near-black-crimson background); updated to the emerald palette. Removed empty leftover `public/assets` and `public/images` directories. `package.json` version aligned to 4.4.6 → released as 4.5.0.
- **README rewritten** to describe the current product (design system, structure, SEM interactions, scenes, accessibility, and a pre-publish checklist for replacing the `https://example.com/` placeholders in index.html, robots.txt, and sitemap.xml with the live URL).
- **Verified**: TypeScript + Vite production build; all 12 structural audit checks; the built bundle served via `vite preview` loads with zero console errors and zero page overflow at desktop; 12-point functional sweep passed (theme toggle + persistence, SEM node/path inspectors with Escape and keyboard Enter activation, pathway tabs + autoplay, respecification rationales, 3 thesis links with `target="_blank" rel="noopener"`, CSV/citation/print actions, 7-page print route, 19 respecification rows).

## v4.4.6 — Faster sunrise
- Solar sunrise sped up to ~2.5 s (was ~6 s); the sun then holds at full height for the remainder of the scene's 7 s display. Carousel cadence and all other animations unchanged.

## v4.4.5 — Timing adjusted for slower readers
- Caption reading budget re-estimated at ~150 wpm (slower readers): 12–16 words ≈ 6 s. The solar sunrise now completes in ~6 s (was ~4.5 s) and the carousel auto-advance is 7 s (was 5.5 s); verified live at ~7.08 s between scene changes. All other animation speeds unchanged.

## v4.4.4 — Sunrise timed to caption reading; carousel cadence matched
- The solar scene's sunrise is now a one-way rise that completes in ~4.5 s — the estimated time to read a scene caption (12–16 words at ~220 wpm) — then holds at full height instead of cycling through a sunset. The scene remounts on each visit, so the rise replays every time it is shown. No other scene's animation speed was changed.
- Overview carousel auto-advance shortened from 6.8 s to 5.5 s to match caption reading time plus a beat; verified live (scene changes logged at ~5.55 s intervals). Manual dot selection still restarts the full countdown.

## v4.4.3 — Sunrise cycle on the solar scene; carousel timer fix
- The solar scene's sun now performs a full sunrise arc: it climbs from the right horizon, crests, and sets to the left on a ~22 s loop (sped up from an initial ~36 s per author request). The sun's color shifts from deep amber at the horizon to pale gold at its peak; the scene's directional light follows the sun and brightens toward midday; the glow halo grows with elevation; and the tracker panels pitch up toward the low sun and flatten as it climbs. Under prefers-reduced-motion the same cycle runs at the scene's gentler 16% pace.
- Overview carousel fix: manually selecting a scene dot now restarts the 6.8 s auto-advance countdown, so a manual selection always gets its full display time instead of potentially being swept away moments later.

## v4.4.2 — CR/AVE formulas shown; solar array now visibly tracks the sun
- Reliability expander revised per author request: now reads "CR and AVE are calculated from the reported standardized loadings using conventional standardized-loading formulas" followed by the formulas themselves — CR = (Σλ)² / [(Σλ)² + Σ(1 − λ²)] and AVE = Σλ² / k, with λ and k defined. The "they were not reported directly in the thesis" clause was removed.
- Solar scene was animated but too subtly (light orbit, cell shimmer, camera sway). Panels and frames now share a pivot and perform a slow single-axis tracking sweep, staggered per column so the motion reads across the array; the sun's glow gently breathes. Verified frame-over-frame in the browser.

## v4.4.1 — Evidence provenance labels removed; wide-screen rebalance
- Removed the "Thesis-reported" / "Dashboard-derived" provenance labels from the Evidence panel headings and the reliability expander (kept the neutral "MI > 15" qualifier on Respecification; full provenance detail remains inside the expander bodies).
- Wide-screen layout balance: at ≥1536px the Respecification panel becomes double-width with its 19 rows in two internal columns, equalizing all four Evidence panels (~equal heights) instead of one towering column dictating grid height. Laptop widths (1280–1535px) keep the proven four-equal-column layout with single-line rows. Verified zero overflow on every page at 1900×950, 1332×665, and 1280×800.

## v4.4.0 — Bloom post-processing on all hero scenes
- Added an UnrealBloom post-processing pipeline (EffectComposer → RenderPass → UnrealBloomPass → OutputPass) to `Scene3D`, tuned per scene: subtle dawn glow on the wind farm (threshold 0.72), pulsing stack beacons and haze on the emissions dusk (0.55), luminous nodes/travelers on the cooperation globe (0.42), sun and PV shimmer on the solar array (0.7), and full luminous treatment on the net-zero particle ascent (0.3). Bright elements now genuinely glow instead of relying on sprite fakes.
- Composer and bloom pass are sized with the renderer (device-pixel-ratio aware, capped at 2×) and disposed on scene change alongside geometries, materials, and textures. Cost: +4.5 KB gzipped on the lazy-loaded Scene3D chunk; only one scene renders at a time, so per-frame cost is bounded.

## v4.3.0 — Layout audit + scene quality pass
- **Layout audit** across 1440×900, 1332×665, 1280×800, and 375×812: every section fits its viewport with zero vertical or horizontal overflow on desktop, and no horizontal overflow on mobile. Natural-height pages (Background, Evidence, Methods, Conclusion) now vertically center their content, so spare height on tall screens reads as intentional white space instead of a dead bottom gap (verified: equal top/bottom margins).
- **Soft round particles everywhere**: `THREE.Points` renders hard squares by default — smoke, embers, starfield, and the particle-ascent field previously looked like pixel confetti. All particle materials now use a radial-gradient sprite map, giving wispy smoke, glowing stars, and soft rising motes.
- **Solar scene rebuilt**: panels were reading as brown boards (warm light on dark metalness with gold frames, seen from below). Now: photovoltaic cell-grid canvas texture on blue glass, aluminum frames, tops tilted toward the raised camera so the PV faces carry the scene, smaller sun disc with a softer halo, and a brighter teal-to-gold sky.
- All 12 structural audit checks and the production build pass.

## v4.2.1 — Respecification moved to Evidence; short-viewport fit
- **Respecification table moved from Methods to Evidence**, where it belongs academically: the 19 modifications are estimated results (coefficients with p-values), reported in the thesis results document alongside loadings and regression coefficients. Methods keeps the procedural description (workflow step 4, MI-threshold fact). Evidence is now four result columns — Model fit, Structural paths (H1–H9), Reliability/validity, Respecification — each visible in full.
- **Short-viewport fit pass**: all seven sections now fit a 1332×665 viewport (short laptop window) as well as 1280×800, verified per page (overflow = 0 everywhere). Long caution notes on Evidence became one-line expanders (fit-is-mixed, CR/AVE caution, interpretation boundaries) so the essential claim stays visible and detail is one click away; bento cards moved their icon inline with the title; page headers, take-home panel, and citation actions tightened; Model/Pathways minimum heights lowered to 560px.

## v4.2.0 — Full respecification results added; Source-hierarchy note removed
- **New "Model respecification" panel on Methods**: all 19 thesis-reported modifications (MI > 15, theoretically justified) — 4 cross-loadings (`AE =~ ES3` 0.432, `CI =~ RA1` −0.473, `RA =~ ES1` 0.254, `CI =~ AE5` 0.125) and 15 residual covariances (from `AE1 ~~ AE2` 0.836 down to `CI2 ~~ AE2` 0.189) with estimates, p-values, and the thesis rationale for each, revealed per-row via accessible `<details>` expanders. Data extracted from the thesis "Summary of Resulting Factor Loadings, Regression Coefficients, Residual Correlation Coefficients, and P-Values" document and stored in `src/data/model.ts` (`modifications`).
- **CSV export extended**: the evidence CSV now contains both the nine structural paths and all nineteen model modifications in one labeled table.
- **Conclusion citation panel** now links to the three public thesis result documents (diagrams/model syntax, results tables, estimated structural model) instead of "repository link not yet provided."
- **Removed** the Source-hierarchy note from the Methods workflow panel (user request); the sample-size caution moved into the Sample composition panel where it belongs thematically. Methods still fits one 1280×800 viewport with the new panel (verified overflow = 0).
- Fixed `scripts/audit.mjs`: percent-encoded root path (directories with spaces) and whitespace-brittle string checks; all 12 structural audit checks pass again.

## v4.1.0 — One-viewport sections + redesigned WebGL hero scenes
- **Fit-to-screen layout pass:** every section now fits a 1280×800 viewport at 100% zoom with zero scroll (verified programmatically per page). Compacted vertical rhythm across all seven pages — tighter page padding/gaps, smaller heading scale, denser table rows, single-row bento grids — while pages still scroll gracefully when a window is shorter.
- **All five hero scenes rebuilt as richer, palette-matched vignettes** (generated in-code with Three.js — no external photo/video dependency): dawn wind farm over low-poly emerald hills with a golden horizon; smoggy industrial dusk with pulsing stack beacons and drifting smoke; night globe with glowing mint nodes, gold arc travelers, and a starfield; golden-hour solar array with sun glow and shimmering cells; and a net-zero particle ascent with expanding halo rings. Each scene now owns a full gradient sky and camera framing that fills the card, replacing the old washed-out crimson-era objects floating on a transparent canvas.
- Scene textures (gradient skies, glow sprites) are tracked and disposed on scene change alongside geometries/materials.

## v4.0.0 — Full UI rebuild: Tailwind CSS v4 + shadcn patterns, Organic Biophilic design system
- Migrated from the hand-written plain-CSS architecture to Tailwind CSS v4 (`@tailwindcss/vite`) with shadcn/ui-style design tokens. Design direction generated with the ui-ux-pro-max design-intelligence skill ("Organic Biophilic": nature greens, rounded organic shapes) and persisted to `design-system/net-zero-sem-atlas/MASTER.md`.
- New palette: emerald primary (#059669 light / #34D399 dark) on soft mint/deep-forest backgrounds, replacing the crimson identity. Light and dark themes both restyled; theme toggle and `data-theme` persistence unchanged.
- New typography: Crimson Pro (serif, headings) + Atkinson Hyperlegible (body) — an academic, accessibility-focused pairing loaded via Google Fonts.
- Component patterns adapted from the 21st.dev catalog via its MCP connector: the two-column staggered hero with animated stats (ravikatiyar162/hero-section-9, rebuilt with framer-motion `MotionConfig reducedMotion="user"`), the hover-lift bento grid with dotted texture (kokonutd/bento-grid) used on Background and Conclusion, and the shadcn Button primitive (`src/components/ui/`).
- SEM construct node colors harmonized with the new palette (RA now sits on the primary emerald); diagram chrome (controls, labels, legend, inspector) restyled on the new tokens. All interactions preserved: hover tracing, node/path selection, evidence inspector, pan/zoom, pathway highlighting, autoplay, CSV export, citation copy, full print route.
- Layout is now responsive-first (stacked at mobile widths, editorial two-column at ≥1024px) instead of the fixed 1150px breakpoint pair. Removed stale `vite.config.js`/`vite.config.d.ts` that shadowed `vite.config.ts`.

## v3.0.2 — Fixed: scenes rendering almost black
- Root cause: the wind turbine tower, smokestacks, and solar panel/frame materials were given near-black base colors (e.g. `0x2a1017`), on the assumption ambient/key light would lift them to a visible dark tone. It didn't lift them nearly enough — they rendered essentially invisible against the dark background, while unlit elements (particles, the network globe/lines) and light-colored lit elements (cream turbine blades) looked correct. Confirmed from the reported screenshots: exactly the lit, dark-colored surfaces were missing, nothing else.
- Fixed by brightening those specific materials to visible mid-tone brand colors (crimson-browns, slate blue for solar glass) and increasing the key/ambient light intensity, plus adding a dim rose-tinted fill light from the opposite side so faces angled away from the key light don't render pure black.

## v3.0.1 — Fixed: 3D scenes freezing under prefers-reduced-motion
- Root cause of "animations not working": if the browser/OS reports `prefers-reduced-motion: reduce` (a real accessibility setting, on by default in some OS configurations, or left on via a DevTools emulation flag), the animation loop was skipped entirely — rendering exactly one static frame and nothing else.
- Fixed by keeping the render loop running under reduced motion but at a much slower, gentler pace (~16% speed) with camera sway disabled, instead of a hard freeze. This still respects the spirit of the accessibility preference (large/fast motion removed) without the scene reading as broken.
- Also fixed a framing bug where wind turbines could sit outside the camera's view on some aspect ratios, and hardened WebGL init to fail gracefully (console diagnostic + gradient fallback) instead of silently, plus force-releases the GPU context on scene change.

## v3.0.0 — Replaced all hero photos with real WebGL 3D scenes
- Removed all Wikimedia Commons photography and the SVG motion-graphics overlays from the Overview hero. Replaced with five genuine Three.js/WebGL scenes: rotating wind turbines, a rising smoke particle system, a wireframe globe with pulsing connection arcs (international cooperation), a tilted solar array with a moving light source, and a rising particle field (net zero pathways). No external image/video dependency remains on the Overview page.
- Only the active scene's renderer runs at a time (previous scene is fully disposed — geometries, materials, renderer — on scene change) rather than keeping five live WebGL contexts simultaneously, to keep GPU/CPU usage sane.
- Code-split the Three.js bundle via `React.lazy`/`Suspense` into its own chunk (~123 KB gzipped) that loads after first paint, so it doesn't block the initial page load. Main app bundle is back to ~61 KB gzipped, same as before this change.
- Each scene respects `prefers-reduced-motion`: renders one static frame instead of animating.
- Removed the now-unused optional video-drop-in hook (`SceneVideo`, `public/videos/`) and the broken-image fallback/probe system, since there are no more photos to fail.

## v2.4.0 — International cooperation scene
- Added a fifth Overview scene, "International cooperation," between the greenhouse-gas-challenge and RE-adoption scenes: United Nations General Assembly Hall photo (CC BY-SA 3.0, verified on Commons, no identifiable individuals) with a statement tied to the thesis's Political Commitment construct (participation in international net-zero agreements).
- Considered COP28/COP29 summit photography first but rejected it: none of the candidates could be verified as genuinely, stably licensed on Commons, and most feature identifiable named delegates/officials, which is best avoided for a reused illustrative background. The UN Assembly Hall is the safer, equally legible "international cooperation" visual.
- Added a matching "network" motion-graphics layer: a faint rotating globe wireframe with connection arcs and nodes pulsing in sequence between them — same lightweight SVG/CSS approach as the other four scenes, no added photo/video weight.
- Renumbered all five scenes (01–05) and updated photo credits in the README accordingly.

## v2.3.0 — Fixed broken hero images + graceful fallback
- Fixed two of the four Overview background photos (scenes 3 and 4) that were failing to load: they used hash-based `upload.wikimedia.org` URLs that no longer resolved. All four scenes now use Wikimedia's stable `Special:FilePath` redirect (the same pattern already proven reliable on scene 2), so they resolve by filename regardless of internal hash paths.
- Replaced the dead `SEDCsolar.jpg` reference (file could not be verified to exist) with a verified, confirmed-existing public-domain U.S. Air Force photo of the Nellis Air Force Base solar array, credited accordingly.
- Added a load-failure probe per scene image: if a photo URL ever breaks again, that scene now falls back to a brand-color gradient instead of rendering blank/black.

## v2.2.0 — Motion-graphics hero + optional video hook
- Added a lightweight, theme-matched motion-graphics layer per Overview scene (spinning turbine silhouettes + drifting clouds, rising smoke, a solar glint sweep with twinkle, rising light particles) — pure SVG/CSS, a few KB total, loops forever, no buffering.
- Considered and rejected embedding real stock/Commons video for the hero: properly-licensed CC clips run 20–250+ MB uncompressed, and adding compressed versions for four scenes would still add ~15–30 MB versus the current ~85 KB CSS/~190 KB JS bundle — a bad trade for a portfolio site's load time and free-tier hosting limits.
- Added an optional `video` field per scene plus a `SceneVideo` component (muted/looped/`playsInline`, pauses for non-active scenes, disabled entirely under `prefers-reduced-motion`) so a compressed, self-sourced clip (e.g. from Pexels/Coverr/Mixkit, recommended <3 MB / 6–10s) can be dropped into `public/videos/` and wired in with one line, without further code changes.
- Retuned the hero color grade (higher contrast/saturation, directional scrim) and crossfade (dissolve + drift instead of a flat opacity fade).
- Added cursor-based parallax on the hero photo layer and a subtle film-grain overlay.
- Made the scene progress dots real controls: click to jump, hover to pause/resume autoplay.

## v2.1.0 — Production readiness pass
- Verified clean `tsc -b && vite build` with zero errors/warnings.
- Added real PNG favicons (16/32/180/192/512), a web app manifest, `robots.txt`, and `sitemap.xml`.
- Added Open Graph / Twitter card image and complete social meta tags, plus canonical URL and JSON-LD scholarly-article metadata.
- Added a `<noscript>` fallback message.
- Added a top-level React `ErrorBoundary` so a runtime error shows a recoverable message instead of a blank page.
- Added deployment configs for Vercel (`vercel.json`), Netlify (`netlify.toml`), and GitHub Pages (`.github/workflows/deploy.yml`) with long-lived caching for hashed assets and no-cache for `index.html`.
- Added `.gitignore` and removed committed OS/build artifacts (`.DS_Store`, `*.tsbuildinfo`).
- Consolidated prior dated fix-note files into this changelog.

## v2.0.0 — Rebuild and interaction hardening
- Rebuilt as React + TypeScript + Vite with fixed SVG node/path geometry (no CSS transforms on positioned nodes).
- Added hover tracing, keyboard-accessible node/path selection, pan/zoom, evidence inspector, CSV export, and citation-copy fallback.
- Added light/dark theme persistence and `prefers-reduced-motion` support.
- Added a state-driven six-stage narrative spotlight for the landing model (replacing an earlier SVG entrance animation that could leave paths invisible).
- Added a looping narrative with Play/Pause/Previous/Next/Restart controls that wrap at the first/last stage.
- Rebuilt the Overview page as a crossfading photographic introduction (four Wikimedia Commons images, credited in the README), separate from the Model page's full SEM diagram.
- Tuned active-path line weight, arrowheads, node hierarchy, legend terminology, and copy for readability across desktop and 13" laptop viewports, informed by iterative structural + copy audits.
- Reduced crimson active-path overlays from 6 px to 4.1 px (intro overlays to 3.8 px) to avoid obscuring arrowheads and coefficient labels, while keeping 24 px invisible hit targets for click/keyboard usability.
- Added a section-by-section layout pass (Poster, Background, Model, Pathways, Evidence, Methods, Conclusion) balancing narrative and diagram space per page.
- Added an explicit internal scroll container per page (below a fixed header) so content taller than the viewport scrolls instead of clipping; diagram zoom now requires Cmd/Ctrl + wheel so normal scrolling passes through the SEM canvas.
- Added `scripts/audit.mjs`: a structural audit (7 constructs, 9 paths, focus/keyboard handling, CSV/clipboard behavior, reduced-motion/print CSS) plus an optional headless-Chromium runtime DOM check.
