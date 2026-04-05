---
title: Plugin Development
sidebar_position: 2
---

# Plugin Development

A plugin is an ESM module that exports a default async function. The CLI calls this function during startup and passes a runtime context with the tools needed to extend behavior.

## Create a Plugin Package

Start with a small Node.js package:

```bash
mkdir my-plugin
cd my-plugin
npm init -y
```

Set `"type": "module"` in `package.json`, then create `index.js`.

## Minimal Plugin Example

```javascript
import chalk from 'chalk';

/**
 * @param {Object} context
 * @param {import('commander').Command} context.program
 * @param {Object} context.config
 * @param {Function} context.saveConfig
 * @param {Object|null} context.profile
 * @param {import('events').EventEmitter} context.eventBus
 * @param {Object} context.events
 */
export default async function plugin(context) {
  const { program, eventBus, events } = context;

  program
    .command('hello')
    .description('Say hello from a plugin')
    .option('-n, --name <name>', 'Name to greet', 'World')
    .action((options) => {
      console.log(chalk.green(`Hello ${options.name}!`));
    });

  eventBus.on(events.BEFORE_COMMAND, (data) => {
    const { thisCommand, actionCommand, profile } = data;
    void thisCommand;
    void actionCommand;
    void profile;
  });
}
```

## Use the Active API Client

Plugins can call Magento or Adobe Commerce APIs through `createClient()`.

```javascript
/**
 * @param {Object} context
 * @param {Function} context.createClient
 */
export default async function plugin(context) {
  const { program, createClient } = context;

  program
    .command('my-custom-endpoint')
    .description('Call a custom endpoint')
    .action(async () => {
      const client = await createClient();
      const data = await client.get('V1/custom-endpoint');
      console.log(data);
    });
}
```

## Restrict a Plugin to Connection Types

If a plugin only works for specific profile types, guard registration at runtime:

```javascript
const SUPPORTED_TYPES = new Set([
  'ac-cloud-paas',
  'magento-os',
  'mage-os',
  'ac-on-prem',
]);

export default async function plugin(context) {
  const { profile } = context;

  if (!profile || !SUPPORTED_TYPES.has(profile.type)) {
    return;
  }

  // Register commands here
}
```

Available connection types:

- `magento-os`
- `mage-os`
- `ac-on-prem`
- `ac-cloud-paas`
- `ac-saas`

## Available Events

### `events.INIT` (`init`)

Triggered after plugins are loaded and before commands are fully processed.

- Payload: the app context (`program`, `config`, `profile`, `eventBus`, `events`).

### `events.BEFORE_COMMAND` (`beforeCommand`)

Triggered right before a command action runs.

- Payload: `thisCommand`, `actionCommand`, and `profile`.

### `events.AFTER_COMMAND` (`afterCommand`)

Triggered right after a command action finishes.

- Payload: same as `events.BEFORE_COMMAND`.

### `events.MCP_START` (`mcpStart`)

Triggered when the MCP server initializes before it starts listening or connecting.

- Payload: `server` and `options`.

## MCP Support and Isolation

When `mage-remote-run` runs as an MCP server, plugin commands are automatically exposed as MCP tools.

Tool discovery and execution use isolated contexts:

- Plugins are loaded inside those isolated contexts.
- Events emitted during a tool execution are scoped to that execution.
- Global events such as `MCP_START` are emitted on the main process event bus.

For configuration injection patterns, see [Plugin Configuration](./plugin-configuration.md).

## Using Built-in Library Utilities

`appContext.lib` gives plugins access to the same internal utilities the CLI commands use — without needing to know the package install path or pin a version.

### Available Sub-modules

| Sub-module | Description |
|---|---|
| `lib.utils` | Output helpers, search/filter builders, pagination |
| `lib.commandHelper` | Command abbreviation resolution |
| `lib.config` | `loadConfig` / `saveConfig` functions |

### `lib.utils` Reference

| Export | Description |
|---|---|
| `printTable(headers, rows)` | Renders a colored CLI table |
| `handleError(error)` | Formats and prints Magento API errors |
| `buildSearchCriteria(options)` | Converts `--filter` / pagination options to Magento search params |
| `buildSortCriteria(options)` | Converts `--sort` options to Magento sort params |
| `addFilterOption(command)` | Adds `--filter` option to a commander command |
| `addSortOption(command)` | Adds `--sort`, `--sort-by`, `--sort-order` options |
| `addPaginationOptions(command)` | Adds `-p, --page` and `-s, --size` options |
| `addFormatOption(command)` | Adds `-f, --format` option |
| `formatOutput(options, data)` | Prints JSON/XML output; returns `true` if handled |
| `applyLocalSearchCriteria(data, options)` | Filters/sorts/paginates a local array |

### Example: Using `lib.utils` in a Plugin

```javascript
export default async function plugin(context) {
  const { program, createClient, lib } = context;
  const { printTable, handleError, addFilterOption, addPaginationOptions, buildSearchCriteria } = lib.utils;

  const cmd = program
    .command('my-items')
    .description('List items from a custom endpoint');

  addFilterOption(cmd);
  addPaginationOptions(cmd);

  cmd.action(async (options) => {
    try {
      const client = await createClient();
      const { params } = buildSearchCriteria(options);
      const result = await client.get('V1/my-items', { params });

      const items = result.items ?? [];
      if (items.length === 0) {
        console.log('No items found.');
        return;
      }

      printTable(['ID', 'Name', 'Status'], items.map(i => [i.id, i.name, i.status]));
    } catch (error) {
      handleError(error);
    }
  });
}
```

### Example: Persisting Plugin Config

```javascript
export default async function plugin(context) {
  const { program, lib } = context;
  const { loadConfig, saveConfig } = lib.config;

  program
    .command('my-plugin-config')
    .description('Show or reset plugin config')
    .action(async () => {
      const config = await loadConfig();
      console.log('Current config:', JSON.stringify(config['my-plugin'] ?? {}, null, 2));
    });
}
```

