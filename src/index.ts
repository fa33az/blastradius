import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs';
import { globSync } from 'glob';
import chalk from 'chalk';
import { GraphBuilder } from './graphBuilder';
import { ImpactAnalyzer } from './impactAnalyzer';
import { GitAnalyzer } from './gitAnalyzer';
import { CoverageAnalyzer } from './coverageAnalyzer';
import { RiskEngine } from './riskEngine';
import { Scorer } from './scorer';
import { Reporter } from './reporter';
import { ImportFixer } from './importFixer';
import { InteractiveHandler } from './interactive';
import { BlastRadiusOptions, BlastRadiusReport } from './types';

const program = new Command();

program
  .name('blastradius')
  .alias('impact-sim')
  .description('If I delete this file, what happens? Impact cascade simulator & risk estimator.')
  .version('1.1.0')
  .argument('<files...>', 'Target file(s) or glob pattern to simulate deletion for')
  .option('--json', 'Output raw JSON report')
  .option('--graph', 'Print dependent cascade tree graph')
  .option('--threshold <number>', 'Custom safe-delete threshold (0-100)', parseFloat)
  .option('--verbose', 'Detailed reasoning and safety factors')
  .option('--entry <file>', 'Define custom entrypoint file')
  .option('--ignore-tests', 'Ignore test file and coverage analysis', false)
  .option('--fix', 'Auto-prune unused import declarations from dependent files', false)
  .option('-i, --interactive', 'Run interactive deletion assistant', false)
  .option('--markdown', 'Output report in GitHub Flavored Markdown format', false)
  .option('--html [filepath]', 'Generate interactive visual HTML report file')
  .action(async (targetInputs: string[], options: BlastRadiusOptions) => {
    try {
      const cwd = process.cwd();

      // Resolve glob patterns and multiple files
      const resolvedFilesSet = new Set<string>();
      for (const input of targetInputs) {
        if (input.includes('*')) {
          const matches = globSync(input, { cwd, absolute: true });
          for (const match of matches) {
            resolvedFilesSet.add(path.resolve(match));
          }
        } else {
          const resolved = path.isAbsolute(input) ? path.resolve(input) : path.resolve(cwd, input);
          resolvedFilesSet.add(resolved);
        }
      }

      const resolvedFiles = Array.from(resolvedFilesSet);

      if (resolvedFiles.length === 0) {
        console.error(chalk.red(`\n❌ Error: No matching target files found.`));
        process.exit(1);
      }

      // Build AST import dependency graph once
      const graphBuilder = new GraphBuilder(cwd, options.entry);
      const graph = graphBuilder.buildGraph();

      const gitAnalyzer = new GitAnalyzer(cwd);
      const coverageAnalyzer = new CoverageAnalyzer(cwd, graph);
      const riskEngine = new RiskEngine();
      const scorer = new Scorer();
      const reporter = new Reporter();

      // Process each file in targets list
      for (const targetFile of resolvedFiles) {
        if (!fs.existsSync(targetFile)) {
          console.error(chalk.red(`\n❌ Error: Target file "${targetFile}" does not exist.`));
          continue;
        }

        const impactAnalyzer = new ImpactAnalyzer(graph);
        const impact = impactAnalyzer.analyze(targetFile);
        const gitMetrics = await gitAnalyzer.analyze(targetFile);
        const coverageMetrics = coverageAnalyzer.analyze(targetFile, options.ignoreTests);

        const riskAnalysis = riskEngine.evaluateRisk(impact, graph, gitMetrics, coverageMetrics);
        const scoreResult = scorer.calculateConfidence(impact, graph, gitMetrics, coverageMetrics, riskAnalysis);

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

        // Render report
        reporter.render(report);

        // Handle --fix non-interactive mode
        if (options.fix && !options.interactive) {
          const fixer = new ImportFixer(cwd, graph);
          const fixRes = fixer.pruneUnusedImports(impact, targetFile);
          if (fixRes.success && fixRes.modifiedFiles.length > 0) {
            console.log(chalk.green(`✔ Auto-pruned unused imports across ${fixRes.modifiedFiles.length} file(s):`));
            for (const file of fixRes.modifiedFiles) {
              console.log(chalk.gray(`  • ${file}`));
            }
          }
        }

        // Handle -i, --interactive mode
        if (options.interactive) {
          const interactiveHandler = new InteractiveHandler();
          await interactiveHandler.handleInteractive(report, impact, graph, cwd);
        }

        // Threshold check
        if (options.threshold !== undefined && scoreResult.confidenceScore < options.threshold) {
          console.error(
            chalk.red(`\n⛔ Threshold failure for ${impact.targetRelativePath}: Score ${scoreResult.confidenceScore}% is below required threshold ${options.threshold}%.`)
          );
          process.exit(1);
        }
      }
    } catch (err: any) {
      console.error(chalk.red(`\n💥 Fatal Error executing blastradius: ${err.message}`));
      process.exit(1);
    }
  });

program.parse(process.argv);
