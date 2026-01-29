---
id: ci-integration
title: CI Integration
sidebar_label: CI Integration
sidebar_position: 5
---

# CI Integration

You can easily integrate `mage-remote-run` into your CI/CD pipelines to automate Magento tasks, such as clearing caches, reindexing, or verifying system status during deployments.

## GitHub Actions

For GitHub Actions, you can use the official [mage-remote-run-action](https://github.com/marketplace/actions/setup-mage-remote-run) from the GitHub Marketplace.

This action handles:
- Installing the CLI tool
- Configuring the connection profile
- Verifying connectivity (optional)

### Example Workflow

There is a comprehensive [example repository](https://github.com/muench-dev/mage-remote-run-ci-example) demonstrating how to set up the action.

Here is a basic example of how to use it in your workflow:

```yaml
name: Mage Remote Run Demo

on:
  push:
    branches: [ "main" ]
  pull_request:
    branches: [ "main" ]
  workflow_dispatch:

jobs:
  demo-integration:
    runs-on: ubuntu-latest
    name: Demo Integration
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Configure Mage Remote Run
        uses: muench-dev/mage-remote-run-action@main
        with:
          profile-name: "PaaS-Instance"
          type: "ac-cloud-paas"
          url: ${{ secrets.MAGE_URL }}
          consumer-key: ${{ secrets.MAGE_CONSUMER_KEY }}
          consumer-secret: ${{ secrets.MAGE_CONSUMER_SECRET }}
          access-token: ${{ secrets.MAGE_ACCESS_TOKEN }}
          token-secret: ${{ secrets.MAGE_ACCESS_TOKEN_SECRET }}
          # Implicitly runs connection test unless no-test is true

      - name: Verify Connection Status
        run: mage-remote-run connection status

      - name: List Websites
        run: mage-remote-run website list --format json

      - name: List Store Groups
        run: mage-remote-run store group list --format json

      - name: Generic REST Call
        run: mage-remote-run rest -m GET /V1/store/websites
```

### Configuration Options

The action supports various inputs to configure the connection. See the [marketplace listing](https://github.com/marketplace/actions/setup-mage-remote-run) for full details on available inputs:

- `profile-name`: Name of the profile to create (default: "default")
- `type`: System type (e.g., "ac-cloud-paas", "magento-os", "ac-saas")
- `url`: Magento instance URL
- `auth-method`: Authentication method (default: "oauth1")
- `consumer-key`, `consumer-secret`, `access-token`, `token-secret`: OAuth 1.0a credentials
- `token`: Bearer token (for "bearer" auth method)
- `client-id`, `client-secret`: SaaS credentials
- `no-test`: Set to "true" to skip the connection test step
