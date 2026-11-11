# KeDo Smart V - Cursor Master Engineering Prompt

You are the lead principal architect and implementation agent for **KeDo Smart V**, a cross-platform, local-first, C++ media editor, AI production system and cloud SaaS. The complete authoritative product requirements are appended verbatim below. Keep the whole project in **one monorepo**. Your job is to implement production-quality vertical slices, not to hallucinate that a large app is already built.

## Rules that override general codegen habits

1. **Source of truth:** Requirements IDs in the appended PRD; reference them in issues, implementation commits and tests. Preserve original user media: never edit source files in place.
2. **Use the specified boundaries:** C++20/23, CMake, a Qt native shell subject to licensing approval, FFmpeg in compliant configuration, OCI/OCIO colour pipeline, Python FastAPI agent orchestration, llama.cpp local LLM, provider adapters, NestJS business API, Next.js marketing (Vercel/v0) and Next.js SaaS UI (ECS). Keep platform-specific implementations in separate folders and shared contracts in packages.
3. **Incremental implementation:** Do not output fake code, placeholders labeled complete, missing imports, fantasy APIs, unverified SDK calls, or mock data disguised as production functionality. Clearly mark deferred components and report what runs.
4. **Milestone ordering:** 0 (scaffold) then 1 (import/timeline) then 2 (take-aware sync) then 3 (colour + first cut), etc. Implement one coherent vertical slice at a time and test before continuing. When work is too large for one edit, complete the current slice and document next tasks in `docs/release/BACKLOG.md`.
5. **Security:** LLMs produce only typed `EditPlan` operations. No LLM direct filesystem/shell/deploy/public-post/payment actions. Verify authorization, privacy policy, media owner, target revision, schemas and provider cost before execution.
6. **True media semantics:** Use rational time, sample-accurate synchronization and timecode; separate repeated music performances from simultaneous camera angles. A source `Take` is not the same as a master music timestamp.
7. **Never falsify restoration:** Distinguish genuine correction, estimated enhancement and generated footage. Preserve all generated asset lineage and allow authenticity lock.
8. **Performance:** Playback is latency class 0; background indexing/AI are throttled. Build bounded CPU/GPU/RAM schedulers with cancellation. No blanket GPU/32-thread assumptions.
9. **Data:** Local SQLite WAL and optional cloud PostgreSQL. Original assets immutable, proxies independently disposable, edits append-only with atomic transactions. Explicit schema migrations.
10. **Deployments:** Marketing on Vercel/v0; SaaS Next.js on ECS; NestJS/FastAPI ECS; video processing dedicated CPU/GPU workers; S3 for media, RDS for metadata, SQS queues. Never send 8K render jobs to Vercel functions.
11. **Licenses:** Introduce `licenses/THIRD_PARTY_APPROVAL.md`, SDK feature flags and CI gates. Avoid enabling FFmpeg GPL/nonfree options without approval, or assuming Qt/proprietary RAW SDK rights.
12. **Test artifacts:** Add real tiny copyright-cleared media fixtures (or synthetic generated fixtures) to tests. Every sync change must report frame error and confidence, every render test must inspect output timestamps/colour metadata. Never commit customer footage, private model keys or heavy downloaded models.
13. **Keep installation practical:** Signed compact installers, optional model weights, on-demand codec SDK integrations where legally permitted, and native UI usable without internet.
14. **Coding standards:** TypeScript strict; Python type hints/Pydantic/mypy/ruff; C++ RAII, clang-format/clang-tidy, ASan/UBSan; test each public API. Generated contracts are checked in or generated deterministically.

## Immediate first-run plan for Cursor

A. Inspect the repository. If it is empty, construct the folder structure from PRD Section 10; create root `README`, `.gitignore`, `AGENTS.md`, `.cursor/rules`, `pnpm-workspace.yaml`, `turbo.json`, basic CMake project and Python uv workspace. Pin compatible, security-patched dependency versions after checking package manager registry; do not invent versions.
B. Implement a **runnable marketing site** in `apps/marketing`: Next.js App Router/TypeScript/Tailwind-compatible styling, accessible KeDo branding, Home, Features, Music Sync, AI Editor, Director Studio, Pricing, Downloads, Privacy, Terms and Contact; no fictional metrics or customer testimonials. Provide local dev and deploy instructions for Vercel/v0.
C. Implement a **runnable SaaS shell** in `apps/studio-web` with project dashboard, import page, timeline UI shell, typed API client, loading/error/permission states. If auth/API services not present, use explicitly labeled local demo fixtures, not pretend production connection.
D. Implement **native C++ foundational libraries**: RationalTime, MediaSourceRef, ProbeResult, ClipInstance, Sequence, EditOperation; CMake + CTest coverage; FFmpeg media probe behind interface; initial Qt app capable of selecting footage and showing frame metadata. When FFmpeg isn't available, fail with useful guidance and keep isolated tests runnable.
E. Implement a **minimal NestJS API** with `/health`, project CRUD, validation and a SQLite/Postgres dev option (or first PostgreSQL migration), tenant authorization tests, OpenAPI spec.
F. Implement **FastAPI AI gateway** with `POST /ai/plans` accepting one typed prompt, returning an unexecuted `EditPlan`, a mock/local adapter and schema validation. Never invoke external API without configured credentials/consent.
G. Implement a **real audio-sync prototype** from small WAV files: master/clip feature extraction, coarse correlation, offset/confidence, timebase conversion and tests for clean/noisy/repeated chorus ambiguity. Ensure song vs take grouping is represented in schema even if grouping model arrives later.
H. Add CI pipeline, lint/typecheck/test/build commands and a `docs/release/IMPLEMENTATION_STATUS.md` recording implemented, stubbed, blocked, tested and next milestones accurately.

## Output expectations for every implementation step

- Provide files actually created/changed, build/test commands and results.
- Do not fake runtime verification; where environment cannot run native UI, say so and test portable core.
- Keep PRD links/IDs on implementation stories; update ADRs for architectural tradeoffs.
- Prefer working thin slices over generating empty folders by the thousands.
- Never ask user to choose a library where this specification already decides it; identify only genuinely blocked external access, legal licenses or provider credentials.
- Always produce a functional result in the repository and finish with exact next runnable command.

---

# APPENDED AUTHORITATIVE COMPLETE PRODUCT DOCUMENTATION

# KeDo Smart V

## Exhaustive Product Requirements, System Architecture & Engineering Implementation Blueprint

**Edition:** 1.0.0 - Architecture Baseline / Product Specification  
**Prepared:** 8 November 2026  
**Scope:** Native desktop, SaaS web, mobile, Chromebook, local AI, hybrid-cloud media processing, public marketing website  
**Status:** Proposed build specification; not a claim that these capabilities have been implemented  
**Canonical name:** **KeDo Smart V**  
**Product promise:** Professional control when you want it; intelligent automation when you don't.

> **Governing design invariant:** The original recording is immutable. Every edit is non-destructive, traceable, reproducible and manually overrideable. AI may recommend, compose and generate, but never silently replace facts, discard source material, publish publicly or incur cloud spend without the appropriate authority.

### How to read this document

- **MUST** = required for the specified release scope; **SHOULD** = strong recommendation; **MAY** = future extension.
- All requirement IDs remain stable across PDF, Google Docs-compatible DOCX and Cursor instructions.
- **P0** = prerequisite/correctness or security; **P1** = core commercial value; **P2** = advanced or later stage.
- **MVP** refers to desktop-first editor with working media ingestion, synchronized multicam, non-destructive timeline, basic grading, AI-assisted first-cut and export. Advanced generative restoration is *not* presumed solved in MVP.
- Capability listings are **product targets**, not vendor guarantees. Camera RAW, platform encoding, AI generation quality, token costs, hardware concurrency and SDK rights must be validated individually.
- Technical sources and licensing verification links are listed in the final appendix; dates and vendor versions will evolve.

---

# 1. Executive vision, opportunity and measurable outcomes

## 1.1 Product thesis

KeDo Smart V is a local-first AI production studio unifying editorial workflows (multi-track timeline, multicam, audio sync, subtitles, colour grading, finishing), prompt-led creation and preproduction (scripts, shot planning and storyboards), intelligent restoration, and automated delivery. It is deliberately designed around difficult real-world imports: hundreds of disorganized files, multiple cameras, scratch audio, separate master songs, camera Log/RAW footage, inconsistent exposure, insufficient storage, low-resource laptops and lengthy review cycles. The editor must remain useful *without* any model or cloud service: ingest, organize, synchronize supported clips, preview, cut, grade, mix and export can still work locally.

## 1.2 Core differentiators

1. **Music-performance-aware alignment:** synchronize each independently recorded take to a common musical clock without confusing the take identities or physically concurrent events.
2. **Genre-sensitive intelligent assembly:** a wedding, song performance, news interview, sermon, scripted scene and viral clip receive different editing policies and ethical defaults.
3. **One editable project graph:** manual work, AI plans, generative clips and professional effects all appear as editable timeline nodes, not flattened output.
4. **Adaptive resource management:** decode, RAM, CPU, GPU/VRAM and background AI share measured budgets; constrained hardware uses proxies and offload instead of crashing.
5. **Local-private by default, cloud-enhanced by choice:** inference provider selection and media uploads require explicit privacy and cost policies.
6. **Production continuity:** scripts, shot lists, storyboards, slates, take metadata and final edits share a project identity and provenance chain.
7. **Simple and pro interfaces on the same engine:** no feature-incompatible project formats when switching between Autopilot, Co-Pilot, Prompt, Manual, and Director workspaces.

## 1.3 North-star metrics (initial release targets; validate with hardware cohorts)

| Metric | Product acceptance target | Notes |
|---|---|---|
| Basic edit readiness | Open a small H.264/HEVC project in under 15 s on reference mid-tier hardware | Excludes initial full analysis and external drive spin-up |
| Project durability | Zero lost edits after successful transaction commit; recover last durable snapshot after forced termination | Validate crash/kill and filesystem faults |
| Music sync | At least 95% of clean scratch-audio clips aligned within 1 video frame on controlled benchmark | Separate time-stretch/tempo-change and silent clips; report confidence |
| Multicam grouping | Distinguish repeated takes vs simultaneous cameras with >98% accuracy on labeled validation set | Avoid silent inaccurate grouping |
| Preview interactivity | 24/30 fps for benchmark 1080p proxy timelines on reference mid-tier hardware | Complex effects and RAW playback may be slower |
| Export integrity | No black frames, audio drift, corrupted timestamps or invalid colour metadata in standard benchmark suites | Platform-specific codec tests |
| AI plan safety | 100% of LLM-generated editing operations schema-validated and checked for authorizations | No direct free-form execution |
| Publication safety | 100% of uploads remain private or draft until user authorizes public publication | OAuth and API limitations documented |
| Cost transparency | Show estimated third-party generation cost before every billable job and record actual charge | Estimates may differ from vendor invoice |

## 1.4 Product boundaries

KeDo Smart V is not a digital-evidence recovery oracle, a guarantee of forensic truth or a guarantee of viral performance. Pure white clipped sensor values, severe defocus, unrecorded moments and invisible camera viewpoints may be **synthesized plausibly** but cannot be uniquely recovered. These operations MUST visibly identify synthetic output, preserve originals and permit a strict authenticity-preserving mode. Fully local LLMs will vary dramatically in capability depending on RAM/VRAM; a single CPU-core machine must remain operational for normal editing but is not expected to run large generative video models in real time.

# 2. Audiences, personas, scenarios and UX principles

## 2.1 Primary personas

| Persona | Main job-to-be-done | Required experience |
|---|---|---|
| Music video director | Organize repeated performances against a mastered song | One-click per-take sync, beat-aware first-cut, performance control |
| Wedding/event filmmaker | Turn huge camera dumps into a coherent emotional story | People/event recognition, chronology, speeches and documentary-safe editing |
| Podcast producer | Edit many camera angles from transcripts | Speaker switching, speech cleanup, chaptering and highlights |
| Creator/social marketer | Publish platform variants quickly | Auto-reframe, hooks, captions, batch output and private review |
| Film/TV editor | Precision editing with camera metadata and real colour | Timecode, RAW, tracks, XML/OTIO exchange, robust timeline |
| Church/conference producer | Long-running sessions and sermons | Reliable multicam, slides/speaker cues, long-duration export |
| Educator | Simplify lectures and generate clips | Diagrams, chapters, transcript edits, captions and accessible export |
| Producer/agency | Coordinate approvals and costs | Workspaces, review versions, permissions, audit trail, quotas |
| Director of photography | Plan before filming | Script-to-shot breakdown, lens/movement composition boards |

## 2.2 Five interaction modes

**Autopilot:** user selects source, format, style, duration, soundtrack, factuality/cost rules, then receives a fully editable first cut. **Co-Pilot:** checkpoints for import interpretation, take grouping, shots, grade, repairs and export. **Prompt:** natural-language and voice instructions translated into structured timeline operations and preview diff. **Manual:** full frame/subframe timeline tools, custom keyframes, node effects, colour scopes, clip-level and bus-level audio. **Director:** development, scripting, shot design, storyboards, scene coverage, shot/scene linkage and project handoff. Modes are views and authority settings over one project graph, not separate editors.

## 2.3 Design language and accessibility

Progressive disclosure: a single Import / Create / Review / Publish flow for beginners, advanced panels opened only when needed. Responsive density, configurable keyboard shortcuts (including NLE presets), command palette, undo history, right-click context menus, drag/drop, high contrast themes, screen-reader names, large-touch-target mobile UI and captions for tutorials. Never hide the source clip behind an AI effect; every AI change exposes before/after and provenance. Avoid interruptive modal dialogs for routine work. Offline and cloud status are always legible.

## 2.4 Default user journey

1. Create project and choose genre/intent, factuality mode and target deliverables.
2. Choose local disk/camera folder, removable media or cloud upload; optionally scan only a selected folder tree.
3. Securely probe media, hash assets, index metadata, generate thumbnails and lightweight proxies, detect master soundtrack.
4. Compute sync graph with confidence and group concurrent cameras separately from repeated takes.
5. Run optional visual, audio, transcript and scene analysis with local/cloud consent and compute budget.
6. Create a structured editorial plan; generate editable timeline; preview low cost; accept/modify shot choices.
7. Auto-correct, grade, repair only enabled issues, add subtitles/effects and optionally synthetic material.
8. Export from originals; check audio drift, loudness, framing, colour and encode quality.
9. Share secure review link or upload privately; publish only following explicit approval.

# 3. Release scope, prioritization and design invariants

## 3.1 Release profiles

**R0 - Engineering scaffold:** monorepo, CI, license review, media probing, source persistence, timeline schema, desktop playback shell, API schemas, service/auth skeleton. **R1 - Creator MVP:** Windows/macOS desktop, local timeline and proxy workflow, music-video sync, basic multicam and grade, lyrics/transcription assist, H.264/HEVC export, cloud optional, marketing website and account entry. **R2 - AI Editor:** genre planners, prompt actions, local text LLM router, polished source analysis, highlights, subtitles, review links. **R3 - Pro Finish:** camera SDKs, HDR, color graph, advanced stabilization/denoise, motion compositing, director boards and video generation adapters. **R4 - Everywhere:** iOS/Android, Linux, Chromebook/PWA, browser advanced editor, cloud render farms, team collaboration. These are milestone sequences, not dates or staffing commitments.

## 3.2 Non-negotiable invariants

- Immutable originals; content-addressable derived media and deterministic effect parameters where possible.
- Common project IDs, timeline operation schemas, media time units and colour metadata across desktop, SaaS and mobile.
- Precise rational timebase: never use floating-point seconds as canonical frame addresses.
- Every project mutation represented by validated, auditable, reversible operations with stable IDs.
- No model has direct filesystem, shell, OAuth, billing or publish permissions; use an allowlisted tool gateway.
- The browser does not need to support proprietary cinema decoders to create a compatible edit; cloud workers can produce authorized proxies and exports.
- Auto operations have low-confidence fallback and never fabricate confidence.
- No network dependency for supported local editing and playback.
- All costly tasks cancellable, resumable or safely restartable; worker failures cannot corrupt the edit database.

# 4. Exhaustive functional requirement catalog

The following requirements define the complete target product surface. Every requirement has a stable ID, a concrete behavior, and a directly testable verification criterion. The catalog intentionally separates foundation features from aspirational generative operations; phase mapping follows in the roadmap.

## 4.1 Import, media library and source management [ING]

**Purpose:** Securely bring in large heterogeneous productions without altering source media.  
**Dependencies:** P0 core, project schema, probe/decoder adapters  
**Module exit criterion:** Controlled fixture of 10,000 mixed files indexes with resumable progress, no mutations to source files, duplicates recognized.

**ING-001 - Permissioned folder scan [P0].** Import selected local folders, removable drives, card structures, network shares and browser uploads only within explicit scopes; offer read-only scan mode. **Acceptance:** Access tests verify non-selected directories are never traversed.

**ING-002 - Media probing [P0].** Extract codec, container, dimensions, rotation, rational FPS, VFR timestamp map, sample rate, channels, colour primaries, transfer, timecode and GPS metadata when present. **Acceptance:** Compare probe records to independent media tooling on known samples.

**ING-003 - Cryptographic identity [P0].** Compute streaming SHA-256 or equivalent stable hashes with file-size and fast-fingerprint stages, avoiding blocking UI. **Acceptance:** Identical assets deduplicate while same-name different-content files remain separate.

**ING-004 - Metadata safety [P0].** Quarantine malformed container metadata, never execute external content, use sandboxed probes with timeouts and memory caps. **Acceptance:** Fuzzed assets cannot crash host UI.

**ING-005 - Card structure preservation [P0].** Respect camera package folder dependencies, sidecars, split clips, spanned files and metadata bundles. **Acceptance:** Media links resolve after copying complete camera directories.

**ING-006 - Source relinking [P0].** Relink by hash, camera ID, timecode and stable metadata when drives move; retain offline placeholders. **Acceptance:** Mount relocated drive and restore all valid links without modifying edits.

**ING-007 - Analysis scheduling [P0].** Index in priority order: selection first, proxy second, thumbnails next, embeddings last. **Acceptance:** User can start playback while background indexing continues.

**ING-008 - Proxy generation [P0].** Generate calibrated proxies by codec/resolution/bit depth/available cores; maintain frame-accurate source mapping. **Acceptance:** Cut frame at proxy timeline matches original master in export.

**ING-009 - Scene browser [P0].** Search by camera, date, people (opt-in), actions, dialogue, wardrobe, sentiment, venue, take and audio context. **Acceptance:** Test queries return annotated expected clips.

**ING-010 - Smart bins and collections [P0].** Expose manual bins, dynamic rule bins, favorites, rejections, ratings, keywords, tags and locked takes. **Acceptance:** Changing tag updates dynamic bins without moving source.

