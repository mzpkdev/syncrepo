<div align="center">

[![license](https://img.shields.io/npm/l/syncrepo.svg)](https://github.com/mzpkdev/syncrepo/blob/master/LICENSE)
[![npm version](https://img.shields.io/npm/v/syncrepo.svg)](https://www.npmjs.com/package/syncrepo)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)
[![bundle size](https://img.shields.io/bundlephobia/min/syncrepo)](https://bundlephobia.com/result?p=syncrepo)

</div>
<br>
<br>

<p align="center">
  <strong>syncrepo</strong>
  <p align="center">
    A tool for synchronizing projects with their template repositories.
    <br />
    <br />
    <a href="https://github.com/mzpkdev/syncrepo/issues">Report a bug</a>
    &nbsp;&nbsp;·&nbsp;&nbsp;
    <a href="https://github.com/mzpkdev/syncrepo/issues">Request a feature</a>
  </p>
<br />
<br />

Table of Contents
------------------

* [Getting started](#getting-started)
    * [How to install](#how-to-install)
    * [Basic usage](#basic-usage)
* [Usage](#usage)
    * [Initializing a template](#initializing-a-template)
    * [Synchronizing with template](#synchronizing-with-template)
    * [Ignoring files](#ignoring-files)
    * [Monorepo support](#monorepo-support)
* [Configuration](#configuration)
* [Limitations](#limitations)
* [Troubleshooting](#troubleshooting)

Getting started
----------------

### How to install

```shell
npm install syncrepo
```

### Basic usage

1. Initialize a template repository in your project:
```shell
syncrepo init --remote https://github.com/example/template.git
```

2. Synchronize your project with the template:
```shell
syncrepo sync
```

Usage
-----

### Initializing a template

The `init` command sets up a template repository for synchronization. It stores the template URL, branch, and current commit hash in a `syncrepo.json` file.

```shell
# Initialize with default branch (main)
syncrepo init --remote https://github.com/example/template.git

# Initialize with a specific branch
syncrepo init --remote https://github.com/example/template.git --branch develop

# Using SSH URL
syncrepo init --remote git@github.com:example/template.git
```

After initialization, a `syncrepo.json` file is created in your project root:
```json
{
  "remote": "https://github.com/example/template.git",
  "branch": "main",
  "commit": "abc123def456..."
}
```

### Synchronizing with template

The `sync` command fetches the latest changes from the template repository and updates files in your project.

```shell
syncrepo sync
```

**What happens during sync:**
- Fetches the latest template content from the configured remote and branch
- Reads `.syncrepoignore` from the template (if present)
- Warns when files will be overwritten (detects content differences)
- Copies files from the template to your project (respecting ignore rules and showing whether files are created or updated)
- Removes files that exist locally but are no longer found in the template repository
- Updates the commit hash in `syncrepo.json`

**Important:** The sync command must be run from within a git repository. Run `git init` first if needed.

**Safety check:** The sync command will fail if your repository has uncommitted changes (staged, unstaged, untracked, or deleted files) to prevent accidental overwrites. To override this check, use the `--force` flag:

```shell
syncrepo sync --force
# or
syncrepo sync -f
```

**Dry-run mode:** Preview what would be synced without actually modifying any files:

```shell
syncrepo sync --dry-run
```

When using `--dry-run`, the command will:
- Validate your repository and configuration
- Fetch the template to check connectivity
- Show which files would be synced, removed, or ignored
- **Skip** all file writes, removals, and config updates

This is useful for:
- Checking what changes would be made before syncing
- Verifying template connectivity
- Reviewing ignore patterns

**Verbose output:** Get detailed information about the sync process:

```shell
syncrepo sync --verbose
# or
syncrepo sync -v
```

Verbose mode shows additional details such as:
- Config update information (commit hash being written)
- Additional status messages

You can combine flags:

```shell
# Preview sync with detailed output
syncrepo sync --dry-run --verbose

# Force sync with verbose output
syncrepo sync --force --verbose
```

### Ignoring files

Create a `.syncrepoignore` file in your template repository to exclude files from synchronization. The format is similar to `.gitignore`:

```gitignore
# Ignore specific files
config.local.json
secrets.env

# Ignore directories
node_modules/
dist/
*.log

# Negation (include files that would otherwise be ignored)
!important.config.json
```

Patterns support:
- Comments (`#`)
- Negation patterns (`!`)
- Directory patterns (trailing `/`)
- Basic glob patterns (`*`, `**`, `?`)

### Monorepo support

If your template is in a subdirectory of a monorepo, you can use the `prefix` option in `syncrepo.json`:

```json
{
  "remote": "https://github.com/example/monorepo.git",
  "branch": "main",
  "prefix": "templates/basic/"
}
```

This will sync only files from the `templates/basic/` directory.

Configuration
------------

The `syncrepo.json` file stores your template configuration:

- `remote` (required): Git repository URL (http://, https://, or git@)
- `branch` (required): Branch name to sync from
- `commit` (optional): Last synced commit hash (updated automatically)
- `prefix` (optional): Subdirectory path to sync from (for monorepos)

Limitations
-----------

**Important:** syncrepo uses a direct file overwrite strategy. Please read these limitations before using the tool.

### No Merge Strategies

syncrepo does not perform merge operations or conflict resolution. When you run `syncrepo sync`:
- Files from the template are copied directly to your project
- If a file exists locally with different content, it will be **overwritten completely**
- Files that exist locally but are no longer in the template will be **removed**
- Your local changes to template-tracked files will be **lost**

### Conflict Detection

The tool will warn you when files will be overwritten or removed:
- Before syncing, it compares local files with template versions
- If content differs, you'll see: `⚠️  Warning: filename will be overwritten (local changes will be lost)`
- If a file will be removed, you'll see: `Removing: filename` and a summary warning: `⚠️  X file(s) were removed (not found in template repository)`
- Use `--dry-run` to preview all changes without modifying files

### Best Practices

To avoid losing work:
1. **Always use `--dry-run` first**: Run `syncrepo sync --dry-run` to preview changes
2. **Commit your work**: The tool blocks sync when you have uncommitted changes (unless using `--force`)
3. **Review warnings carefully**: If you see overwrite warnings, review those files before proceeding
4. **Use `.syncrepoignore`**: Exclude files you've customized from synchronization
5. **Expect to lose local changes**: Only sync template files you haven't modified, or that you're willing to reset

### When to Use syncrepo

syncrepo works best when:
- You maintain configuration files, tooling, or boilerplate in a template
- You want to propagate updates from the template to multiple projects
- You're okay with overwriting template-tracked files (or haven't modified them)

### When NOT to Use syncrepo

Consider alternatives if:
- You need to merge changes between template and your modifications
- You've heavily customized files that also change in the template
- You need sophisticated conflict resolution

For those cases, consider Git submodules, npm packages, or manual cherry-picking with Git.

Troubleshooting
---------------

**Error: "Not a git repository"**
- Run `git init` to initialize a git repository in your project directory

**Error: "Configuration file not found"**
- Run `syncrepo init --remote <url>` to initialize the template

**Error: "No commit hash found for branch ... in remote ..."**
- The remote repository or branch cannot be accessed
- Verify the branch exists: Check the repository on GitHub/GitLab/etc.
- Verify the remote URL: Confirm the URL in `syncrepo.json` is correct
- Check network connectivity: Ensure you can access the remote repository
- For private repositories: Verify you have proper authentication (SSH key or credentials)

**Error: "Path traversal detected"**
- This security error occurs if the template tries to write files outside your project directory
- Check the template repository for malicious file paths

**Error: "Repository has uncommitted changes"**
- The sync command blocks execution when there are uncommitted changes to prevent data loss
- Commit or stash your changes before syncing: `git commit -am "message"` or `git stash`
- To proceed anyway (overwrites uncommitted changes): `syncrepo sync --force`

**Files not syncing**
- Check if files are listed in `.syncrepoignore` in the template repository
- Verify the `prefix` option if using monorepo support
