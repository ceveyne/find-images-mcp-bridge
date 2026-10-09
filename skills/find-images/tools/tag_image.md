# `tag_image`

Manage persistent tags for indexed images through the configured image server.

Examples:

- `{ "action": "add_tag", "target": "p1", "tags": ["favorite"] }`
- `{ "action": "remove_tag", "target": ["p1", "v2", "/absolute/path/image.png"], "tags": ["favorite", "reviewed"] }`

## Parameters

- **scratchpadFolder** — Scratchpad session folder name, one level under CHAT_WORKING_DIRECTORIES. How to obtain it, and whether it is required, depends on your client — see SKILL.md's 'Chat working directory' section.
- **action** — list_tags lists all indexed tags; show_tag lists current tags; add_tag adds tags; remove_tag removes named tags; remove_all_tags clears every tag from each target.
- **target** — One or more indexed image references: vN, iN, pN, a filename in the scratchpad folder, or an absolute image path — or, on clients that support attachment handles (see SKILL.md), by its `aN` handle instead. Use an array for multiple targets.
- **tags** — Tags to add or remove. Use an array for multiple tags.
