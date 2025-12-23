---
title: eav
sidebar_position: 8
---

# eav

Manage EAV attribute sets.

## eav attribute-set list

List attribute sets with paging.

```bash
mage-remote-run eav attribute-set list --page 1 --size 20
```

Options:

- `-p, --page <number>`: Page number
- `-s, --size <number>`: Page size

## eav attribute-set show `<id>`

Show attribute set details.

```bash
mage-remote-run eav attribute-set show 4
```
