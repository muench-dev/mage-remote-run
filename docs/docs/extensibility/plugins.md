---
title: Plugin Management
sidebar_position: 1
---

# Plugin Management

`mage-remote-run` supports plugins as standard Node.js modules. Registered plugins are loaded by the CLI and can extend commands, configuration, and runtime behavior.

## Register a Plugin

Register an installed npm package or a local path:

```bash
mage-remote-run plugin register <package-name-or-path>
```

Examples:

```bash
# Register a globally installed npm package
mage-remote-run plugin register mage-remote-run-plugin-audit

# Register a local plugin by absolute path
mage-remote-run plugin register /path/to/my-plugin
```

## Unregister a Plugin

Remove a plugin from the stored configuration:

```bash
mage-remote-run plugin unregister <package-name-or-path>
```

## List Registered Plugins

Show all plugins currently configured for the CLI:

```bash
mage-remote-run plugin list
```

## What a Plugin Can Do

- Register custom CLI commands.
- Listen to lifecycle events such as `beforeCommand` or `mcpStart`.
- Use the active connection through `createClient()`.
- Inject configuration, including [virtual commands](./virtual-commands.md).

For implementation details, continue with [Plugin Development](./plugin-development.md).
