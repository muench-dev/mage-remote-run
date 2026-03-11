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
