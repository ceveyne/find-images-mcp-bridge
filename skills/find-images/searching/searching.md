# Searching

Guidance for constructing effective `find_image` calls. Agent-facing only — this is not end-user
app documentation (a separate user-docs tool covers the **Find Images.app** interface itself).

## Query construction

A search combines up to two independent signals:

- **Free-text description** (`query`) — with `target` set, describe the desired change positively
  (e.g. "person on a beach, same pose"); without `target`, write a complete description of what to find.
- **Reference image** (`target`) — ranks the corpus by visual similarity.

`query` can also carry **structured hard filters** inline as text: `Model:`, `LoRAs:`, `Size:`,
`Source:`, `Origin:`, `Tags:`, and `Timestamp:`. These are AND filters — they exclude
non-matching candidates before any ranking happens, e.g.
`Model: flux_2 Tags: illustration, 2d sunset over mountains`.

### `query` and `target` are strictly complementary — never redundant

When `target` is set, `query` must describe only what should _differ_ from the reference image.
Never restate what the reference image already shows just to avoid leaving `query` empty — that
double-counts the reference's own content as a text signal and dilutes its visual weight, which is
one of the most common mistakes when forming these calls. If nothing should differ, `query` is the
empty string `""`.

- Attach a 2D illustration, want similar 2D illustrations → `query: ""`.
- Attach a 2D illustration, want the same character as a photograph → `query: "same character as a photograph"`.

### Describe the result positively — never describe what to exclude

Negative or restrictive phrasing ("but", "only", "exclusively", "not") works poorly — it is weighed
as an ordinary descriptive token, not as a true exclusion operator, and routinely fails to exclude
what it names. Always describe exactly what the end result should look like; never phrase it as an
exception to or exclusion from the reference image.

- Bad: `"same person but not a photo"`, `"only illustrations, not photos"`.
- Good: `"same person, 2D illustration style"`.

## includeMetadata / excludeImage

Two independent toggles change how a `target` reference image is used:

| Parameter               | Effect                                                                                                                                                                |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `includeMetadata: true` | Adds the reference image's generation metadata (prompt, model, LoRAs, ...) as an additional ranking signal across the full corpus — not an identical-metadata filter. |
| `excludeImage: true`    | Ignores the reference image's pixels entirely — ranks by prompt/metadata similarity only. Use only when visual similarity is explicitly unwanted.                     |

## Choosing parameters for a goal

| Goal                                               | Recommended parameters                                                          | Why                                                                                                         |
| -------------------------------------------------- | ------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| "Find visually similar images"                     | `target` only, `query: ""`                                                      | Ranks the full corpus by visual similarity; an empty `query` keeps the reference's visual weight undiluted. |
| "Same style, different subject or scene"           | `target` + `query`                                                              | Reference anchors the visual style; `query` positively describes what should change.                        |
| "More from this creative direction"                | `target` + `includeMetadata: true`                                              | Pixels and generation metadata jointly rank the corpus by visual and generation-context similarity.         |
| "Reference style plus a specific new concept"      | `target` + `query` + `includeMetadata: true`                                    | Combines visual reference, requested change, and metadata signal.                                           |
| "Thematic search, no reference image"              | `query` only                                                                    | A complete descriptive query ranks the full collection.                                                     |
| "Require specific generation metadata"             | `query` with `Model:`/`LoRAs:`/`Size:`/`Source:`/`Origin:`/`Timestamp:`/`Tags:` | Hard AND filters restrict candidates before ranking.                                                        |
| "Prompt/metadata similarity, no visual similarity" | `target` + `includeMetadata: true` + `excludeImage: true`                       | Only the reference's metadata feeds the ranking; its pixels are ignored.                                    |

Use one, two, or all of `query`/`target`/`includeMetadata`/`excludeImage` together, depending on
the goal — none of them are mutually exclusive.
