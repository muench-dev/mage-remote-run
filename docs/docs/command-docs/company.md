---
title: company
sidebar_position: 3
---

# Company Commands

Manage B2B companies in Adobe Commerce.

:::info
These commands are available only for **Adobe Commerce** profiles with B2B modules detected. For PaaS/On-Prem profiles, B2B modules are checked during `connection add` or `connection edit`.
:::

## List Companies

List available companies with pagination support.

```bash
mage-remote-run company list [options]
```

### Options

| Option | Description | Default |
|---|---|---|
| `-p, --page <number>` | Page number | 1 |
| `-s, --size <number>` | Page size | 20 |
| `--sort-by <field>` | Field to sort by | `entity_id` |
| `--sort-order <order>` | Sort order (ASC, DESC) | `ASC` |
| `-f, --format <type>` | Output format (`text`, `json`, `xml`) | `text` |

### Example

```bash
mage-remote-run company list --page 1 --size 10
```

## Show Company

Show detailed information about a specific company.

```bash
mage-remote-run company show <companyId> [options]
```

### Options

| Option | Description | Default |
|---|---|---|
| `-f, --format <type>` | Output format (`text`, `json`, `xml`) | `text` |

### Example

```bash
mage-remote-run company show 1
```

## Create Company

Create a new company. Interactive prompts will guide you.

```bash
mage-remote-run company create
```

## Update Company

Update company details interactively.

```bash
mage-remote-run company update <companyId>
```

## Delete Company

Delete a company.

```bash
mage-remote-run company delete <companyId>
```

## Company Structure

Show basic company structure.

```bash
mage-remote-run company structure <companyId>
```

## Company Roles

Manage B2B roles.

### List Roles

```bash
mage-remote-run company role list
```

### Show Role

```bash
mage-remote-run company role show <roleId>
```

## Company Credits

Manage company credits.

### Show Credit

View credit balance and limits.

```bash
mage-remote-run company credit show <companyId>
```

### Credit History

View credit transaction history.

```bash
mage-remote-run company credit history <companyId>
```

### Increase Balance

Increase company credit balance.

```bash
mage-remote-run company credit increase <creditId> <amount>
# Optional: --comment "Reason" --po "PO123"
```

### Decrease Balance

Decrease company credit balance.

```bash
mage-remote-run company credit decrease <creditId> <amount>
# Optional: --comment "Reason" --po "PO123"
```
