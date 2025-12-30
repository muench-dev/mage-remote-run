---
title: webhook
sidebar_position: 14
---

# Webhook Commands

Manage webhooks in Adobe Commerce SaaS.

:::info
These commands are available only for **Adobe Commerce (Cloud/SaaS)** connection profiles.
:::

## List Webhooks

List all configured webhooks.

```bash
mage-remote-run webhook list [options]
```

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `-f, --format <type>` | Output format (`table`, `json`, `xml`) | `table` |

### Example

```bash
# List in table format (default)
mage-remote-run webhook list

# List in JSON format
mage-remote-run webhook list --format json
```

## List Supported Webhook Types

List all supported webhook types available in the system.

```bash
mage-remote-run webhook supported-list [options]
```

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `--format <type>` | Output format (`table`, `json`) | `table` |

### Example

```bash
# List supported types in table format
mage-remote-run webhook supported-list

# List in JSON format
mage-remote-run webhook supported-list --format json
```

## Show Webhook Details

Display detailed information about a specific webhook.

```bash
mage-remote-run webhook show [name]
```

### Arguments

| Argument | Description | Required |
|----------|-------------|----------|
| `name` | Webhook name | No (prompts if missing) |

### Example

```bash
# Show specific webhook
mage-remote-run webhook show "Product Save Hook"

# Interactive selection
mage-remote-run webhook show
```

## Create Webhook

Create a new webhook subscription with comprehensive configuration options.

```bash
mage-remote-run webhook create [options]
```

### Options

| Option | Description | Required |
|--------|-------------|----------|
| `--name <name>` | Hook name | Yes (prompts if missing) |
| `--webhook-method <method>` | Webhook method (e.g., `observer.catalog_product_save_after`) | Yes (searchable prompt if missing) |
| `--webhook-type <type>` | Webhook type (`before` or `after`) | Yes (prompts if missing) |
| `--url <url>` | Webhook URL | Yes (prompts if missing) |
| `--method <method>` | HTTP method (`POST`, `PUT`, `DELETE`) | No (prompts if missing, default: `POST`) |
| `--batch-name <name>` | Batch name | No (prompts if missing, default: `default`) |
| `--batch-order <n>` | Batch order | No (prompts if missing, default: `0`) |
| `--priority <n>` | Priority | No (prompts if missing, default: `0`) |
| `--timeout <n>` | Timeout in milliseconds | No (prompts if missing, default: `5000`) |
| `--soft-timeout <n>` | Soft timeout in milliseconds | No (prompts if missing, default: `3000`) |
| `--ttl <n>` | Cache TTL | No (prompts if missing, default: `3600`) |
| `--fallback-error-message <msg>` | Fallback error message | No (prompts if missing, default: `Webhook execution failed`) |
| `--required` | Mark webhook as required | No (prompts if missing, default: `false`) |
| `--fields <json>` | Fields as JSON string | No (interactive collection if missing) |
| `--headers <json>` | Headers as JSON string | No (interactive collection if missing) |
| `--rules <json>` | Rules as JSON string | No (interactive collection if missing) |

### Interactive Mode

When run without options, the command provides an interactive experience with:
- **Searchable webhook method selection**: Type to filter through supported webhook types
- **Custom webhook method option**: Enter custom values not in the supported list
- **Sensible defaults**: Pre-filled values for common configurations
- **Interactive collection**: Step-by-step prompts for fields, headers, and rules

### Examples

#### Interactive Mode
```bash
mage-remote-run webhook create
```

#### Basic Creation
```bash
mage-remote-run webhook create \
  --name "Product Save Hook" \
  --webhook-method "observer.catalog_product_save_after" \
  --webhook-type "after" \
  --url "https://example.com/webhook" \
  --method "POST"
```

#### Complete Configuration
```bash
mage-remote-run webhook create \
  --name "Order Complete Hook" \
  --webhook-method "observer.sales_order_save_after" \
  --webhook-type "after" \
  --url "https://example.com/orders" \
  --method "POST" \
  --timeout "5000" \
  --soft-timeout "3000" \
  --ttl "3600" \
  --priority "10" \
  --required
```

#### With Fields, Headers, and Rules
```bash
mage-remote-run webhook create \
  --name "Product Update Hook" \
  --webhook-method "observer.catalog_product_save_after" \
  --webhook-type "after" \
  --url "https://example.com/products" \
  --fields '[{"name":"product_id","source":"product.entity_id"}]' \
  --headers '[{"name":"X-Auth-Token","value":"secret123"}]' \
  --rules '[{"field":"product.status","operator":"eq","value":"1"}]'
```

## Delete Webhook

Delete (unsubscribe from) a webhook.

```bash
mage-remote-run webhook delete [name]
```

### Arguments

| Argument | Description | Required |
|----------|-------------|----------|
| `name` | Webhook name | No (prompts if missing) |

### Example

```bash
# Delete specific webhook
mage-remote-run webhook delete "Product Save Hook"

# Interactive selection
mage-remote-run webhook delete
```

## Webhook Configuration

### Webhook Methods

Webhook methods follow the pattern `observer.<event_name>` or `plugin.<event_name>`. Use the `webhook supported-list` command to see all available methods.

Common examples:
- `observer.catalog_product_save_after` - After product save
- `observer.catalog_product_save_before` - Before product save
- `observer.sales_order_save_after` - After order save
- `observer.customer_save_before` - Before customer save

### Webhook Types

- `after` - Execute webhook after the event
- `before` - Execute webhook before the event

### Fields Configuration

Fields define what data to send in the webhook payload:

```json
[
  {
    "name": "product_id",
    "source": "product.entity_id"
  },
  {
    "name": "product_sku",
    "source": "product.sku"
  }
]
```

### Headers Configuration

Custom HTTP headers to include in webhook requests:

```json
[
  {
    "name": "X-Auth-Token",
    "value": "your-secret-token"
  },
  {
    "name": "Content-Type",
    "value": "application/json"
  }
]
```

### Rules Configuration

Conditional rules to determine when the webhook should fire:

```json
[
  {
    "field": "product.status",
    "operator": "eq",
    "value": "1"
  },
  {
    "field": "product.type_id",
    "operator": "in",
    "value": ["simple", "configurable"]
  }
]
```

Supported operators:
- `eq` - Equals
- `neq` - Not equals
- `in` - In array
- `nin` - Not in array
- `gt` - Greater than
- `lt` - Less than
- `gte` - Greater than or equal
- `lte` - Less than or equal