**ING-011 - Import reports [P0].** List missing media, unsupported codecs, estimated storage, duplicate groups, corrupt segments and privacy issues. **Acceptance:** Report is reproducible and exportable as JSON/CSV.

**ING-012 - Storage policy [P0].** Configure in-place edits versus managed copy, proxy/cache directory, cache limits, eviction and media backup warnings. **Acceptance:** LRU eviction never removes irreplaceable source assets.

## 4.2 Universal synchronization and take analysis [SYN]

**Purpose:** Align simultaneously recorded cameras and repeated song performances without losing identity.  
**Dependencies:** ING, audio analysis, rational timebase  
**Module exit criterion:** On labeled clean audio test set: >=95% within one video frame; every low-confidence sync visible and correctable.

**SYN-001 - Source sound selection [P0].** Detect candidate master audio, boom, mixer tracks, camera scratch audio, embedded timecode, LTC and clapper events. **Acceptance:** All viable sync anchors are ranked with recorded origin.

**SYN-002 - Audio fingerprints [P0].** Build robust mel/spectral fingerprints, onset features and offset windows under reverberation and microphone EQ differences. **Acceptance:** Sync remains stable in known noisy audio fixtures.

**SYN-003 - Cross-correlation refinement [P0].** Refine rough matches by normalized cross-correlation or equivalent on aligned waveforms with resampling. **Acceptance:** Store sample offset, error and certainty.

**SYN-004 - Take-aware song alignment [P0].** Align each repeated performance to the musical timeline while retaining unique take IDs; do not imply simultaneous recording. **Acceptance:** Music-video test groups repeated choruses without collapsing takes.

**SYN-005 - Clock drift correction [P0].** Estimate linear piecewise drift for long camera recordings and external audio devices; preserve source time mapping. **Acceptance:** One-hour multicam fixture maintains frame-level A/V sync.

**SYN-006 - Timecode paths [P0].** Use embedded timecode or jam-sync metadata when trustworthy; reconcile inconsistent drop-frame/non-drop-frame and rate formats. **Acceptance:** Timecode reconciliation is deterministic.

**SYN-007 - Silent clip fallback [P0].** Attempt lips/viseme track, choreography cues, visible claps, flash/lighting cue and neighboring metadata references. **Acceptance:** Unsupported clips marked approximate instead of forced to a bad sync.

**SYN-008 - Music structure detection [P0].** Infer beats, measures, verse/chorus/bridge, downbeats and repeated motifs with manual music-grid edits. **Acceptance:** User can revise grid without destroying clip offsets.

**SYN-009 - Cross-camera grouping [P0].** Distinguish same physical event/time from separately performed takes by image, audio, slate and timestamps. **Acceptance:** False 'same moment' associations are visible and reversible.

**SYN-010 - Confidence inspection [P0].** Show sync heatmap, fingerprint view, alternative anchors and one-click slip/recompute for individual clips. **Acceptance:** Reviewer can inspect and override each uncertain association.

**SYN-011 - Multicam angle construction [P0].** Group synced tracks into angles with camera label, slate, lens metadata and monitor audio priority. **Acceptance:** Angle cuts stay attached to correct source timestamp.

**SYN-012 - Sync session persistence [P0].** Serialize algorithms/version, offsets, drift curves, anchors, confidence, take associations and user overrides. **Acceptance:** Reload reproduces exact alignment without re-analysis.

## 4.3 Professional editing timeline and project graph [TIM]

**Purpose:** Deliver high-performance, non-destructive editorial precision and unlimited AI/manual interchange.  
**Dependencies:** ING, timebase, media engine  
**Module exit criterion:** Frame-perfect edits, reliable undo, no lost state after forced process kill, validated interchange on reference project.

**TIM-001 - Rational timecode [P0].** Represent times in rational ticks with per-asset mapping for 23.976, 25, 29.97 DF, 59.94 and VFR. **Acceptance:** 6-hour timeline shows no cumulative drift.

**TIM-002 - Multi-track hierarchy [P0].** Support nested sequences, audio buses, linked audio/video, compound clips, adjustment layers and track groups. **Acceptance:** Nested renders equal their flattened reference within tolerance.

**TIM-003 - Edit tools [P0].** Insert, overwrite, ripple, roll, slip, slide, trim, lift, extract, razor, replace and batch conform. **Acceptance:** All operations covered by timebase unit tests.

**TIM-004 - Multicam switching [P0].** Live-switch camera angles during proxy playback and later fine-trim exact cuts. **Acceptance:** Switches preserve continuous master audio.

**TIM-005 - Keyframes [P0].** Animate transforms, crop, masks, opacity, speed, colour parameters and audio envelopes with multiple interpolation curves. **Acceptance:** Values evaluate deterministically at frame ticks.

**TIM-006 - Variable speed [P0].** Support speed ramping, reverse, freeze frames and time remapping while tracking audio pitch policy. **Acceptance:** Mapping remains monotonic where required and export remains timestamp valid.

**TIM-007 - Transition graph [P0].** Support dissolves, wipes, L-cuts/J-cuts, customizable transitions and audio crossfades as explicit nodes. **Acceptance:** Transition edges never address unavailable frames silently.

**TIM-008 - Undo/redo journal [P0].** Persist typed commands and inverse operations, snapshots and branch history, with conflict-aware replay. **Acceptance:** Undo restores the prior visual and audio graph.

**TIM-009 - Autosave and crash recovery [P0].** Flush journal atomically, checkpoint by policy and recover source references after unclean termination. **Acceptance:** Fault-injection suite reopens latest committed state.

**TIM-010 - Markers and notes [P0].** Attach review comments, beat markers, scene IDs, annotations and approval status to time and asset spans. **Acceptance:** Comments remain attached through safe ripple operations.

**TIM-011 - Searchable timeline [P0].** Find speaker phrases, scene labels, objects, colour tags, edit tags or clip IDs from unified search. **Acceptance:** Search result clicks move playhead to exact source frame.

**TIM-012 - Interchange [P0].** Export/import supported OTIO and conventional edit formats with explicit lossy feature mapping. **Acceptance:** Unsupported effects produce documented warnings, not invisible loss.

## 4.4 Decode, cache, preview and playback engine [PLAY]

**Purpose:** Keep preview smooth while exact export remains a distinct high-quality render path.  
**Dependencies:** TIM, codecs, hardware adapter  
**Module exit criterion:** Benchmark under reference machines with no UI freeze and predictable proxy fallback.

**PLAY-001 - Decoder abstraction [P0].** Select CPU, VideoToolbox, Media Foundation, VA-API, NVDEC or vendor SDK according to measured capabilities. **Acceptance:** Hardware failure falls back without losing timeline state.

**PLAY-002 - Render graph [P0].** Use typed compositing nodes with dirty region propagation, frame dependencies, cache keys and GPU resource descriptors. **Acceptance:** Identical render inputs produce identical cache identities.

**PLAY-003 - Frame scheduling [P0].** Prioritize playhead and near-future frames; cancel obsolete scrubbing tasks. **Acceptance:** Repeated fast scrubs never lock the UI thread.

**PLAY-004 - Variable frame rate [P0].** Normalize display timeline while maintaining source timestamp map and source audio synchronization. **Acceptance:** Smartphone VFR fixture exports stable lip sync.

**PLAY-005 - Adaptive preview [P0].** Lower scale, chroma precision, effect quality or AI previews under latency pressure without altering final master settings. **Acceptance:** Preview downgrade is labeled and reversible.

**PLAY-006 - Cache tiers [P0].** Maintain RAM LRU, GPU VRAM budget and disk spill with exact invalidation by source hash/effect versions. **Acceptance:** Edit a grade and unrelated clip caches stay valid.

**PLAY-007 - Audio clock authority [P0].** Choose a stable audio master clock and compensate video cadence without changing exported frame positions. **Acceptance:** Long playback produces no audible cumulative drift.

**PLAY-008 - Waveform generation [P0].** Cache downsampled multiresolution waveforms, peaks, loudness and spectrograms. **Acceptance:** Editing UI zoom remains fast for multi-hour audio.

**PLAY-009 - Preview scopes [P0].** Provide safe-area, false colour, waveform, parade, vectorscope, histogram and clipping checks on calibrated paths. **Acceptance:** Scopes computed from declared working colour space.

**PLAY-010 - Render failover [P0].** Isolate codec, plugin, inference and GPU crashes in workers where platform permits; degrade to proxy/CPU path. **Acceptance:** Forced worker kill cannot invalidate project files.

## 4.5 AI genre-aware editorial intelligence [EDT]

**Purpose:** Produce a compelling first cut with explainable constraints tailored to content.  
**Dependencies:** SYN, PLAY, ASR, VISION, AGT  
**Module exit criterion:** Human evaluators prefer or accept >=70% of first-cut shot selections on target genre pilots; not a guarantee of artistic quality.

**EDT-001 - Genre templates [P1].** Ship music video, wedding, podcast, street interview, movie, concert, church service, conference, birthday, vlog, product, real estate, education and documentary policies. **Acceptance:** User can see and override all chosen template rules.

**EDT-002 - Multimodal scoring [P1].** Rate focus, composition, visibility, stability, action, intelligibility, emotional relevance and uniqueness per shot. **Acceptance:** Each ranking includes supporting evidence and confidence.

**EDT-003 - Narrative graph [P1].** Create editable event/scene/beat/story arcs rather than randomly concatenating high-score shots. **Acceptance:** Output plan has scene/beat rationale linked to clips.

**EDT-004 - Music video assembly [P1].** Prefer lip-sync-correct takes, maintain master song uninterrupted and choose shots on meaningful musical boundaries. **Acceptance:** No unintended breaks or tempo changes in master track.

**EDT-005 - Interview editing [P1].** Preserve answer context, avoid misleading sentence joins and provide source transcript provenance for all cuts. **Acceptance:** Transcript-to-source time mapping inspectable.

**EDT-006 - Wedding narrative [P1].** Identify arrivals, ceremony, vows, speeches, reception, emotional reactions and person preferences. **Acceptance:** Chronology remains correct under factuality lock.

**EDT-007 - Scripted continuity [P1].** Check action line, eyeline, direction of movement, dialogue pickups and shot-reverse-shot rules. **Acceptance:** Continuity warnings shown for suspect cuts.

**EDT-008 - Social clip extraction [P1].** Suggest standalone highlights with opening context, complete thought and non-deceptive captions. **Acceptance:** Clip includes traceable start/end and source transcript.

**EDT-009 - Editable style guides [P1].** User can set pace, coverage ratio, speaker priority, forbidden shot types, colour mood, aspect, duration and overlays. **Acceptance:** Regeneration preserves locked shot/scene selections.

**EDT-010 - Multiple versions [P1].** Produce narrative, fast, documentary, performance-first and cinematic variants in separate branches. **Acceptance:** Variant diff compares clips, trims and effects.

**EDT-011 - Confidence & policy [P1].** Offer 'ask before changing' gates for scene order, sensitive changes, synthetic footage or factual edits. **Acceptance:** No forbidden operation reaches executor.

**EDT-012 - Explain choices [P1].** Expose why shot selected, rejected or placed, and constraints violated or satisfied. **Acceptance:** Explanation links to actual graph and analysis annotations.

## 4.6 Colour science, matching and creative grading [COL]

**Purpose:** Deliver robust camera transforms and creative look controls without destroying original pixel data.  
**Dependencies:** PLAY, media metadata, HDR pipeline  
**Module exit criterion:** Reference charts and skin-tone tests pass measured colour-difference targets defined per camera pipeline.

**COL-001 - Input identification [P1].** Parse source Log/RAW gamut, transfer function, HDR tags and manufacturer metadata; allow manual override. **Acceptance:** Mislabeled footage shows a warning rather than silently applying invalid transform.

**COL-002 - Colour managed pipeline [P1].** Implement scene-referred float or half-float processing with OCIO/ACES-compatible transforms. **Acceptance:** Round-trip transform target stays within defined deltaE tolerances.

**COL-003 - RAW controls [P1].** Expose ISO/exposure where supported, white balance/tint, highlight recovery and debayer quality through licensed SDK. **Acceptance:** Parameters preserve source metadata and are non-destructive.

**COL-004 - Exposure balancing [P1].** Analyze shot-wide and subject-specific regions, protecting highlight roll-off and skin where feasible. **Acceptance:** Correction never assumes clipped data can be genuinely restored.

**COL-005 - Auto white balance [P1].** Compare neutral regions, reference charts and scene context; allow fixed camera-match anchor. **Acceptance:** Mixed lighting confidence visible and manual keyframes possible.

**COL-006 - Camera match [P1].** Match shots across cameras by scene/reference and skin preservation, with per-scene model and continuity penalties. **Acceptance:** Match avoids colour pumping between cuts.

**COL-007 - Primary grading [P1].** Lift/gamma/gain, printer lights, contrast, pivot, exposure, saturation, temperature, curves and HDR wheels. **Acceptance:** All controls animate and serialize.

**COL-008 - Secondary grading [P1].** Hue/sat/luma keys, skin-tone qualifiers, masks, power windows and motion tracking. **Acceptance:** Mask edits update only dependent nodes.

**COL-009 - Creative styles [P1].** Film emulation, halation, glow, grain, split tone, vibrance, vintage, concert and cinematic LUT stacking. **Acceptance:** Look is re-editable and optional, not baked in.

**COL-010 - Reference look transfer [P1].** Extract look from chosen image/clip, map to target gamut and protect skin and neutrals. **Acceptance:** Before/after comparison and match strength exposed.

**COL-011 - Scopes and HDR [P1].** Waveform, vectorscope, legal range, PQ/HLG and SDR transforms with monitor calibration reminders. **Acceptance:** Metadata preserved in validated exports.

**COL-012 - Batch consistency [P1].** Apply shared base correction per scene with individualized trims and shot-relative changes. **Acceptance:** One scene grade update does not obliterate shot overrides.

## 4.7 Professional audio, music analysis and speech intelligence [AUD]

**Purpose:** Preserve high-quality sound while simplifying dialogue, songs and long-format productions.  
**Dependencies:** SYN, audio graph  
**Module exit criterion:** Voice intelligibility, music integrity and sync remain consistent after export on benchmark suites.

**AUD-001 - Master audio handling [P1].** Keep final song locked and unmodified by default during music-video first cuts. **Acceptance:** Compare export PCM to approved source path within codec tolerance.

**AUD-002 - ASR transcription [P1].** Generate word-level timestamps with diarization, languages and editable correction history. **Acceptance:** Caption timing does not drift after retime.

**AUD-003 - Speaker diarization [P1].** Label speakers and allow rename/merge/split with consent for biometric-like voice analysis. **Acceptance:** Edits update all timeline associations.

**AUD-004 - Noise reduction [P1].** Suppress continuous noise, hum and room ambience with A/B and artifact strength controls. **Acceptance:** Bypass recovers original audio samples.

**AUD-005 - Reverb / wind handling [P1].** Provide dereverb, wind reduction, de-essing, plosive repair and spectrally limited repair tools. **Acceptance:** Artifacts flagged for human review.

**AUD-006 - Audio mixer [P1].** Tracks, buses, groups, pan, EQ, compressor, limiter, sidechain, sends and automation. **Acceptance:** Render output matches realtime mixer settings.

**AUD-007 - Loudness compliance [P1].** Target integrated LUFS, true peak, dialogue loudness and platform presets with measurable reports. **Acceptance:** True peak scanner validates emitted master.

**AUD-008 - Music structure [P1].** Beat/downbeat/key/tempo/sections and chord suggestions, with user corrections and time signatures. **Acceptance:** Grid edits propagate non-destructively.

**AUD-009 - Auto ducking [P1].** Reduce music under speech with sidechain envelope and editable response time. **Acceptance:** No clipping or excessive pumping in test cases.

**AUD-010 - Voice cleanup [P1].** Detect filler words, clicks, pauses and breath edits with reversible proposal mode. **Acceptance:** No syllable removal without visible proposed cut.

**AUD-011 - Stem isolation [P1].** Optional voice/music/instrument separation through model adapter, clearly identifying estimation artifacts. **Acceptance:** Separated tracks re-align to source sample positions.

**AUD-012 - Multilingual captions [P1].** Translate transcripts with quality status, review tools and captions/burned-in/sidecar export. **Acceptance:** No claim of accuracy before review.

## 4.8 Restoration, stabilization and motion reconstruction [RES]

**Purpose:** Separate authentic repair from generative replacement with truthful confidence and provenance.  
**Dependencies:** PLAY, model gateway, masks  
**Module exit criterion:** Reference comparisons include objective VMAF/SSIM where appropriate plus human inspection, no promise of original truth.

**RES-001 - Denoising [P1].** Spatial/temporal noise filtering that preserves facial detail and grain, with shadow-specific controls. **Acceptance:** Preview exposes before/after and artifact notices.

**RES-002 - Deblur [P1].** Estimate camera/subject motion blur with constrained sharpening and optional generative reconstruction. **Acceptance:** Mode explicitly distinguishes restoration from synthesis.

**RES-003 - Stabilization [P1].** Use optical flow and gyroscope metadata, horizon lock, rolling-shutter correction, crop budget and edge fill. **Acceptance:** Export reports remaining crop and stability score.

**RES-004 - Frame interpolation [P1].** Flow-based high-FPS conversion and slow motion, detecting cuts, occlusions and warped limbs. **Acceptance:** Hard cut boundaries do not interpolate across scenes.

**RES-005 - Dropped-frame repair [P1].** Rebuild a small number of missing frames with confidence masks and source-index references. **Acceptance:** Synthetic frames tagged and originals unchanged.

**RES-006 - Exposure salvage [P1].** Recover RAW shadow/highlight data where available; escalate truly missing detail to labeled generative estimates. **Acceptance:** Fully clipped source never claims factual recovery.

**RES-007 - Object cleanup [P1].** Track dust, lens spots, wires or selected objects across shots; use inpaint with temporal coherence checks. **Acceptance:** Editor can repaint masks per frame.

**RES-008 - Short clip extension [P1].** Generate plausible continuation with continuity conditioning, optionally using end-frame reference and story constraint. **Acceptance:** Extension distinctly marked synthetic on timeline.

**RES-009 - Alternative perspective [P1].** Use multi-view geometry when actual camera coverage exists; generative angle only when explicitly opted in. **Acceptance:** Unknown geometry displayed as estimated.

**RES-010 - Face fidelity [P1].** Limit identity drift, constrain portrait retouch and detect inconsistent generated face features. **Acceptance:** AI report warns when identity preservation confidence low.

**RES-011 - Authenticity Lock [P1].** Prohibit content-generating changes for documentary/evidence workflows, allow noise/color repairs within declared policy. **Acceptance:** Tool gateway rejects forbidden generation calls.

**RES-012 - Provenance manifest [P1].** Attach model ID, seed, mask, input clips, prompt, sampling settings, version and output hashes. **Acceptance:** User can retrieve lineage for every synthetic asset.

