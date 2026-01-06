---
title: connection
sidebar_position: 4
---

# Connection Commands

Manage connection profiles for Magento instances. Profiles store system type, instance URL, and authentication settings. The active profile is used for all API commands.

## connection add

Create a new profile via interactive prompts.

```bash
mage-remote-run connection add
```

Prompts include:

- System type (Open Source, Mage-OS, Adobe Commerce on-prem, PaaS, SaaS)
- Instance URL
- Authentication method and credentials
- For Adobe Commerce PaaS/On-Prem, the CLI checks installed modules and stores whether B2B modules are available.

## connection list

List all profiles and show which one is active.

```bash
mage-remote-run connection list
```

## connection search `<query>`

Filter profiles by name.

```bash
mage-remote-run connection search staging
```

## connection delete `<name>`

Delete a profile after confirmation.

```bash
mage-remote-run connection delete my-store
```

## connection edit `<name>`

Edit an existing profile using the same prompts as `add`.

```bash
mage-remote-run connection edit my-store
```

## connection select

Pick the active profile from a list.

```bash
mage-remote-run connection select
```

## connection status

Show the active profile and basic details.

```bash
mage-remote-run connection status
```

## connection test

Test connectivity for the active profile or all profiles.

```bash
mage-remote-run connection test
mage-remote-run connection test --all
```

## connection clear-token-cache

Remove the cached access token so the next command fetches a fresh one.

```bash
mage-remote-run connection clear-token-cache
```
