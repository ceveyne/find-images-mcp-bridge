---
name: find-images
description: Search and tag images through the Find Images.app server. Made for LM Studio Bionic.
---

# Find Images

One subfile per tool under `tools/`. File name = tool name + `.md`. Each file contains the full tool description and all parameter descriptions. Open only the file(s) for the tool(s) you are about to call in this session.

This skill documents only the tools of the `find-images-mcp-bridge` bridge to **Find Images.app**. The separate image-pipeline plugins (`generate-image`, `process-image`, `analyse-image`, `find-image`) each ship their own skill with the same structure — if one of them is not installed, its tools simply don't appear in your tool list.

## Tools

| Tool         | File                                         | Search keywords                                                    |
| ------------ | -------------------------------------------- | ------------------------------------------------------------------ |
| `find_image` | [`tools/find_image.md`](tools/find_image.md) | search, cross-modal retrieval, metadata filter, target, similarity |
| `tag_image`  | [`tools/tag_image.md`](tools/tag_image.md)   | list_tags, show_tag, add_tag, remove_tag, remove_all_tags          |

## Usage Guide

Agent-facing guidance for forming effective tool calls — not end-user app documentation (a
separate user-docs tool covers the **Find Images.app** interface itself).

| Topic     | File                                               | Covers                                                                                              |
| --------- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Searching | [`searching/searching.md`](searching/searching.md) | query/target construction, structured filters, includeMetadata/excludeImage, goal → parameter table |
| Tagging   | [`tagging/tagging.md`](tagging/tagging.md)         | tag_image actions, tag persistence, filtering find_image by Tags:                                   |

## Chat working directory

`scratchpadFolder` is required. Before calling a tool: call `get_scratchpad_folder`, then pass its return value unchanged as `scratchpadFolder` — e.g. if `get_scratchpad_folder` returns "1a2b3c", call the tool with `scratchpadFolder="1a2b3c"`.

## Attachment references

Attachments the user added to the chat are referenced by their filename (basename) in the scratchpad folder. This client does not support `aN` attachment handles.

## Related skills

**Required reading before presenting any result:** `image-display` (installed alongside this skill) is the backbone for every image/video workflow on this client — it explains how to verify whether a search result image is actually visible to you and to the user, which is not automatic and not the same thing.
