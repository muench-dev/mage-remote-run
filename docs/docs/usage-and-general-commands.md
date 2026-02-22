---
id: usage-and-general-commands
title: Usage and General Commands
sidebar_label: Usage and General Commands
sidebar_position: 4
---

# Usage and General Commands

## Running Commands

Use the installed binary or run the CLI via `npx`:

```bash
mage-remote-run <command> [options]
# or
npx mage-remote-run <command> [options]
```

To get help for a specific command:

```bash
mage-remote-run <command> --help
```

## Global Options

Commander provides the standard flags:

- `-h, --help`: Show help for a command
- `-V, --version`: Show version information

## Interactive Console (REPL)

See the `console` command reference for usage, globals, and options.

## MCP Server

See the `mcp` command reference for setup, options, and transport details.

## Connection Profiles

All API commands use the active connection profile. Start by creating one:

```bash
mage-remote-run connection add
```

Useful connection commands:

```bash
mage-remote-run connection list
mage-remote-run connection select
mage-remote-run connection status
mage-remote-run connection test --all
```

## Output Formats

Some commands support format switching:

```bash
mage-remote-run customer show <id> --format json
mage-remote-run order show <id-or-increment> --format xml
```

## Configuration

For configuration storage paths and environment variables, see the dedicated [Configuration](./configuration.md) page.
