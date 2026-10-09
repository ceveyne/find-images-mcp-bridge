# `find_image`

Find visually similar and metadata-related images. Use this tool for cross-modal retrieval over images from several sources across the local network.

## Parameters

- **scratchpadFolder** — Scratchpad session folder name, one level under CHAT_WORKING_DIRECTORIES. How to obtain it, and whether it is required, depends on your client — see SKILL.md's 'Chat working directory' section.
- **query** — Search instruction. With target, positively describe additions or changes; without target, write a complete description. Model:, LoRAs:, Tag:, Tags:, Size:, Source:, Origin:, and Timestamp: are hard AND filters.
- **target** — Reference image: vN, iN, pN, a filename in the scratchpad folder, or an absolute path — or, on clients that support attachment handles (see SKILL.md), by its `aN` handle instead. Set it for 'like this image', 'same style as p1', or changes to a shown image.
- **includeMetadata** — Add target generation metadata as a ranking signal across the full corpus, not an identical-metadata filter.
- **excludeImage** — Ignore target pixels. Use only for prompt/metadata similarity, not 'same style' or other image-guided changes.
- **retrievalLimit** — Maximum number of matching images to return.
- **scopeId** — Reserved for the upcoming Search Scope feature; currently has no effect.
