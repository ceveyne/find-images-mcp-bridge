# find-images-mcp-bridge

Local stdio MCP bridge between **[LM Studio Bionic](https://lmstudio.ai/)** and a **[Find Images.app](https://github.com/ceveyne/find-images-releases)** MCP server. Provides next-level image search and information retrieval based on multimodal embeddings.

The bridge exposes `find_image` and `tag_image` tools to Bionic. It forwards search and tag requests to the **Find Images** MCP server, downloads its previews, writes them to the specified scratchpad, and registers them for later editing or processing.

## Prerequisites

- macOS 26 or later on Apple Silicon.
- **[Find Images.app](https://github.com/ceveyne/find-images-releases)** version `0.1.56-1` or later, fully set up and verified to find images.
- Bionic Version 1.1.4+3 or later.

## Bionic Configuration

The stdio definition requires these values:

- `command`: node
- `args`: path to the find-images-mcp-bridge's `index.js`. Example: `/Users/ceveyne/.lmstudio/extensions/plugins/ceveyne/find-images-mcp-bridge/dist/index.js`
- `CHAT_WORKING_DIRECTORIES`: absolute base directory for all Bionic scratchpads. Example: `/Users/ceveyne/.lmstudio/scratchpads`
- `FIND_IMAGES_MCP_INDEXER_URL`: base URL of the image server. Example: `https://127.0.0.1:9760/mcp`
- `FIND_IMAGES_MCP_INDEXER_TOKEN`: bearer token for the image server. Example: `b2f4b1e2-3g0w-4c8t-3b7q-6n2b5b7x1a9d`
- `FIND_IMAGES_MCP_INDEXER_CA_CERT`: optional path to the image server's self-signed CA/server certificate; standard certificate validation remains active without this value. Example: `/Users/ceveyne/.find-images/server/server.crt`

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
      "CHAT_WORKING_DIRECTORIES": "/absolute/path/to/bionic-scratchpads",
      "FIND_IMAGES_MCP_INDEXER_URL": "https://find-images-server.example.com/mcp",
      "FIND_IMAGES_MCP_INDEXER_TOKEN": "<bearer-token>",
      "FIND_IMAGES_MCP_INDEXER_CA_CERT": "/absolute/path/to/server.crt"
    }
  }
}
```

## Setup step by step

1. Download and install the **[Find Images.app](https://github.com/ceveyne/find-images-releases)**. Using the latest available version is highly recommended.
2. Run the guided Onboarding and verify you're set up according to the [Find Images.app README](https://github.com/ceveyne/find-images-releases).
3. Enter Find Images General Settings and add a bearer token to the "MCP Server Bearer Token" field. This is required to get the MCP server started.
4. `cd ~/.lmstudio/extensions/plugins/ceveyne && git clone https://github.com/ceveyne/find-images-mcp-bridge`
5. `cd ~/.lmstudio/extensions/plugins/ceveyne/find-images-mcp-bridge && npm install && npm run build`
6. Start Bionic > Settings > MCP > Add custom MCP. Configuration:

- Name: find-images
- Connection: On this computer
- Command: node
- Enter Advanced settings according to your setup, following the "Bionic Configuration" examples above.

7. Save your Settings and make sure the Status is `Connected • 2 tools ready`.
8. Ask your Bionic agent to find images.
9. Text your friends about your gorgeous\* Find Images setup.

\* May or may not be gorgeous – depending on your settings.

## Companion plugin

For LM Studio, use the [LM Studio plugin: **find-image**](https://lmstudio.ai/ceveyne/find-image).
To generate images, use the [LM Studio plugin – made for Bionic: **generate-image**](https://lmstudio.ai/ceveyne/generate-image).

## Development

```bash
npm install
npm run build
npm test
```

## License

MIT
