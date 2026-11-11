# Backlog (next runnable slices)

1. **Milestone 1 — Media ingest & playback** *(proxy + scrub shell done)*
   - [x] Permissioned folder scan + SHA-256 identity
   - [x] ffprobe-cli probe + ingest CLI
   - [x] Proxy job state machine skeleton
   - [x] Real proxy encode via ffmpeg CLI worker (+ API complete + mapping)
   - [x] Scrubbable preview (Qt-free: native scrub + studio shell + API session)
   - [x] Qt desktop shell (LGPL-dev local; NLE QML + native bridge) — ship approval still gated
2. **Milestone 2 — Music-video synchronization**
   - [x] Sync sessions, take/angle grouping, ambiguity UI, CLI
   - [x] Drift curves / piecewise affine maps (SYN-005)
   - [x] Landmark/fingerprint index beyond NCC (SYN-002)
3. **Milestone 3 — Colour + first cut**
   - [x] Primary grade model + authenticity class gates (native + studio preview)
   - [x] Genre first-cut planner → EditPlan (TS/Python/API)
   - [x] Apply EditPlan to sequence journal (TS + C++ + Nest)
   - [x] OCIO config packaging / ACES display transforms (lite; libOCIO gated)
   - [x] Multimodal shot scoring beyond sync confidence (EDT-002)
4. **Hardening**
   - [x] Postgres RLS migration + memberships (`003_rls_memberships.sql`)
   - [x] OIDC auth mode gate (demo fallback; HS256 local)
   - [x] Cross-language EditPlan contract CI
   - [x] Nest Postgres pool + `SET LOCAL` tenant GUCs (`withTenant`)
   - [x] Projects dual-store (memory default / Postgres when URL set)
   - [x] Production demo-env identity lockdown
   - [x] Persist assets/sync/editorial/preview via same Postgres path (`005_domain_persistence.sql`)
   - [x] Production OIDC JWKS / Clerk-compatible org claims (RS256 + HS256 fallback)
5. **Milestone 4 — Agentic editing + cloud SaaS** *(starter)*
   - [x] Prompt → schema-validated EditPlan (Nest + AI gateway)
   - [x] Cloud consent / privacy gate for non-mock providers
   - [x] Studio auth transport (demo headers \| Bearer) + Agent panel
   - [ ] Live Clerk (or IdP) session wiring in studio-web
   - [ ] Multipart upload + worker queue + quota meter
   - [ ] Local llama.cpp / real cloud provider adapters (credential-gated)
6. **Later**
   - [ ] Qt desktop ship/redistribute approval + installer SBOM
   - [ ] Desktop EditPlan ↔ Nest/AI apply path
   - [ ] Live vision/ASR → shot signals
