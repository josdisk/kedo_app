# ADR 0002 — LLMs emit EditPlan only

## Status

Accepted

## Context

Agentic editors are unsafe if models can touch filesystem, shell, billing, or public publish APIs directly.

## Decision

All LLM/editor agents produce schema-validated `EditPlan` operations. Execution goes through authorized project APIs with revision checks, media ownership, and cost/consent gates. Plans are never treated as already applied.

## Consequences

Slightly more glue code; strong auditability and testability.
