---
title: order
sidebar_position: 6
---

# order

Manage orders.

## order list

List orders with paging controls.

```bash
mage-remote-run order list --page 1 --size 20
```

Options:

- `-p, --page <number>`: Page number
- `-s, --size <number>`: Page size

## order search `<query>`

Search orders by increment ID (LIKE match).

```bash
mage-remote-run order search 1000
```

## order show `<identifier>`

Show an order by internal ID or increment ID.

```bash
mage-remote-run order show 42
mage-remote-run order show 100000123 --format json
```

Options:

- `-f, --format <type>`: `text`, `json`, or `xml`

## order latest

List recent orders sorted by `created_at` descending. Use interactive selection to open details.

```bash
mage-remote-run order latest --page 1 --size 20
mage-remote-run order latest --select
```

Options:

- `-p, --page <number>`: Page number
- `-z, --size <number>`: Page size
- `-s, --select`: Interactive selection mode

## order edit `<id>`

Add a status history comment (prompts for status and comment).

```bash
mage-remote-run order edit 42
```
