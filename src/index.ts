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
import { ConfigLoader } from './configLoader';
import { DiffAnalyzer } from './diffAnalyzer';
import { ExportAnalyzer } from './exportAnalyzer';
import { WatchEngine } from './watchEngine';
import { BlastRadiusOptions, BlastRadiusReport } from './types';

const program = new Command();

program
  .name('blastradius')
  .alias('impact-sim')
  .description('If I delete this file, what happens? Impact cascade simulator & risk estimator.')
  .version('1.2.0');

// Subcommand: blastradius diff [branch]
program
  .command('diff [branch]')
  .description('Automatically analyze impact for files changed in git status or branch diff')
  .option('--json', 'Output raw JSON report')
  .option('--graph', 'Print dependent cascade tree graph')
  .option('--threshold <number>', 'Custom safe-delete threshold (0-100)', parseFloat)
  .option('--verbose', 'Detailed reasoning and safety factors')
  .option('--markdown', 'Output report in GitHub Flavored Markdown format')
  .action(async (branch: string | undefined, options: BlastRadiusOptions) => {
    const cwd = process.cwd();
    const diffAnalyzer = new DiffAnalyzer(cwd);
    const changedFiles = await diffAnalyzer.getChangedFiles(branch);

    if (changedFiles.length === 0) {
      console.log(chalk.green('\n[OK] No modified or deleted files detected in Git diff.'));
      process.exit(0);
    }

    console.log(chalk.bold.cyan(`\n[GIT DIFF] Analyzing impact for ${changedFiles.length} changed file(s)...`));
    await runAnalysis(changedFiles, options);
  });

// Main Action
program
  .argument('[files...]', 'Target file(s) or glob pattern to simulate deletion for')
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
  .option('--export <name>', 'Analyze impact of deleting a specific named export symbol')
  .option('-w, --watch', 'Live watch mode monitoring source files', false)
  .option('--config <filepath>', 'Path to custom configuration file (.blastradiusrc.json)')
  .action(async (targetInputs: string[], options: BlastRadiusOptions) => {
    const cwd = process.cwd();

    if (options.watch) {
      const watchEngine = new WatchEngine(cwd);
      watchEngine.startWatch((changedFile) => {
        runAnalysis([changedFile], options);
      });
      return;
    }

    if (targetInputs.length === 0) {
      // Fallback to diff check if no files specified
      const diffAnalyzer = new DiffAnalyzer(cwd);
      const changedFiles = await diffAnalyzer.getChangedFiles();
      if (changedFiles.length > 0) {
        console.log(chalk.bold.cyan(`\n[AUTO DIFF] Analyzing ${changedFiles.length} file(s) modified in git status...`));
        await runAnalysis(changedFiles, options);
        return;
      }
      console.error(chalk.red(`\nError: Please specify target file(s), glob pattern, or run "blastradius diff".`));
      process.exit(1);
    }

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
      console.error(chalk.red(`\nError: No matching target files found.`));
      process.exit(1);
    }

    await runAnalysis(resolvedFiles, options);
  });

async function runAnalysis(resolvedFiles: string[], options: BlastRadiusOptions): Promise<void> {
  const cwd = process.cwd();
  const config = ConfigLoader.loadConfig(cwd, options.config);

  const effectiveThreshold = options.threshold ?? config.threshold;
  const effectiveEntry = options.entry || (config.entrypoints ? config.entrypoints[0] : undefined);

  // Build AST import dependency graph once
  const graphBuilder = new GraphBuilder(cwd, effectiveEntry);
  const graph = graphBuilder.buildGraph();

  const gitAnalyzer = new GitAnalyzer(cwd);
  const coverageAnalyzer = new CoverageAnalyzer(cwd, graph);
  const riskEngine = new RiskEngine();
  const scorer = new Scorer(config.weights);
  const reporter = new Reporter();
  const exportAnalyzer = new ExportAnalyzer(cwd, graph);

  for (const targetFile of resolvedFiles) {
    if (!fs.existsSync(targetFile)) {
      console.error(chalk.red(`\nError: Target file "${targetFile}" does not exist.`));
      continue;
    }

    const impactAnalyzer = new ImpactAnalyzer(graph);
    const impact = impactAnalyzer.analyze(targetFile);
    const gitMetrics = await gitAnalyzer.analyze(targetFile);
    const coverageMetrics = coverageAnalyzer.analyze(targetFile, options.ignoreTests);

    const riskAnalysis = riskEngine.evaluateRisk(impact, graph, gitMetrics, coverageMetrics);
    const scoreResult = scorer.calculateConfidence(impact, graph, gitMetrics, coverageMetrics, riskAnalysis);

    let exportImpact;
    if (options.export) {
      exportImpact = exportAnalyzer.analyzeExport(targetFile, options.export);
    }

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
      exportImpact,
    };

    // Render report
    reporter.render(report);

    // Handle export impact notification
    if (exportImpact) {
      console.log(chalk.bold.yellow(`\n[EXPORT ANALYSIS] Named Export: "${exportImpact.exportName}"`));
      console.log(`Referencing Modules: ${exportImpact.totalReferences}`);
      if (exportImpact.referencingModules.length > 0) {
        for (const mod of exportImpact.referencingModules) {
          console.log(chalk.gray(`  - ${mod}`));
        }
      }
    }

    // Handle --fix non-interactive mode
    if (options.fix && !options.interactive) {
      const fixer = new ImportFixer(cwd, graph);
      const fixRes = fixer.pruneUnusedImports(impact, targetFile);
      if (fixRes.success && fixRes.modifiedFiles.length > 0) {
        console.log(chalk.green(`[OK] Auto-pruned unused imports across ${fixRes.modifiedFiles.length} file(s):`));
        for (const file of fixRes.modifiedFiles) {
          console.log(chalk.gray(`  - ${file}`));
        }
      }
    }

    // Handle -i, --interactive mode
    if (options.interactive) {
      const interactiveHandler = new InteractiveHandler();
      await interactiveHandler.handleInteractive(report, impact, graph, cwd);
    }

    // Threshold check
    if (effectiveThreshold !== undefined && scoreResult.confidenceScore < effectiveThreshold) {
      console.error(
        chalk.red(`\nThreshold failure for ${impact.targetRelativePath}: Score ${scoreResult.confidenceScore}% is below required threshold ${effectiveThreshold}%.`)
      );
      process.exit(1);
    }
  }
}

program.parse(process.argv);
