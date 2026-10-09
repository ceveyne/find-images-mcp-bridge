# Tagging

Guidance for the `tag_image` tool and the `Tags:` query filter. Agent-facing only — this is not
end-user app documentation (a separate user-docs tool covers the **Find Images.app** interface
itself).

## Actions

- `list_tags` — returns every tag currently known to the index.
- `show_tag` — returns the tags currently applied to `target`.
- `add_tag` — applies one or more `tags` to `target`.
- `remove_tag` — removes the named `tags` from `target`.
- `remove_all_tags` — clears every tag from `target`.

A tag cannot contain spaces. Tags persist on an indexed image until explicitly removed with
`remove_tag`/`remove_all_tags` — there is no automatic expiry.

## Filtering by tag in find_image

Once applied, tags become a hard AND filter in `find_image`'s `query` text: `Tags: illustration, 2d`.
Combine with any other structured filter or free-text description the same way — see `searching.md`.

## Typical flow

1. `tag_image` with `action: "add_tag"` to label one or more results (`target` accepts an array
   for batch tagging).
2. Later, `find_image` with `Tags: <tag>` in `query` to retrieve everything carrying that tag.
