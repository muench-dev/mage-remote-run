---
id: inventory
title: Inventory Commands
sidebar_label: Inventory
sidebar_position: 9
---

# Inventory Commands

Manage inventory stocks and sources.

## `inventory stock`

Commands for managing inventory stocks.

### List Stocks

List all available inventory stocks.

```bash
mage-remote-run inventory stock list
```

**Options:**
- `-h, --help`: Display help for command

### Show Stock

Show detailed information about a specific stock.

```bash
mage-remote-run inventory stock show <stock_id>
```

**Arguments:**
- `stock_id`: The ID of the stock to retrieve.

## `inventory source`

Commands for managing inventory sources.

### List Sources

List all available inventory sources.

```bash
mage-remote-run inventory source list --page 1 --size 20
```

**Options:**
- `-p, --page <number>`: Page number (default: "1")
- `-s, --size <number>`: Page size (default: "20")

## `inventory resolve-stock`

Resolve the stock ID assigned to a specific sales channel (e.g., website).

```bash
mage-remote-run inventory resolve-stock <type> <code>
```

**Arguments:**
- `type`: Sales channel type (e.g., `website`)
- `code`: Sales channel code (e.g., `base`)

**Example:**

```bash
mage-remote-run inventory resolve-stock website base
# Output: Resolved Stock ID: 1
```

## `inventory source selection-algorithm`

Commands for managing source selection algorithms.

### List Algorithms

List all available source selection algorithms.

```bash
mage-remote-run inventory source selection-algorithm list
```
