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

- **Static AST Dependency Graph**: Deep scanning powered by `ts-morph` to track static imports, `import type` declarations, re-exports, and dynamic `import()` calls.
- **Batch Processing & Wildcard Globs**: Analyze individual files, file lists, or wildcard glob patterns (`"src/legacy/**/*.ts"`).
- **AST Import Auto-Pruner (`--fix`)**: Automatically removes unused `import` declarations from all dependent files when a target file is deleted.
- **Interactive Deletion Workflow (`-i, --interactive`)**: Step-by-step CLI prompt to safely preview impact, confirm deletion, auto-prune imports, and run test suites.
- **GitHub PR Markdown Exporter (`--markdown`)**: Formats impact reports into GitHub Flavored Markdown for automated PR review comments.
- **Visual HTML Report Exporter (`--html`)**: Generates standalone dark-themed HTML report dashboards with dynamic dependency trees.
- **Git Churn & Velocity Metrics**: Analyzes commit frequency, recency, author counts, and modification history using `simple-git`.
- **Test Suite & Coverage Integration**: Detects active test references and parses Jest/Istanbul JSON coverage reports (`coverage-final.json`).

---

## Quick Start

### Installation

#### Global Installation via npm

```bash
npm install -g @fa33az/blastradius
```

#### Local Project Installation

```bash
npm install --save-dev @fa33az/blastradius
```

### Basic Command Usage

Run `blastradius` or `impact-sim` on any target file in your repository:

```bash
blastradius src/utils/legacyParser.ts
```

Analyze multiple files or glob patterns:

```bash
blastradius src/utils/a.ts src/utils/b.ts
```

```bash
blastradius "src/legacy/**/*.ts"
```

---

## CLI Options & Flags

| Flag | Short | Description | Default |
| --- | --- | --- | --- |
| `<files...>` | | Target file(s) or glob pattern to analyze | Required |
| `--interactive` | `-i` | Run interactive deletion assistant workflow | `false` |
| `--fix` | | Auto-prune unused import declarations from dependent files | `false` |
| `--markdown` | | Output report in GitHub Flavored Markdown format | `false` |
| `--html [filepath]` | | Generate interactive visual HTML report file | Disabled |
| `--json` | | Output raw machine-readable JSON report | `false` |
| `--graph` | | Print ASCII dependent cascade tree graph | `false` |
| `--threshold <number>` | | Exit code 1 if confidence score < threshold (0-100) | Disabled |
| `--verbose` | | Print detailed risk factors and positive safety reasoning | `false` |
| `--entry <file>` | | Define custom application entrypoint file path | Auto-detected |
| `--ignore-tests` | | Skip test suite reference and coverage analysis | `false` |
| `--version` | `-v` | Output version number | `1.1.0` |
| `--help` | `-h` | Display CLI help documentation | |

---

## Example Usage & Outputs

### 1. Interactive Deletion Workflow (`-i`)

```bash
blastradius src/utils/legacyParser.ts -i
```

```
Interactive Deletion Assistant
Target File: src/utils/legacyParser.ts
Deletion Confidence Score: 85%

? Choose an action for this file: (Use arrow keys)
> Delete file AND auto-prune unused imports (--fix)
  Delete file ONLY
  Cancel action
```

### 2. Standard Terminal Output

```bash
blastradius src/scorer.ts --verbose --graph
```

```
--------------------------------------------------
Impact Simulation Report
Target: src/scorer.ts

Direct Imports: 1
Indirect Cascade Depth: 1
Total Affected Modules: 1

Test References: None
Last Modified: Unknown
Commit Count: 0
Contributors: 0

Runtime Risk: High
Bug Probability if Deleted: 55%

Deletion Confidence Score: 63%

Recommendation:
Safe to delete with caution. Check indirect cascading dependents.

 [HIGH RISK] 
This file is deeply integrated into core modules.
Deletion is likely to cause runtime or build failure.

Detailed Reasoning:
  - 1 module(s) directly import this file
  - File is directly imported by an application entrypoint

Safety Factors:
  - No test suites reference this file directly

Dependent Cascade Tree:
└── src/index.ts [static]
--------------------------------------------------
```

### 3. GitHub PR Comment Markdown Export (`--markdown`)

```bash
blastradius src/scorer.ts --markdown
```

```markdown
# Impact Simulation Report: `src/scorer.ts`

> **Tagline**: If I delete this file, what happens?

### Overview Metrics
| Metric | Value |
| --- | --- |
| **Target File** | `src/scorer.ts` |
| **Direct Imports** | 1 |
| **Cascade Depth** | 1 |
| **Total Affected Modules** | 1 |
| **Test References** | None |
| **Runtime Risk** | **High** |
| **Bug Probability** | **55%** |
| **Delete Confidence Score** | **63%** |

> [!CAUTION]
> **HIGH RISK DELETION DETECTED**
> This file is deeply integrated into core modules. Deletion is likely to cause build or runtime failure.
```

---

## GitHub Actions CI Integration

Enforce safe file deletion in Pull Requests using the `--threshold` flag:

```yaml
name: BlastRadius Impact Guard

on:
  pull_request:
    paths:
      - 'src/**'

jobs:
  impact-check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
      - run: npm ci
      - name: Check Deletion Impact
        run: |
          npx @fa33az/blastradius src/utils/legacyParser.ts --threshold 75 --markdown > impact-report.md
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

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

Distributed under the MIT License. See [LICENSE](LICENSE) for more information.

---

## Author & Maintainer

Created and maintained by **fa33az** and open-source contributors.
