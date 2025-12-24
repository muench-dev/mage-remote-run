# webhook

Manage webhooks in Adobe Commerce.

:::info
These commands are available only for **Adobe Commerce (Cloud/SaaS)** connection profiles.
:::

## List Webhooks

List available webhooks.

```bash
mage-remote-run webhook list [options]
```

### Options

| Option | Description | Default |
|Params|---|---|
| `-p, --page <number>` | Page number | 1 |
| `-s, --size <number>` | Page size | 20 |
| `-f, --format <type>` | Output format (`text`, `json`, `xml`) | `text` |

### Example

```bash
mage-remote-run webhook list --page 1 --size 10 --format json
```
