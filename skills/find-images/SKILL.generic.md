---
name: find-images
description: Search and tag images through the Find Images.app server. Made for generic MCP clients.
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

`scratchpadFolder` is optional. If your client exposes a working/session folder concept, pass it as `scratchpadFolder`; otherwise omit the parameter and the server writes directly into CHAT_WORKING_DIRECTORIES.

## Attachment references

Attachments are referenced by their filename (basename) or an absolute path. This client does not support `aN` attachment handles.

## Related skills

`image-display` (installed alongside this skill, if your client supports skills) explains how to verify whether a search result image is actually visible to you and to the user on this client.
