---
title: order
sidebar_position: 10
---

# Order Commands

Manage orders.

## order list

List orders with paging controls.

```bash
mage-remote-run order list
mage-remote-run order list --page 1 --size 20
mage-remote-run order list --status pending
mage-remote-run order list --email user@example.com
mage-remote-run order list --date-from 2023-01-01 --date-to 2023-12-31
mage-remote-run order list --fields "increment_id,grand_total,customer_email"
mage-remote-run order list --filter "grand_total>=100" --add-fields "base_grand_total,billing_address.city"
```

### Options

- `-p, --page <number>`: Page number (default: 1)
- `-s, --size <number>`: Page size (default: 20)
- `-f, --format <type>`: Output format (text, json, xml) (default: text)
- `--status <status>`: Filter by order status (e.g., pending, processing)
- `--email <email>`: Filter by customer email address
- `--store <store_id>`: Filter by store ID
- `--date-from <date>`: Filter by creation date from (e.g., `2023-01-01`)
- `--date-to <date>`: Filter by creation date to (e.g., `2023-12-31`)
- `--filter <filters...>`: Generic filters. Supports operators `>`, `<`, `>=`, `<=`, and `=` (e.g., `grand_total>=100`, `status=pending`)
- `--fields <fields>`: Comma-separated columns to display exclusively, overriding the defaults (`increment_id,status,etc.`). Supports nested attributes (e.g., `billing_address.city`).
- `--add-fields <fields>`: Comma-separated columns to display alongside the default ones.

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

## order cancel `<id>`

Cancel an order.

```bash
mage-remote-run order cancel 42
```

## order hold `<id>`

Put an order on hold.

```bash
mage-remote-run order hold 42
```

## order unhold `<id>`

Release an order from hold.

```bash
mage-remote-run order unhold 42
```
