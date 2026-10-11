---
name: image-display
description: Required reading before presenting any image/video result from generate-image, process-image, analyse-image, or find-image — the backbone for verifying whether it's actually visible to you and to the user. Made for generic MCP clients.
---

# Result display

Shared across the image-pipeline plugins (`generate-image`, `process-image`, `analyse-image`,
`find-image`). Whichever of those are installed, every tool result they return is subject to this
skill — this is required reading, not an optional nice-to-have, and it is the backbone for every
image/video workflow on this client. Read it once per session, not per tool call.

## Core principle

**This is the backbone for every image/video workflow:** agent-visible ≠ user-visible. After any
tool call that produces or returns an image/video, verify separately whether (a) you can see the
result, and (b) the user can see it. Never assume one
implies the other.

## Generic clients (snapshot, 2026-10-09 — not yet elaborated)

Behavior is unverified for generic/third-party MCP clients. Do not assume a result is visible to
the user just because it was returned successfully — check your client's own documentation or ask
the user to confirm.

_(Full guidance is planned for a later revision of this skill. See
`tool-description-skill-concept.md` → "Ausblick: Übergreifender Skill für Ergebnis-Darstellung" in
the `made-for-bionic` repo for the underlying analysis.)_
