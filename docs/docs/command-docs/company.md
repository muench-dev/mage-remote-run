# company

Manage B2B companies in Adobe Commerce.

:::info
These commands are available only for **Adobe Commerce (Cloud/SaaS)** connection profiles.
:::

## List Companies

List available companies with pagination support.

```bash
mage-remote-run company list [options]
```

### Options

| Option | Description | Default |
|Params|---|---|
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
