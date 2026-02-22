---
title: connection
sidebar_position: 4
---

# Connection Commands

Manage connection profiles for Magento instances. Profiles store system type, instance URL, and authentication settings. The active profile is used for all API commands.

For configuration file locations and environment variables, see the [Configuration](../configuration.md) page.

## connection add

Create a new profile. This command supports both interactive prompts and non-interactive flags for CI/CD pipelines.

### Interactive Mode

```bash
mage-remote-run connection add
```

Prompts include:

- System type (Open Source, Mage-OS, Adobe Commerce on-prem, PaaS, SaaS)
- Instance URL
- Authentication method and credentials
- For OAuth 1.0a: Signature Method (HMAC-SHA256 or HMAC-SHA1)
- For Adobe Commerce PaaS/On-Prem, the CLI checks installed modules and stores whether B2B modules are available.

### Non-Interactive Mode (CI/CD)

You can pass all required parameters as flags. If `--type` is provided, the command runs in non-interactive mode.

**Common Options:**

- `--name <name>`: Profile Name (Required)
- `--type <type>`: System Type (`magento-os`, `mage-os`, `ac-on-prem`, `ac-cloud-paas`, `ac-saas`)
- `--url <url>`: Instance URL
- `--active`: Set as active profile automatically
- `--no-test`: Skip connection test (useful if the instance is not reachable yet)

**Adobe Commerce SaaS:**

- `--client-id <id>`: Client ID
- `--client-secret <secret>`: Client Secret

**Bearer Token (REST):**

- `--auth-method bearer` (Optional if `--token` is provided)
- `--token <token>`: Access Token

**OAuth 1.0a:**

- `--auth-method oauth1` (Optional if keys are provided)
- `--consumer-key <key>`
- `--consumer-secret <secret>`
- `--access-token <token>`
- `--token-secret <secret>`
- `--signature-method <method>`: `hmac-sha256` (default) or `hmac-sha1`

### Examples

**Adobe Commerce SaaS:**
```bash
mage-remote-run connection add \
  --name "Production" \
  --type ac-saas \
  --url "https://example.com" \
  --client-id "my-id" \
  --client-secret "my-secret" \
  --active
```

**Adobe Commerce SaaS (Pre-generated Token):**
```bash
mage-remote-run connection add \
  --name "Production" \
  --type ac-saas \
  --url "https://example.com" \
  --token "access_token_here"
```

**Adobe Commerce Cloud (PaaS) with Integration Token:**
```bash
mage-remote-run connection add \
  --name "MyPaaS" \
  --type ac-cloud-paas \
  --url "https://paas.example.com" \
  --token "integration_token"
```

**Bearer Token:**
```bash
mage-remote-run connection add \
  --name "Staging" \
  --type magento-os \
  --url "https://staging.example.com" \
  --token "my-token"
```

**OAuth 1.0a (Standard):**
```bash
mage-remote-run connection add \
  --name "MyOAuth" \
  --type ac-on-prem \
  --url "https://example.com" \
  --consumer-key "ck_..." \
  --consumer-secret "cs_..." \
  --access-token "at_..." \
  --token-secret "ts_..."
```

**OAuth 1.0a (with SHA1 for older versions):**
```bash
mage-remote-run connection add \
  --name "Legacy" \
  --type ac-on-prem \
  --url "https://legacy.example.com" \
  --consumer-key "ck" \
  --consumer-secret "cs" \
  --access-token "at" \
  --token-secret "ts" \
  --signature-method hmac-sha1
```

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
