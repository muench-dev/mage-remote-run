---
id: configuration
title: Configuration
sidebar_label: Configuration
---

# Configuration

This page documents where `mage-remote-run` stores configuration data and which environment variables are read by the CLI.

## Configuration Storage

The CLI stores configuration (profiles, plugin registration, and preferences) and token cache data in system-specific locations:

| OS | Configuration Path (`config.json`) | Cache Path (`token-cache.json`) |
|---|---|---|
| **macOS** | `~/.config/mage-remote-run` | `~/Library/Caches/mage-remote-run` |
| **Linux** | `~/.config/mage-remote-run` | `~/.cache/mage-remote-run` |
| **Windows** | `%APPDATA%\mage-remote-run\Config` | `%LOCALAPPDATA%\mage-remote-run\Cache` |

On macOS, the CLI also migrates legacy config automatically from the previous default location to `~/.config/mage-remote-run` when needed.

## Environment Variables

The following environment variables are processed by `mage-remote-run`:

| Variable | Used For |
|---|---|
| `DEBUG` | Enables debug output in commands and internal helpers. Any non-empty value enables debug mode. |
| `MAGE_REMOTE_RUN_DEFAULT_COUNTRY` | Sets the default country code used by `company create` address prompts. Defaults to `US` when not set. |
| `MAGE_REMOTE_RUN_MCP_TOKEN` | Sets the authentication token for `mage-remote-run mcp --transport http` when `--token` is not provided. |
| `NODE_ENV` | Internal runtime mode checks (for example, suppressing console banner output during tests and disabling spec cache in test mode). |
| `HOME` / `USERPROFILE` | Resolves `~/...` plugin paths in `plugin register` commands. |

For MCP usage details, see the [MCP command docs](./command-docs/mcp.md).
