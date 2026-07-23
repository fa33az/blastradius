import * as fs from 'fs';
import * as path from 'path';
import { CoverageMetrics, DependencyGraph } from './types';

export class CoverageAnalyzer {
  private rootPath: string;
  private graph: DependencyGraph;

  constructor(rootPath: string, graph: DependencyGraph) {
    this.rootPath = path.resolve(rootPath);
    this.graph = graph;
  }

  public analyze(targetPath: string, ignoreTests: boolean = false): CoverageMetrics {
    if (ignoreTests) {
      return {
        coverageFileFound: false,
        hasCoverageData: false,
        lineCoveragePct: null,
        statementCoveragePct: null,
        branchCoveragePct: null,
        functionCoveragePct: null,
        referencingTests: [],
      };
    }

    const referencingTests: string[] = [];

    // Find test files in dependency graph referencing targetPath
    const targetNode = this.graph.nodes.get(targetPath);
    if (targetNode) {
      for (const edge of targetNode.dependentModules) {
        const sourceRelPath = this.graph.nodes.get(edge.sourcePath)?.relativePath || edge.sourcePath;
        if (this.isTestFile(sourceRelPath)) {
          referencingTests.push(sourceRelPath);
        }
      }
    }

    // Look for coverage JSON file (e.g. coverage/coverage-final.json)
    const possibleCoveragePaths = [
      path.join(this.rootPath, 'coverage', 'coverage-final.json'),
      path.join(this.rootPath, 'coverage', 'coverage-summary.json'),
    ];

    let coverageFileFound = false;
    let lineCoveragePct: number | null = null;
    let statementCoveragePct: number | null = null;
    let branchCoveragePct: number | null = null;
    let functionCoveragePct: number | null = null;
    let hasCoverageData = false;

    for (const covPath of possibleCoveragePaths) {
      if (fs.existsSync(covPath)) {
        coverageFileFound = true;
        try {
          const raw = fs.readFileSync(covPath, 'utf-8');
          const data = JSON.parse(raw);

          // Find entry for targetPath or normalized targetPath
          const targetKey = Object.keys(data).find(k => {
            const normK = path.resolve(k);
            return normK === targetPath;
          });

          if (targetKey && data[targetKey]) {
            hasCoverageData = true;
            const fileCov = data[targetKey];

            // Istanbul format coverage extraction
            if (fileCov.s) {
              const statementKeys = Object.keys(fileCov.s);
              const totalStatements = statementKeys.length;
              const coveredStatements = statementKeys.filter(k => fileCov.s[k] > 0).length;
              statementCoveragePct = totalStatements > 0 ? Math.round((coveredStatements / totalStatements) * 100) : 100;
            }

            if (fileCov.f) {
              const fnKeys = Object.keys(fileCov.f);
              const totalFns = fnKeys.length;
              const coveredFns = fnKeys.filter(k => fileCov.f[k] > 0).length;
              functionCoveragePct = totalFns > 0 ? Math.round((coveredFns / totalFns) * 100) : 100;
            }

            if (fileCov.b) {
              const branchKeys = Object.keys(fileCov.b);
              let totalBranches = 0;
              let coveredBranches = 0;
              for (const bk of branchKeys) {
                const arr = fileCov.b[bk];
                if (Array.isArray(arr)) {
                  totalBranches += arr.length;
                  coveredBranches += arr.filter(v => v > 0).length;
                }
              }
              branchCoveragePct = totalBranches > 0 ? Math.round((coveredBranches / totalBranches) * 100) : 100;
            }

            lineCoveragePct = statementCoveragePct; // Default line fallback to statement pct
          }
        } catch {
          // JSON parse failed or unexpected structure
        }
        break; // Stop after first match
      }
    }

    return {
      coverageFileFound,
      hasCoverageData,
      lineCoveragePct,
      statementCoveragePct,
      branchCoveragePct,
      functionCoveragePct,
      referencingTests,
    };
  }

  private isTestFile(filePath: string): boolean {
    const lower = filePath.toLowerCase();
    return (
      lower.includes('.test.') ||
      lower.includes('.spec.') ||
      lower.includes('__tests__') ||
      lower.includes('/tests/') ||
      lower.includes('/spec/')
    );
  }
}
