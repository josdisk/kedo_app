# ADR 0001 — Monorepo with independent deployables

## Status

Accepted (R0)

## Context

KeDo Smart V spans native media, SaaS UI, marketing, NestJS, and Python AI services. A single runtime is impractical; a single source of truth for contracts is required.

## Decision

One Git monorepo with path-filtered CI. Marketing deploys to Vercel; studio/API/AI to ECS (later); native libraries via CMake. Shared schemas live in `packages/contracts` and `python/kedo-ai-core`.

## Consequences

Faster contract evolution; stricter package boundary enforcement required. Marketing must not pull native/media weights.
