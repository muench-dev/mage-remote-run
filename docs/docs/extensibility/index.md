---
title: Extensibility
sidebar_label: Extensibility
---

# Extensibility

`mage-remote-run` can be extended in two complementary ways:

- Plugins add JavaScript-based behavior such as custom commands, event listeners, and API integrations.
- Configuration-based extensions let you inject reusable command definitions and plugin settings without changing the CLI itself.

Use this section to choose the right approach:

- [Plugin management](./plugins.md) covers registering, listing, and removing plugins.
- [Plugin development](./plugin-development.md) explains how to create a plugin and use the runtime context.
- [Plugin configuration](./plugin-configuration.md) shows how plugins can inject or persist configuration.
- [Virtual commands](./virtual-commands.md) documents configuration-driven REST commands.

In practice, many extensions combine both approaches: a plugin can ship JavaScript behavior and also expose static configuration or virtual commands.
