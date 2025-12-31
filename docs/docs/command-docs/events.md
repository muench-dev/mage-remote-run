---
title: event
sidebar_position: 2
---

# event

Manage Adobe I/O Events.

## event check-configuration

Check the configuration of Adobe I/O Events.

```bash
mage-remote-run event check-configuration
```

### Options

- `-f, --format <type>`: Output format (text, json, xml) (default: text)

## event provider list

List event providers.

```bash
mage-remote-run event provider list
```

### Options

- `-f, --format <type>`: Output format (text, json) (default: text)

## event provider show

Show event provider details.

```bash
mage-remote-run event provider show <id>
```

### Options

- `-f, --format <type>`: Output format (text, json) (default: text)

## event provider create

Create a new event provider. This command is interactive.

```bash
mage-remote-run event provider create
```

## event provider delete

Delete an event provider.

```bash
mage-remote-run event provider delete <id>
```

## event supported-list

List supported events.

```bash
mage-remote-run event supported-list
```

### Options

- `-f, --format <type>`: Output format (text, json) (default: text)