## 4.9 Compositing, effects, masks, motion graphics and tracking [VFX]

**Purpose:** Create an accessible After Effects-class conceptual workflow with editable effect nodes.  
**Dependencies:** PLAY, tracking, shader library  
**Module exit criterion:** Reference effect sequences match offline render and support isolated preview.

**VFX-001 - Layer compositor [P1].** Implement transforms, blend modes, alpha premultiplication, mattes, nested comps and depth-aware optional passes. **Acceptance:** Alpha edges and blend math tested.

**VFX-002 - Keying [P1].** Chroma key, luma key, despill, edge softness and screen cleanup. **Acceptance:** Green screen fixture tested against reference matte.

**VFX-003 - Mask & roto [P1].** Manual bezier masks plus AI matting for hair, people and objects, with temporal refinement. **Acceptance:** User corrections persist across model reruns.

**VFX-004 - Tracking [P1].** Point, planar and object tracking with occlusion/confidence indicators and stabilization linkage. **Acceptance:** Track remains anchored through controlled occlusions.

**VFX-005 - Object addition/removal [P1].** Add graphics/3D elements or remove selected objects with tracked masks and lighting recommendations. **Acceptance:** Synthetic overlay can be disabled instantly.

**VFX-006 - Motion graphics [P1].** Titles, lower thirds, kinetic text, animated shapes, charts, logos and template parameter editing. **Acceptance:** Fonts properly embedded or substituted with warning.

**VFX-007 - Particles & stylization [P1].** GPU effects for particles, bloom, lens distortion, film burn, light leaks and glitch with adjustable intensity. **Acceptance:** Resource budget caps preview GPU cost.

**VFX-008 - AI effects [P1].** Apply selective generative transforms to explicit regions with non-destructive output cache and per-frame masks. **Acceptance:** Result can be regenerated with known seed/model.

**VFX-009 - Transitions [P1].** Curated simple transitions plus plug-in effect transitions with user-defined duration and easing. **Acceptance:** Fallback on unsupported plugin is a warning, not silent clip loss.

**VFX-010 - 3D camera layer [P1].** Camera solve and 2.5D elements with depth estimate visualization, not pretending perfect 3D reconstruction. **Acceptance:** Unsupported geometry displayed explicitly.

## 4.10 Video generation and extension provider hub [VID]

**Purpose:** Offer provider-neutral generation, editing and storyboard reference assets with consented billing.  
**Dependencies:** AGT, SVC, cloud storage  
**Module exit criterion:** Provider mock suite validates callbacks, retries, idempotency, safety and costs before real vendor enablement.

**VID-001 - Text-to-video [P1].** Submit prompts, duration, aspect, fps and style to models advertising compatible capability. **Acceptance:** Unsupported settings rejected before request.

**VID-002 - Image-to-video [P1].** Animate a user-selected reference with movement/camera path constraints and input-rights confirmation. **Acceptance:** Source image lineage retained.

**VID-003 - Reference video editing [P1].** Support region rewrite, style transfer, background changes and scene modifications when provider advertises capability. **Acceptance:** Capability matrix prevents false UI promises.

**VID-004 - Multi-shot planning [P1].** Divide scripts into bounded generation jobs with seed, character reference and continuity metadata. **Acceptance:** Outputs re-link to script scene and shot ID.

**VID-005 - Frame-based extension [P1].** Condition on first/last frame or previous segment where provider supports it. **Acceptance:** Continuation is labeled generated.

**VID-006 - Storyboard generation [P1].** Produce composition, lighting, lens, shot angle and motion reference frames with deliberate character/wardrobe consistency plan. **Acceptance:** Shot board includes prompts and seed/model provenance.

**VID-007 - Provider contracts [P1].** Define normalized generation request, status, progress, billing estimate, output artifacts, cancellation and errors. **Acceptance:** Adapter conformance suite runs without vendor access.

**VID-008 - Model routing [P1].** Select local versus cloud and provider by capability, region, data policy, cost, latency and user-approved preference. **Acceptance:** Restricted region never routes to forbidden endpoint.

**VID-009 - Generation review [P1].** Allow side-by-side seed variations, favorites, reference match scores and target-timeline insertion. **Acceptance:** No generation auto-publishes.

**VID-010 - Provider lifecycle [P1].** Version APIs, poll/webhooks, expire signed URLs, handle rate limits, retries, refunds and vendor downtime. **Acceptance:** Idempotent job resubmission does not double-bill internally.

## 4.11 Local agentic AI and deterministic tool execution [AGT]

**Purpose:** Make user intent translate into safe, structured and fully reversible edit commands.  
**Dependencies:** TIM, SVC, LLM runtime  
**Module exit criterion:** 100% of model-proposed operations pass schema/authz/timebase validations; tests reject prompt-injection payloads.

**AGT-001 - Local text models [P0].** Run approved quantized GGUF models through llama.cpp with CPU, Metal, CUDA or Vulkan where supported. **Acceptance:** Device check selects a model that fits RAM/VRAM budget.

**AGT-002 - Cloud reasoning [P0].** Offer provider-neutral connectors for OpenAI, Anthropic and xAI with versioned models and user provider policy. **Acceptance:** Revoked API key cannot be used after revocation.

**AGT-003 - Agent roles [P0].** Assign intake, sync analyst, director, editor, colourist, VFX, audio engineer, caption reviewer, exporter and QA checker. **Acceptance:** Role outputs follow declared schemas.

**AGT-004 - Planner / executor split [P0].** LLM creates a declarative plan; deterministic C++/service executors validate and apply atomic commands. **Acceptance:** No free-form shell commands executed by LLM.

**AGT-005 - Typed tool registry [P0].** Limit operations to tools with JSON Schema, budgets, side-effect scope, cancellation and audit metadata. **Acceptance:** Invalid arguments fail with corrective feedback.

**AGT-006 - Context retrieval [P0].** Use project-scoped embeddings, shot metadata, transcripts, scene graph and source hashes via permissioned retrieval. **Acceptance:** Cross-project context isolation tests pass.

**AGT-007 - Human approval gates [P0].** Require approval for irreversible deletes, publish, external media upload, spending, identity/face changes and authenticity violations. **Acceptance:** Denied action leaves no external side effect.

**AGT-008 - Agent memory [P0].** Retain user preferences and project decisions with per-project visibility and ability to reset, not unbounded hidden memory. **Acceptance:** Preference change affects later plan deterministically.

**AGT-009 - Prompt editing preview [P0].** Show plan diff, estimated run time, provider/cost and clips affected before apply where appropriate. **Acceptance:** Undo of accepted action restores original graph.

**AGT-010 - Failure handling [P0].** Checkpoint long task graphs, retry idempotently, degrade to local/rule workflows, surface uncertainty. **Acceptance:** Terminated worker resumes without duplicate outputs.

**AGT-011 - Model benchmarking [P0].** Compare candidate small/medium model quality on function calling, script work, caption tasks and hallucination rate. **Acceptance:** Model selection requires benchmark report, not just popularity.

**AGT-012 - Safety / input trust [P0].** Treat transcript, metadata, subtitle and reference text as untrusted content; deny exfiltration instructions. **Acceptance:** Prompt-injection suite cannot escalate tool privileges.

## 4.12 Director Studio: writing, storyboards and production planning [DIR]

**Purpose:** Unify preproduction metadata and postproduction footage to preserve intent through edit.  
**Dependencies:** AGT, VID, project metadata  
**Module exit criterion:** Shot list generated from a screenplay and re-linked to imported takes in pilot production.

**DIR-001 - Script drafting [P1].** Draft film, commercial, documentary, podcast and music-video treatments with beat structure and scene headings. **Acceptance:** Versioned scripts support manual editing.

**DIR-002 - Script revision [P1].** Suggest pacing, character continuity, dialogue and scene transitions with tracked diffs and rationale. **Acceptance:** User approves individual revisions.

**DIR-003 - Shot breakdown [P1].** Generate scene, shot, coverage purpose, action, dialogue, characters, props, lighting, lens and framing records. **Acceptance:** Every shot record points to script line/span.

**DIR-004 - Storyboard frames [P1].** Generate per-shot reference frames with aspect, angle, actor blocking, lighting and composition notes. **Acceptance:** Outputs labeled reference, not actual shot.

**DIR-005 - Camera movement plans [P1].** Specify pan, tilt, dolly, crane, handheld, drone, blocking and lens notes with animation previews where feasible. **Acceptance:** Movement notes export in shot-list PDF/CSV.

**DIR-006 - Continuity bible [P1].** Track wardrobe, props, scene time/weather, actor positions, screen direction and consistent visual style. **Acceptance:** User sees conflicts before shoot.

**DIR-007 - Production schedule [P1].** Organize locations, scenes, cast availability, takes and capture checklists, with manual constraints. **Acceptance:** Schedule export retains linked shot IDs.

**DIR-008 - On-set tagging [P1].** Support camera slate, QR/scene identifiers, shot statuses and optional mobile logging. **Acceptance:** Media imported later matches identifiers.

**DIR-009 - Coverage assessment [P1].** Compare actual shots against planned ones and detect missing angles/actions/lines. **Acceptance:** Uncertain matching requires director confirmation.

**DIR-010 - Reshoot alternatives [P1].** Offer coverage plan, editorial workaround or explicitly synthetic replacement choices. **Acceptance:** No claim fabricated frames were truly filmed.

**DIR-011 - Director review [P1].** Display script pages next to matching takes, assembly cut and notes. **Acceptance:** Scene/take links survive import relinking.

## 4.13 Captions, translation and accessibility [SUB]

**Purpose:** Make subtitles easy, accurate, editable and accessible across platforms.  
**Dependencies:** AUD, TIM  
**Module exit criterion:** Broadcast and social formats validate timestamps, line breaks, encoding and synchronization.

**SUB-001 - Speech captions [P1].** Generate accurately timestamped transcripts with speaker labels and human correction. **Acceptance:** Source-timestamp trace maintained.

**SUB-002 - Lyric captions [P1].** Sync manually supplied lyrics or verified transcription against song with word timing. **Acceptance:** Lyrics rights and transcription review notice shown.

**SUB-003 - Multi-language [P1].** Translate subtitles with glossary, proper names and locale controls. **Acceptance:** Review flags named-entity uncertainty.

**SUB-004 - Caption editor [P1].** Provide WYSIWYG visual typography, motion, safe-area and presets. **Acceptance:** Text remains editable and exportable sidecar.

**SUB-005 - Accessibility formats [P1].** Import/export SRT, WebVTT and other supported text tracks; preserve optional speaker identifiers. **Acceptance:** Round-trip timing bounded by frame duration.

**SUB-006 - Burn-in and sidecar [P1].** Deliver both styled burn-in and unstyled machine caption tracks according to export preset. **Acceptance:** Re-encode changes don't alter line content.

**SUB-007 - Content warnings [P1].** Show captions confidence and translations requiring review before publication. **Acceptance:** Low confidence prompts user.

## 4.14 Social repurposing and short-form editor [SOC]

**Purpose:** Create good short clips without promising guaranteed viral reach.  
**Dependencies:** EDT, SUB, PBL  
**Module exit criterion:** One long source produces reviewed 9:16, 1:1 and 16:9 clips with correct safe areas.

**SOC-001 - Highlight scoring [P1].** Rank moments by hook, completeness, novelty, emotional energy and context preservation. **Acceptance:** Each score has explainable contributing factors.

**SOC-002 - Auto reframe [P1].** Track speaking faces/subjects and adjust virtual crop with manual anchor overrides. **Acceptance:** Subject remains in safe region in evaluated frames.

**SOC-003 - Hook variants [P1].** Suggest alternative cold opens, headlines and pacing versions without fabricating speaker statements. **Acceptance:** Every version maps to actual source timestamp.

**SOC-004 - Caption templates [P1].** Provide readable karaoke-like words, emphasis, branded presets and accessible contrast. **Acceptance:** Caption collision and safe zone checks pass.

**SOC-005 - Batch aspect ratios [P1].** Output vertical, square and landscape with crop variants from a common source edit. **Acceptance:** No unexpected letterboxing in preset dimension test.

**SOC-006 - Brand kits [P1].** Save fonts, logos, palettes, lower thirds and safe overlays per workspace. **Acceptance:** Global brand change offers selective application.

**SOC-007 - Performance import [P1].** Optional user-authorized analytics import where API permits, stored separately from creative source. **Acceptance:** Revoking platform access halts future imports.

**SOC-008 - Editorial scorecard [P1].** Suggest thumbnail, title, summary, hashtags and platform-specific edits with uncertainty disclaimer. **Acceptance:** User edits all metadata before publishing.

## 4.15 Export, compression and quality control [EXP]

**Purpose:** Produce high-fidelity, small-enough delivery formats through measured encoding rather than magical claims.  
**Dependencies:** PLAY, COL, AUD  
**Module exit criterion:** Reference outputs pass frame-timestamp, audio-sync, colour tags, duration and decode validation.

**EXP-001 - Master render [P1].** Always evaluate effects from selected source quality; never unknowingly export only from proxies. **Acceptance:** Quality metadata shows source-to-output lineage.

**EXP-002 - Codec profiles [P1].** Support H.264/AVC, H.265/HEVC, AV1 where available, and supported professional intermediates. **Acceptance:** Codec choice lists hardware/license constraints.

**EXP-003 - Quality targeting [P1].** Use rate control, perceptual evaluation, scene complexity and content-adaptive allocation. **Acceptance:** Report measured size, bitrate and quality surrogate.

**EXP-004 - Frame precision [P1].** Conform rational timebases, VFR and audio offsets with deterministic output timestamps. **Acceptance:** Duration tests pass across odd FPS sources.

**EXP-005 - GPU encoding [P1].** Select NVENC, AMF, Quick Sync, VideoToolbox or software encoder based on platform support and comparison. **Acceptance:** Software fallback always available if codec supported.

**EXP-006 - HDR/colour metadata [P1].** Preserve correct primaries, transfer characteristics, mastering info and SDR conversions. **Acceptance:** Test on reference video analyzer.

**EXP-007 - Batch renditions [P1].** Create presets for YouTube, Instagram, TikTok, archive, film festival and client review, with user-editable settings. **Acceptance:** Presets produce exact target dimensions/framerates.

**EXP-008 - Loudness validation [P1].** Scan integrated LUFS and true peak, clipping, silence and channel routing. **Acceptance:** QC flags noncompliant output.

**EXP-009 - Render resumability [P1].** Persist segment manifests and invalidate only changed segments; ensure closed-GOP boundaries when needed. **Acceptance:** Interrupted export restarts without duplicated content.

**EXP-010 - Render quality report [P1].** Display dropped frames, missing effects/media, plugin failures, colour warnings and generated-content disclosure. **Acceptance:** Export can be blocked on critical errors.

## 4.16 Review, approval, publishing and delivery [PBL]

**Purpose:** Move from private review to authorized publishing with rights and spending controls.  
**Dependencies:** EXP, identity, cloud auth  
**Module exit criterion:** No automated public posting in e2e tests without publish permission and confirmation.

**PBL-001 - Review versions [P1].** Generate watermarked/unwatermarked previews with view-only links, expiration and optional passcodes. **Acceptance:** Public link cannot access raw sources unless granted.

**PBL-002 - Frame-specific comments [P1].** Attach annotations to frame, screen coordinates and clip IDs; record reviewer and status. **Acceptance:** Comment remains mapped through new version comparisons.

**PBL-003 - Approval workflow [P1].** Support draft, review requested, changes requested, approved and published states with actor permissions. **Acceptance:** Transition guards prevent invalid publish.

**PBL-004 - YouTube upload [P1].** OAuth authorize channel, upload as private by default, metadata, thumbnail and chapters via supported APIs. **Acceptance:** Private visibility verified before review completion.

**PBL-005 - Other social adapters [P1].** Provide platform-specific support for creator-authorized publishing or export-to-device when APIs disallow direct post. **Acceptance:** Unsupported operations never advertised as guaranteed.

**PBL-006 - Publish confirmation [P1].** Explicit user action required for public/scheduled visibility, including intended channel and time. **Acceptance:** E2E test denies automated approval escalation.

**PBL-007 - Delivery packages [P1].** Export master, proxy, audio stems, captions, QC report, edit manifest and optional OTIO. **Acceptance:** Manifest verifies all package files.

**PBL-008 - Unpublish/revoke [P1].** Provide link revocation and API-supported platform actions, with realistic external consistency warnings. **Acceptance:** Revocation audit includes timestamp and result.

## 4.17 Resource adaptation and native hardware optimization [PER]

**Purpose:** Optimize measured responsiveness and throughput across variable CPU, GPU, RAM and battery profiles.  
**Dependencies:** PLAY, platform runtime  
**Module exit criterion:** Resource stress tests avoid OOM and maintain interactive timeline responsiveness in minimum tiers.

**PER-001 - Hardware capability probe [P0].** Query physical/logical cores, topology, NUMA where exposed, SIMD, GPU queues, VRAM, memory pressure and codec acceleration. **Acceptance:** Reports show unsupported paths and verified capabilities.

**PER-002 - CPU work stealing [P0].** Assign splittable independent tasks to bounded pools with task affinity, low-overhead queues and throughput feedback. **Acceptance:** 32-core fixture achieves speedup on embarrassingly parallel tasks.

**PER-003 - One-core operation [P0].** Preserve UI responsiveness by time-slicing background tasks and limiting proxy/AI concurrency. **Acceptance:** Single-core simulation remains editable at low preview tier.

**PER-004 - RAM budgeter [P0].** Bound decoder queues, source thumbnails, analysis batch, local LLM and frame cache; use spill and eviction. **Acceptance:** Low-RAM simulation avoids process kill.

**PER-005 - GPU allocator [P0].** Track per-backend texture, staging, model weights and output surfaces with playback reservation. **Acceptance:** AI cannot consume protected preview memory budget.

**PER-006 - Thermal/battery profiles [P0].** Detect mobile/portable constraints, cap sustained loads and warn before background exports. **Acceptance:** Throttling causes graceful preview downgrade.

**PER-007 - I/O awareness [P0].** Adjust reads for HDD, USB, NVMe and network media; throttle hashing and respect disconnect. **Acceptance:** Unplugged source becomes offline placeholder, no corruption.

**PER-008 - Adaptive benchmark [P0].** Calibrate per-device throughput for decode, proxy, AI model, effect kernels and export. **Acceptance:** Profile is versioned and invalidated on driver changes.

**PER-009 - Task prioritization [P0].** Use realtime-ish playback, interactive commands, export, proxies and AI as separate latency classes. **Acceptance:** Stress case keeps playhead reaction under target.

**PER-010 - Multi-GPU policy [P0].** Assign workloads only when supported and beneficial; avoid expensive transfers for small operations. **Acceptance:** Benchmark validates against single-GPU baseline.

