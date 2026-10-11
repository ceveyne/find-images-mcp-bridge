# find-images-mcp-bridge

Local stdio MCP bridge between an MCP client (LM Studio Bionic, Unsloth Studio, or another MCP client) and a **[Find Images.app](https://github.com/ceveyne/find-images-releases)** MCP server. Provides next-level image search and information retrieval based on multimodal embeddings.

## What it does

The bridge exposes `find_image` and `tag_image` tools. It forwards search and tag requests to the **Find Images** MCP server, downloads its previews, writes them to the specified scratchpad, and registers them for later editing or processing.

![reality-check-workflow-example](docs/images/reality-check-workflow_03.jpeg)

![reality-check-workflow-example](docs/images/reality-check-workflow_04.jpeg)

![reality-check-workflow-example](docs/images/reality-check-workflow_05.jpeg)

## Prerequisites

- macOS 26 or later on Apple Silicon.
- **[Find Images.app](https://github.com/ceveyne/find-images-releases)** version `0.1.56-1` or later, fully set up and verified to find images.
- [Node.js](https://nodejs.org/) and `npm` installed.

## Installation

```bash
cd ~/.lmstudio/extensions/plugins/ceveyne
git clone https://github.com/ceveyne/find-images-mcp-bridge
cd find-images-mcp-bridge
npm install
npm run build
```

This produces `dist/index.js`, the entrypoint referenced by `args` in every configuration below.

## Bionic Configuration

![bionic_conntected_mcp_servers](docs/images/bionic_conntected_mcp_servers.jpeg)

For **LM Studio Bionic**. The stdio definition requires these values:

- `command`: node
- `args`: path to the find-images-mcp-bridge's `index.js`. Example: `/Users/ceveyne/.lmstudio/extensions/plugins/ceveyne/find-images-mcp-bridge/dist/index.js`
- `FIND_IMAGES_MCP_INDEXER_TOKEN`: bearer token for the image server. Example: `b2f4b1e2-3g0w-4c8t-3b7q-6n2b5b7x1a9d`

![bionic_find-images_mcp_servers](docs/images/bionic_find-images_mcp_servers.jpeg)

> 💡 **Tip:** You don't need to set any of the following ENVs if you're happy with the defaults:

- `MCP_MADE_FOR`: `bionic` (default). `scratchpadFolder` is required for `find_image`/`tag_image`, and `find_image` results are presented via an HTML report + tool-chaining instructions (`open_url_in_app_browser`/`view_images`/`attach_file`).
- `CHAT_WORKING_DIRECTORIES`: absolute base directory for all Bionic scratchpads. Default `~/.lmstudio/scratchpads`. Example: `/Users/ceveyne/.lmstudio/scratchpads`
- `FIND_IMAGES_MCP_INDEXER_URL`: base URL of the image server. Default `https://127.0.0.1:9760/mcp`.
- `FIND_IMAGES_MCP_INDEXER_CA_CERT`: optional path to the image server's self-signed CA/server certificate; standard certificate validation remains active without this value. Default `~/.find-images/server/server.crt`, when that file exists. Example: `/Users/ceveyne/.find-images/server/server.crt`

- `USE_SKILLS`: default `true`. When `true`, the `find_image`/`tag_image` tool descriptions are minimized and point at the installed skill `find-images` (see [skills/find-images](skills/find-images)) for the full parameter documentation. Set to `false` to restore the original, fully inline tool descriptions instead — no skill installation needed in that case. Install the skill in Bionic via `Skills > Install a skill > Select a folder`, pointing at this repo's `skills/find-images` folder. If the skill isn't installed yet (or the installed copy is outdated), the server copies the current version from this repo's own `skills/find-images` folder automatically — see "Skill delivery" below.

  ![bionic_skills](docs/images/bionic_skills.jpeg)

  > 💡 **Tip:** Bionic's **Settings → Skills → Use skills found in other apps** is on by default, which also surfaces everything under `~/.agents/skills` (shared with Unsloth Studio and VS Code Copilot) inside Bionic — including this plugin's own Unsloth-variant skill copy. Having both variants visible at once can confuse the agent about which one to read. Either disable that setting, or disable this specific skill entry under it, if you only intend to use Bionic.

  ![bionic_use_skills_found_in_other_apps](docs/images/bionic_use_skills_found_in_other_apps.jpeg)

```json
{
  "name": "find-images",
  "enabled": true,
  "connection": {
    "type": "stdio",
    "command": "node",
    "args": ["/absolute/path/to/find-images-mcp-bridge/dist/index.js"],
    "cwd": "/absolute/path/to/bionic-scratchpads",
    "env": {
      "MCP_MADE_FOR": "bionic",
      "CHAT_WORKING_DIRECTORIES": "/absolute/path/to/bionic-scratchpads",
      "FIND_IMAGES_MCP_INDEXER_URL": "https://find-images-server.example.com/mcp",
      "FIND_IMAGES_MCP_INDEXER_TOKEN": "<bearer-token>",
      "FIND_IMAGES_MCP_INDEXER_CA_CERT": "/absolute/path/to/server.crt",
      "USE_SKILLS": "true"
    }
  }
}
```

### Env vars at a glance

| Env var                           | Default                                         | Required |
| --------------------------------- | ----------------------------------------------- | -------- |
| `MCP_MADE_FOR`                    | `bionic`                                        | No       |
| `CHAT_WORKING_DIRECTORIES`        | `~/.lmstudio/scratchpads`                       | No       |
| `FIND_IMAGES_MCP_INDEXER_URL`     | `https://127.0.0.1:9760/mcp`                    | No       |
| `FIND_IMAGES_MCP_INDEXER_TOKEN`   | –                                               | Yes      |
| `FIND_IMAGES_MCP_INDEXER_CA_CERT` | `~/.find-images/server/server.crt` (if present) | No       |
| `USE_SKILLS`                      | `true`                                          | No       |

## Setup for LM Studio Bionic step by step

1. Download and install the **[Find Images.app](https://github.com/ceveyne/find-images-releases)**. Using the latest available version is highly recommended.
2. Run the guided Onboarding and verify you're set up according to the [Find Images.app README](https://github.com/ceveyne/find-images-releases).
3. Enter Find Images General Settings and add a bearer token to the "MCP Server Bearer Token" field. This is required to get the MCP server started.
4. `cd ~/.lmstudio/extensions/plugins/ceveyne && git clone https://github.com/ceveyne/find-images-mcp-bridge`
5. `cd ~/.lmstudio/extensions/plugins/ceveyne/find-images-mcp-bridge && npm install && npm run build`
6. Add a custom MCP server in your client, using `node` as the command and the configuration for your client from the chapters above.
7. Verify the connection reports `2 tools ready`.
8. Ask your agent to find images.
9. Text your friends about your gorgeous\* Find Images setup.

\* May or may not be gorgeous – depending on your settings.

## Companion plugin

For LM Studio, use the [LM Studio plugin: **find-image**](https://lmstudio.ai/ceveyne/find-image).
To generate images, use the [LM Studio plugin – made for Bionic: **generate-image**](https://lmstudio.ai/ceveyne/generate-image).
To analyse images, use the [LM Studio plugin – made for Bionic: **analyse-image**](https://lmstudio.ai/ceveyne/analyse-image).
For precise, mask-based editing tasks, use the [LM Studio plugin – made for Bionic: **process-image**](https://lmstudio.ai/ceveyne/process-image).

## Unsloth Configuration

![unsloth_mcp](docs/images/unsloth_mcp.jpeg)

![unsloth_manage_mcp_servers](docs/images/unsloth_manage_mcp_servers.jpeg)

For **Unsloth Studio**. Its agent obtains the session identifier via `cat .unsloth_sandbox`, which doubles as both `scratchpadFolder` and the local chat thread id. The stdio definition requires these values:

- `command`: node
- `args`: path to the find-images-mcp-bridge's `index.js`. Example: `/Users/ceveyne/.lmstudio/extensions/plugins/ceveyne/find-images-mcp-bridge/dist/index.js`
- `MCP_MADE_FOR`: `unsloth`.
- `FIND_IMAGES_MCP_INDEXER_TOKEN`: bearer token for the image server. Example: `b2f4b1e2-3g0w-4c8t-3b7q-6n2b5b7x1a9d`

![unsloth_find-images_mcp_servers](docs/images/unsloth_find-images_mcp_servers.jpeg)

> 💡 **Tip:** You don't need to set any of the following ENVs if you're happy with the defaults:

- `CHAT_WORKING_DIRECTORIES`: absolute base directory for all sandbox folders. Default `~/.unsloth/studio/sandbox`.
- `CLIENT_DB_LOCATION`: absolute path to Unsloth Studio's local chat database. Default `~/.unsloth/studio/studio.db`.
- `FIND_IMAGES_MCP_INDEXER_URL`: base URL of the image server. Default `https://127.0.0.1:9760/mcp`.
- `FIND_IMAGES_MCP_INDEXER_CA_CERT`: optional path to the image server's self-signed CA/server certificate; standard certificate validation remains active without this value. Default `~/.find-images/server/server.crt`, when that file exists. Example: `/Users/ceveyne/.find-images/server/server.crt`

- `USE_SKILLS`: default `true`. When `true`, the `find_image`/`tag_image` tool descriptions are minimized and point at the installed skill `find-images` for the full parameter documentation. Unsloth Studio can't import a skill from a folder — it only creates/edits/deletes skills in its own UI, saved under `~/.agents/skills` — so the skill must be copied there first:

  ```bash
  bash skills/find-images/install/install_unsloth_skills.sh
  ```

  Windows: `skills/find-images/install/install_unsloth_skills.ps1` (unverified on Windows).

  Installs `~/.agents/skills/find-images/SKILL.md` (the Unsloth variant) plus its `tools/` folder. The skill is usable immediately, no Unsloth restart needed. Re-run after updating this repo. Set `USE_SKILLS=false` instead if you'd rather skip the skill install and keep the original, fully inline tool descriptions.

  ![unsloth_skills](docs/images/unsloth_skills.jpeg)

  ![unsloth_manage_skills](docs/images/unsloth_manage_skills.jpeg)

```json
{
  "name": "find-images",
  "enabled": true,
  "connection": {
    "type": "stdio",
    "command": "node",
    "args": ["/absolute/path/to/find-images-mcp-bridge/dist/index.js"],
    "env": {
      "MCP_MADE_FOR": "unsloth",
      "CHAT_WORKING_DIRECTORIES": "/absolute/path/to/.unsloth/studio/sandbox",
      "CLIENT_DB_LOCATION": "/absolute/path/to/.unsloth/studio/studio.db",
      "FIND_IMAGES_MCP_INDEXER_URL": "https://find-images-server.example.com/mcp",
      "FIND_IMAGES_MCP_INDEXER_TOKEN": "<bearer-token>",
      "FIND_IMAGES_MCP_INDEXER_CA_CERT": "/absolute/path/to/server.crt",
      "USE_SKILLS": "true"
    }
  }
}
```

### Env vars at a glance

| Env var                           | Default                                         | Required |
| --------------------------------- | ----------------------------------------------- | -------- |
| `MCP_MADE_FOR`                    | –                                               | Yes      |
| `CHAT_WORKING_DIRECTORIES`        | `~/.unsloth/studio/sandbox`                     | No       |
| `CLIENT_DB_LOCATION`              | `~/.unsloth/studio/studio.db`                   | No       |
| `FIND_IMAGES_MCP_INDEXER_URL`     | `https://127.0.0.1:9760/mcp`                    | No       |
| `FIND_IMAGES_MCP_INDEXER_TOKEN`   | –                                               | Yes      |
| `FIND_IMAGES_MCP_INDEXER_CA_CERT` | `~/.find-images/server/server.crt` (if present) | No       |
| `USE_SKILLS`                      | `true`                                          | No       |

## Generic Configuration

For any other MCP client. The stdio definition requires these values:

- `command`: node
- `args`: path to the find-images-mcp-bridge's `index.js`. Example: `/Users/ceveyne/.lmstudio/extensions/plugins/ceveyne/find-images-mcp-bridge/dist/index.js`
- `MCP_MADE_FOR`: `generic`.
- `CHAT_WORKING_DIRECTORIES`: absolute base directory for all scratchpads. No default — must be set explicitly. Example: `/absolute/path/to/scratchpads`
- `FIND_IMAGES_MCP_INDEXER_URL`: base URL of the image server. Default `https://127.0.0.1:9760/mcp`.
- `FIND_IMAGES_MCP_INDEXER_TOKEN`: bearer token for the image server. Example: `b2f4b1e2-3g0w-4c8t-3b7q-6n2b5b7x1a9d`
- `FIND_IMAGES_MCP_INDEXER_CA_CERT`: optional path to the image server's self-signed CA/server certificate; standard certificate validation remains active without this value. Default `~/.find-images/server/server.crt`, when that file exists. Example: `/Users/ceveyne/.find-images/server/server.crt`

- `USE_SKILLS`: default `false`. It's unverified whether a given generic MCP client supports skills at all, or — if it does — whether it reads them from `~/.agents/skills` (the path used by both Unsloth Studio and VS Code Copilot, but not a confirmed universal convention). Only set this to `true` if that's confirmed for your client, after installing the skill:

  ```bash
  bash skills/find-images/install/install_generic_skills.sh
  ```

  Windows: `skills/find-images/install/install_generic_skills.ps1` (unverified on Windows).

  Installs `~/.agents/skills/find-images/SKILL.md` (the generic variant) plus its `tools/` folder.

```json
{
  "name": "find-images",
  "enabled": true,
  "connection": {
    "type": "stdio",
    "command": "node",
    "args": ["/absolute/path/to/find-images-mcp-bridge/dist/index.js"],
    "env": {
      "MCP_MADE_FOR": "generic",
      "CHAT_WORKING_DIRECTORIES": "/absolute/path/to/scratchpads",
      "FIND_IMAGES_MCP_INDEXER_URL": "https://find-images-server.example.com/mcp",
      "FIND_IMAGES_MCP_INDEXER_TOKEN": "<bearer-token>",
      "FIND_IMAGES_MCP_INDEXER_CA_CERT": "/absolute/path/to/server.crt",
      "USE_SKILLS": "false"
    }
  }
}
```

### Env vars at a glance

| Env var                           | Default                                         | Required |
| --------------------------------- | ----------------------------------------------- | -------- |
| `MCP_MADE_FOR`                    | –                                               | Yes      |
| `CHAT_WORKING_DIRECTORIES`        | –                                               | Yes      |
| `FIND_IMAGES_MCP_INDEXER_URL`     | `https://127.0.0.1:9760/mcp`                    | No       |
| `FIND_IMAGES_MCP_INDEXER_TOKEN`   | –                                               | Yes      |
| `FIND_IMAGES_MCP_INDEXER_CA_CERT` | `~/.find-images/server/server.crt` (if present) | No       |
| `USE_SKILLS`                      | `false`                                         | No       |

## Skill delivery

Unlike `generate-image`/`process-image`/`analyse-image` (distributed via the LM Studio Hub's file-count-limited artifact), this repo is installed via plain `git clone`/`git pull` (see "Installation" above) — the canonical skill content under [skills/find-images](skills/find-images) is therefore always already present on disk, no Hub quota applies, and nothing needs to be fetched over the network.

Instead, the MCP server copies the skill's files directly from that local folder the first time it detects (via `USE_SKILLS`) that the client-installed copy (`~/.lmstudio/skills/find-images` for Bionic, `~/.agents/skills/find-images` for Unsloth/generic) is missing or outdated — the exact same copy the `install_*_skills.sh`/`.ps1` scripts under `skills/find-images/install/` perform manually. The shared `image-display` skill (synced in locally from `made-for-bionic-core`, see `scripts/sync-shared-skills.mjs`) is kept current the same way. This runs automatically on every MCP session start — no manual re-install needed after a `git pull`. If the local canonical copy is somehow missing, the server falls back to a one-time note on the first tool result instead, naming the matching install script.

## Development

```bash
npm install
npm run build
npm test
```

## License

MIT
