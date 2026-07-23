<h1 align="center">blastradius</h1>

<p align="center">
  <a href="https://www.npmjs.com/package/@fa33az/blastradius"><img src="https://img.shields.io/npm/v/@fa33az/blastradius.svg" alt="npm version" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT" /></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg" alt="Node.js Version" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.3-blue.svg" alt="TypeScript" /></a>
</p>

<p align="center">
  <b>If I delete this file, what happens?</b>
</p>

---

## Overview

`blastradius` (executable alias `impact-sim`) is a production-grade TypeScript CLI tool designed to simulate the structural impact, downstream cascading risks, and runtime bug probability of deleting any file or set of files from a codebase.

Unlike traditional static dependency graphs, `blastradius` combines static AST analysis, Git history churn, test suite references, and runtime heuristics into a transparent, deterministic **Confidence Delete Score (0-100%)**.

---

## Key Features

- **Git Diff Auto-Analysis (`blastradius diff`)**: Automatically detects modified or deleted files in `git status` or PR branches and calculates cumulative impact.
- **Project Config File (`.blastradiusrc.json`)**: Repository-level overrides for scoring weights, entrypoints, thresholds, and ignore paths.
- **Export-Level Impact Analysis (`--export <name>`)**: Analyzes the specific blast radius of deleting a named function, class, or type export within a module.
- **Live Watch Mode (`-w, --watch`)**: Monitors source files and recalculates impact instantly on save.
- **Native GitHub Action (`action.yml`)**: Ready-to-use GitHub Action for PR automation and threshold enforcement in CI/CD pipelines.
- **Static AST Dependency Graph**: Deep scanning powered by `ts-morph` to track static imports, `import type` declarations, re-exports, and dynamic `import()` calls.
- **Batch Processing & Wildcard Globs**: Analyze individual files, file lists, or wildcard glob patterns (`"src/legacy/**/*.ts"`).
- **AST Import Auto-Pruner (`--fix`)**: Automatically removes unused `import` declarations from all dependent files when a target file is deleted.
- **Interactive Deletion Workflow (`-i, --interactive`)**: Step-by-step CLI prompt to safely preview impact, confirm deletion, auto-prune imports, and run test suites.
- **GitHub PR Markdown Exporter (`--markdown`)**: Formats impact reports into GitHub Flavored Markdown for automated PR review comments.
- **Visual HTML Report Exporter (`--html`)**: Generates standalone dark-themed HTML report dashboards with dynamic dependency trees.

---

## Installation

### Global Installation via npm

```bash
npm install -g @fa33az/blastradius
```

### Local Project Installation

```bash
npm install --save-dev @fa33az/blastradius
```

---

## Quick Start & Usage

### 1. Analyze Specific Target Files

```bash
blastradius src/utils/legacyParser.ts
```

```bash
blastradius "src/legacy/**/*.ts"
```

### 2. Auto-Analyze Git Changes (`blastradius diff`)

Analyze all modified/deleted files in your uncommitted Git status:

```bash
blastradius diff
```

Analyze changes comparing your branch against `main`:

```bash
blastradius diff main
```

### 3. Named Export Impact Analysis (`--export`)

Analyze what happens if you delete a single exported function or symbol:

```bash
blastradius src/scorer.ts --export DEFAULT_WEIGHTS
```

### 4. Live Watch Mode (`-w, --watch`)

```bash
blastradius -w
```

---

## CLI Options & Flags

| Command / Flag | Short | Description | Default |
| --- | --- | --- | --- |
| `<files...>` | | Target file(s) or glob pattern to analyze | Required |
| `diff [branch]` | | Subcommand to analyze Git modified/deleted files | |
| `--export <name>` | | Analyze impact of deleting a specific named export symbol | |
| `-w, --watch` | | Live watch mode monitoring source files for changes | `false` |
| `-i, --interactive` | | Run interactive deletion assistant workflow | `false` |
| `--fix` | | Auto-prune unused import declarations from dependent files | `false` |
| `--markdown` | | Output report in GitHub Flavored Markdown format | `false` |
| `--html [filepath]` | | Generate interactive visual HTML report file | Disabled |
| `--json` | | Output raw machine-readable JSON report | `false` |
| `--graph` | | Print ASCII dependent cascade tree graph | `false` |
| `--threshold <number>` | | Exit code 1 if confidence score < threshold (0-100) | Config default |
| `--config <path>` | | Path to custom configuration file | Auto-detected |
| `--verbose` | | Print detailed risk factors and positive safety reasoning | `false` |
| `--entry <file>` | | Define custom application entrypoint file path | Auto-detected |
| `--ignore-tests` | | Skip test suite reference and coverage analysis | `false` |
| `--version` | `-v` | Output version number | `1.2.0` |
| `--help` | `-h` | Display CLI help documentation | |

---

## Repository Configuration (`.blastradiusrc.json`)

Create a `.blastradiusrc.json` in your repository root to configure default settings:

```json
{
  "weights": {
    "directImpact": 0.35,
    "cascadeImpact": 0.25,
    "testPresence": 0.15,
    "gitActivity": 0.15,
    "runtimeCriticality": 0.10
  },
  "entrypoints": [
    "src/index.ts",
    "src/main.ts"
  ],
  "threshold": 75,
  "ignorePaths": [
    "node_modules/**",
    "dist/**"
  ]
}
```

---

## GitHub Actions CI Integration

Add `blastradius` to your Pull Request workflow:

```yaml
name: BlastRadius Impact Guard

on:
  pull_request:
    types: [opened, synchronize]

jobs:
  impact-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
      - run: npm ci
      - name: Analyze PR Deletion Impact
        run: |
          npx @fa33az/blastradius diff main --threshold 75 --markdown > impact-report.md
```

Or using native GitHub Action syntax:

```yaml
      - name: Run BlastRadius Guard
        uses: fa33az/blastradius@v1.2.0
        with:
          target: 'diff'
          threshold: '75'
```

---

## Scoring Engine Architecture

The Confidence Delete Score is computed deterministically using a weighted evaluation model:

```typescript
const weights = {
  directImpact: 0.35,        // Direct import connections
  cascadeImpact: 0.25,       // Indirect downstream cascade depth
  testPresence: 0.15,        // Test references and coverage data
  gitActivity: 0.15,         // Recency and author velocity
  runtimeCriticality: 0.10   // Entrypoint & core layer integration
};
```

### Score Range & Recommendations

- **80% - 100% (Very Safe)**: Isolated or unused module. Safe to delete.
- **60% - 79% (Safe with Caution)**: Moderate direct dependencies. Verify indirect downstream cascade depth.
- **40% - 59% (Moderate Risk)**: Multiple active dependents. Refactor modules before removal.
- **0% - 39% (High / Critical Risk)**: Deeply integrated into application entrypoints or core layers. Do not delete without architectural refactoring.

---

## License

Distributed under the MIT License. See [LICENSE](LICENSE) for more information.

---

## Author & Maintainer

Created and maintained by **fa33az** and open-source contributors.
