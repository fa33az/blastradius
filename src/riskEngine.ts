import { CoverageMetrics, DependencyGraph, GitMetrics, ImpactResult, RiskAnalysis } from './types';

export class RiskEngine {
  public evaluateRisk(
    impact: ImpactResult,
    graph: DependencyGraph,
    git: GitMetrics,
    coverage: CoverageMetrics
  ): RiskAnalysis {
    const reasons: string[] = [];
    const positiveFactors: string[] = [];
    let riskPoints = 0;

    const targetNode = graph.nodes.get(impact.targetPath);

    if (!impact.exists || !targetNode) {
      return {
        level: 'Low',
        bugProbabilityPct: 0,
        reasons: ['File does not exist in project'],
        positiveFactors: ['File is already absent'],
      };
    }

    // 1. Direct dependents analysis
    if (impact.directDependents.length > 0) {
      riskPoints += Math.min(impact.directDependents.length * 15, 40);
      reasons.push(`${impact.directDependents.length} module(s) directly import this file`);
    } else {
      positiveFactors.push('Zero direct imports found in codebase');
    }

    // 2. Cascade depth & total affected
    if (impact.maxCascadeDepth > 1) {
      riskPoints += Math.min(impact.maxCascadeDepth * 10, 30);
      reasons.push(`Indirect dependency cascade depth of ${impact.maxCascadeDepth}`);
    }

    if (impact.totalAffected > 5) {
      riskPoints += 15;
      reasons.push(`High number of total affected modules (${impact.totalAffected})`);
    }

    // 3. Entrypoint & Core Layer presence
    let importedByEntrypoint = false;
    let importedByCore = false;
    let importedByConfig = false;

    for (const edge of targetNode.dependentModules) {
      const parentNode = graph.nodes.get(edge.sourcePath);
      if (parentNode) {
        if (parentNode.isEntrypoint) importedByEntrypoint = true;
        if (parentNode.isCoreLayer) importedByCore = true;
        if (parentNode.isConfig) importedByConfig = true;
      }
    }

    if (importedByEntrypoint) {
      riskPoints += 30;
      reasons.push('File is directly imported by an application entrypoint');
    }

    if (importedByCore) {
      riskPoints += 20;
      reasons.push('File is deeply integrated into core layer modules');
    }

    if (importedByConfig) {
      riskPoints += 15;
      reasons.push('File is referenced in bootstrap or configuration modules');
    }

    // 4. Dynamic import uncertainty
    if (impact.dynamicDependents.length > 0) {
      riskPoints += 15;
      reasons.push('Referenced via dynamic imports (runtime resolution uncertainty)');
    }

    // 5. Git activity & Author metrics
    if (git.isGitRepo && git.tracked) {
      if (git.daysSinceLastCommit !== null && git.daysSinceLastCommit <= 30) {
        riskPoints += 15;
        reasons.push(`Active file: modified recently (${git.daysSinceLastCommit} days ago)`);
      } else if (git.daysSinceLastCommit !== null && git.daysSinceLastCommit > 180) {
        positiveFactors.push(`Inactive file: last modified ${git.daysSinceLastCommit} days ago`);
      }

      if (git.authorCount > 2) {
        riskPoints += 10;
        reasons.push(`Multiple contributors (${git.authorCount} authors) have touched this file`);
      }

      if (git.totalCommits > 10) {
        riskPoints += 10;
        reasons.push(`High commit velocity (${git.totalCommits} commits)`);
      }
    }

    // 6. Test coverage presence
    if (coverage.referencingTests.length > 0) {
      reasons.push(`Referenced by ${coverage.referencingTests.length} active test file(s)`);
    } else {
      riskPoints += 10;
      positiveFactors.push('No test suites reference this file directly');
    }

    // 7. Legacy folder reduction
    if (targetNode.isLegacy) {
      riskPoints = Math.max(0, riskPoints - 25);
      positiveFactors.push('Located in legacy/deprecated directory');
    }

    // Calculate Bug Probability % (0 - 100)
    const bugProbabilityPct = Math.min(Math.max(riskPoints, 5), 98);

    // Determine Risk Level
    let level: 'Low' | 'Medium' | 'High' | 'Critical' = 'Low';
    if (bugProbabilityPct >= 75) {
      level = 'Critical';
    } else if (bugProbabilityPct >= 50) {
      level = 'High';
    } else if (bugProbabilityPct >= 25) {
      level = 'Medium';
    }

    return {
      level,
      bugProbabilityPct,
      reasons,
      positiveFactors,
    };
  }
}
