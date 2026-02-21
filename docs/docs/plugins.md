---
sidebar_position: 10
---

# Plugins

`mage-remote-run` supports a plugin system that allows you to extend its functionality with custom commands and event hooks. Plugins are standard Node.js modules that export a default function.

## Managing Plugins

You can manage plugins using the `plugin` command namespace.

### Register a Plugin

To register an installed plugin (either global or local):

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

### Unregister a Plugin

To remove a plugin from the configuration:

```bash
mage-remote-run plugin unregister <package-name-or-path>
```

### List Plugins

To see all currently registered plugins:

```bash
mage-remote-run plugin list
```

## Developing Plugins

A plugin is a JavaScript module (ESM) that exports a default asynchronous function. This function receives an `context` object containing the application state and helpers.

### Plugin Structure

Create a new directory for your plugin and initialize it:

```bash
mkdir my-plugin
cd my-plugin
npm init -y
```

Ensure `package.json` has `"type": "module"`.

Create an `index.js`:

```javascript
import chalk from 'chalk';

/**
 * @param {Object} context
 * @param {import('commander').Command} context.program - The Commander.js program instance
 * @param {Object} context.config - The user configuration object
 * @param {Object|null} context.profile - The active profile (if any)
 * @param {import('events').EventEmitter} context.eventBus - The application event bus
* @param {Object} context.events - Event name constants
 */
export default async function(context) {
    const { program, eventBus, events } = context;

    // 1. Register a new command
    program.command('hello')
        .description('Say hello from a plugin')
        .option('-n, --name <name>', 'Name to greet', 'World')
        .action((options) => {
            console.log(chalk.green(`Hello ${options.name}!`));
        });

    // 2. Hook into application events
    eventBus.on(events.BEFORE_COMMAND, (data) => {
        const { thisCommand, actionCommand, profile } = data;
        // Logic to execute before any command runs
        // e.g., Logging, validation, etc.
    });
}
```

### Using the API Client

Plugins can use the `createClient` factory to obtain an API client for the active connection. This allows plugins to make requests to the Magento/Adobe Commerce REST API.

```javascript
/**
 * @param {Object} context
 * @param {Function} context.createClient - Factory function to create an API client
 */
export default async function(context) {
    const { program, createClient } = context;

    program.command('my-custom-endpoint')
        .description('Call a custom endpoint')
        .action(async () => {
            try {
                // Create a client for the active profile
                const client = await createClient();

                // Make a GET request to /V1/custom-endpoint
                const data = await client.get('V1/custom-endpoint');
                console.log(data);
            } catch (error) {
                console.error(error.message);
            }
        });
}
```

### Available Events

#### `events.INIT` (`init`)

Triggered after plugins are loaded and before commands are fully processed.
- **Payload**: The `appContext` object (`program`, `config`, `profile`, `eventBus`, `events`).

#### `events.BEFORE_COMMAND` (`beforeCommand`)

Triggered right before a command action is executed.

- **Payload**:
  - `thisCommand`: The command object attached to the listener (Commander internal).
  - `actionCommand`: The specific command being executed (Commander internal).
  - `profile`: The active `mage-remote-run` profile object (or `null`).

#### `events.AFTER_COMMAND` (`afterCommand`)

Triggered right after a command action has finished execution.

- **Payload**: Same as `events.BEFORE_COMMAND`.

#### `events.MCP_START` (`mcpStart`)

Triggered when the MCP server initializes (but before it starts listening or connecting).

- **Payload**:
  - `server`: The `McpServer` instance.
  - `options`: The options passed to the `mcp` command.

### Context Isolation

When running as an MCP server, `mage-remote-run` creates isolated contexts for tool discovery and execution.
- Plugins are loaded into these isolated contexts.
- Events emitted within a tool execution (like `BEFORE_COMMAND`) are scoped to that execution's event bus.
- Global events like `MCP_START` are emitted on the main process event bus and are received by the plugin instance loaded at startup.


### MCP Support

Commands registered by plugins are automatically discovered and exposed as tools when `mage-remote-run` is running as an MCP (Model Context Protocol) server. This allows AI agents to utilize your plugin's functionality without additional configuration.

## Example

Check out the `examples/hello-world-plugin` directory in the repository for a complete working example.
