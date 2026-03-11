---
title: Plugin Configuration
sidebar_position: 3
---

# Plugin Configuration

Plugins can extend `mage-remote-run` by modifying the runtime configuration object or by shipping static configuration files.

## Modify Configuration at Runtime

The plugin entrypoint receives `context.config`, which is the same configuration object used by the CLI.

This lets a plugin inject settings or command definitions before the CLI finishes command registration.

```javascript
export default async function plugin(context) {
  const { config } = context;

  if (!config.commands) {
    config.commands = [];
  }

  config.commands.push({
    name: 'mycompany check',
    method: 'GET',
    endpoint: '/V1/my-plugin-check',
    description: 'Sample injected virtual command from plugin',
  });
}
```

Because command registration reads `config.commands`, injected entries become available as normal CLI commands during the same execution.

## Persist Plugin Settings

Use `saveConfig()` when a plugin should write defaults or user preferences back to disk.

```javascript
export default async function plugin(context) {
  const { config, saveConfig } = context;

  if (!config.myPluginSettings) {
    config.myPluginSettings = { enabled: true };
    await saveConfig(config);
  }
}
```

The saved file is the standard `config.json` used by the CLI. For config file locations, see the main [Configuration](../configuration.md) page.

## Ship Static Configuration

Instead of mutating config in JavaScript, a plugin can provide static JSON that the CLI loads automatically.

The loader checks, in order:

1. `mage-remote-run.json` in the plugin root.
2. The `mage-remote-run` property in the plugin's `package.json`.

Example `mage-remote-run.json`:

```json
{
  "$schema": "https://mage-remote-run.muench.dev/config.schema.json",
  "commands": [
    {
      "name": "mycompany check",
      "method": "GET",
      "endpoint": "/V1/my-plugin-check",
      "description": "Sample injected virtual command from plugin"
    }
  ]
}
```

This is useful for lightweight plugins that only contribute configuration and do not need executable JavaScript.

## Typical Use Cases

- Add default plugin settings to `config.json`.
- Inject [virtual commands](./virtual-commands.md) for custom APIs.
- Package reusable command definitions for a team.
- Combine static config with runtime logic in the same plugin.
