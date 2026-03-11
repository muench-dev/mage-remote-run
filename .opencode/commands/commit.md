---
description: Commit the changes to the repository
---

Commit the changes by using the [Conventional Commit](https://www.conventionalcommits.org/) format for all commit messages. This helps keep the commit history readable and enables automated tools for changelogs and releases.

Commit all changes in logical chunks. For example, if you added a new feature and also fixed a bug, you should create two separate commits: one for the new feature and one for the bug fix. This makes it easier to understand the history of changes and to revert specific changes if needed.

### Example commit messages

```text
# New features and bug fixes
feat(auth): add OAuth2 support for Google login
fix(api): resolve memory leak in data streaming endpoint

# Refactoring and Performance
refactor: simplify user validation logic
perf: optimize database query for product listings

# Documentation and Style
docs: update API documentation for the checkout flow
style: fix indentation in scss files (no logic changes)

# Maintenance and Tooling
chore: update dependency versions in package.json
test: add unit tests for the price calculator service

# Breaking Changes (triggers a Major version bump)
feat(api)!: remove deprecated v1 search endpoint

BREAKING CHANGE: The v1 search endpoint has been removed. 
Please migrate to v2 as documented in the migration guide.
```
