# Implementation status — KeDo Smart V

**Date:** 2026-11-10  
**Release profile focus:** Desktop Qt LGPL-dev shell + prior M4 starter

## Implemented (runnable)

| Area | Location | Tests |
|---|---|---|
| Qt6 QML NLE shell (LGPL-dev) | `apps/desktop` via `KEDOV_ENABLE_QT` | configure/build preset `desktop-qt` |
| Desktop controls wired (play, undo, tools, bins, agent, export, grade) | `NativeBridge` editor controller | manual interactive |
| NativeBridge probe + PLAY-003 scrub | `apps/desktop/src/NativeBridge.*` | links `kedov_media_io` |
| Studio web NLE chrome | `apps/studio-web` editor | manual / smoke |
| Cloud consent gate | contracts + Python + Nest/AI | cloud-consent tests |
| Prompt → EditPlan API | Nest `/ai/plans` + AI gateway | editorial + ai-api tests |
| Prior hardening / M1–M3 | existing | existing |

## Stubbed / deferred

| Area | Status |
|---|---|
| Qt ship/redistribute | LGPL-dev only; counsel Pending in THIRD_PARTY_APPROVAL |
| Desktop ↔ Nest EditPlan apply | Agent panel local stub |
| Live Clerk SDK in studio | Token getter hook ready; no Clerk package yet |
| Real openai/anthropic adapters | Consent gate only; credentials not invented |
| llama.cpp local models | Deferred |
| Worker queue / multipart upload | Deferred |

## Next

Desktop EditPlan API wire, or Qt packaging approval — see `BACKLOG.md`.
