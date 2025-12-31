---
title: import
sidebar_position: 10
---

# Import Commands

Import data into Adobe Commerce (PaaS, SaaS, On-Premise).

## import json

Imports data from a JSON file, standard input (stdin), or via an interactive editor.

**Availability:** Adobe Commerce (PaaS, SaaS, On-Premise)

```bash
mage-remote-run import json <file> [options]
```

### Examples

**Interactive Mode:**
```bash
mage-remote-run import json data.json
```

**Non-Interactive (Full CLI Options):**
```bash
mage-remote-run import json products.json \
  --entity-type catalog_product \
  --behavior append \
  --allowed-error-count 10 \
  --validation-strategy validation-skip-errors
```

**Piping Data (STDIN):**
```bash
cat data.json | mage-remote-run import json
```

### Options

- `--entity-type <type>`: Entity Type (e.g., `catalog_product`, `customer`, `customer_composite`, `advanced_pricing`).
- `--behavior <behavior>`: Import Behavior (`append`, `replace`, `delete_entity`).
- `--validation-strategy <strategy>`: `validation-stop-on-errors` (default) or `validation-skip-errors`.
- `--allowed-error-count <count>`: Number of allowed errors (default: 10).

## import csv

Imports data from a CSV file, standard input (stdin), or via an interactive editor.

**Availability:** Adobe Commerce (PaaS, On-Premise)  
**Note:** Not available on Adobe Commerce SaaS.

```bash
mage-remote-run import csv <file> [options]
```

### Examples

**Interactive Mode:**
```bash
mage-remote-run import csv products.csv
```

**Custom Separators:**
```bash
mage-remote-run import csv products.csv \
  --field-separator ";" \
  --multi-value-separator "|"
```

**Non-Interactive:**
```bash
mage-remote-run import csv customers.csv \
  --entity-type customer \
  --behavior replace
```

### Options

- `--entity-type <type>`: Entity Type.
- `--behavior <behavior>`: Import Behavior.
- `--field-separator <char>`: Column separator (default: `,`).
- `--multi-value-separator <char>`: Separator for multiple values in a cell (default: `,`).
- `--empty-value-constant <string>`: Value to treat as empty (default: `__EMPTY__VALUE__`).
- `--images-file-dir <dir>`: Directory for images (default: `var/import/images`).
- `--validation-strategy <strategy>`: `validation-stop-on-errors` (default) or `validation-skip-errors`.
- `--allowed-error-count <count>`: Number of allowed errors (default: 10).
