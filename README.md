<p align="center">
  <img src="assets/logo.png" alt="blastradius logo" width="550" />
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/@fa33az/blastradius"><img src="https://img.shields.io/npm/v/@fa33az/blastradius.svg" alt="npm version" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-yellow.svg" alt="License: MIT" /></a>
  <a href="https://nodejs.org"><img src="https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg" alt="Node.js Version" /></a>
  <a href="https://www.typescriptlang.org/"><img src="https://img.shields.io/badge/TypeScript-5.3-blue.svg" alt="TypeScript" /></a>
</p>

<p align="center">
  <b>If I delete this file, what happens?</b>
</p>

`blastradius` (executable alias `impact-sim`) is a TypeScript CLI tool designed to simulate the structural impact and runtime risk of deleting any file or set of files from a codebase.

Unlike static dependency visualizers, `blastradius` calculates direct import breakage, indirect cascading module dependencies, test coverage risks, and Git history velocity to produce a transparent **Confidence Delete Score (0-100%)**.

---

## Key Features

- **Static AST Analysis**: Deep module graph scanning using `ts-morph` to track static imports, `import type` specifiers, and dynamic `import()` calls.
- **Batch Files & Glob Support**: Analyze single files, multiple file lists, or glob expressions (`"src/legacy/*.ts"`).
- **AST Import Auto-Pruner (`--fix`)**: Automatically removes unused `import` declarations from dependent files using AST manipulation when a target file is deleted.
- **Interactive Deletion Workflow (`-i, --interactive`)**: Real-time confirmation assistant to safely delete files, auto-prune imports, and run test suites.
- **GitHub PR Markdown Exporter (`--markdown`)**: Formats impact reports into GitHub Flavored Markdown for automated PR review comments.
- **Interactive Visual HTML Exporter (`--html`)**: Generates standalone dark-themed HTML report dashboards with dynamic dependency trees and logo integration.
- **Cascading Dependency Depth**: Traces full downstream impact chains with maximum cascade depth calculation.
- **Git History Metrics**: Evaluates repository churn, commit velocity, days since last modification, and unique author metrics via `simple-git`.
- **Test & Coverage Integration**: Detects active test references and parses Jest/Istanbul JSON coverage reports (`coverage-final.json`).
- **Runtime Risk Engine**: Evaluates entrypoint linkages, core system layers, configuration references, and legacy folder path discounts.

---

## Installation

### Prerequisites

- Node.js 18.0.0 or higher
- TypeScript repository (JS and TS/JSX/TSX supported)

### Global Installation

```bash
npm install -g @fa33az/blastradius
```

### Local Development / Linking

```bash
git clone https://github.com/fa33az/blastradius.git
cd blastradius
npm install
npm run build
npm link
```

---

## Quick Start

Simulate deleting a single target file:

```bash
blastradius src/utils/legacyParser.ts
```

Simulate deleting multiple files or glob patterns:

```bash
blastradius src/utils/a.ts src/utils/b.ts
```

```bash
blastradius "src/legacy/**/*.ts"
```

---

## CLI Options

| Flag | Description | Default |
| --- | --- | --- |
| `<files...>` | Target file(s) or glob pattern to analyze | Required |
| `-i, --interactive` | Run interactive deletion assistant workflow | `false` |
| `--fix` | Auto-prune unused import declarations from dependent files | `false` |
| `--markdown` | Output report in GitHub Flavored Markdown format | `false` |
| `--html [filepath]` | Generate interactive visual HTML report file | Disabled |
| `--json` | Output result as raw JSON | `false` |
| `--graph` | Print ASCII dependent cascade tree graph | `false` |
| `--threshold <number>` | Fail with exit code 1 if confidence score < threshold | Disabled |
| `--verbose` | Print detailed risk factors and positive safety reasoning | `false` |
| `--entry <file>` | Define custom application entrypoint file path | Auto-detected |
| `--ignore-tests` | Skip test suite reference and coverage analysis | `false` |
| `-v, --version` | Output version number | `1.1.0` |
| `-h, --help` | Display CLI help documentation | |

---

## Example Outputs

### Interactive Deletion Assistant (-i)

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

### Markdown Export (--markdown)

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

## Scoring Architecture

The Confidence Delete Score is computed using a weighted evaluation model:

```typescript
const weights = {
  directImpact: 0.35,        // Direct import connections
  cascadeImpact: 0.25,       // Indirect downstream cascade depth
  testPresence: 0.15,        // Test references and coverage data
  gitActivity: 0.15,         // Recency and author velocity
  runtimeCriticality: 0.10   // Entrypoint & core layer integration
};
```

Score Interpretation:
- **80% - 100%**: Very safe to delete (isolated or zombie module).
- **60% - 79%**: Safe with caution (verify indirect cascade depth).
- **40% - 59%**: Moderate risk (refactor dependents prior to removal).
- **0% - 39%**: High / Critical risk (do not delete without major refactoring).

---

## License

Distributed under the MIT License. See [LICENSE](LICENSE) for more information.

---

## Author

Created and maintained by **fa33az** and contributors.
