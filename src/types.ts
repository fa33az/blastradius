export type ImportType = 'static' | 'type-only' | 'dynamic';

export interface ImportEdge {
  sourcePath: string; // The file importing
  targetPath: string; // The file being imported
  type: ImportType;
  specifiers: string[];
}

export interface ModuleNode {
  absolutePath: string;
  relativePath: string;
  isEntrypoint: boolean;
  isCoreLayer: boolean;
  isConfig: boolean;
  isLegacy: boolean;
  importedModules: string[]; // Absolute paths this module imports
  dependentModules: ImportEdge[]; // Edges pointing to this module
}

export interface DependencyGraph {
  nodes: Map<string, ModuleNode>;
  rootPath: string;
  totalFiles: number;
}

export interface CascadeTreeNode {
  relativePath: string;
  absolutePath: string;
  depth: number;
  importType: ImportType;
  children: CascadeTreeNode[];
}

export interface ImpactResult {
  targetPath: string;
  targetRelativePath: string;
  exists: boolean;
  directDependents: string[];
  typeOnlyDependents: string[];
  dynamicDependents: string[];
  indirectDependents: string[];
  totalAffected: number;
  maxCascadeDepth: number;
  cascadeTree: CascadeTreeNode[];
}

export interface GitMetrics {
  isGitRepo: boolean;
  tracked: boolean;
  daysSinceLastCommit: number | null;
  totalCommits: number;
  authorCount: number;
  authors: string[];
  lastCommitDate: string | null;
}

export interface CoverageMetrics {
  coverageFileFound: boolean;
  hasCoverageData: boolean;
  lineCoveragePct: number | null;
  statementCoveragePct: number | null;
  branchCoveragePct: number | null;
  functionCoveragePct: number | null;
  referencingTests: string[];
}

export interface RiskAnalysis {
  level: 'Low' | 'Medium' | 'High' | 'Critical';
  bugProbabilityPct: number;
  reasons: string[];
  positiveFactors: string[];
}

export interface ScoringWeights {
  directImpact: number;
  cascadeImpact: number;
  testPresence: number;
  gitActivity: number;
  runtimeCriticality: number;
}

export interface ScoreResult {
  confidenceScore: number; // 0 to 100
  recommendation: string;
  riskLevel: 'Low' | 'Medium' | 'High' | 'Critical';
  breakdown: {
    directImpactScore: number;
    cascadeImpactScore: number;
    testScore: number;
    gitScore: number;
    runtimeScore: number;
  };
}

export interface BlastRadiusOptions {
  json?: boolean;
  graph?: boolean;
  threshold?: number;
  verbose?: boolean;
  entry?: string;
  ignoreTests?: boolean;
}

export interface BlastRadiusReport {
  target: string;
  directImports: number;
  indirectCascadeDepth: number;
  totalAffectedModules: number;
  testReferences: string[];
  gitMetrics: {
    lastModifiedDaysAgo: number | null;
    commitCount: number;
    contributors: number;
  };
  coverageMetrics: {
    covered: boolean;
    lineCoveragePct: number | null;
  };
  runtimeRisk: 'Low' | 'Medium' | 'High' | 'Critical';
  bugProbabilityPct: number;
  deletionConfidenceScore: number;
  recommendation: string;
  detailedReasons: string[];
  positiveFactors: string[];
  options: BlastRadiusOptions;
  tree?: CascadeTreeNode[];
}