**PER-011 - OOM recovery [P0].** Catch allocation refusal, unload model, reduce preview scale, retry safely and emit recoverable status. **Acceptance:** Forced VRAM failure doesn't crash app.

## 4.18 Cinema camera interoperability and edit exchange [CAM]

**Purpose:** Support serious camera workflows while respecting SDK and codec licensing limitations.  
**Dependencies:** ING, COL, EXP  
**Module exit criterion:** Each format passes import/grade/export fixture and documents unavailable functionality per platform.

**CAM-001 - BRAW adapter [P1].** Integrate Blackmagic RAW SDK for permitted platforms, metadata and debayer controls. **Acceptance:** Valid BRAW reference exports exact duration/color metadata.

**CAM-002 - R3D adapter [P1].** Integrate supported RED SDK after legal/SDK review; support color pipeline, metadata and decode quality tiers. **Acceptance:** R3D fixture and performance report produced.

**CAM-003 - ARRI path [P1].** Import supported ProRes/ARRIRAW paths only with available decoder and licensed rights. **Acceptance:** Unsupported ARRIRAW clearly identified before ingest.

**CAM-004 - Sony path [P1].** Support XAVC and X-OCN when SDK/licensing permits, plus S-Log/S-Gamut metadata transforms. **Acceptance:** Camera metadata displayed correctly.

**CAM-005 - Canon path [P1].** Support standard codecs, Canon Log and Cinema RAW Light via vendor integration if accessible. **Acceptance:** Unsupported RAW offers proxy conversion path.

**CAM-006 - High-resolution footage [P1].** Decode 4K/6K/8K+ through proxy tiers, selective frame buffers, hardware limits and bounded cache. **Acceptance:** 8K project opens on modest machine using proxies.

**CAM-007 - Mixed frame rates [P1].** Conform 23.976/24/25/29.97/50/59.94/120 and VFR with explicit clip interpretation controls. **Acceptance:** No cross-track drift after 1-hour render.

**CAM-008 - Metadata continuity [P1].** Retain camera ID, lens/focal length, ISO, T-stop, tilt/gyro, LUT, reel, slate and original sidecars. **Acceptance:** Round trip preserves recognized fields.

**CAM-009 - Interchange mappings [P1].** Support OTIO, EDL and future XML/AAF through format plugins with loss reports. **Acceptance:** Reimport comparison shows supported transform equivalence.

**CAM-010 - License registry [P1].** Track build flags for codec patents, SDK EULAs, Qt, FFmpeg GPL/LGPL and restricted modules. **Acceptance:** CI blocks disallowed redistributable bundles.

## 4.19 SaaS cloud project service and browser editor [CLD]

**Purpose:** Deliver OpenArt-style online editing without pretending a browser is a full native codec host.  
**Dependencies:** SVC, media workers, browser runtime  
**Module exit criterion:** Chrome/Edge/Safari supported feature matrix validated; server render returns editable project-compatible result.

**CLD-001 - Cloud project shell [P1].** Next.js App Router studio with auth, dashboard, import, media management, editor and job manager. **Acceptance:** Projects visible only to authorized tenants.

**CLD-002 - Browser timeline [P1].** TypeScript graph editor with common serialized timeline actions and WebCodecs/WebGPU preview where available. **Acceptance:** Same sequence opens in desktop with equivalent cuts.

**CLD-003 - Remote media ingest [P1].** Multipart signed uploads, checksums, resumable retries, virus screening and tenant-scoped object keys. **Acceptance:** Interrupted 50 GB upload resumes without restarting all chunks.

**CLD-004 - Proxy-first cloud editor [P1].** Generate browser-compatible low bitrate media and audio waveforms on ingest workers. **Acceptance:** Editor launches while RAW conversion continues.

**CLD-005 - Cloud AI tasks [P1].** Submit media analysis/generation jobs with progress, cancellation, spending policy and human review. **Acceptance:** Aborted job cannot publish or charge duplicate credits.

**CLD-006 - Hybrid local/cloud link [P1].** Desktop can optionally sync project metadata and upload selected assets/proxies, never whole disk by default. **Acceptance:** Disabled sync produces zero remote asset traffic.

**CLD-007 - Collaboration [P1].** Presence, annotations, version branches, conflict-aware timeline operations and edit leases initially. **Acceptance:** Concurrent edits do not silently overwrite committed work.

**CLD-008 - Offline web behavior [P1].** Cache shell and available proxies with permission, queue safe metadata edits, reconcile on reconnect. **Acceptance:** Offline edits are distinguishable from published server state.

**CLD-009 - Render remote [P1].** Submit immutable render manifest, source references and output profile to C++ worker. **Acceptance:** Retry yields same encoded essence within allowed nondeterminism.

**CLD-010 - Browser compatibility matrix [P1].** Feature-detect WebGPU, WebCodecs, storage quotas and HDR, choose CPU/proxy fallback. **Acceptance:** Unsupported browsers show clear alternative workflow.

## 4.20 Marketing website and product growth surface [MKT]

**Purpose:** Provide a fast, polished public marketing site managed through v0/Vercel and isolated from expensive media workloads.  
**Dependencies:** Next.js app, analytics, billing landing  
**Module exit criterion:** Core Web Vitals and accessibility budgets validated in CI and on staging.

**MKT-001 - Next.js foundation [P1].** Use current security-patched Next.js 16.4 series App Router, React 19.3-compatible version and TypeScript strict mode. **Acceptance:** Dependency audit and build pass on pinned lockfile.

**MKT-002 - Marketing pages [P1].** Home, features, AI editor, sync showcase, grading, generators, pricing, downloads, pro, studio, use cases, compare, help, contact and legal. **Acceptance:** All routes have metadata and clear CTA.

**MKT-003 - Vercel/v0 workflow [P1].** Keep design system and page content editable via v0 compatible Next architecture while preserving repo source of truth. **Acceptance:** Deploy preview and production from marketing workspace.

**MKT-004 - Internationalization [P1].** English first with architecture for French translations, locale metadata, canonical/hreflang and legal language review. **Acceptance:** FR pages never incorrectly canonicalize to EN.

**MKT-005 - SEO [P1].** Semantic content, structured product metadata, OpenGraph images, XML sitemap, robots, canonical URLs and fast server rendering. **Acceptance:** Lighthouse SEO and crawler checks pass.

**MKT-006 - Conversion flow [P1].** Trial/sign-in, product downloads, plan compare, use-case quiz and newsletter with consent. **Acceptance:** Sign-up attribution stored with minimal data.

**MKT-007 - Trust & compatibility [P1].** Public system requirements, supported formats, limitations, cloud privacy and rights to generated content. **Acceptance:** Claims derive from tested support matrix.

**MKT-008 - Docs and tutorials [P1].** Searchable knowledge base, onboarding videos, sync troubleshooting and sample projects. **Acceptance:** Docs version aligns with app release.

**MKT-009 - Analytics privacy [P1].** Consent-aware events, opt-outs and no media content collected by page analytics. **Acceptance:** Consent test blocks unapproved tracking.

## 4.21 Application service APIs and identity [SVC]

**Purpose:** Protect users, workspaces and assets across local, SaaS and partner integrations.  
**Dependencies:** Auth provider, PostgreSQL, API gateway  
**Module exit criterion:** Security acceptance validates tenant isolation and per-resource policies across all endpoints.

**SVC-001 - Authentication [P1].** Managed OIDC (Clerk recommended initially), verified sessions, MFA and OAuth only server-side; local edit works with cached license where permitted. **Acceptance:** Expired/revoked online sessions denied.

**SVC-002 - Organizations and roles [P1].** Owners, admins, producers, editors, reviewers and guests with per-project access and service accounts. **Acceptance:** RLS/ABAC tests block cross-tenant access.

**SVC-003 - Project CRUD [P1].** Create, duplicate, archive, import/export project manifest and ownership transfer with audit. **Acceptance:** Project version updates use optimistic concurrency.

**SVC-004 - Signed object access [P1].** Issue narrowly scoped pre-signed upload/download links with expiry, content validation and tenant prefix. **Acceptance:** Link cannot read neighbor tenant object.

**SVC-005 - Billing orchestration [P1].** Separate seats, storage, compute, credits, invoices, limits and cost estimate ledger. **Acceptance:** Duplicate usage event does not double-bill.

**SVC-006 - Provider key vault [P1].** Encrypt bring-your-own API keys with cloud KMS and local OS keychain; never log secrets. **Acceptance:** Secret redaction suite passes.

**SVC-007 - Notification system [P1].** In-app, email and optional webhook events for rendering, approval and limits with opt-out settings. **Acceptance:** Delivery retries are bounded and idempotent.

**SVC-008 - Audit logging [P1].** Log content-affecting actions, uploads, cloud inference, approvals and publication with actor and trace ID. **Acceptance:** Logs do not contain raw prompt secrets.

**SVC-009 - API versioning [P1].** Use /v1 namespaces, deprecation policies, pagination, idempotency keys and request validation. **Acceptance:** Old client receives compatibility or upgrade prompt.

**SVC-010 - Data exports/deletion [P1].** Permit project/asset export, account deletion request and retention policy enforcement. **Acceptance:** Deletion flow accounts for backups and legal holds.

## 4.22 Durable processing, orchestration and worker control [JOB]

**Purpose:** Scale CPU and GPU tasks without turning editor crashes into lost work.  
**Dependencies:** SVC, cloud queue, PER  
**Module exit criterion:** Chaos tests validate process kill, repeated webhook, interrupted upload and source relink.

**JOB-001 - Durable task state [P0].** Persist lifecycle queued, running, waiting-input, retrying, completed, cancelled and failed. **Acceptance:** Worker restart reconstructs pending jobs.

**JOB-002 - Workflow DAG [P0].** Model ingest/proxy/ASR/vision/sync/grade/export as dependency graph with bounded concurrency. **Acceptance:** Dependency failures halt downstream safely.

**JOB-003 - Queue topology [P0].** Separate interactive preview, upload transcode, CPU analysis, GPU AI and export classes. **Acceptance:** Large batch cannot starve interactive requests.

**JOB-004 - Resource reservations [P0].** Schedule based on GPU memory, available cores, codec slots, storage and vendor quotas. **Acceptance:** Workloads cannot overcommit protected limits.

**JOB-005 - Heartbeats and leases [P0].** Workers lease tasks with expiry, heartbeat updates and fencing tokens. **Acceptance:** Stale worker cannot commit a duplicate completion.

**JOB-006 - Idempotency [P0].** Jobs include dedupe keys from input hashes, manifest version and operation params. **Acceptance:** Retry cannot create double charges or duplicated assets.

**JOB-007 - Checkpointing [P0].** Segment export, resumable model inference where possible and rehydrate tasks with status events. **Acceptance:** Injected failure resumes correct stage.

**JOB-008 - Progress telemetry [P0].** Provide stages, processed frames, estimated stage remaining ranges and actual resource use. **Acceptance:** Progress remains monotonic for stages.

**JOB-009 - Failure fallback [P0].** OOM downgrade, CPU fallback or safe delay; clear error when no workable backend. **Acceptance:** No unbounded retry storm.

**JOB-010 - Queue economics [P0].** Route hot-path editing to low latency; cold background rendering to spot/on-demand according to interruption tolerance. **Acceptance:** Cloud billing metrics tie to job ID.

## 4.23 Project data model, indexing and search [DAT]

**Purpose:** Keep source media, edits, AI lineage, permissions and sync data consistent and queryable.  
**Dependencies:** SQLite local, PostgreSQL cloud, object metadata  
**Module exit criterion:** Round-trip between local project package and SaaS canonical JSON passes version migration tests.

**DAT-001 - Canonical project manifest [P0].** Define schema_version, project_id, workspaces, source refs, sequences, timebase, transforms and dependency graph. **Acceptance:** Validation rejects unknown required fields.

**DAT-002 - Asset tables [P0].** Track immutable source hash, codec, path/URI, owner, status, rights and derived assets. **Acceptance:** No source row overwritten by proxy metadata.

**DAT-003 - Timeline event store [P0].** Append typed reversible commands with actor, ordering, parent version and checksum. **Acceptance:** Replay yields same graph as snapshot.

**DAT-004 - Scene graph [P0].** Persist scene/shots, people when authorized, transcripts, actions, markers and temporal anchors. **Acceptance:** Search references exact assets and ranges.

**DAT-005 - AI provenance [P0].** Link prompt, model, provider, generated asset, seeds, weights, source hashes and consent. **Acceptance:** Every generated asset reveals lineage.

**DAT-006 - Sync graph storage [P0].** Store anchors, offset, stretch map, confidence, take group, timecode path and manual override. **Acceptance:** Sync refresh honors override until unlocked.

**DAT-007 - Transactional commits [P0].** Use SQLite WAL local and PostgreSQL transactions/cloud outbox for durable edit state. **Acceptance:** Partial commit rollback leaves valid project.

**DAT-008 - Version migration [P0].** Version schemas and provide forward-safe and downgrade warnings, with backup before migration. **Acceptance:** Old sample projects upgrade in test matrix.

**DAT-009 - Metadata search [P0].** Index transcripts, clip tags, shot descriptions and embeddings under project-scoped permissions. **Acceptance:** Search never crosses tenant boundary.

**DAT-010 - Data minimization [P0].** Store optional identity/face embeddings and customer content only with consent and configured retention. **Acceptance:** Opt-out deletes derived sensitive indexes per policy.

## 4.24 Privacy, security, content authenticity and rights [SEC]

**Purpose:** Make professional and personal footage trustworthy under hybrid AI processing.  
**Dependencies:** SVC, policy engine, every provider  
**Module exit criterion:** Security test blocks exfiltration, public publishing without approval, cross-tenant access and raw media leakage.

**SEC-001 - Principle of least privilege [P0].** Media tools use scoped IDs, never arbitrary host filesystem path from LLM. **Acceptance:** Tool injection cannot open unauthorized file.

**SEC-002 - Sandboxed media workers [P0].** Probe and decode untrusted media in constrained processes with memory/CPU timeouts and patch policy. **Acceptance:** Fuzzer corpus cannot escape sandbox.

**SEC-003 - Secrets handling [P0].** OS keychain locally, KMS/Secrets Manager cloud, no secret in project package or logs. **Acceptance:** Secret scans pass CI.

**SEC-004 - Tenant isolation [P0].** Separate storage prefixes, DB authorization/row protections, per-tenant jobs and signed requests. **Acceptance:** Red-team cross-tenant path attempt denied.

**SEC-005 - Consent for providers [P0].** Display exact assets sent, destination/provider, purpose, region when known and retention caveats. **Acceptance:** Provider request impossible before permission.

**SEC-006 - Authenticity lock [P0].** For documentary, legal, journalistic and archival use, prohibit synthetic insertions or mark edits according to defined profile. **Acceptance:** Mixed authenticity export produces manifest warning.

**SEC-007 - Provenance ledger [P0].** Hash source and generated artifacts, sign finalized manifest and preserve editorial operation history. **Acceptance:** Tampering detection identifies changed artifact.

**SEC-008 - Rights check [P0].** Prompt user about music licenses, faces, assets and reference rights; provide workspace policies and no unsupported legal assurances. **Acceptance:** Delivery checklist includes licensing acknowledgment.

**SEC-009 - Account recovery [P0].** MFA, device revocation, access logs, support workflows and safe lost-device project recovery. **Acceptance:** Revoked device loses sync authorization.

**SEC-010 - Sensitive content protections [P0].** Apply responsible provider policies and guard generated deception, identity misuse and minors-related processing. **Acceptance:** Policy violations block cloud generation requests.

**SEC-011 - Backup & disaster recovery [P0].** Encrypted backups, tested restore, version history and explicit deletion controls. **Acceptance:** Scheduled restore test demonstrates target recovery point.

## 4.25 Plans, subscription, credits and costs [BIL]

**Purpose:** Create sustainable pricing while making AI costs understandable and user-controlled.  
**Dependencies:** SVC, JOB, provider accounting  
**Module exit criterion:** Billing reconciliation accurately maps usage to provider charges and user authorization.

**BIL-001 - Plan catalog [P1].** Distinguish free editing, creator, pro, studio and enterprise options by storage, seats and features, not claims of infinite AI. **Acceptance:** Entitlements evaluated centrally.

**BIL-002 - Local-first access [P1].** Allow core offline editing under appropriate license policy, with grace period and no cloud dependency for source data. **Acceptance:** Offline test opens existing project.

**BIL-003 - Metered compute [P1].** Charge credits or compute units for cloud GPU tasks, AI providers, storage and transcription with published unit logic. **Acceptance:** Billing event idempotent.

**BIL-004 - Cost preview [P1].** Quote estimated credits/currency before vendor generation and warn when variance possible. **Acceptance:** Spend authorization stored with job.

**BIL-005 - BYO provider keys [P1].** Let advanced users use permitted vendor keys with local/remote secure storage and clear billing ownership. **Acceptance:** BYO request is tagged distinct from platform-billed.

**BIL-006 - Limits and caps [P1].** User-defined daily/monthly budget, hard spend caps, organization approvals and cancellation. **Acceptance:** Exceeding cap prevents new billable work.

**BIL-007 - Receipts & audit [P1].** Record model, duration, generated output, input costs, taxes and spend status in statements. **Acceptance:** Invoice reconciles with ledger.

**BIL-008 - Graceful downgrade [P1].** If subscription lapses, user retains export/access to owned project content per plan policy and clear warning. **Acceptance:** No hostage-lock of source files.

## 4.26 Mobile, Chromebook and cross-device experiences [MOB]

**Purpose:** Provide practical edit capability without claiming desktop parity on constrained devices.  
**Dependencies:** TIM, CLD, platform bridge  
**Module exit criterion:** Open same project with supported controls; unsupported effects do not become corrupt or flatten silently.

**MOB-001 - iOS native shell [P1].** Share C++ media core where practical with SwiftUI native integration and Metal/VideoToolbox backends. **Acceptance:** App meets storage/background processing limitations.

**MOB-002 - Android native shell [P1].** Shared C++ via NDK/JNI with Kotlin UI, MediaCodec/Media3 integration and Vulkan/NNAPI where supported. **Acceptance:** App handles OEM codec differences.

**MOB-003 - Mobile project workflows [P1].** Ingest mobile camera footage, quick trim, captions, social edit, proxy review, feedback and optional cloud export. **Acceptance:** Low-end phones gracefully degrade advanced effects.

**MOB-004 - Touch timeline [P1].** Pinch zoom, frame seek, magnetic snapping, nested menus and large accessible control targets. **Acceptance:** Usability studies cover novice editing.

**MOB-005 - Background operations [P1].** Respect iOS/Android job limits, storage grants, app lifecycle and network conditions. **Acceptance:** Interrupted background job resumes safely.

