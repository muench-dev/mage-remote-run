---
title: product
sidebar_position: 7
---

# product

Inspect product types and attributes.

## product types

List available product types.

```bash
mage-remote-run product types
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
