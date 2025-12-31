---
title: product
sidebar_position: 11
---

# Product Commands

Inspect product types and attributes.

# Product Commands

Manage products, attributes, and types.

## `product list`

List products with pagination and sorting.

```bash
mage-remote-run product list --sort-by price --sort-order DESC
```

**### Options**
- `-p, --page <number>`: Page number (default: 1)
- `-s, --size <number>`: Page size (default: 20)
- `--sort-by <field>`: Field to sort by (default: entity_id)
- `--sort-order <order>`: Sort order (ASC or DESC) (default: ASC)
- `-f, --format <type>`: Output format (text, json, xml) (default: text)

## `product show`

Show detailed product information.

```bash
mage-remote-run product show <sku>
```

**Arguments:**
- `sku`: The SKU of the product to retrieve.

**Options:**
- `-f, --format <type>`: Output format (text, json, xml)

## `product type`

Commands for managing product types.

### `product type list`

List available product types.

```bash
mage-remote-run product type list
```

## product attribute list

List product attributes with paging.

```bash
mage-remote-run product attribute list --page 1 --size 20
```

Options:

- `-p, --page <number>`: Page number
- `-s, --size <number>`: Page size

## product attribute show `<attributeCode>`

Show a product attribute with selectable output format.

```bash
mage-remote-run product attribute show color
mage-remote-run product attribute show color --format json
```

Options:

- `-f, --format <type>`: `text`, `json`, or `xml`

## product attribute type list

List available attribute input types.

```bash
mage-remote-run product attribute type list
```

## `product link-type`

Commands for managing product link types.

### `product link-type list`

List available product link types.

```bash
mage-remote-run product link-type list
mage-remote-run product link-type list --format json
```

**Options:**
- `-f, --format <type>`: Output format (text, json, xml)