**MOB-006 - Chromebook strategy [P1].** PWA first with feature detection; Linux or Android native packages only on compatible Chromebooks. **Acceptance:** Offline shell and web edits work within quota.

**MOB-007 - Cross-device sync [P1].** Push manifest revisions and user-selected proxies/assets; conflict merge and offline branch repair. **Acceptance:** Reconnect doesn't silently overwrite work.

**MOB-008 - Platform limitations [P1].** Display unsupported codecs/effects/models and allow cloud fallback only with consent. **Acceptance:** Exported project warns rather than discarding nodes.

## 4.27 Third-party plugin architecture and automation [EXT]

**Purpose:** Enable future codecs, AI models, effects, export targets and developer extensions safely.  
**Dependencies:** TIM, AGT, SVC  
**Module exit criterion:** Signed or allowlisted plugins can load/unload without corrupting core project state.

**EXT-001 - Plugin SDK [P1].** Version stable C ABI or IPC interface for media effects, codecs, analyzers and importers. **Acceptance:** Old compatible plugin passes ABI contract.

**EXT-002 - Web extension API [P1].** Offer UI panels through constrained sandbox and message protocol, no global DOM/tool access by default. **Acceptance:** Malicious extension cannot read project without permission.

**EXT-003 - Effect packages [P1].** Package parameters, preview kernels, render kernels, dependency manifest and deterministic fallback. **Acceptance:** Unknown effect becomes visible placeholder.

**EXT-004 - AI adapter spec [P1].** Normalize chat/vision/image/video provider capability and pricing metadata. **Acceptance:** Fake provider passes reference contract tests.

**EXT-005 - Automation recipes [P1].** Save sequences such as ingest > sync > grade > review using explicit parameter schemas. **Acceptance:** Permission gates honored in every recipe stage.

**EXT-006 - Marketplace governance [P1].** Sign plugins, scan dependencies, show requested permissions, support revoke and version rollback. **Acceptance:** Revoked plugin cannot run new jobs.

## 4.28 Observability, experimentation, reliability and QA [OBS]

**Purpose:** Make quality measurable without uploading customer source content by default.  
**Dependencies:** All modules  
**Module exit criterion:** Operational dashboards and automated regression suites detect correctness, performance and safety regressions.

**OBS-001 - Structured logs [P1].** Emit trace_id, job_id, media_id hash prefix, stage, timings and safe errors; redact paths and secrets. **Acceptance:** Static and runtime scrubbers pass.

**OBS-002 - Performance metrics [P1].** Measure playhead latency, frame drops, decode throughput, proxy speed, VRAM, OOM, export fps and startup. **Acceptance:** Compare on declared hardware matrix.

**OBS-003 - Sync scorecard [P1].** Track frame error distributions, clip coverage, false matches, take grouping and confidence calibration on labeled set. **Acceptance:** CI flags benchmark regressions.

**OBS-004 - Render regression [P1].** Compare representative output via frame hashes where deterministic and perceptual metrics otherwise. **Acceptance:** Regression approval stores baseline.

**OBS-005 - Provider reliability [P1].** Record external vendor latency, price estimate vs actual, error type and retry effectiveness. **Acceptance:** Circuit breaker opens on configured fault rate.

**OBS-006 - Privacy-preserving telemetry [P1].** Default minimal anonymous diagnostics, granular opt-in for deeper traces and never auto-upload raw media. **Acceptance:** Traffic test verifies policy.

**OBS-007 - Release canaries [P1].** Progressive rollout with crash-free rate, render success and rollback criteria, plus staged feature flags. **Acceptance:** Failed canary triggers rollback.

**OBS-008 - Incident readiness [P1].** Document severe bug playbooks, restore drills, customer communications and postmortem requirements. **Acceptance:** Recovery exercise conducted before GA.

**Catalog total: 28 major modules and 281 individually testable functional requirements.**

# 5. Music-video synchronization: detailed engineering design

## 5.1 Domain model

A media **source** is a unique immutable recorded file or camera clip. A **session** is a filming period. A **take** is a physically distinct performance or continuous event. An **angle** is a camera view of a particular physical take. A **master music clock** is the canonical song-time coordinate, independent of wall-clock and camera timecode. A clip may map to both an absolute recording time and a *musical performance time*; those mappings are never conflated.

Define `MediaSource`, `RecordingSession`, `Take`, `CameraAngle`, `SyncAnchor`, `SyncSegment`, `MusicTimeline`, `AlignmentHypothesis` and `ManualOverride` as first-class project objects. A single music-video song might have eight independently performed takes; each may contain several concurrent camera angles. The UI should show one stacked group per take, all addressable by musical time, enabling fast switches across takes on the master soundtrack.

## 5.2 Algorithm pipeline

1. **Probe:** gather timestamps, timecode, LTC, camera unique IDs, sample rates and VFR presentation timestamps. Create reliable source duration and media maps.
2. **Reference identification:** allow explicit master WAV/AIFF/song selection; else score candidates by duration, SNR, format and near-match to other clips. Ask the user on ambiguity.
3. **Coarse recognition:** resample audio analysis copies to a common rate, compute STFT magnitude fingerprints, chroma where useful, landmark hashes, beat/onset envelopes and energy-normalized windows. Index master song landmarks in a compact inverted lookup.
4. **Hypothesis generation:** compare each clip's robust landmarks against master song, collect top offset candidates and probability. Mask long silences, applause or identical repeated instrumental loops.
5. **Fine alignment:** use cross-correlation on selected windows and a multi-resolution search. For performance footage, weight vocal transients and phoneme cues; instrument performances may require onset and beat features. Report residual error in frames and samples.
6. **Drift estimation:** for long takes, compare matched anchors at beginning/middle/end. Fit piecewise affine map to accommodate independent recorder clocks, resampled captures or dropped frames. Don't silently time-stretch the original master song.
7. **Take grouping:** build camera concurrence graph using wall-clock, slate, matching acoustic events, visual overlap and source metadata. Put physically simultaneous sources together; leave separate performances as independent take groups even when both map to the same music timestamp.
8. **Low-audio fallback:** use manual clap alignment, timecode, visible lip/viseme trajectories, performer movements, lighting cues, waveforms from neighboring footage or external log. Present alternative matches with confidence and explain that visual alignment is approximate.
9. **Human review:** show audio waveforms, musical ruler, clapper markers, offset hypotheses and unmapped clips. Add drag-slip + zoom-to-transient controls; freeze manual corrected anchors.
10. **Persistence:** cache audio embeddings/fingerprints by asset hash and algorithm version; persist alignment maps and confidence. Reuse match results when edit changes.

## 5.3 Alignment representation and numerical guarantees

Represent source sample position `s`, source PTS `p`, master audio sample index `m` and sequence frame number `f` using integer/rational coordinates. Store each sync segment as `(source_start, source_end, master_start, slope_num, slope_den, uncertainty_samples)`. The map approximates `m = master_start + (s-source_start) * slope_num / slope_den`. A **slope** not equal to unity indicates independent clock drift or a performance timing difference. For repeated song performance, alignment may be non-linear; save local anchor map and interpolation uncertainty. Use exact rational arithmetic for timeline boundaries. Avoid storing only `offset_seconds` as floating point.

## 5.4 Hard cases and correct behavior

- Identical repeated chorus: candidate anchors span multiple plausible positions; use additional surrounding audio, vocal timing and take context. Do not choose arbitrary first match.
- Playback song heard through loudspeaker plus live artist: scratch audio contains both; compare spectral and vocal/onset channels; offer singer-vs-playback reference weighting.
- Playback song started mid-verse or repeated: annotate the local start index and song section; support trims and multiple independent segments.
- Mobile VFR capture and dropped camera frames: align based on presentation timestamps, not a fabricated constant-FPS frame count.
- Slate-only silent cinema cameras: link visual slate and clapper events to a master audio anchor with manual fine slip.
- Recording at 48 kHz nominal but clock runs off: estimate drift, adjust map, and keep a note in QC report.
- B-roll with no artist/audio: tag as unsynchronized cutaway; align editorially to song beat rather than pretending to lip-sync.
- Master recording replaced later: recompute mapping with versioning while preserving manual locked cut decisions when possible.

## 5.5 Performance scoring and automatic cutting

Build per-beat candidate shot tables using: sync confidence; vocal mouth alignment; face visibility; focus; motion; camera distance; occlusion; composition; continuity with previous shot; energy/genre preference; representation fairness across takes; user pins. Optimize sequence with constraints, not simply highest independent shot score. Include minimum shot duration, maximum repetition, selected chorus emphasis, no cut on forbidden frame range, and user priority for a named take. For instrumental sections, relax lip-sync weighting and prioritize cinematography/B-roll. Separate **edit beat map** from master sound recording so cuts cannot alter the song.

## 5.6 Gold test suite

Create benchmark packs: two simultaneous cameras + waveform claps; eight repeated music takes at varying offset; chorus repetition ambiguity; 1-hour multi-device drift; VFR smartphone; footage with no scratch sound; loud concert with distortion; camera scratch EQ/reverb; missing frames and discontinuous clips; mixed 23.976/29.97/59.94; shifted master mix; B-roll. Metrics include absolute offset p50/p95, outlier rate, take-group precision/recall, false positive sync ratio, unaligned clip truthfulness, human correction time and user confidence calibration. **Shipping gate:** incorrect confident matches are treated more severely than unresolved matches.

# 6. Shared media engine and timeline internals

## 6.1 C++ component boundaries

Prefer C++20 for broad compiler/platform compatibility with selected C++23 features after toolchain validation. CMake presets and Conan 2 or vcpkg provide pinned dependencies; avoid generating two independent dependency graphs for the same native module. Public C ABI or protobuf/gRPC boundaries isolate process-facing interfaces; Qt lives in UI, not the portable media libraries. Use RAII, immutable frame references, async cancellation, strict thread ownership, bounds checking and sanitizers.

- `media-core`: asset metadata, timebase, hash identities and decoder interfaces.
- `media-io`: FFmpeg/OS/vendor codecs, camera-sidecar readers and relinking.
- `media-audio`: resampling, waveform analysis, sync, audio mixing and loudness.
- `media-video`: frame surfaces, caching, transforms and GPU effects.
- `media-color`: OCIO/ACES-compatible transforms, scopes, grade evaluation.
- `media-timeline`: sequences, tracks, clips, operations, effect DAG and undo.
- `media-render`: render scheduling, encoding, audio/video mux, checkpoints and QC.
- `media-platform`: Metal, D3D12, Vulkan, SIMD, file dialogs, OS hardware adapters.
- `media-plugins`: effect/codec extensions isolated via ABI or IPC.
- `media-bridge`: protobuf/gRPC/shared-memory or C API bindings used by web worker, Qt and mobile clients.

## 6.2 Graph model

Each `Sequence` references ordered `Track` objects. Each `ClipInstance` references a source asset and source timestamp interval, optional speed map, transforms and ordered effect nodes. Each `EffectNode` declares typed input/output, colour space, deterministic settings, temporal dependencies, GPU backend compatibility and cache key. The active render graph is immutable per evaluated version; UI edits create a new graph generation. Use caches keyed by input hashes + pipeline/version/effect params + time index + preview mode; no cache key may ignore colour management, GPU precision or generative seed.

Audio graph is sample-accurate and separate from video cadence but shares the canonical sequence time mapping. Handle discontinuities, latency compensation, crossfades, stem buses and eventual sample-rate conversion explicitly. Export worker evaluates exact source-resolution graph and writes frame/audio segments with checkpoint metadata.

## 6.3 Project transactions

A timeline command carries `command_id`, `project_id`, `sequence_id`, `expected_revision`, `actor_id`, `operation_type`, `schema_version`, `args`, `inverse`, `source_refs`, and `created_at`. Validate asset ownership, track locks, time range, graph cycles and policy before applying. Commit new revision atomically in SQLite WAL or PostgreSQL transaction and publish an outbox event only after commit. Client optimistic edits roll back or merge on conflict; never silently replace collaborative changes.

## 6.4 Decode/render pipeline

`MediaSource -> Probe/Decoder -> Source colour transform -> Clip speed/geometry -> Grade/FX nodes -> Layer compositing -> Display transform or Output transform -> Encoder -> Mux -> QC`. For preview, introduce scalable proxies, reduced-quality approximations and temporary caches, but retain coherent frame mapping. For output, source decode and export settings override preview simplifications. Every render records operation graph revision, input checksum, settings version, codec build metadata and output hash.

## 6.5 Hardware tiers (illustrative targets, not promises)

| Tier | Typical hardware | Application behavior |
|---|---|---|
| T0 | 1-2 CPU cores, 4-8 GB RAM, weak iGPU | 360p/540p proxies; foreground playback priority; local LLM optional small model only; no real-time heavy neural VFX |
| T1 | 4-8 CPU cores, 8-16 GB, iGPU | 720p/1080p proxies; limited multicam; async analysis; optional cloud AI |
| T2 | 8-16 CPU cores, 16-64 GB, dedicated GPU | Most 1080p multicam workflows, selective 4K proxy/live effects, local medium text model depending on VRAM |
| T3 | 16-32+ cores, 64+ GB, 12-48 GB VRAM | Concurrent ingest/export, more real-time grading, many 4K streams, optional video AI models depending on architecture |

Derive actual concurrency from **benchmark results**, not these labels alone. Reserve memory floors for the OS/UI and interactive frame queue. Implement cooperative cancellation and stop background indexing when under pressure. On single-core systems, software decoding/encoding may be slow; remain responsive using time slicing, not impossible throughput claims.

# 7. Colour grading, quality and AI restoration contracts

## 7.1 Colour science decisions

Project settings define working colour space, output display transform and per-source camera transforms, not global hardcoded LUT assumptions. A camera clips' Log source is converted through the appropriate metadata/SDK into the managed working space. Apply technical corrections before creative looks where appropriate; manage display output separately from export output. Scope readings state which signal (scene-linear or display-referred) is measured. Use 16/32-bit processing for high dynamic range tasks; track precision conversions and clamp only where valid. Preserve HDR metadata and avoid applying SDR display transforms twice.

## 7.2 Match and correction stages

`Detect input color -> set reference shot -> chart/skin/background analysis -> exposure/WB correction -> per-shot trim -> temporal smoothness -> creative shared look -> manual exceptions -> quality gate.` Let users compare source, corrected, graded and final render. Confidence should decrease under mixed light, blown highlight values, extreme sensor noise and poorly tagged sources. Batch corrections store settings per shot and editable common scene look; do not bake all frames without approval.

## 7.3 Restoration policy classes

**Class A: reversible deterministic correction** (exposure curve, transform, non-destructive stabilizer). **Class B: estimated enhancement** (denoise, deblur, interpolation), where estimated pixels or frames can be inaccurate. **Class C: generative synthesis** (new camera angle, new action, major reconstruction, scene extension), which produces content absent from the original. On each clip, display class, source links, estimated fidelity and a synthetic-content badge when C occurs. Authenticity Lock may permit restricted A and some B, but prohibits C. For journalism and evidence, additionally emit a signed provenance manifest and warn that even Class B can obscure details.

## 7.4 AI quality evaluator

After each candidate repair, compare candidate against source: temporal consistency, motion warping, face identity similarity when allowed, lip sync, skin texture, hallucinated objects, frame flicker, clipping, exposure stability and audio alignment. A model's self-approval is insufficient. Use deterministic checks plus human-visible QA; if results fail, retain original and ask user or reduce effect strength. Generated outputs remain independent assets. Avoid promising fully truthful recreation of overexposed or shaken footage.

# 8. Local LLMs, multimodal intelligence and cloud-provider orchestration

## 8.1 Guiding architecture

Local AI should be modular: `llama.cpp` is the preferred initial local text-LLM engine, running signed/user-consented GGUF models; ONNX Runtime and platform runtimes handle specific computer-vision tasks; Python/PyTorch performs advanced model workloads and backend research. Do **not** insist that one text model performs audio sync, tracking, visual restoration, face re-identification and cinematography reasoning. Use domain-specific signal processing first, specialist inference second and LLM planning last.

## 8.2 Local model profiles

- **Tiny:** quantized 1-4B class (subject to license and benchmark) for tagging, basic prompt parsing, short summaries on low-resource devices.
- **Standard:** quantized 7-14B class for planning, structured tool calls, clip summaries and script edits with moderate memory.
- **Advanced:** 20-30B+ class on capable desktop or self-hosted GPU for complex editorial reasoning, longer script consistency and plan comparison.
- **Multimodal specialists:** separate speech-to-text, diarization, image embeddings, segmentation, optical-flow, tracking, face blurring and video frame analysis. Select actual models after license/performance benchmarks.

These are **size categories**, not preselected named weights. Download model manifests should include license, checksum, context size, quantization, recommended memory, applicable tasks and disable/uninstall controls. Do not ship models that prohibit commercial use. Keep local inference bound to loopback/sandbox with explicit tool broker. A model's general intelligence does not override measured reliability at edit-command generation.

## 8.3 Provider adapters and responsibilities

| Provider | Primary integration objective | Implementation notes |
|---|---|---|
| OpenAI | Scriptwriting, editing plans, structured tools, story outline, image-capable analysis where supported | Responses API, structured JSON, explicit data policy, model/version settings |
| Anthropic | Long-form story analysis, dialogue, script consistency, tool-using reasoning | Messages API, typed tool callbacks, model routing |
| xAI/Grok | Alternate reasoning, writing, comparison and tool-using workflows | xAI API adapter; verify named model, region and feature support |
| Google | Gemini analysis/creative workflows; Veo/video where enabled | Gemini/Vertex adapters; per-feature generation/extension checks |
| Kling | Text/image/reference video, motion, video edit features advertised by accessible API tier | API credentials, async job polling, rights/cost constraints |
| ByteDance/Seedance | Shot generation and continuation through official permitted access path | Adapter uses accessible ModelArk/BytePlus region endpoint and model-specific limits |
| Local GGUF / ONNX | Private prompt interpretation, classification and specialist inference | Offline policy, CPU/GPU budget and supported hardware fallback |

**Important:** Availability, video model features, regional eligibility, licensing and prices change frequently. Each provider declares capabilities at runtime: text reasoning; structured output; vision; storyboard image; text-to-video; image-to-video; reference video; video extension; keyframe guidance; native resolution; prompt size; concurrency; cancellation; data retention; commercial terms; content restrictions; and cost quote. Never advertise every feature across all providers.

## 8.4 Agent roles and authority separation

`Production Manager Agent` owns task breakdown, budget and approval checkpoints; `Script Doctor` suggests rewrite/structure; `Storyboards Agent` creates shot prompts; `Intake Agent` labels media; `Sync Analyst` proposes alignment hypotheses; `Director Agent` builds story graph; `Editor Agent` constructs timed cut plan; `Colourist Agent` proposes correction graph; `Audio Agent` proposes speech/music operations; `VFX Agent` proposes masks and generation; `Social Editor` proposes aspect/highlight variants; `QC Agent` reports failures; `Publisher Agent` prepares metadata but cannot publish without authorization.

