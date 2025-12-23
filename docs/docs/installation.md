---
id: installation
slug: /installation
title: Installation
sidebar_label: Installation
sidebar_position: 2
---

# Installation

mage-remote-run is distributed as an npm package and can be installed globally or run via `npx`.

## Install Globally

```bash
npm install -g mage-remote-run
mage-remote-run --version
```

## Run with npx

```bash
npx mage-remote-run --help
```

## Run from Source

If you cloned the repository, you can run the CLI directly from the project root:

```bash
node bin/mage-remote-run.js --help
```

## Authentication Setup

Most commands require a configured connection profile. Use the interactive setup to choose the system type and authentication method (Bearer token, OAuth 1.0a, or SaaS client credentials).

```bash
mage-remote-run connection add
```
