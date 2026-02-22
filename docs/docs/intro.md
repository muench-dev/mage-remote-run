---
id: intro
sidebar_position: 1
title: Introduction
slug: /
---

# Welcome to mage-remote-run

<img src="/img/logo.svg" alt="mage-remote-run logo" width="220" />

mage-remote-run is a Node.js CLI for working with Magento Open Source, Mage-OS, and Adobe Commerce via the REST API. It focuses on remote administration tasks like connection management, store data inspection, customers, orders, products, and tax classes.

> Early stage: This tool is not yet stable and may change in breaking ways.

## Quick Start

1. Install the CLI or use `npx`:

```bash
npm install -g mage-remote-run
# or
npx mage-remote-run --help
```

2. Add your first connection:

```bash
mage-remote-run connection add
```

3. Confirm the active profile and test it:

```bash
mage-remote-run connection status
mage-remote-run connection test
```

4. Explore commands:

```bash
mage-remote-run --help
mage-remote-run website list
```

## How It Works

The CLI stores one or more connection profiles locally, then uses the active profile to call Magento REST endpoints. Every command maps to a REST resource and prints structured output suited for scripting or quick inspection.
