---
title: rest
sidebar_position: 12
---

# REST Commands

Execute manual REST API requests.

## rest

Execute a manual REST API request against the configured connection.

```bash
mage-remote-run rest [path] [options]
```

### Options

- `-m, --method <method>`: HTTP Method (GET, POST, PUT, DELETE)
- `-d, --data <data>`: Request body data (JSON)
- `-q, --query <string>`: Query parameters (e.g. "a=1&b=2")
- `-s, --size <number>`: Search Criteria Page Size
- `--page-size <number>`: Search Criteria Page Size (alias for --size)
- `-p, --page <number>`: Search Criteria Current Page
- `--current-page <number>`: Search Criteria Current Page (alias for --page)
- `--filter <filters...>`: Generic filters (e.g. status=pending)
- `--sort <sorts...>`: Sort orders by field and direction (e.g. sku:DESC, created_at:ASC)
- `-c, --content-type <type>`: Content-Type (default: application/json)
- `-f, --format <type>`: Output format (json, xml)

### Examples

**Interactive Mode**
```bash
mage-remote-run rest
```

**GET Request**
```bash
mage-remote-run rest V1/store/websites
```

**GET Request with Method**
```bash
mage-remote-run rest V1/customers/1 -m GET
```

**POST Request with Data**
```bash
mage-remote-run rest V1/customers -m POST -d '{"customer": {"email": "test@example.com", ...}}'
```

**Query Parameters**
```bash
mage-remote-run rest V1/products -q "searchCriteria[pageSize]=10&fields=items[sku,name]"
```

**Pagination Shortcuts**
```bash
mage-remote-run rest V1/products --page 1 --size 10
```

**Sorting and Filtering**
```bash
mage-remote-run rest V1/products --filter status=pending grand_total>100 --sort created_at:DESC
```

**Output Format**
```bash
mage-remote-run rest V1/store/websites -f json > websites.json
```
