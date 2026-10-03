# find-images-mcp-bridge

Local stdio MCP bridge between an MCP client (LM Studio Bionic, Unsloth Studio, or another MCP client) and a **[Find Images.app](https://github.com/ceveyne/find-images-releases)** MCP server. Provides next-level image search and information retrieval based on multimodal embeddings.

The bridge exposes `find_image` and `tag_image` tools. It forwards search and tag requests to the **Find Images** MCP server, downloads its previews, writes them to the specified scratchpad, and registers them for later editing or processing.

## Prerequisites

- macOS 26 or later on Apple Silicon.
- **[Find Images.app](https://github.com/ceveyne/find-images-releases)** version `0.1.56-1` or later, fully set up and verified to find images.

## Bionic Configuration

For **LM Studio Bionic**. The stdio definition requires these values:

- `command`: node
- `args`: path to the find-images-mcp-bridge's `index.js`. Example: `/Users/ceveyne/.lmstudio/extensions/plugins/ceveyne/find-images-mcp-bridge/dist/index.js`
- `FIND_IMAGES_MCP_INDEXER_TOKEN`: bearer token for the image server. Example: `b2f4b1e2-3g0w-4c8t-3b7q-6n2b5b7x1a9d`

> 💡 **Tip:** You don't need to set any of the following ENVs if you're happy with the defaults:

- `MCP_MADE_FOR`: `bionic` (default). `scratchpadFolder` is required for `find_image`/`tag_image`, and `find_image` results are presented via an HTML report + tool-chaining instructions (`open_url_in_app_browser`/`view_images`/`attach_file`).
- `CHAT_WORKING_DIRECTORIES`: absolute base directory for all Bionic scratchpads. Default `~/.lmstudio/scratchpads`. Example: `/Users/ceveyne/.lmstudio/scratchpads`
- `FIND_IMAGES_MCP_INDEXER_URL`: base URL of the image server. Default `https://127.0.0.1:9760/mcp`.
- `FIND_IMAGES_MCP_INDEXER_CA_CERT`: optional path to the image server's self-signed CA/server certificate; standard certificate validation remains active without this value. Default `~/.find-images/server/server.crt`, when that file exists. Example: `/Users/ceveyne/.find-images/server/server.crt`

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
      "FIND_IMAGES_MCP_INDEXER_CA_CERT": "/absolute/path/to/server.crt"
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

## Unsloth Configuration

For **Unsloth Studio**. Its agent obtains the session identifier via `cat .unsloth_sandbox`, which doubles as both `scratchpadFolder` and the local chat thread id. The stdio definition requires these values:

- `command`: node
- `args`: path to the find-images-mcp-bridge's `index.js`. Example: `/Users/ceveyne/.lmstudio/extensions/plugins/ceveyne/find-images-mcp-bridge/dist/index.js`
- `MCP_MADE_FOR`: `unsloth`.
- `FIND_IMAGES_MCP_INDEXER_TOKEN`: bearer token for the image server. Example: `b2f4b1e2-3g0w-4c8t-3b7q-6n2b5b7x1a9d`

> 💡 **Tip:** You don't need to set any of the following ENVs if you're happy with the defaults:

- `CHAT_WORKING_DIRECTORIES`: absolute base directory for all sandbox folders. Default `~/.unsloth/studio/sandbox`.
- `CLIENT_DB_LOCATION`: absolute path to Unsloth Studio's local chat database. Default `~/.unsloth/studio/studio.db`.
- `FIND_IMAGES_MCP_INDEXER_URL`: base URL of the image server. Default `https://127.0.0.1:9760/mcp`.
- `FIND_IMAGES_MCP_INDEXER_CA_CERT`: optional path to the image server's self-signed CA/server certificate; standard certificate validation remains active without this value. Default `~/.find-images/server/server.crt`, when that file exists. Example: `/Users/ceveyne/.find-images/server/server.crt`

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
      "FIND_IMAGES_MCP_INDEXER_CA_CERT": "/absolute/path/to/server.crt"
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

## Generic Configuration

For any other MCP client. The stdio definition requires these values:

- `command`: node
- `args`: path to the find-images-mcp-bridge's `index.js`. Example: `/Users/ceveyne/.lmstudio/extensions/plugins/ceveyne/find-images-mcp-bridge/dist/index.js`
- `MCP_MADE_FOR`: `generic`.
- `CHAT_WORKING_DIRECTORIES`: absolute base directory for all scratchpads. No default — must be set explicitly. Example: `/absolute/path/to/scratchpads`
- `FIND_IMAGES_MCP_INDEXER_URL`: base URL of the image server. Default `https://127.0.0.1:9760/mcp`.
- `FIND_IMAGES_MCP_INDEXER_TOKEN`: bearer token for the image server. Example: `b2f4b1e2-3g0w-4c8t-3b7q-6n2b5b7x1a9d`
- `FIND_IMAGES_MCP_INDEXER_CA_CERT`: optional path to the image server's self-signed CA/server certificate; standard certificate validation remains active without this value. Default `~/.find-images/server/server.crt`, when that file exists. Example: `/Users/ceveyne/.find-images/server/server.crt`

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
      "FIND_IMAGES_MCP_INDEXER_CA_CERT": "/absolute/path/to/server.crt"
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

## Development

```bash
npm install
npm run build
npm test
```

## License

MIT
