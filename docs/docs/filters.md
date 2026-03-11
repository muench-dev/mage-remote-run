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
| `neq` | `!=` | Not equal | `--filter "status!=canceled"` |
| `in` | | In a list of values (comma-separated) | `--filter "entity_id:in=1,2,3"` |
| `nin` | `:!in` | Not in a list of values | `--filter "entity_id:!in=1,2,3"` |
| `like` | `~` | Contains value. You can use `*` as a wildcard. | `--filter "name~*shirt*"` |
| `nlike` | `!~` | Does not contain value. | `--filter "name!~*shirt*"` |
| `notnull`| `!` | Is not null. | `--filter "created_at!"` |
| `null` | `?` | Is null. | `--filter "updated_at?"` |
| `moreq` | | More or equal | `--filter "price:moreq=100"` |
| `finset` | `@@` | A value within a set of values | `--filter "category_ids@@3"` |
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
mage-remote-run product list --filter "sku:like=DRONE-* || price>100"
```

In this example, products containing a SKU starting with `DRONE-` OR having a price greater than 100 will be matched.

## Examples

Here are some real-world examples of how filters can be used with various list commands:

**Products**
List simple products with a price greater than or equal to 100:
```bash
mage-remote-run product list --filter "type_id=simple" "price>=100"
```

**Orders**
List pending orders with a grand total greater than 100:
```bash
mage-remote-run order list --filter "status=pending" --filter "grand_total>100"
```
Include additional columns while filtering:
```bash
mage-remote-run order list --filter "grand_total>=100" --add-fields "base_grand_total,billing_address.city"
```

**Customers**
List customers by email domain and group ID:
```bash
mage-remote-run customer list --filter "email~*@example.com*" --filter "group_id=1"
```

**Customer Groups**
Find customer groups by code:
```bash
mage-remote-run customer group list --filter "code~*VIP*"
```
