# Filtering

Many `list` commands support the `--filter` option to query the Adobe Commerce REST API. Mage Remote Run uses a shorthand and explicit operator syntax to make filtering easy.

## Syntax

By default, filters can be specified using a shorthand format:

```bash
--filter "field=value"
```

You can also use explicit operators for more complex queries:

```bash
--filter "field:operator=value"
```

## Available Operators

The following operators are supported:

| Operator | Shorthand | Description | Example |
|---|---|---|---|
| `eq` | `=` | Equals | `--filter "status=1"` or `--filter "status:eq=1"` |
| `gt` | `>` | Greater than | `--filter "price>100"` or `--filter "price:gt=100"` |
| `lt` | `<` | Less than | `--filter "price<50"` |
| `gteq` | `>=` | Greater than or equal | `--filter "price>=100"` |
| `lteq` | `<=` | Less than or equal | `--filter "price<=50"` |
| `neq` | | Not equal | `--filter "status:neq=canceled"` |
| `in` | | In a list of values (comma-separated) | `--filter "entity_id:in=1,2,3"` |
| `nin` | | Not in a list of values | `--filter "entity_id:nin=1,2,3"` |
| `like` | | Contains value. You can use `*` as a wildcard. | `--filter "name:like=*shirt*"` |
| `nlike` | | Does not contain value. | `--filter "name:nlike=*shirt*"` |
| `notnull`| | Is not null. | `--filter "created_at:notnull"` |
| `null` | | Is null. | `--filter "updated_at:null"` |
| `moreq` | | More or equal | `--filter "price:moreq=100"` |
| `finset` | | A value within a set of values | `--filter "category_ids:finset=3"` |
| `nfinset`| | A value that is not within a set of values | `--filter "category_ids:nfinset=3"` |
| `from` | | The beginning of a range. Must be used with to. | `--filter "created_at:from=2024-01-01"` |
| `to` | | The end of a range. Must be used with from. | `--filter "created_at:to=2024-12-31"` |

## Multiple Filters

You can provide multiple filters by specifying the `--filter` option multiple times:

```bash
mage-remote-run order list --filter "status=pending" --filter "grand_total>100"
```

## OR Filters

To perform a logical OR, separate multiple filters with `||`. You can optionally include spaces around the separator. This will group them in a single `filter_groups` context:

```bash
mage-remote-run order list --filter "sku:like=DRONE-* || price>100"
```

In this example, orders containing a SKU starting with `DRONE-` OR having a price greater than 100 will be matched.