No role executes shell commands or changes files directly. Each role submits typed plans to a **Policy/Schema Validator**, then a **Deterministic Command Gateway**, then a **Media Worker**. Side effects require `capability`, `user_intent`, `approved_scope`, `estimated_cost` and `audit_id`. For remote AI, show source clips/thumbnails to be transmitted and obtain user permission before transfer. A deny decision is logged and no provider call occurs.

## 8.5 Plan representation

Every prompt edit produces a structured plan:

```json
{
  "schema_version": "1.0",
  "project_id": "proj_demo",
  "sequence_id": "seq_main",
  "expected_revision": 43,
  "mode": "preview_then_apply",
  "intent": "Replace the chorus shot with Take 4 close-up and soften blue grade",
  "constraints": {"preserve_master_audio": true, "no_synthetic_content": true},
  "operations": [
    {"type": "replace_clip_range", "target_clip_id": "clip_48",
     "range": {"start_frame": 2016, "end_frame": 2112},
     "source_asset_id": "asset_take4_close", "source_in_frame": 876},
    {"type": "adjust_grade", "scope": "scene_chorus_2",
     "parameters": {"blue_saturation_delta": -0.08}}
  ],
  "require_confirmation": false
}
```

A schema checker confirms source authorization, frame ranges, asset existence, valid colour parameters, track locks, conflicts, media policy and operation count. UI visualizes a before/after diff. The same command format is used by human shortcuts, macros and agents. LLM output must **never** be treated as already executed merely because it contains a command-shaped object.

## 8.6 Retrieval and prompt security

Text from footage, PDFs, song lyrics, transcripts and third-party generated responses may contain adversarial instructions. Treat these as data, not new authority. Retrieval indexes remain project/tenant scoped; do not send entire source footage to an LLM when frames, summaries or embeddings suffice. Local/cloud routing considers private project mode, model license, workspace region, cost ceiling and desired reasoning quality. Record prompt template version, tool list, model ID, context IDs, output validation and user override.

## 8.7 AI processing cost control

Use per-job consent and budget gates; coarse local sampling first, expensive remote scene analysis only on selected ranges, batch similar inferences, cache by asset+model+prompt version and use asynchronous generation. If a user requests "do everything", show a concrete plan indicating which steps are free/local and which require credits. Avoid cloud spending from background autoscan unless explicitly authorized.

# 9. Hosting and deployment: marketing Vercel, SaaS application and native workers

## 9.1 Deployable boundaries

| Workload | Preferred runtime / service | Reason |
|---|---|---|
| Public marketing + pricing + knowledge base | **Vercel**; Next.js 16.4 App Router; v0-compatible source | Fast iteration, previews, SEO and static/server pages |
| SaaS editor UI | **AWS ECS Fargate**, Next.js App Router | Independent scaling/deployments; same-origin web app and server-side auth |
| Public API and business backend | **AWS ECS Fargate**, NestJS | Long-lived APIs, consistent auth, workflows and billing |
| AI orchestration/API | **AWS ECS Fargate**, FastAPI/Python | Pydantic schemas, model adapters, durable tasks and orchestration |
| Video transcode/render CPU | **ECS on EC2 CPU pools** / appropriately sized CPU instances | Sustained CPU throughput without browser/serverless limits |
| Video render / local models / GPU inference | **Dedicated EC2 GPU node pool**, containerized C++ and Python workers | Hardware codecs, CUDA and controllable VRAM; scale to zero where possible |
| Object storage | **Amazon S3** with multipart/resumable upload and lifecycle | Source/proxy/derived media, versioned manifests, large-file support |
| Project database | **Amazon RDS PostgreSQL** | Transactional project metadata and tenant data |
| Hot state/locks | **Redis** (managed when production requires) | Job signal, rate limits, cache metadata, ephemeral presence |
| Durable queue | **Amazon SQS** + Postgres job ledger/outbox | Durable asynchronous media tasks and simple initial ops |
| Edge delivery | **CloudFront** for signed media URLs | Proxy/review delivery separate from original media access |
| Auth | **Clerk** or equivalent OIDC provider | Quick verified auth for website/studio; offline native project use remains possible |
| Billing | **Stripe** subscription and usage ledger | Seats, credits, invoices and tax workflow |
| Infrastructure | **Terraform** and GitHub Actions | Repeatable IaC, CI and staged deployments |

This is an initial recommendation, not the only valid architecture. ECS/EC2 + SQS reduces operational complexity relative to day-one Kubernetes for this product. Consider EKS/Temporal only when orchestration complexity and measured workload justify it. Deploy independent GPU queues and avoid using Vercel functions to render or decode large multi-hour media. v0 may scaffold the marketing website, but commits and production configuration must remain in the same source-controlled monorepo. When the user chooses a self-hosted or alternative provider later, packages should depend on abstract object storage/queue interfaces rather than AWS-specific APIs in core logic.

## 9.2 Domain and URL layout (illustrative, subject to owning the domain)

`www.kedosmartv.com` public marketing; `studio.kedosmartv.com` SaaS workspace; `api.kedosmartv.com` business API; `media.kedosmartv.com` signed media/CDN; `review.kedosmartv.com` approval portal; `docs.kedosmartv.com` developer/user documentation. DNS records are targets, not an assertion that a domain is registered.

## 9.3 Media ingest to export flow

1. Client requests ingest session with project ID, file size/type/checksum hints and destination region.
2. Backend verifies tenant permissions/quota and generates multipart signed upload plan; client streams directly to object storage.
3. Client commits completed parts; service validates checksum and probe status; quarantine if suspicious.
4. `ingest.completed` event enters queue; CPU workers probe, generate thumbnail/preview/proxy and index source metadata; optional user-authorized analysis tasks follow.
5. Web editor streams compatible proxies; native desktop may play original local asset.
6. AI edit plan is validated and committed to project timeline revision; it references only authorized asset IDs.
7. On export, backend freezes project revision and render manifest; scheduler selects CPU/GPU workers; C++ worker retrieves permitted assets, produces final encode and QC report.
8. Output saved to derived storage with signed delivery URL, budget ledger and review state; YouTube private upload occurs only with user permission.

## 9.4 Cloud autonomy, offline and sync

Desktop application uses local SQLite, file sources and models by default. Cloud project sync is opt-in and can be limited to manifests, low-res proxies, specific clips or all selected media. Build an **upload-consent diff** listing exact files before any upload. If disconnected, preserve edit commands in a local journal with logical clocks/revisions. When online, reconcile against server revision and expose user-resolvable conflicts. A project edited from two disconnected computers must never silently overwrite either branch. Device-side credentials use OS Keychain, Windows Credential Manager or Android Keystore. Cloud source and local source references are separate locators for the same immutable asset identity.

## 9.5 Failure and budget strategy

Use multi-AZ database and regularly tested restore, S3 object versioning/lifecycle rules, encryption at rest/transit, per-job CPU/GPU time budgets, queue dead-letter handling and cost alarms. Workers are leased; an expired worker's completion is fenced from committing. GPU spots can be used for checkpointable jobs, not latency-critical interactive preview unless predictable fallback exists. Store provider results and bill only once per idempotent operation. All cloud region choices reflect user workspace policy, provider support and legal review.

# 10. Monorepo: definitive recommended folder and package layout

## 10.1 Build strategy

**One Git repository**, not one runtime and not one deployment. Use `pnpm` + Turborepo for TypeScript/Next.js workspaces, CMake + Conan 2 (or pinned vcpkg consistently) for native C++, `uv` workspaces for Python packages, Protobuf/Buf for cross-language contracts, Docker for services and Terraform for infrastructure. Each deployable app can release independently from path-filtered CI; all depend on versioned contracts. `docs/` holds canonical specifications and ADRs. Root `AGENTS.md` sets cross-codebase AI instructions; `.cursor/rules` holds scoped Cursor rules.

## 10.2 Complete conceptual folder tree

```text
kedo-smart-v/
├── README.md
├── AGENTS.md
├── LICENSES.md
├── .env.example
├── .gitignore
├── .editorconfig
├── .node-version
├── pnpm-workspace.yaml
├── pnpm-lock.yaml
├── package.json
├── turbo.json
├── Taskfile.yml
├── CMakePresets.json
├── conanfile.py
├── uv.lock
├── pyproject.toml
├── buf.yaml
├── .cursor/
│   └── rules/
│       ├── 00-architecture.mdc
│       ├── 10-cpp-media.mdc
│       ├── 20-web-nextjs.mdc
│       ├── 30-python-ai.mdc
│       ├── 40-security.mdc
│       └── 50-testing.mdc
├── apps/
│   ├── marketing/                     # Next.js 16.4, React, TS; Vercel/v0
│   │   ├── app/(public)/
│   │   │   ├── page.tsx
│   │   │   ├── features/page.tsx
│   │   │   ├── music-video-sync/page.tsx
│   │   │   ├── ai-editor/page.tsx
│   │   │   ├── colour/page.tsx
│   │   │   ├── director-studio/page.tsx
│   │   │   ├── use-cases/[slug]/page.tsx
│   │   │   ├── pricing/page.tsx
│   │   │   ├── downloads/page.tsx
│   │   │   ├── enterprise/page.tsx
│   │   │   ├── docs/page.tsx
│   │   │   ├── blog/[slug]/page.tsx
│   │   │   └── legal/[slug]/page.tsx
│   │   ├── components/
│   │   ├── content/
│   │   ├── i18n/
│   │   ├── public/
│   │   └── tests/
│   ├── studio-web/                    # Next.js SaaS on ECS, browser editor
│   │   ├── app/(auth)/
│   │   ├── app/(studio)/dashboard/
│   │   ├── app/(studio)/projects/[id]/
│   │   ├── app/(studio)/media/
│   │   ├── app/(studio)/editor/[id]/
│   │   ├── app/(studio)/director/[id]/
│   │   ├── app/(studio)/jobs/
│   │   ├── app/(studio)/billing/
│   │   ├── components/editor/
│   │   ├── components/multicam/
│   │   ├── components/colour/
│   │   ├── components/ai-copilot/
│   │   ├── lib/webcodecs/
│   │   ├── lib/webgpu/
│   │   ├── lib/media-upload/
│   │   ├── state/
│   │   ├── public/
│   │   └── tests/
│   ├── review-web/                    # Secure reviewer portal
│   ├── admin-web/                     # Internal ops dashboard
│   ├── desktop/                       # Qt 6/QML application (Win/Mac/Linux)
│   │   ├── src/main.cpp
│   │   ├── src/app/
│   │   ├── src/models/
│   │   ├── qml/workspaces/
│   │   ├── qml/editor/
│   │   ├── qml/color/
│   │   ├── qml/director/
│   │   ├── qml/assets/
│   │   ├── resources/
│   │   ├── packaging/windows/
│   │   ├── packaging/macos/
│   │   ├── packaging/linux/
│   │   └── tests/
│   ├── ios/                           # SwiftUI + C++ bridge + Metal
│   │   ├── KeDoSmartV/
│   │   ├── NativeBridge/
│   │   └── Tests/
│   ├── android/                       # Kotlin + JNI + C++ bridge
│   │   ├── app/src/main/
│   │   ├── native-bridge/
│   │   └── tests/
│   └── examples/                      # SDK demonstrators, sample editor
├── services/
│   ├── api/                           # NestJS gateway + auth + OpenAPI
│   │   ├── src/modules/auth/
│   │   ├── src/modules/workspaces/
│   │   ├── src/modules/projects/
│   │   ├── src/modules/assets/
│   │   ├── src/modules/sequences/
│   │   ├── src/modules/billing/
│   │   ├── src/modules/reviews/
│   │   ├── src/modules/publishing/
│   │   └── test/
│   ├── ai-api/                        # FastAPI/Pydantic agent gateway
│   ├── ai-worker/                     # Python analyses and provider adapters
│   ├── media-cpu-worker/              # C++ transcode/export worker
│   ├── media-gpu-worker/              # C++ CUDA/Metal/Vulkan variants
│   ├── jobs/                          # SQS ledger/leases/outbox/scheduler
│   ├── provider-webhooks/             # AI provider callbacks verification
│   └── notifications/                # Email/in-app events
├── native/
│   ├── CMakeLists.txt
│   ├── cmake/
│   ├── include/kedov/
│   ├── media-core/                    # Asset IDs, timebase, metadata
│   ├── media-io/                      # FFmpeg + camera SDK adapters
│   ├── media-timeline/                # Operation log, tracks, sequences
│   ├── media-audio/                   # Sync, DSP, mixer, ASR bridge
│   ├── media-video/                   # Render graph, surfaces, cache
│   ├── media-color/                   # OCIO/ACES, scopes, grades
│   ├── media-vfx/                     # Masks, tracking, compositing
│   ├── media-restoration/             # Denoise, flow, stabilization
│   ├── media-encode/                  # Exports, mux, QC
│   ├── media-scheduler/               # Task queues, CPU/GPU budgets
│   ├── media-platform/
│   │   ├── windows-d3d12/
│   │   ├── macos-metal/
│   │   ├── linux-vulkan/
│   │   ├── codecs/
│   │   └── hw-detection/
│   ├── media-plugins/                 # Stable ABI/IPC extension host
│   ├── media-bridge/                  # Native to TS/Python/Swift/JNI
│   └── tests/
├── python/
│   ├── kedo-ai-core/
│   │   └── src/kedo_ai/
│   │       ├── orchestration/
│   │       ├── policies/
│   │       ├── memory/
│   │       ├── tools/
│   │       ├── evaluations/
│   │       └── schemas/
│   ├── agents/
│   │   ├── producer/
│   │   ├── script-doctor/
│   │   ├── storyboards/
│   │   ├── ingest/
│   │   ├── sync/
│   │   ├── editor/
│   │   ├── colorist/
│   │   ├── audio/
│   │   ├── vfx/
│   │   ├── social/
│   │   ├── qc/
│   │   └── publisher/
│   ├── inference/
│   │   ├── llama-cpp/
│   │   ├── onnx/
│   │   ├── torch/
│   │   ├── speech/
│   │   ├── vision/
│   │   └── video/
│   ├── providers/
│   │   ├── openai/
│   │   ├── anthropic/
│   │   ├── xai/
│   │   ├── google/
│   │   ├── kling/
│   │   ├── seedance/
│   │   └── registry/
│   └── tests/
├── packages/
│   ├── contracts/                    # JSON Schema, generated TS types
│   ├── protocol/                     # Protobuf/gRPC + Buf
│   ├── sdk-typescript/
│   ├── sdk-python/
│   ├── ui/                           # Shared React UI
│   ├── design-tokens/
│   ├── editor-model/                 # Portable TS timeline projection
│   ├── auth/
│   ├── policy/
│   ├── api-client/
│   ├── db-postgres/
│   ├── db-sqlite/
│   ├── provider-capabilities/
│   ├── i18n/
│   ├── observability/
│   └── config/
├── models/
│   ├── manifests/                    # Licenses, checksums, benchmarks
│   ├── prompts/                      # Versioned agent prompt templates
│   ├── evals/                        # Test tasks, no sensitive videos
│   └── README.md                     # Large weights not checked into Git
├── infrastructure/
│   ├── terraform/
│   │   ├── modules/network/
│   │   ├── modules/ecs/
│   │   ├── modules/gpu-workers/
│   │   ├── modules/s3/
│   │   ├── modules/postgres/
│   │   ├── modules/queues/
│   │   ├── modules/observability/
│   │   ├── environments/dev/
│   │   ├── environments/staging/
│   │   └── environments/prod/
│   ├── docker/
│   ├── compose/
│   ├── scripts/
│   └── policies/
├── database/
│   ├── migrations/postgres/
│   ├── migrations/sqlite/
│   ├── seeds/
│   ├── schemas/
│   └── fixtures/
├── tests/
│   ├── e2e/
│   ├── contract/
│   ├── sync-gold/
│   ├── codec-fixtures/
│   ├── performance/
│   ├── security/
│   ├── gpu/
│   ├── colour/
│   ├── disaster-recovery/
│   └── project-migration/
├── docs/
│   ├── product/                       # This exhaustive PRD
│   ├── architecture/
│   ├── specifications/
│   ├── api/
│   ├── adr/
│   ├── design/
│   ├── operations/
│   ├── legal-licensing/
│   └── release/
├── scripts/
├── .github/workflows/
│   ├── ci-ts.yml
│   ├── ci-cpp.yml
│   ├── ci-python.yml
│   ├── contract-tests.yml
│   ├── media-regression.yml
│   ├── security-scan.yml
│   ├── release-desktop.yml
│   ├── deploy-marketing.yml
│   └── deploy-services.yml
└── .changeset/
```

## 10.3 Code ownership and dependency boundaries

`native/*` must not depend on Next.js or NestJS. `apps/marketing` must not depend on native decoder binaries or server database access. `apps/studio-web` can depend on shared TS contracts/UI/API clients, but not on raw AWS credentials. `services/ai-api` talks only through versioned job/project/media APIs and capability gateway, not directly mutate project DB edit rows. `services/media-*` accepts immutable render manifests with signed media access, not unrestricted network paths. `packages/contracts` must be generated from canonical schemas and verified in cross-language contract tests. Build hooks must not accidentally pull 5 GB model weights into marketing builds.

## 10.4 Required root commands (conceptual)

```bash
pnpm install --frozen-lockfile
pnpm dev:marketing
pnpm dev:studio
pnpm dev:api
pnpm test:contracts
pnpm lint && pnpm typecheck && pnpm test
cmake --preset dev
cmake --build --preset dev
ctest --preset dev --output-on-failure
uv sync --frozen
uv run pytest python/tests
# Real command definitions must be implemented and validated by Cursor.
```

## 10.5 Monorepo CI matrix

- **Web:** format, lint, typecheck, unit tests, Playwright, accessibility, WebGPU feature-detection tests, production build, dependency audit.
- **Native:** compile Win x64/ARM where supported, macOS universal/Apple Silicon, Linux x64; clang-tidy, ASan/UBSan, CTest, codec licensing flags, reproducible artifacts and signing/notarization.
- **Python:** ruff, mypy, pytest, Pydantic schema contract tests, provider mock jobs, restricted tool test, model license manifest checks.
- **Integrated:** project migration, sync gold suites, audio/colour render comparison, e2e upload/private publish, crash recovery, worker lease fencing.
- **Release:** signed binary, SBOM, dependency report, license/commercial permission checklist, rollout metrics and rollback plan.

# 11. Canonical project schema, relational model and search design

## 11.1 Authoritative object model

