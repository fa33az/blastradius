import { CoverageMetrics, DependencyGraph, GitMetrics, ImpactResult, RiskAnalysis, ScoreResult, ScoringWeights } from './types';

export const DEFAULT_WEIGHTS: ScoringWeights = {
  directImpact: 0.35,
  cascadeImpact: 0.25,
  testPresence: 0.15,
  gitActivity: 0.15,
  runtimeCriticality: 0.10,
};

export class Scorer {
  private weights: ScoringWeights;

  constructor(customWeights?: Partial<ScoringWeights>) {
    this.weights = { ...DEFAULT_WEIGHTS, ...customWeights };
  }

  public calculateConfidence(
    impact: ImpactResult,
    graph: DependencyGraph,
    git: GitMetrics,
    coverage: CoverageMetrics,
    risk: RiskAnalysis
  ): ScoreResult {
    if (!impact.exists) {
      return {
        confidenceScore: 100,
        recommendation: 'File does not exist in repository. Safe to ignore.',
        riskLevel: 'Low',
        breakdown: {
          directImpactScore: 100,
          cascadeImpactScore: 100,
          testScore: 100,
          gitScore: 100,
          runtimeScore: 100,
        },
      };
    }

    // 1. Direct Impact Score (0 to 100, higher = safer to delete)
    const directCount = impact.directDependents.length + impact.dynamicDependents.length * 1.5;
    let directImpactScore = 100;
    if (directCount === 1) directImpactScore = 40;
    else if (directCount === 2) directImpactScore = 20;
    else if (directCount >= 3) directImpactScore = 0;

    // 2. Cascade Impact Score (0 to 100)
    let cascadeImpactScore = 100;
    if (impact.maxCascadeDepth === 1) cascadeImpactScore = 60;
    else if (impact.maxCascadeDepth === 2) cascadeImpactScore = 30;
    else if (impact.maxCascadeDepth >= 3) cascadeImpactScore = 0;

    // 3. Test Presence / Coverage Score (0 to 100)
    let testScore = 100;
    if (coverage.referencingTests.length > 0) {
      // If tests exist for this file, deleting it breaks tests (low delete confidence)
      testScore = Math.max(0, 100 - coverage.referencingTests.length * 35);
    }

    // 4. Git Activity Score (0 to 100)
    let gitScore = 100;
    if (git.isGitRepo && git.tracked) {
      if (git.daysSinceLastCommit !== null) {
        if (git.daysSinceLastCommit <= 14) gitScore -= 40;
        else if (git.daysSinceLastCommit <= 60) gitScore -= 20;
      }
      if (git.totalCommits > 15) gitScore -= 20;
      if (git.authorCount > 2) gitScore -= 20;
      gitScore = Math.max(0, gitScore);
    }

    // 5. Runtime Criticality Score (0 to 100)
    let runtimeScore = 100;
    const targetNode = graph.nodes.get(impact.targetPath);
    if (targetNode) {
      for (const edge of targetNode.dependentModules) {
        const parent = graph.nodes.get(edge.sourcePath);
        if (parent) {
          if (parent.isEntrypoint) runtimeScore -= 60;
          if (parent.isCoreLayer) runtimeScore -= 30;
          if (parent.isConfig) runtimeScore -= 20;
        }
      }
      if (targetNode.isLegacy) runtimeScore += 30;
      runtimeScore = Math.max(0, Math.min(100, runtimeScore));
    }

    // Weighted sum
    const totalWeighted =
      directImpactScore * this.weights.directImpact +
      cascadeImpactScore * this.weights.cascadeImpact +
      testScore * this.weights.testPresence +
      gitScore * this.weights.gitActivity +
      runtimeScore * this.weights.runtimeCriticality;

    const confidenceScore = Math.round(Math.min(100, Math.max(0, totalWeighted)));

    // Recommendation wording
    let recommendation = '';
    if (confidenceScore >= 80) {
      recommendation = 'Very safe to delete. Minimal to no downstream impact detected.';
    } else if (confidenceScore >= 60) {
      recommendation = 'Safe to delete with caution. Check indirect cascading dependents.';
    } else if (confidenceScore >= 40) {
      recommendation = 'Moderate risk. Refactor dependent modules before removal.';
    } else {
      recommendation = 'DO NOT DELETE. Deeply integrated core dependency; removal will break runtime.';
    }

    return {
      confidenceScore,
      recommendation,
      riskLevel: risk.level,
      breakdown: {
        directImpactScore,
        cascadeImpactScore,
        testScore,
        gitScore,
        runtimeScore,
      },
    };
  }
}
