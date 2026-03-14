# GitHub Workflow Instructions

This document covers the Git and GitHub conventions for the **MicroMorphAgent** project — branching strategy, commit style, pull request process, and release management.

---

## Table of Contents

- [Repository Overview](#repository-overview)
- [Branching Strategy](#branching-strategy)
- [Branch Naming Conventions](#branch-naming-conventions)
- [Commit Message Convention](#commit-message-convention)
- [Pull Request Process](#pull-request-process)
- [Code Review Guidelines](#code-review-guidelines)
- [Merging Rules](#merging-rules)
- [Release Process](#release-process)
- [Hotfixes](#hotfixes)
- [Issue Tracking](#issue-tracking)
- [Useful Git Commands](#useful-git-commands)

---

## Repository Overview

| Detail | Value |
|--------|-------|
| **Owner** | `uhaseeb85` |
| **Repository** | `MicroMorphAgent` |
| **Default / Production Branch** | `main` |
| **Clone URL** | `https://github.com/uhaseeb85/MicroMorphAgent.git` |

---

## Branching Strategy

This project follows a simplified **GitHub Flow** model:

```
main  ←──── feature/...   (direct PR into main)
       ←──── fix/...
       ←──── hotfix/...
       ←──── chore/...
```

- `main` is always deployable. No direct commits are allowed to `main`.
- All work happens on short-lived feature branches that are merged back via pull request.
- There is no long-lived `develop` or `release` branch.

---

## Branch Naming Conventions

Use the format: `<type>/<short-description>`

| Type | Use for | Example |
|------|---------|---------|
| `feat/` | New features or enhancements | `feat/pdf-export-styling` |
| `fix/` | Bug fixes | `fix/graph-tooltip-overflow` |
| `hotfix/` | Critical bugs that must reach `main` immediately | `hotfix/auth-token-null-crash` |
| `chore/` | Dependency updates, config, tooling | `chore/upgrade-vite-8` |
| `refactor/` | Code restructuring without behaviour change | `refactor/llm-client-cleanup` |
| `docs/` | Documentation-only changes | `docs/update-readme` |
| `test/` | Test additions or fixes | `test/orchestrator-unit-tests` |

**Rules:**
- Use lowercase and hyphens only (no underscores or camelCase).
- Keep the description short (3–5 words maximum).
- Branch names must match the pattern `<type>/...` — PRs from branches not following this will be flagged in review.

---

## Commit Message Convention

Follow the **Conventional Commits** specification (`v1.0.0`):

```
<type>(<scope>): <short summary>

[optional body]

[optional footer(s)]
```

### Types

| Type | When to use |
|------|-------------|
| `feat` | A new feature visible to the user |
| `fix` | A bug fix |
| `chore` | Maintenance task (deps, config, build) |
| `refactor` | Code change that is neither a fix nor a feature |
| `docs` | Documentation only |
| `style` | Formatting, missing semicolons — no logic change |
| `test` | Adding or correcting tests |
| `perf` | Performance improvement |
| `ci` | CI/CD configuration changes |

### Scopes (optional but recommended)

`orchestrator` · `llm` · `graph` · `parser` · `github` · `ui` · `store` · `deps` · `config`

### Examples

```bash
feat(llm): add retry logic with exponential backoff

fix(graph): prevent duplicate edges in co-change matrix

chore(deps): remove java-parser, fix lodash-es prototype pollution

docs: update README with analysis modes section

refactor(orchestrator): extract phase helpers into separate methods
```

**Rules:**
- The summary line must be 72 characters or fewer.
- Use the imperative mood: "add feature" not "added feature".
- Do not end the summary line with a period.
- Reference related issues in the footer: `Closes #42` or `Refs #17`.

---

## Pull Request Process

### 1. Create your branch

```bash
git checkout main
git pull origin main
git checkout -b feat/my-feature
```

### 2. Make commits following the convention above

```bash
git add .
git commit -m "feat(ui): add granularity selector to onboarding form"
```

### 3. Push and open a PR

```bash
git push origin feat/my-feature
```

Then open a Pull Request on GitHub targeting `main`.

### 4. Fill in the PR template

Every PR description should include:

```markdown
## Summary
<!-- What does this PR do? Why is it needed? -->

## Changes
<!-- Bullet list of notable changes -->

## Testing
<!-- How was this tested? Demo mode? Specific repo? Manual steps? -->

## Screenshots (if UI change)
<!-- Before / after screenshots or a screen recording -->

## Related Issues
<!-- Closes #XX or N/A -->
```

### 5. Request review

Assign at least one reviewer before marking the PR as ready for review. Draft PRs are fine for early feedback.

---

## Code Review Guidelines

**For reviewers:**
- Approve only when the code is correct, secure, and maintains the existing style.
- Use **Request Changes** for blocking issues; **Comment** for non-blocking suggestions.
- Check that `npm run build` and `npm run lint` would pass (CI will verify, but review manually too).
- Flag any hardcoded API keys, tokens, or credentials — these must never be committed.
- Verify that `localStorage` interactions are scoped to the `decomp_config` key and do not leak sensitive data.

**For authors:**
- Respond to all review comments before requesting a re-review.
- Do not force-push to a branch after a review has started unless absolutely necessary, and communicate if you do.
- Resolve conversations only after the concern has been addressed.

---

## Merging Rules

- **Squash and merge** is the preferred strategy for feature and fix branches (keeps `main` history clean).
- **Merge commit** may be used for hotfixes to preserve the original commit context.
- Delete the source branch after merging.
- Do not merge your own PR without at least one approval (except for documentation-only changes).

---

## Release Process

This project is a client-side SPA — "releasing" means building and deploying the production bundle.

```bash
# 1. Ensure main is up to date and green
git checkout main
git pull origin main

# 2. Run the production build
npm run build

# 3. Tag the release
git tag -a v<MAJOR>.<MINOR>.<PATCH> -m "Release v<MAJOR>.<MINOR>.<PATCH>"
git push origin v<MAJOR>.<MINOR>.<PATCH>

# 4. Create a GitHub Release from the tag
#    Include a changelog summarising merged PRs since the previous tag.
```

**Versioning (Semantic Versioning):**

| Increment | When |
|-----------|------|
| `MAJOR` | Breaking changes (e.g., incompatible config schema changes) |
| `MINOR` | New features added in a backward-compatible manner |
| `PATCH` | Backward-compatible bug fixes and dependency updates |

---

## Hotfixes

For critical bugs on `main` that cannot wait for a normal PR cycle:

```bash
git checkout main
git pull origin main
git checkout -b hotfix/describe-the-issue

# Make the minimal fix
git commit -m "fix(scope): describe the critical fix"
git push origin hotfix/describe-the-issue
```

Open a PR targeting `main`, add the `hotfix` label, and request expedited review. After merging, create a patch release tag.

---

## Issue Tracking

Use GitHub Issues for all bug reports, feature requests, and tasks.

### Issue Labels

| Label | Meaning |
|-------|---------|
| `bug` | Something is broken |
| `enhancement` | New feature or improvement request |
| `security` | Vulnerability or security concern |
| `dependencies` | Dependency update |
| `documentation` | Docs gap or correction needed |
| `good first issue` | Suitable for new contributors |
| `question` | General question needing clarification |

### Filing a Bug

Include:
1. **Steps to reproduce** (repo URL, analysis mode, browser/OS).
2. **Expected behaviour.**
3. **Actual behaviour** (include console errors if applicable).
4. **Screenshots** if the issue is visual.

---

## Useful Git Commands

```bash
# Sync your local main with remote
git fetch origin
git checkout main
git merge --ff-only origin/main

# Rebase your feature branch onto latest main (before opening a PR)
git checkout feat/my-feature
git rebase origin/main

# Amend the last commit message (before pushing)
git commit --amend -m "fix(scope): corrected summary"

# Undo last local commit but keep changes staged
git reset --soft HEAD~1

# View commit log with graph
git log --oneline --graph --decorate --all

# Stash work in progress
git stash push -m "wip: describe what you were doing"
git stash pop

# List all local branches sorted by last commit date
git branch --sort=-committerdate

# Delete a remote branch after merging
git push origin --delete feat/my-feature
```

---

> For project setup, configuration, and architecture details see [README.md](README.md).
