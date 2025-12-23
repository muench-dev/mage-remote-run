---
title: Compatibility
---

mage-remote-run is a Node.js CLI that calls Magento REST APIs. Compatibility depends on your Magento instance exposing the REST endpoints used by each command and on the permissions granted to the API credentials you configure.

## Platform Support

- Adobe Commerce
- Magento Open Source
- Mage-OS

## API Requirements

- REST endpoints under `/V1` must be reachable from the machine running the CLI.
- The configured credentials must have permissions for the resources you intend to use (customers, orders, catalog, stores, tax classes, and EAV).
- SaaS configurations require a client ID and client secret; on-prem or PaaS setups support bearer tokens and OAuth 1.0a.

If a command fails with authorization errors, review the role permissions or token scope for that profile.