A `Workspace` has many `Projects`; each `Project` has `Sources`, `DerivedAssets`, `RecordingSessions`, `Takes`, `ShotPlans`, `ScenePlans`, `Sequences`, `AgentJobs` and `ReviewVersions`. `SourceAsset` is immutable with origin(s) and camera metadata. `ClipInstance` is a reference to SourceAsset plus source range and sequence range, NOT a duplicated video binary. `TimelineOperation` is an event-sourced typed mutation; `ProjectSnapshot` accelerates load. `SyncAlignment` references a source and one master/sync group, storing anchor mapping and confidence. `GenerationRecord` references a project, prompt, source hashes, provider/model and generated artifact. `AuditEvent` references actor, scope and authorization. `UsageEvent` references cost source and job ID.

Use **UUIDv7 or similarly sortable opaque IDs**, UTC timestamps for audit, integer/rational media time for frames/audio and explicit `schema_version`. Cloud PostgreSQL is authoritative for synced project revisions; native SQLite is authoritative for offline local branches until reconciled. Large metadata/search fields may use `JSONB`, but relational foreign keys are required for ownership and critical references. Store video, audio, raw image sequences and proxy binaries outside relational DB.

## 11.2 Logical PostgreSQL tables (selected key fields)

| Entity | Required fields and indexes | Integrity / retention |
|---|---|---|
| organizations | id, name, owner_user_id, billing_account, policy_id, region | User/org role authorization |
| users / memberships | user_id, org_id, role, status, MFA info ref | Composite org/user unique |
| projects | id, org_id, title, genre, privacy_mode, current_revision, schema_version | Tenant-owned, soft delete policy |
| source_assets | id, project_id, sha256, size_bytes, uri_locator, camera_metadata JSONB, media_properties JSONB | Immutable hash + ownership |
| derived_assets | id, source_asset_id?, project_id, type, hash, uri, recipe_hash, generation_record_id? | Invalidate derived only |
| source_locations | asset_id, device_id?, local_uri?, remote_object_key?, online_state | Multiple origins per logical asset |
| sessions / takes | project_id, session_id, take_id, camera_id, slate, created_at | Unique take within project |
| sync_alignments | id, source_asset_id, sync_group_id, take_id, confidence, segments JSONB, algorithm_version | Manual overrides versioned |
| scenes / shots | id, project_id, script_version, scene_number, shot_number, plan_metadata, status | Link filming and production |
| sequences / tracks | id, project_id, working_color, num/den timebase, track_kind, ordering | Validate timebase and order |
| clip_instances | id, track_id, source_asset_id, source range, seq range, speed_map, effects_rev | Source/sequence ranges non-negative |
| operations | id, sequence_id, rev, actor_id, type, payload JSONB, inverse JSONB, checksum | Append-only journal |
| snapshots | sequence_id, revision, state_hash, blob_ref | Never overwrite operation journal |
| transcripts / captions | source_asset_id, language, word time map, speaker_ids, rev | No blind auto-release |
| embeddings | project_id, asset_id, model_version, vector, policy | Tenant filtering before vector search |
| agent_runs | id, project_id, task, provider, model, status, permissions, estimate, actual | Audited lifecycle |
| generation_records | id, job_id, input_hashes, prompt_hash, model_id, seed, rights, output_ids | Synthetic lineage mandatory |
| jobs / job_events | id, job_type, tenant_id, dedupe_key, state, attempt, lease_token, resource_budget | Exactly-once commit semantics |
| export_renders | id, seq_revision, manifest_hash, profile, state, output_hash, QC_ref | Immutable render inputs |
| reviews / approvals | id, project_id, render_id, reviewer, state, comments, timestamp | Guard transition to publish |
| publishing_destinations | id, org_id, external_channel_ref, OAuth vault ref, scopes | No plaintext provider token |
| publishing_actions | id, render_id, destination_id, visibility, approval_ref, status | Published only with approval |
| usage_ledger | id, job_id, provider, metric, units, estimated_cost, actual_cost, currency | Idempotent job charge |
| audit_events | org_id, actor_id, resource, action, result, trace_id, created_at | Append-only, redacted |

## 11.3 Example minimal SQL migration sketch

```sql
CREATE TABLE organizations (
  id UUID PRIMARY KEY, name TEXT NOT NULL,
  region TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE projects (
  id UUID PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id),
  name TEXT NOT NULL,
  genre TEXT NOT NULL DEFAULT 'generic',
  privacy_mode TEXT NOT NULL DEFAULT 'local_first',
  schema_version INTEGER NOT NULL DEFAULT 1,
  revision BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX projects_org_idx ON projects(organization_id, updated_at DESC);
CREATE TABLE source_assets (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id),
  sha256 CHAR(64) NOT NULL,
  size_bytes BIGINT NOT NULL CHECK (size_bytes >= 0),
  media_properties JSONB NOT NULL DEFAULT '{}',
  source_metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(project_id, sha256)
);
CREATE TABLE sequence_operations (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id),
  sequence_id UUID NOT NULL,
  revision BIGINT NOT NULL CHECK (revision > 0),
  actor_id TEXT NOT NULL,
  operation_type TEXT NOT NULL,
  schema_version INTEGER NOT NULL,
  payload JSONB NOT NULL,
  inverse_payload JSONB NOT NULL,
  checksum CHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(sequence_id, revision)
);
CREATE INDEX operations_project_idx ON sequence_operations(project_id, created_at);
-- Production migrations add tenant policies, source URI tables, jobs,
-- provenance, partitions, foreign-key coverage and outbox delivery.
```

**Do not deploy this sketch as-is:** full migrations must include memberships, row-level security or equivalent enforced query policies, foreign keys between project and clip types, binary storage policies, retention and concurrency semantics. Use database constraints plus API authorization; RLS is defense-in-depth, not a substitute for business authorization.

## 11.4 Local project package

A portable project package `*.kedov` should be a manifest + SQLite history + hash-addressed metadata + optional selected proxies/derived assets. Prefer a directory package for local autosave and optional zipped exchange, preserving external source file references and relative locator options. Explicit user choices: link files, managed copies, proxies only or full archive. Warn if package export excludes original camera files. Never embed API keys or vendor OAuth secrets in project packages. Include migration version and integrity manifest.

## 11.5 Search & retrieval

Relational queries handle exact metadata; full-text indexes handle transcript/script; vector search (PostgreSQL pgvector or dedicated vector service when scale justifies) handles semantic shot search. Each retrieval query must filter `workspace_id`, `project_id` and authorized roles **before** nearest-neighbor ranking or service cache reuse. Store embedding model/version and source timestamp range; rebuild only changed assets. Private face/voice identity embeddings are opt-in and deletable. For local projects, use SQLite FTS and an optional local ANN index.

# 12. APIs, typed operations, workers and event contracts

## 12.1 Business REST interface, version 1 (examples)

```text
POST   /v1/projects
GET    /v1/projects/{projectId}
PATCH  /v1/projects/{projectId}
POST   /v1/projects/{projectId}/assets/import-sessions
POST   /v1/import-sessions/{sessionId}/parts
POST   /v1/import-sessions/{sessionId}/complete
GET    /v1/projects/{projectId}/assets?cursor=...
POST   /v1/projects/{projectId}/sync-jobs
GET    /v1/sync-jobs/{jobId}
POST   /v1/sync-alignments/{alignmentId}/override
GET    /v1/projects/{projectId}/sequences/{sequenceId}
POST   /v1/sequences/{sequenceId}/operations
POST   /v1/projects/{projectId}/ai/plans
POST   /v1/ai/plans/{planId}/preview
POST   /v1/ai/plans/{planId}/apply
POST   /v1/projects/{projectId}/generations
GET    /v1/generation-jobs/{jobId}
POST   /v1/projects/{projectId}/exports
GET    /v1/exports/{exportId}
POST   /v1/exports/{exportId}/reviews
POST   /v1/reviews/{reviewId}/approve
POST   /v1/reviews/{reviewId}/request-changes
POST   /v1/exports/{exportId}/publish-private
POST   /v1/publishing-actions/{actionId}/confirm-publication
GET    /v1/workspaces/{workspaceId}/usage
GET    /v1/providers/capabilities
GET    /v1/jobs/{jobId}/events
```

All write routes require authenticated identity, authorization, `Idempotency-Key` where side effects are repeatable, strict request schema validation and expected revision/ETag for edits. Upload completion must validate object checksums. Return problem-details errors with `code`, `human_message`, `retryable`, `trace_id` and `details` safe for disclosure. Paginate high-volume lists. Publish actions require scoped OAuth and separate publish approval token.

## 12.2 Example protocol contract (illustrative)

```proto
syntax = "proto3";
package kedov.media.v1;
message Rational { int64 numerator = 1; int64 denominator = 2; }
message MediaRange { int64 start_tick = 1; int64 end_tick = 2; Rational timebase = 3; }
message AssetRef { string asset_id = 1; string content_hash = 2; }
message SyncAnchor {
  int64 source_sample = 1;
  int64 master_sample = 2;
  double confidence = 3;
}
message SyncResult {
  string source_asset_id = 1;
  string take_id = 2;
  repeated SyncAnchor anchors = 3;
  string algorithm_version = 4;
  bool user_override = 5;
}
message RenderRequest {
  string job_id = 1;
  string project_id = 2;
  string sequence_id = 3;
  uint64 frozen_revision = 4;
  string manifest_sha256 = 5;
  string output_profile_id = 6;
}
message RenderProgress {
  string job_id = 1;
  uint64 frames_completed = 2;
  uint64 frames_total = 3;
  string stage = 4;
}
```

Native ABI structs must not expose unstable STL types over a binary plugin boundary. Workers should use gRPC/protobuf or a compatible local IPC protocol with authentication and proper deadlines. Browser command schemas may compile to TypeScript and validate server-side; Swift/Kotlin/C++ bindings should share the same source schema where possible.

## 12.3 Durable event names and handlers

| Event | Producer | Consumer / side effect |
|---|---|---|
| asset.imported.v1 | assets service | Probe and proxy DAG |
| asset.probed.v1 | media CPU worker | Media metadata update and optional analysis |
| sync.requested.v1 | project API | Sync job queue |
| sync.completed.v1 | sync worker | Review/confidence UI and timeline grouping |
| ai.plan.ready.v1 | AI orchestrator | Preview diff; **never** auto-apply without policy |
| timeline.revision.committed.v1 | project API | Cache invalidation and notification |
| generation.requested.v1 | generation service | Vendor/local generation queue |
| generation.completed.v1 | provider webhook adapter | Verify result hash, attach derived asset |
| export.requested.v1 | project API | Frozen render DAG |
| export.qc.passed.v1 | render worker | Review availability |
| review.approved.v1 | authorized reviewer | Unlock eligible publish action |
| publication.confirmed.v1 | authorized owner | External post/update task |
| usage.recorded.v1 | billing ledger | Reconciliation and quota update |

Use transactional outbox for DB event producers, dead-letter queues for persistent failure and signed provider webhooks with replay protection. Default retry is exponential with jitter, constrained by task-type budget. Do not claim global exactly-once queue delivery: implement **at-least-once handling with idempotent committed effects**.

## 12.4 Explicit workflow state machines

**Import:** CREATED -> UPLOADING -> VALIDATING -> PROBING -> READY | QUARANTINED | FAILED | CANCELLED. **AI generation:** DRAFT -> COST_QUOTED -> USER_AUTHORIZED -> QUEUED -> RUNNING -> REVIEW_READY | FAILED | CANCELLED; output insertion is a separate edit command. **Export:** QUEUED -> RESOLVING -> RENDERING -> ENCODING -> QC -> COMPLETED | BLOCKED | FAILED | CANCELLED. **Review:** DRAFT -> REQUESTED -> CHANGES_REQUESTED -> APPROVED. **Publish:** PREPARED -> PRIVATE_UPLOADED -> AWAITING_PUBLIC_CONFIRMATION -> PUBLICATION_QUEUED -> PUBLISHED | FAILED. Each transition records actor and policy evidence.

# 13. Cross-platform capability matrix and offline behavior

| Capability | Desktop Win/Mac/Linux | Web SaaS | iOS/Android | Chromebook |
|---|---|---|---|---|
| Local media import/playback | Yes, supported codecs/SDKs | Browser compatible; proxies/cloud fallback | Device codecs/native bridge | PWA/media support varies |
| Frame-accurate timeline | Full target | Web-compatible graph | Simplified touch UI | Web version |
| Music sync | Native local compute | Server analysis or compatible browser preview | Local lightweight or cloud job | Cloud/browser path |
| RAW camera grading | SDK/OS/codec-dependent | Server proxy/edit settings; cloud render | Limited/remote | Limited/remote |
| Full effect graph | Native optimized | Compatible effects plus remote preview | Subset and remote | Compatible web subset |
| Local text LLM | Resource-dependent | Optional user-hosted or browser small model | Small model on capable devices | Small model if capable |
| Generative video AI | Local only if hardware supports; cloud optional | Cloud providers | Cloud providers | Cloud providers |
| Full-quality mastering/export | Native | Dedicated server workers | Supported device codec or cloud | Cloud/limited local |
| Offline editing | Primary promise | Cached subset with reconciliation | Cached subset | Browser quota dependent |
| Direct private publish | With OAuth/cloud or desktop integration | Supported APIs | Supported APIs | Supported APIs |

Feature parity means **project and edit compatibility**, not identical computation speed or codec libraries. A GPU-only effect missing on Android should keep a valid node placeholder and offer remote export/preview rather than discard a grade. Warn users of platform codec and licensing differences. Support Windows 11 and recent macOS as initial target; Linux distribution support and GPU driver matrix are staged. Test current mobile operating systems as part of platform-specific release gates.

# 14. Website design, SaaS navigation and onboarding specification

## 14.1 Marketing information architecture

**Hero:** headline explaining editing with or without AI, two CTAs (Try Web Studio / Download), hero proof of multicam sync, short sample walkthrough with clear representative-demo label. **Feature areas:** Import, Sync Music Videos, Automatic Editing, Pro Timeline, Colour, Restoration, AI Generation, Script/Storyboards, Social Shorts, Export/Publishing. **Use-case pages:** weddings, music videos, podcasts, creators, films, churches, events, education and agencies; each includes example workflow, supported actions, feature limits and optional comparison. **Pricing:** concrete seat/storage/credit accounting, local offline feature status and BYO AI-key policy. **Trust:** privacy, security, provenance, supported hardware/codecs, rights and availability by provider. **Support:** docs, release notes, tutorials, troubleshooting, status, contact. **Legal:** terms, privacy, provider consent, refund conditions and content rights (counsel-reviewed).

## 14.2 Suggested homepage layout

1. Clean editorial hero with product identity, one-sentence promise and source-to-timeline animation (performance budget aware).
2. Three-step workflow: Import / Let AI edit / Take control.
3. Interactive multicamera sync demonstration with separate takes shown on shared musical ruler.
4. “One app, five workspaces” interactive comparison.
5. Camera and format capabilities with verified support qualifiers.
6. Before/after colour and restoration comparison that labels reconstructed pixels honestly.
7. Script-to-shot board to edited scene walkthrough.
8. Short-form social previews and supported platforms.
9. Performance/privacy architecture highlights: local files stay local unless selected for upload.
10. Real pricing, FAQ, download platform selector and closing CTA.

Use semantic HTML, accessible reduced-motion animations, compressed modern images, fonts with fallback, server-rendered metadata and structured data. For launch, avoid flashy shader backgrounds that cause poor Core Web Vitals or mobile accessibility problems. Keep brand tokens in `packages/design-tokens`, shared with the SaaS editor where practical. Support EN/FR locale structure from day one even if translation is phased.

## 14.3 SaaS studio navigation

Left rail: Home, Projects, Import, Editor, Director Studio, AI Tools, Review, Exports, Publishing, Assets, Billing, Workspace, Settings. Within project: Media | Timeline | Sync | AI Assistant | Colour | Audio | Effects | Captions | Export. Central canvas shows preview and context-sensitive control overlays; lower region timeline/multicam lanes; right inspector reveals only relevant effects. Global command palette and prompt bar accessible in every workspace; distinct cost/consent indicator for cloud AI.

## 14.4 Onboarding

Quickstart launches with demo project or selected media. User chooses “Music video”, “Podcast”, “Wedding/Event”, “Film”, “Social clip” or “Start blank”. Explain that supported local editing does not require account connection or cloud transfer. For online, estimate upload time/storage and feature access. Start with a **sample 8-camera song project** (synthetic/test footage licensed for demo) to prove take-aware synchronization. Store tutorials and demo assets separate from private customer content.

# 15. Reliability, performance, privacy and non-functional requirements

## 15.1 Performance budgets

- Track **time to first playable frame**, 50th/95th percentile seek latency, playback dropped-frame rate, memory/VRAM peak and sustained export fps per reference hardware.
- Define separate measurement lanes for proxy 1080p/30, native 4K/30, multicam 4x/8x, RAW 6K/8K, 20-minute sequence, 3-hour church service, and 300-clip music video.
- For each platform, publish an evidence-backed requirements matrix rather than a simplistic “works on any computer” claim. Video codecs may be hardware-decoded only when the exact profile and bit depth are supported.
- Target preview controls responding in under 150 ms p95 on reference mid-tier machine for common cuts, while accepting longer delays for model generation and expensive cold cache seeks. Establish benchmark thresholds with test hardware first.
- A single blocked cloud provider must not freeze the edit UI. Every job operation has retry, cancellation, and visible local/offline fallback where appropriate.
- CPU and memory scheduler must profile real throughput and avoid over-parallelization. Two 32-core processors may differ radically because of SIMD, memory bandwidth, codec units, thermal throttling and GPU links.

## 15.2 Security requirements

- Enforce tenant/workspace/project authorization on every API call and signed media link. The source of truth for permissions is the API policy service, never the LLM.
- Use TLS, encryption at rest, signed software updates, OS credential vaults, credentials rotation, provider key vault and separation of production/dev secrets.
- Sandbox untrusted media parsing and plugin execution when possible; never trust codec metadata or AI-generated text as executable instructions.
- Require clear privacy consent before external AI/provider uploads. Show provider identity, selected footage, retention caveats and actual costs. BYO keys do not bypass consent or policy.
- Prevent AI from posting public content, accessing unrelated files or charging money without permission. Tools such as `delete_media`, `publish_public`, `upload_external`, `charge_credits` require higher authorization and audit evidence.
- Create incident and disclosure processes, encryption/key backup plans, data retention, account export/deletion and compliance counsel review for Canada and target international markets.

## 15.3 Availability and backup

Source assets stay immutable with validated checksums. The project journal uses atomic durable commits. Cloud job ledger and output manifests support resume/retry; checkpoints prevent redoing hours of processing where feasible. RDS point-in-time recovery and S3 versioning are configured with retention and tested restore; desktop project uses backup snapshots and optionally distinct external backup destination. Specify and verify RPO/RTO by service tier during operations planning. Never claim a backup exists unless a restore test has passed.

