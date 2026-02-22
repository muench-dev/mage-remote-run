---
title: mcp
sidebar_position: 9
---

# MCP Server

Expose mage-remote-run commands as tools over the Model Context Protocol (MCP).

## Usage

Start with stdio transport (default):

```bash
mage-remote-run mcp --transport stdio
```

Start with HTTP transport (SSE):

```bash
mage-remote-run mcp --transport http --host 127.0.0.1 --port 18098
```

## Authentication

Authentication is **mandatory** for the HTTP transport.

The server generates a secure random token on startup if one is not provided. The token will be printed to the console.

To specify a token manually:

```bash
mage-remote-run mcp --transport http --token secure-token-123
```

You can also set the `MAGE_REMOTE_RUN_MCP_TOKEN` environment variable.

Clients must provide the token via:
- **Query Parameter**: `?token=<token>` (Required for SSE connection)
- **Authorization Header**: `Authorization: Bearer <token>` (For POST requests)

## Options

- `--transport <type>`: `stdio` or `http` (default: `stdio`)
- `--host <host>`: HTTP host (default: `127.0.0.1`)
- `--port <port>`: HTTP port (default: `18098`)
- `--token <token>`: Authentication token (HTTP only)

## Tool naming

Tools are derived from CLI commands by replacing spaces with underscores. Examples:

- `website list` -> `website_list`
- `store view list` -> `store_view_list`

Arguments and options map to the same CLI inputs (`format`, IDs, flags, and so on).

## Notes

- The MCP server uses your local profiles. Create one with `mage-remote-run connection add` first.
- HTTP transport exposes `GET /sse` and `POST /messages`.
