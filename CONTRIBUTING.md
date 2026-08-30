# Contributing Guide

Thank you for contributing to this project.

This document defines the rules and workflow that all team members should follow when working on the project. The goal is to keep the codebase clean, organized, reviewable, and easy for everyone to work on.

---

## Table of Contents

* [1. General Rules](#1-general-rules)
* [2. Repository Structure](#2-repository-structure)
* [3. Branching Strategy](#3-branching-strategy)
* [4. Branch Naming Convention](#4-branch-naming-convention)
* [5. Creating a Branch](#5-creating-a-branch)
* [6. Keeping Your Branch Updated](#6-keeping-your-branch-updated)
* [7. Commit Message Convention](#7-commit-message-convention)
* [8. Pull Request Rules](#8-pull-request-rules)
* [9. Code Review](#9-code-review)
* [10. Merge Rules](#10-merge-rules)
* [11. Conflict Resolution](#11-conflict-resolution)
* [12. Code Quality Rules](#12-code-quality-rules)
* [13. Security Rules](#13-security-rules)
* [14. Dependency Rules](#14-dependency-rules)
* [15. Documentation Rules](#15-documentation-rules)
* [16. Issue Rules](#16-issue-rules)
* [17. Before Opening a Pull Request](#17-before-opening-a-pull-request)
* [18. Recommended Git Workflow](#18-recommended-git-workflow)
* [19. Things Contributors Should Avoid](#19-things-contributors-should-avoid)
* [20. Quick Reference](#20-quick-reference)

---

# 1. General Rules

All contributors are expected to follow these rules:

1. Do not push directly to the `main` branch.
2. Create a separate branch for every task or feature.
3. Follow the branch naming convention.
4. Keep commits small and meaningful.
5. Write clear commit messages.
6. Do not mix unrelated changes in the same branch.
7. Open a Pull Request (PR) when your work is ready.
8. At least one team member should review the PR before merging.
9. Resolve all requested changes before merging.
10. Never commit secrets, API keys, passwords, tokens, or private credentials.
11. Keep documentation updated when necessary.
12. Test your changes before opening a PR.
13. Do not modify another contributor's work unnecessarily.
14. Communicate with the team before making large architectural changes.
15. Keep the project structure consistent.

---

# 2. Repository Structure

The repository contains the following main components organized in a tree structure:

```text
project-root/
+ backend/ - Contains the Python-based backend application.
+ frontend/ - Contains the React & TypeScript frontend application.
+ docker/ - Contains Dockerfiles and the Docker Compose setup.
+ DOCx/ - Contains project documentation, feature specifications, and guides.
+ script/ - Contains setup and automation scripts.
- .dockerignore - Lists files and folders to ignore during Docker builds.
- .editorconfig - Configures consistent coding styles across different editors.
- .gitignore - Lists files and folders that Git should ignore.
- README.md - The main entry point explaining the project setup.
- CONTRIBUTING.md - The contributor guidelines (this file).
- LICENSE - The legal distribution terms for this project.
```

Contributors should place files in the appropriate directory.

Do not create unnecessary files or directories in the project root.

Before adding a new major directory, discuss it with the team.

---

# 3. Branching Strategy

The `main` branch is the stable branch of the project.

Contributors should never work directly on `main`.

The recommended workflow is:

```text
main
 |
 +-- feature/frontend/dark-mode
 |
 +-- feature/frontend/login
 |
 +-- feature/backend/document-upload
 |
 +-- fix/backend/validation-error
 |
 \-- docs/project/setup-guide
```

After completing the work:

```text
Your Branch
     |
     v
Pull Request
     |
     v
Code Review
     |
     v
Approved
     |
     v
main
```

---

# 4. Branch Naming Convention

All branches must follow this format:

```text
<type>/<scope>/<description>
```

Example:

```text
feature/frontend/dark-mode
```

### Branch Types

| Type       | Purpose                                      |
| ---------- | -------------------------------------------- |
| `feature`  | New functionality                            |
| `fix`      | Bug fixes                                    |
| `hotfix`   | Critical/urgent fixes                        |
| `refactor` | Code restructuring without changing behavior |
| `docs`     | Documentation changes                        |
| `test`     | Adding or modifying tests                    |
| `perf`     | Performance improvements                     |
| `chore`    | Maintenance/configuration/dependencies       |
| `build`    | Build system changes                         |
| `ci`       | CI/CD changes                                |

### Examples

#### Features

```text
feature/frontend/dark-mode
feature/frontend/document-viewer
feature/frontend/login
feature/backend/register
feature/backend/document-upload
feature/backend/chat-history
```

#### Bug Fixes

```text
fix/frontend/navbar-overflow
fix/backend/token-expiry
fix/backend/database-filter
fix/backend/file-upload
```

#### Refactoring

```text
refactor/backend/auth-service
refactor/frontend/api-client
refactor/backend/retrieval-service
```

#### Documentation

```text
docs/project/setup-guide
docs/project/architecture
docs/backend/authentication
```

#### Tests

```text
test/backend/login
test/backend/retrieval
test/backend/file-upload
```

#### Maintenance

```text
chore/docker/update-compose
chore/dependencies/update-packages
chore/project/update-config
```

### Branch Naming Rules

Use:

* lowercase letters
* hyphens for multiple words
* meaningful descriptions

Good:

```text
feature/frontend/dark-mode
feature/backend/google-login
fix/backend/file-validation
```

Bad:

```text
Feature/Frontend/DarkMode
mybranch
pankaj-branch
new-feature
test123
final
final-version
final-final
```

---

# 5. Creating a Branch

Always start from the latest `main`.

```bash
git switch main
git pull origin main
```

Create your branch:

```bash
git switch -c feature/frontend/dark-mode
```

Push the branch:

```bash
git push -u origin feature/frontend/dark-mode
```

After this, normal pushes can use:

```bash
git push
```

---

# 6. Keeping Your Branch Updated

Before starting work, update your local `main`:

```bash
git switch main
git pull origin main
```

Then switch back to your branch:

```bash
git switch feature/frontend/dark-mode
```

Update your branch using the team's agreed strategy.

### Option 1: Merge `main`

```bash
git merge main
```

### Option 2: Rebase onto `main`

```bash
git rebase main
```

The team should agree on one preferred approach.

Do not rebase a shared branch that other contributors are actively using unless everyone involved agrees.

---

# 7. Commit Message Convention

Commit messages should be short, descriptive, and consistent.

Use:

```text
<type>: <description>
```

Examples:

```text
feat: add document upload
fix: handle invalid file type
refactor: simplify authentication service
docs: update API documentation
test: add login tests
chore: update docker configuration
perf: optimize document retrieval
```

### Commit Types

| Type       | Purpose            |
| ---------- | ------------------ |
| `feat`     | New feature        |
| `fix`      | Bug fix            |
| `refactor` | Code restructuring |
| `docs`     | Documentation      |
| `test`     | Tests              |
| `chore`    | Maintenance        |
| `perf`     | Performance        |
| `build`    | Build changes      |
| `ci`       | CI/CD changes      |

### Good Commit

```bash
git commit -m "feat: add document upload API"
```

### Bad Commits

```text
update
changes
done
final
working
asdf
fix
code
```

Avoid meaningless commit messages.

### Keep Commits Focused

Prefer:

```text
feat: add login API
fix: validate login credentials
test: add login API tests
```

Instead of:

```text
added login, changed navbar, fixed docker, updated README
```

---

# 8. Pull Request Rules

Every contribution should be merged through a Pull Request.

A PR should:

* Have a clear title.
* Explain what was changed.
* Explain why the change was needed.
* Mention related issues when applicable.
* Include screenshots for UI changes when useful.
* Include testing information.
* Have no unnecessary changes.
* Pass required checks.
* Be reviewed before merging.

### PR Title Format

Use:

```text
<type>: <description>
```

Examples:

```text
feat: add document upload
fix: resolve authentication error
docs: update project setup guide
refactor: improve RAG retrieval service
```

### PR Description

A good PR should contain:

```markdown
## Summary

Briefly explain what was changed.

## Changes

- Added document upload API
- Added file validation
- Added error handling

## Testing

- Tested PDF upload
- Tested invalid file type
- Tested large file handling

## Screenshots

Add screenshots here if applicable.

## Related Issue

Closes #123
```

---

# 9. Code Review

Every PR should be reviewed by at least one other contributor before merging, unless the team explicitly decides otherwise.

Reviewers should check:

* Correctness
* Code quality
* Security
* Error handling
* Performance
* Naming
* Project conventions
* Tests
* Documentation
* Unnecessary changes

### Reviewers should

* Explain problems clearly.
* Suggest improvements when appropriate.
* Focus on the code, not the person.
* Avoid unnecessary stylistic arguments.
* Approve only when the contribution is ready.

### Contributors should

* Respond to review comments.
* Make requested changes.
* Explain disagreements respectfully.
* Re-request review after making significant changes.

---

# 10. Merge Rules

The following rules should be followed:

1. Do not merge your own PR without review.
2. Do not merge PRs containing unresolved critical review comments.
3. Do not merge failing tests or checks.
4. Do not merge code containing secrets.
5. Do not merge unrelated changes.
6. Keep `main` stable.

Recommended GitHub branch protection for `main`:

* Require Pull Request before merging.
* Require at least one approval.
* Require status checks to pass.
* Prevent force pushes.
* Prevent branch deletion if appropriate.
* Prevent direct pushes to `main`.

---

# 11. Conflict Resolution

If your branch has merge conflicts, resolve them carefully.

First update `main`:

```bash
git switch main
git pull origin main
```

Then return to your branch:

```bash
git switch feature/frontend/dark-mode
```

Merge or rebase according to the team's workflow.

For merge:

```bash
git merge main
```

Resolve conflicts manually.

Then:

```bash
git add .
git commit
git push
```

If using rebase:

```bash
git rebase main
```

Resolve conflicts and continue:

```bash
git add .
git rebase --continue
```

Do not blindly accept:

```text
Accept Current
```

or:

```text
Accept Incoming
```

Understand the conflicting changes before resolving them.

If you are unsure about a conflict, ask the contributor who owns the affected code.

---

# 12. Code Quality Rules

All contributors should follow the coding standards of the project.

### General

* Use meaningful variable and function names.
* Keep functions reasonably small.
* Avoid unnecessary duplication.
* Handle errors properly.
* Avoid dead code.
* Remove debugging statements before committing.
* Keep formatting consistent.
* Follow the project's configured formatter/linter.

Do not commit:

```javascript
console.log("test");
```

unless it is intentionally required.

### Python

Follow the project's Python formatting and linting configuration.

Example tools may include:

```text
Black
Ruff
isort
```

### TypeScript / JavaScript

Follow the project's formatter and linting configuration.

Example tools may include:

```text
Prettier
ESLint
```

Do not manually format files differently from the project configuration.

---

# 13. Security Rules

Security is everyone's responsibility.

### Never commit

```text
.env
.env.local
.env.production
API keys
passwords
JWT secrets
database credentials
private keys
access tokens
cloud credentials
```

Use environment variables instead.

Example:

```env
DATABASE_URL=...
API_KEY=...
JWT_SECRET=...
```

Make sure sensitive files are included in `.gitignore`.

Example:

```gitignore
.env
.env.*
!.env.example
```

### `.env.example`

When an environment variable is required, document its name in `.env.example`.

Example:

```env
DATABASE_URL=
API_KEY=
JWT_SECRET=
```

Never put real credentials in `.env.example`.

---

# 14. Dependency Rules

Before adding a new dependency:

1. Check whether the functionality already exists.
2. Check whether the dependency is actively maintained.
3. Check its license.
4. Check for known security vulnerabilities.
5. Consider bundle/build/runtime impact.
6. Discuss major dependencies with the team.

Avoid adding dependencies for very small functionality that can reasonably be implemented without them.

After installing dependencies, commit the appropriate lock file.

Examples:

```text
package-lock.json
pnpm-lock.yaml
yarn.lock
bun.lock
uv.lock
poetry.lock
```

Do not manually edit lock files unless necessary.

---

# 15. Documentation Rules

Documentation should be updated whenever project behavior or setup changes.

Documentation may include:

```text
README.md
docs/
API documentation
Architecture documentation
Setup instructions
Environment variable documentation
```

If you add a new API, feature, configuration option, or major workflow, update the relevant documentation.

For example, if you add:

```text
POST /api/documents/upload
```

the API documentation should also be updated.

---

# 16. Issue Rules

Use GitHub Issues to track:

* Bugs
* Features
* Improvements
* Tasks
* Documentation
* Refactoring
* Technical debt

### Issue Titles

Use clear titles.

Good:

```text
Add document upload API
Fix Qdrant connection error
Improve login validation
Add dark mode to dashboard
Update Docker setup documentation
```

Bad:

```text
Bug
Issue
Problem
Help
Important
Something is wrong
```

### Before Starting an Issue

Check whether someone is already working on it.

If necessary, assign the issue to yourself before starting work.

---

# 17. Before Opening a Pull Request

Before creating a PR, make sure:

### Git

* [ ] Branch follows the naming convention.
* [ ] Branch is based on the latest `main`.
* [ ] No unrelated changes are included.
* [ ] Commit messages are meaningful.
* [ ] No secrets are committed.

### Code

* [ ] Code follows project standards.
* [ ] Formatter has been run.
* [ ] Linter passes.
* [ ] Tests pass.
* [ ] Debugging code has been removed.
* [ ] Error handling is appropriate.

### Documentation

* [ ] Documentation has been updated if necessary.
* [ ] API documentation has been updated if necessary.
* [ ] README has been updated if necessary.

### Pull Request

* [ ] PR title follows the convention.
* [ ] PR description explains the changes.
* [ ] Testing information is provided.
* [ ] Screenshots are included for relevant UI changes.
* [ ] Related issue is linked.

---

# 18. Recommended Git Workflow

The standard workflow is:

### Step 1 — Update `main`

```bash
git switch main
git pull origin main
```

### Step 2 — Create a branch

```bash
git switch -c feature/frontend/dark-mode
```

### Step 3 — Work on the task

Make your changes.

### Step 4 — Check your changes

```bash
git status
git diff
```

### Step 5 — Stage changes

```bash
git add .
```

Prefer staging specific files when practical:

```bash
git add src/components/Navbar.tsx
```

### Step 6 — Commit

```bash
git commit -m "feat: add dark mode"
```

### Step 7 — Push

```bash
git push -u origin feature/frontend/dark-mode
```

### Step 8 — Open a Pull Request

Open a PR from:

```text
feature/frontend/dark-mode
```

into:

```text
main
```

### Step 9 — Code Review

Wait for the required review.

Address review comments.

### Step 10 — Merge

After approval and successful checks, merge the PR.

### Step 11 — Delete the Branch

After merging:

```bash
git branch -d feature/frontend/dark-mode
```

The remote branch can also be deleted through GitHub.

---

# 19. Things Contributors Should Avoid

## Do not push directly to `main`

Bad:

```bash
git switch main
git add .
git commit -m "changes"
git push origin main
```

Use a feature/fix branch and PR instead.

---

## Do not commit secrets

Never do:

```bash
git add .env
git commit -m "add configuration"
```

---

## Do not commit generated files unnecessarily

Examples:

```text
node_modules/
.venv/
__pycache__/
dist/
build/
coverage/
```

These should normally be ignored using `.gitignore`.

---

## Do not mix unrelated work

Avoid a PR like:

```text
feat: add login + redesign navbar + change Docker + update database
```

Instead, create focused PRs:

```text
feat: add login
feat: redesign navbar
chore: update Docker configuration
refactor: update database layer
```

---

## Do not overwrite another contributor's work

Before modifying an area that another contributor is actively working on, communicate with them.

---

## Do not force push shared branches

Avoid:

```bash
git push --force
```

For shared branches, force pushing can overwrite other contributors' work.

If force pushing is genuinely required for your own branch, prefer:

```bash
git push --force-with-lease
```

---

# 20. Quick Reference

## Branch

```text
<type>/<scope>/<description>
```

Examples:

```text
feature/frontend/dark-mode
feature/frontend/login
fix/backend/validation
refactor/backend/retrieval
docs/project/setup
test/backend/login
chore/docker/config
```

## Commit

```text
<type>: <description>
```

Examples:

```text
feat: add login API
fix: handle invalid token
docs: update API documentation
test: add login tests
```

## Basic Workflow

```bash
git switch main
git pull origin main

git switch -c feature/frontend/dark-mode

# Make changes

git status
git add .
git commit -m "feat: add dark mode"

git push -u origin feature/frontend/dark-mode
```

Then:

```text
Open PR
   |
   v
Code Review
   |
   v
Fix requested changes
   |
   v
Approval
   |
   v
Checks pass
   |
   v
Merge into main
   |
   v
Delete branch
```

---

# Final Principle

> **Keep branches focused, commits meaningful, Pull Requests reviewable, and ****`main`**** stable.**

When in doubt about a change that could affect the architecture, shared code, database, API contracts, or another contributor's work, discuss it with the team before implementing it.

**Happy contributing!**
