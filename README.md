# blastradius

[![npm version](https://img.shields.io/npm/v/blastradius.svg)](https://www.npmjs.com/package/blastradius)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3-blue.svg)](https://www.typescriptlang.org/)

> If I delete this file, what happens?

`blastradius` (executable alias `impact-sim`) is a TypeScript CLI tool designed to simulate the structural impact and runtime risk of deleting any file from a codebase.

Unlike static dependency visualizers, `blastradius` calculates direct import breakage, indirect cascading module dependencies, test coverage risks, and Git history velocity to produce a transparent **Confidence Delete Score (0-100%)**.

---

## Key Features

- **Static AST Analysis**: Deep module graph scanning using `ts-morph` to track static imports, `import type` specifiers, and dynamic `import()` calls.
- **Cascading Dependency Depth**: Traces full downstream impact chains with maximum cascade depth calculation.
- **Git History Metrics**: Evaluates repository churn, commit velocity, days since last modification, and unique author metrics via `simple-git`.
- **Test & Coverage Integration**: Detects active test references and parses Jest/Istanbul JSON coverage reports (`coverage-final.json`).
- **Runtime Risk Engine**: Evaluates entrypoint linkages, core system layers, configuration references, and legacy folder path discounts.
- **Transparent Scoring Engine**: Fully configurable weighted score model mapping risk parameters to a 0-100% confidence rating.
- **Machine-Readable & CI Friendly**: Native `--json` output and optional `--threshold` flags to enforce safe deletion limits in CI pipelines.

---

## Installation

### Prerequisites

- Node.js 18.0.0 or higher
- TypeScript repository (JS and TS/JSX/TSX supported)

### Global Installation

```bash
npm install -g blastradius
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

Simulate deleting a target file in your repository:

```bash
blastradius src/utils/legacyParser.ts
```

Or using the alias command:

```bash
impact-sim src/utils/legacyParser.ts
```

---

## CLI Options

| Flag | Description | Default |
| --- | --- | --- |
| `<file>` | Target relative or absolute file path to analyze | Required |
| `--json` | Output result as raw JSON | `false` |
| `--graph` | Print ASCII dependent cascade tree graph | `false` |
| `--threshold <number>` | Fail with exit code 1 if confidence score < threshold | Disabled |
| `--verbose` | Print detailed risk factors and positive safety reasoning | `false` |
| `--entry <file>` | Define custom application entrypoint file path | Auto-detected |
| `--ignore-tests` | Skip test suite reference and coverage analysis | `false` |
| `-v, --version` | Output version number | `1.0.0` |
| `-h, --help` | Display CLI help documentation | |

---

## Example Outputs

### Standard Terminal Report

```
--------------------------------------------------
Impact Simulation Report
Target: src/utils/legacyParser.ts

Direct Imports: 0
Indirect Cascade Depth: 2
Total Affected Modules: 3

Test References: None
Last Modified: 482 days ago
Commit Count: 2
Contributors: 1

Runtime Risk: Medium
Bug Probability if Deleted: 32%

Deletion Confidence Score: 78%

Recommendation:
Safe to delete with caution. Check indirect cascading dependents.
--------------------------------------------------
```

### High Risk Terminal Warning

```
--------------------------------------------------
Impact Simulation Report
Target: src/core/kernel.ts

Direct Imports: 8
Indirect Cascade Depth: 4
Total Affected Modules: 24

Test References: src/__tests__/kernel.test.ts
Last Modified: 2 days ago
Commit Count: 45
Contributors: 4

Runtime Risk: High
Bug Probability if Deleted: 82%

Deletion Confidence Score: 18%

Recommendation:
DO NOT DELETE. Deeply integrated core dependency; removal will break runtime.

 HIGH RISK 
This file is deeply integrated into core modules.
Deletion is likely to cause runtime or build failure.
--------------------------------------------------
```

### JSON Output Format

```json
{
  "target": "src/utils/legacyParser.ts",
  "directImports": 0,
  "indirectCascadeDepth": 2,
  "totalAffectedModules": 3,
  "testReferences": [],
  "gitMetrics": {
    "lastModifiedDaysAgo": 482,
    "commitCount": 2,
    "contributors": 1
  },
  "coverageMetrics": {
    "covered": false,
    "lineCoveragePct": null
  },
  "runtimeRisk": "Medium",
  "bugProbabilityPct": 32,
  "deletionConfidenceScore": 78,
  "recommendation": "Safe to delete with caution.",
  "detailedReasons": [
    "Indirect dependency cascade depth of 2"
  ],
  "positiveFactors": [
    "Zero direct imports found in codebase",
    "Inactive file: last modified 482 days ago"
  ]
}
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

## Contributing

Contributions, issues, and feature requests are welcome. Feel free to check the issues page or submit a pull request.

1. Fork the project repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

Distributed under the MIT License. See [LICENSE](LICENSE) for more information.

---

## Author

Created and maintained by **fa33az** and contributors.
