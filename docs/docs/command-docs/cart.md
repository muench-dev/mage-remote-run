---
sidebar_position: 10
---

# Cart Commands

Manage shopping carts using `mage-remote-run`.

## `cart list`

List carts with optional filtering. (Formerly `cart search`)

### Usage

```bash
mage-remote-run cart list [options]
```

### Options

| Option | Description | Default |
|---|---|---|
| `-p, --page <number>` | Page number | 1 |
| `-s, --size <number>` | Page size | 20 |
| `-f, --format <type>` | Output format (`text`, `json`, `xml`) | `text` |
| `--filter <filter>` | Filter criteria (see below) | `[]` |
| `--sort <sort>` | Sort options (see below) | `[]` |

### Filtering

Filters can be specified using the format `field:value:condition`.
- `field`: The field to filter by (e.g., `is_active`, `customer_email`).
- `value`: The value to search for.
- `condition`: (Optional) The condition type (e.g., `eq`, `lt`, `gt`, `like`). Defaults to `eq`.

### Sorting

Sort options can be specified using the format `field:direction`.
- `field`: The field to sort by (e.g., `created_at`, `grand_total`).
- `direction`: (Optional) The direction (`ASC` or `DESC`). Defaults to `ASC`.

### Examples

```bash
# List all carts
mage-remote-run cart list

# List active carts
mage-remote-run cart list --filter "is_active:1"

# List carts sorted by creation date descending
mage-remote-run cart list --sort "created_at:DESC"

# Pagination
mage-remote-run cart list --page 2 --size 50
```

## `cart show`

Show detailed information about a specific cart, including:
- General Info (ID, Status, Dates)
- Customer Info
- Billing Address
- Shipping Information (if available)
- Totals (Subtotal, Tax, Shipping, Grand Total)
- Items

### Usage

```bash
mage-remote-run cart show <cartId> [options]
```

### Options

| Option | Description | Default |
|---|---|---|
| `-f, --format <type>` | Output format (`text`, `json`, `xml`) | `text` |

### Examples

```bash
# Show cart details
mage-remote-run cart show 42

# Show cart as JSON
mage-remote-run cart show 42 --format json
```
