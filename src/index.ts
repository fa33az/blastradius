import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs';
import chalk from 'chalk';
import { GraphBuilder } from './graphBuilder';
import { ImpactAnalyzer } from './impactAnalyzer';
import { GitAnalyzer } from './gitAnalyzer';
import { CoverageAnalyzer } from './coverageAnalyzer';
import { RiskEngine } from './riskEngine';
import { Scorer } from './scorer';
import { Reporter } from './reporter';
import { BlastRadiusOptions, BlastRadiusReport } from './types';

const program = new Command();

program
  .name('blastradius')
  .alias('impact-sim')
  .description('If I delete this file, what happens? Impact cascade simulator & risk estimator.')
  .version('1.0.0')
  .argument('<file>', 'Target file to simulate deletion for')
  .option('--json', 'Output raw JSON report')
  .option('--graph', 'Print dependent cascade tree graph')
  .option('--threshold <number>', 'Custom safe-delete threshold (0-100)', parseFloat)
  .option('--verbose', 'Detailed reasoning and safety factors')
  .option('--entry <file>', 'Define custom entrypoint file')
  .option('--ignore-tests', 'Ignore test file and coverage analysis', false)
  .action(async (targetFile: string, options: BlastRadiusOptions) => {
    try {
      const cwd = process.cwd();
      const resolvedTarget = path.isAbsolute(targetFile)
        ? path.resolve(targetFile)
        : path.resolve(cwd, targetFile);

      if (!fs.existsSync(resolvedTarget)) {
        console.error(chalk.red(`\n❌ Error: Target file "${targetFile}" does not exist.`));
        console.error(chalk.gray(`Resolved path: ${resolvedTarget}\n`));
        process.exit(1);
      }

      // 1. Build AST import dependency graph
      const graphBuilder = new GraphBuilder(cwd, options.entry);
      const graph = graphBuilder.buildGraph();

      // 2. Perform direct and indirect impact analysis
      const impactAnalyzer = new ImpactAnalyzer(graph);
      const impact = impactAnalyzer.analyze(resolvedTarget);

      // 3. Perform Git activity analysis
      const gitAnalyzer = new GitAnalyzer(cwd);
      const gitMetrics = await gitAnalyzer.analyze(resolvedTarget);

      // 4. Perform Test & Coverage analysis
      const coverageAnalyzer = new CoverageAnalyzer(cwd, graph);
      const coverageMetrics = coverageAnalyzer.analyze(resolvedTarget, options.ignoreTests);

      // 5. Evaluate runtime risk heuristics
      const riskEngine = new RiskEngine();
      const riskAnalysis = riskEngine.evaluateRisk(impact, graph, gitMetrics, coverageMetrics);

      // 6. Calculate Confidence Delete Score
      const scorer = new Scorer();
      const scoreResult = scorer.calculateConfidence(impact, graph, gitMetrics, coverageMetrics, riskAnalysis);

      // Build structured report object
      const report: BlastRadiusReport = {
        target: impact.targetRelativePath,
        directImports: impact.directDependents.length,
        indirectCascadeDepth: impact.maxCascadeDepth,
        totalAffectedModules: impact.totalAffected,
        testReferences: coverageMetrics.referencingTests,
        gitMetrics: {
          lastModifiedDaysAgo: gitMetrics.daysSinceLastCommit,
          commitCount: gitMetrics.totalCommits,
          contributors: gitMetrics.authorCount,
        },
        coverageMetrics: {
          covered: coverageMetrics.hasCoverageData,
          lineCoveragePct: coverageMetrics.lineCoveragePct,
        },
        runtimeRisk: riskAnalysis.level,
        bugProbabilityPct: riskAnalysis.bugProbabilityPct,
        deletionConfidenceScore: scoreResult.confidenceScore,
        recommendation: scoreResult.recommendation,
        detailedReasons: riskAnalysis.reasons,
        positiveFactors: riskAnalysis.positiveFactors,
        options,
        tree: options.graph ? impact.cascadeTree : undefined,
      };

      // Render output
      const reporter = new Reporter();
      reporter.render(report);

      // Handle custom threshold check if specified
      if (options.threshold !== undefined) {
        if (scoreResult.confidenceScore < options.threshold) {
          if (!options.json) {
            console.error(
              chalk.red(`\n⛔ Threshold failure: Score ${scoreResult.confidenceScore}% is below required threshold ${options.threshold}%.`)
            );
          }
          process.exit(1);
        }
      }
    } catch (err: any) {
      console.error(chalk.red(`\n💥 Fatal Error executing blastradius: ${err.message}`));
      process.exit(1);
    }
  });

program.parse(process.argv);