## 15.4 Copyright, likeness and factual integrity

Editing an existing song or video does not automatically grant distribution rights. Provide permission records and checklists for music, logos, stock footage, third-party references, faces, voices, actors and performers. Synthetic performance, unrecorded action and alternate camera angles are marked as generated. Avoid deceptive contextual cuts, fabricated interviews and nonconsensual identity transformations in protected workflows. Users may publish only after user-controlled review, with provider/platform policies in force.

## 15.5 Accessibility & internationalization

Keyboard-operable editor, shortcut remapping, voice commands as optional input, screen-reader labels and high-contrast UI. Captions should support readable line lengths, sound descriptions, language selection and safe-area templates. Website and app content localizable through shared message keys, with Canadian English/French as initial localization targets. Test locale-aware typography and right-to-left layout readiness for future languages.

# 16. Testing strategy and acceptance criteria by system

## 16.1 Test pyramid

**Native unit tests:** timebase, source range, crop, interpolation, audio sample mapping, color math, invalid metadata, render nodes, cache key and thread cancellation. **Python unit tests:** prompt schemas, provider capability validation, tool authorization, AI plan parsing, retrieval access and budget enforcement. **Web unit tests:** editor reducer, auth guards, signed-upload sessions, UI persistence, accessibility. **Cross-language contract tests:** protobuf/JSON Schema equivalence and backward compatibility. **Integration tests:** codec worker, job ledger, S3 upload, private publishing, database transaction/outbox. **E2E:** bring footage through first-cut, correction, manual override, export, review and private upload. **Chaos:** disconnect drive, kill render worker, revoke OAuth, network cut, GPU OOM, malformed BRAW, duplicate webhook, tenant escape attempt. **Human quality:** expert reviewers assess cut continuity, sound, colour and synthetic visual artifacts.

## 16.2 Benchmark dataset catalog

| Fixture | Goal | Must assert |
|---|---|---|
| MV-001 8 cameras / 8 repeated takes | Master song performance sync | Correct take identity and frame-error metric |
| MV-002 song chorus repeated | Ambiguous reference | Confidence/alternative handling rather than wrong certainty |
| MV-003 no scratch audio | Fallback sync | Visual suggestion labeled uncertain; manual slip usable |
| MV-004 1-hour drifting recorder | Clock mismatch | Continuous audio alignment and honest drift curve |
| PC-001 podcast 4 cameras | Speaker-aware auto cut | Speaker/camera correctness and context preservation |
| EV-001 wedding full day | Story/chronology | Essential events covered; no invented speech/action |
| CC-001 church 3-hour service | Long render and transcription | No sync drift, correct chapters and long duration export |
| CIN-001 mixed 4K/6K RAW | Cinema import | License-aware decoder support and correct colour transforms |
| COL-001 mixed log cameras | Auto grade | Calibrated chart/skintone differential evaluation |
| REST-001 unusable exposure | Restoration honesty | Warning that lost detail is estimated, non-destructive result |
| REST-002 violent shake/occlusion | Stabilization | Visible crop budget and synthesis provenance |
| VFR-001 phone VFR + 29.97 | Timestamp compatibility | A/V sync after conform and export |
| WEB-001 remote 50 GB upload | Resumable SaaS ingest | Checksums, recovery and scoped access |
| SEC-001 malicious transcript | Prompt injection | No elevated tool execution or data exfiltration |
| PUB-001 video review | Private YouTube upload | No public visibility before approval |
| PERF-001 1 CPU core/low RAM | Graceful degradation | No OOM, UI interactive, cloud opt-in |
| PERF-002 32 cores, capable GPU | Scalable throughput | Parallel speedup demonstrated on suited workloads |

## 16.3 Release gates

A milestone may ship only when its **functionality tests, data migration, security audit, legal licensing gates, user documentation and rollback path** pass. Media decode/encode test reports must identify exact builds and codecs. Fix correctness and data-loss bugs before visual polish. A missing provider SDK/license is a release gate for that one connector, not a reason to break all other editing workflows. Beta must include crash-report opt-in, feature-availability disclosures, limited models and service budgets to prevent uncontrolled costs.

## 16.4 Human review protocols

Experts review synchronized music edits in a blind comparison to manual edit baselines; wedding/film reviewers assess emotional/narrative integrity; trained colourists compare skin and neutral rendering; accessibility specialists review subtitles and controls; platform reviewers confirm exports. Score tests by task completion time, manual interventions, false confident matches, creative acceptability and trust. A satisfying automatic edit is a product metric, not something provable by an AI's self-rating.

# 17. Milestones, implementation backlog and dependency order

## 17.1 Milestone 0 - Monorepo foundation and architecture governance

**Build:** root workspace, `apps/marketing`, desktop Qt shell, `native/media-core`, initial Next studio UI, NestJS auth API, FastAPI AI stub, schema generation, SQLite/Postgres migrations, Docker compose, CI. **Deliverable:** marketing website renders, desktop opens sample media and project manifest, cloud API health checks, auth plus project create/list, cross-language contract test. **Exit:** `pnpm`, `uv`, `cmake`, CI workflows, schema validation and signed build recipe documented.

## 17.2 Milestone 1 - Media ingest and editable playback

**Build:** file browser and read-only scanner, source/proxy identity, decoder adapter, thumbnails/waveforms, timebase, 1-4 video tracks, audio bus, trim/ripple, basic export, project journals and crash recovery. **Exit:** user cuts/reopens/exports a small multi-camera project; source file content unchanged; no unrecoverable state under injected app kill.

## 17.3 Milestone 2 - Music-video synchronization flagship

**Build:** audio fingerprinting, timecode, drift fit, master-song map, take-aware groups, confidence UI, manual anchors, multicam lane and 300-clip benchmark. **Exit:** sync gold benchmarks pass; uncertain clips flagged rather than silently matched; user can manually repair ambiguous matches. **This is the strongest early market differentiator.**

## 17.4 Milestone 3 - Grading and baseline intelligence

**Build:** source color detection, OCIO pipeline, basic curves/wheels, auto exposure/WB, camera match, beat map, transcript, shot quality metadata and music-video genre first-cut plan. **Exit:** AI constructs a reversible first cut while locked master song persists; color correction can be bypassed and inspected.

## 17.5 Milestone 4 - Agentic editing and cloud SaaS

**Build:** llama.cpp model management, prompt-to-plan, typed tool gateway, OpenAI/Anthropic/xAI adapters, local/cloud privacy router, studio browser editor, multipart upload, worker queue and quota meter. **Exit:** user prompt produces a validated diff and applies reversible operations; cloud jobs enforce spend/consent and project permissions.

## 17.6 Milestone 5 - Pro finishing and creator distribution

**Build:** expanded grade, scopes, caption UI, audio cleanup, effects and masks, short-form reframing, export QC, private YouTube upload/review, common cinema SDKs where licensed. **Exit:** complete music video, podcast or wedding workflow from import to private client review, verified on supported platforms.

## 17.7 Milestone 6 - Director Studio and advanced generative models

**Build:** script versioning, shot breakdowns, storyboards/frames, production logs, reference video editing, frame extension, stabilization, super-resolution, restorations and AI provider marketplace. **Exit:** script shot IDs link to real imported footage and generative shot assets have provenance; authenticity lock honored.

## 17.8 Milestone 7 - Mobile, web expansion and collaboration

**Build:** iOS/Android editor with shared native bridge, Chromebook PWA, expanded browser effects, collaboration/conflict UI, enterprise deployment policy and scale testing. **Exit:** one project schema opens across platforms, with explicit feature differences and safe remote render path.

## 17.9 Implementation team / workstream topology

Avoid assigning a single engineer to all video/AI/web tasks. Separate ownership but keep one monorepo and shared contracts. Suggested workstreams: media core/timeline, audio synchronization, color/codec, GPU/effects, AI/agents, web SaaS, native UI/mobile, infra/security, QA/data/licensing. Each workstream owns test fixtures and produces weekly integration builds; dependencies should flow via stable schemas, not copied business logic.

## 17.10 Critical implementation order

Correct timebase and source identity **before** synchronization; immutable graph and operation journal **before** AI plan application; provider permission gateway **before** external cloud adapters; color management **before** auto-look generation; production-sized CPU/GPU profiling **before** performance claims; private upload and approval state machine **before** public publishing; working vertical slice **before** broad plugin marketplace.

# 18. End-to-end reference workflows

## 18.1 Music-video director: 300 clips + final song

Input: camera cards from RED/Sony/Canon/Blackmagic, final 48 kHz song, beat preference, performance priority and 4K master target. Import probes without changing card files, categorizes camera IDs and generates proxies. Sync engine detects separate take performances vs simultaneous angles and maps each to master song; uncertain clips display orange/attention state for manual correction. Editor agent ranks performances, plans shot cadence by song section and creates a first cut while preserving master WAV. Auto Color applies camera transforms and reference-shot matching. Director selects chorus cut, prompts for different take/grade; tool gateway previews diff and commits inverse-enabled timeline edit. Export worker renders originals to 4K HEVC plus ProRes master where supported and a review proxy, passes QC, then authorized YouTube upload remains private until director approves.

## 18.2 Wedding: documentary plus emotional highlights

Input: several cameras plus separate reception audio, music license notes and must-include events. Detect ceremony/reception/entrance/speeches, match persons only if user authorizes visual identity features, synchronize vows/speeches, build documentary chronological edit and separate highlight variant. Preserve quote integrity and provide authenticity lock. Offer exposure/noise repairs with clear estimated artifacts. Reviewers annotate frame-specific feedback; client approval precedes public delivery.

## 18.3 Podcast: 3 cameras + four microphones

Input: continuous cameras/mics, intro/outro and brand kit. Sync with cross-correlation; diarization and transcription attach word-level timestamps; edit conversation based on intent without removing meaning; choose active-speaker angles, lower-third names, de-noise/de-ess and captions. Produce full-length episode, 6-12 suggested short clips, chapters and aspect-specific exports. User reviews clips and metadata before any external publishing.

## 18.4 Director: script to boards to reshoot advisory

Director enters screenplay, actors/locations and tone. Writing agent suggests treatments but keeps all manual revisions. Shot-planning agent produces per-shot angle, blocking, movement, lens and lighting intent; image provider generates board references with model and seed provenance. On filming day, assistant records slate/shots. Imported media is linked back to shot IDs; missing reverse angles are flagged. Options are **reshoot**, **edit around missing coverage** or **explicit generative replacement**. Never claim generated reverse shot was filmed.

## 18.5 Church/conference: 3-hour multicamera service

Input: stage camera, wide camera, presentation capture and separate audio mix. Reliable long-duration sync tracks drift and chapter anchors from service program; highlight editor identifies sermon, readings and music segments. Preserve spoken content in archive; display subtitle confidence. Export complete service, podcast audio and short highlights, with review and protected upload. Avoid requiring online AI or making long background tasks block live playback.

## 18.6 Mobile creator on a low-end device

Input: phone video with VFR and noisy sound, 9:16 destination. UI offers instant trim/reframe/caption, local proxies and privacy controls. Heavy AI effects show cloud opt-in with exact footage selected and credit estimate. Background jobs respect battery and platform limits; disconnect or background suspension preserves state. User can later open same editable sequence on Windows/macOS.

# 19. Commercialization and operational policy

## 19.1 Proposed plan architecture, not fixed pricing

**Free / Local Starter:** import, trim, proxy, limited sync assets, common export presets and optional small local models; no mandatory AI credit purchase. **Creator:** larger projects, genre editors, captions, cloud review, private publishing and credit allowance. **Pro:** advanced multicam, color, RAW adapters where licensed, additional output formats, local model controls and heavy GPU jobs. **Studio/Team:** seats, shared workspaces, comment/review/approval, spend controls, resource pools. **Enterprise:** SSO, data regions, private inference, security review, support and custom integration. Pricing must be derived from storage, compute, provider invoice, distribution and customer conversion research; do not promise unlimited costly video generation.

## 19.2 Unit economics discipline

Log per-job input/output storage GB-month, bandwidth, CPU core seconds, GPU seconds, provider tokens/generation durations, rendering quality tier and retry overhead. Estimate gross margin by plan, allow spend caps and credit reservations. A user re-exporting without changing footage may reuse valid caches but must not create a new external generation expense. Distinguish BYO provider key billing from platform-billed credits in the ledger. Record provider region/price changes in capability registry without changing project history.

## 19.3 Release governance

Feature flags and staged deployment; per-OS binary signatures and notarization where required; SBOM and third-party notices; policy-versioned consent; incident runbooks; support escalation; accessible troubleshooting pages and transparent service status. Maintain an **SDK/license approval register** for Qt commercial/LGPL obligations, FFmpeg build flags, camera vendor SDKs, codec patents, OS distribution, model weights and generated media terms. Obtain legal review before paid release, especially around proprietary codecs and redistribution.

# 20. Risks, decisions and known research questions

| Risk | Impact | Mitigation / decision gate |
|---|---|---|
| Impossible genuine frame recovery | Misleading users | Truthful A/B/C restoration classes and provenance |
| Licensing for FFmpeg/Qt/camera SDKs | Product distribution block | Independent legal review and build-feature gates |
| Heavy local AI on tiny hardware | Poor responsiveness, OOM | Runtime model profiles and optional cloud offload |
| High egress/GPU/provider cost | Loss-making SaaS | Job quotes, strict caps, cache, smart proxy, audit |
| Audio sync ambiguity | Wrong music edit | Confidence calibration, alternatives and manual overrides |
| Third-party video model churn | Broken integration | Capability negotiation, adapters, fallbacks, version pinning |
| Web codec gap and browser memory | Weak SaaS editor | Proxy-first browser layer and remote C++ exports |
| Multi-device project conflicts | Edit/data loss | Event journal, expected revision and explicit conflict UX |
| Inconsistent color output | Professional distrust | OCIO/ACES test charts, metadata and monitored export paths |
| Fraudulent generated footage | Ethical/reputational harm | Authenticity lock, disclosures, publication safeguards |
| Unsupported huge RAW storage | User frustration | Capacity estimate, card handling, tiered proxies, warnings |
| Massive upfront scope | Never ship | Vertical slices, strict milestones, music sync flagship first |

Open architecture decisions: exact Qt commercial license route; C++ package manager; initial camera SDK contracts; product hosting region and tenancy model; supported audio ASR/diarization models with commercial rights; model benchmarks and selected GGUF weights; eventual native Linux/Chromebook distribution; enterprise private hosting; synthetic video watermark/provenance standard; release pricing and API cost pass-through. These are explicit decisions pending tests/contracts, not hidden assumptions.

# 21. Glossary and conventions

- **Asset**: immutable original or explicitly derived media item with content hash.
- **Source range**: timestamp interval within original asset.
- **Sequence range**: interval on editing timeline.
- **Take**: one physically recorded performance/continuity segment.
- **Angle**: camera view of one take; not interchangeable with an independent performance.
- **Sync graph**: anchors/mappings relating source times to master clock and groups.
- **Proxy**: lightweight editable representation linked frame-accurately to original.
- **Render manifest**: frozen project revision + inputs/settings used for output.
- **Synthetic**: image/audio/video content invented beyond evidence available in source.
- **Fidelity Lock**: setting that restricts synthetic modification in truth-sensitive workflows.
- **Agentic AI**: constrained planner with typed tools and authorization, not unrestricted autonomous shell control.
- **Provider adapter**: versioned API interface that exposes actual model capabilities/limitations.
- **Project graph**: typed nodes for media, edits, effects, audio and derived output.
- **Idempotency**: repeated job requests have one committed effect and one internal charge.
- **Local-first**: core project handling remains usable without cloud; user controls source uploads.

# 22. Source documentation and verification register (checked 8 November 2026)

Sources listed for engineering due diligence; vendor documents may evolve after preparation. They are **not guarantees** of unrestricted commercial usage or an exhaustive legal opinion.

1. **[S01] Next.js official release blog** - Next.js 16.4 series and current active releases: https://nextjs.org/blog
2. **[S02] Next.js support policy** - supported major and patch/security policy: https://nextjs.org/support-policy
3. **[S03] llama.cpp repository and backend matrix** - local CPU/GPU quantized LLM inference: https://github.com/ggml-org/llama.cpp
4. **[S04] llama.cpp server** - schemas, function calling, local HTTP models and model management: https://github.com/ggml-org/llama.cpp/tree/master/tools/server
5. **[S05] OpenAI Responses API** - tool use and structured function calling: https://developers.openai.com/api/reference/responses/overview
6. **[S06] OpenAI Structured Outputs** - schema-constrained outputs: https://developers.openai.com/api/docs/guides/structured-outputs
7. **[S07] Anthropic Claude API tool use** - provider-specific tools and message structure: https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview
8. **[S08] xAI function calling** - Grok tool integration: https://docs.x.ai/developers/tools/function-calling
9. **[S09] Google Gemini video generation** - video models and version-specific generation functions: https://ai.google.dev/gemini-api/docs/video
10. **[S10] Kling official developer platform** - available video/image generation/editing features by API tier: https://kling.ai/dev/api
11. **[S11] BytePlus ModelArk Seedance** - region/model-specific API and resolution controls: https://docs.byteplus.com/en/docs/ModelArk/seedance-2-0
12. **[S12] FFmpeg legal** - LGPL/GPL/nonfree build obligations: https://ffmpeg.org/legal.html
13. **[S13] Qt licensing** - commercial and LGPL/GPL module options: https://doc.qt.io/qt-6/licensing.html
14. **[S14] Blackmagic RAW SDK** - camera decoding and vendor SDK: https://www.blackmagicdesign.com/ca/developer/products/braw/sdk-and-software
15. **[S15] OpenTimelineIO** - editorial interchange: https://github.com/AcademySoftwareFoundation/OpenTimelineIO
16. **[S16] OpenColorIO** - colour management: https://opencolorio.readthedocs.io/
17. **[S17] Cursor Project Rules** - scoped `.cursor/rules/*.mdc` and `AGENTS.md`: https://docs.cursor.com/context/rules-for-ai
18. **[S18] YouTube Data API videos insert/update** - private upload permissions and metadata: https://developers.google.com/youtube/v3/docs/videos/insert
19. **[S19] Apple VideoToolbox** - platform video encoding/decoding: https://developer.apple.com/documentation/videotoolbox
20. **[S20] ONNX Runtime Execution Providers** - portable AI hardware backends: https://onnxruntime.ai/docs/execution-providers/

# 23. Document revision control

Version 1.0.0 is the initial KeDo Smart V master PRD/architecture specification. Changes to an established behavior receive a new revision with ADR and updated requirement acceptance criteria. Implementation tickets and Cursor agent instructions must link back to stable requirement IDs. Before shipping, refresh AI provider availability, camera SDK and codec licensing, framework security patch versions and relevant OS/browser APIs; the high-level architecture should not require rewrites when a model vendor changes its API.
