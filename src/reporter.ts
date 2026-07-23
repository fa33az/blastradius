import chalk from 'chalk';
import { BlastRadiusReport, CascadeTreeNode } from './types';

export class Reporter {
  public render(report: BlastRadiusReport): void {
    if (report.options.json) {
      console.log(JSON.stringify(report, null, 2));
      return;
    }

    const divider = chalk.gray('--------------------------------------------------');
    console.log(`\n${divider}`);
    console.log(chalk.bold.magenta('🧠 Impact Simulation Report'));
    console.log(`${chalk.gray('Target:')} ${chalk.bold.cyan(report.target)}\n`);

    console.log(`${chalk.white('Direct Imports:')} ${this.formatCount(report.directImports)}`);
    console.log(`${chalk.white('Indirect Cascade Depth:')} ${chalk.yellow(report.indirectCascadeDepth)}`);
    console.log(`${chalk.white('Total Affected Modules:')} ${this.formatCount(report.totalAffectedModules)}\n`);

    const testsStr =
      report.testReferences.length > 0
        ? chalk.green(report.testReferences.join(', '))
        : chalk.gray('None');
    console.log(`${chalk.white('Test References:')} ${testsStr}`);

    const daysStr =
      report.gitMetrics.lastModifiedDaysAgo !== null
        ? `${report.gitMetrics.lastModifiedDaysAgo} days ago`
        : chalk.gray('Unknown');
    console.log(`${chalk.white('Last Modified:')} ${daysStr}`);
    console.log(`${chalk.white('Commit Count:')} ${report.gitMetrics.commitCount}`);
    console.log(`${chalk.white('Contributors:')} ${report.gitMetrics.contributors}\n`);

    console.log(`${chalk.white('Runtime Risk:')} ${this.formatRiskLevel(report.runtimeRisk)}`);
    console.log(`${chalk.white('Bug Probability if Deleted:')} ${this.formatBugProb(report.bugProbabilityPct)}\n`);

    console.log(`${chalk.white('Deletion Confidence Score:')} ${this.formatConfidence(report.deletionConfidenceScore)}\n`);

    console.log(chalk.bold.white('Recommendation:'));
    console.log(chalk.italic(report.recommendation));

    if (report.runtimeRisk === 'High' || report.runtimeRisk === 'Critical') {
      console.log(`\n${chalk.bgRed.bold.white(' ⚠️ HIGH RISK ')}`);
      console.log(chalk.red('This file is deeply integrated into core modules.'));
      console.log(chalk.red('Deletion is likely to cause runtime or build failure.'));
    }

    if (report.options.verbose) {
      console.log(`\n${chalk.bold.yellow('🔍 Detailed Reasoning:')}`);
      for (const reason of report.detailedReasons) {
        console.log(chalk.yellow(`  • ${reason}`));
      }
      if (report.positiveFactors.length > 0) {
        console.log(chalk.bold.green('\n✨ Safety Factors:'));
        for (const factor of report.positiveFactors) {
          console.log(chalk.green(`  • ${factor}`));
        }
      }
    }

    if (report.options.graph && report.tree && report.tree.length > 0) {
      console.log(`\n${chalk.bold.blue('🌳 Dependent Cascade Tree:')}`);
      for (const rootNode of report.tree) {
        this.printTree(rootNode, '', true);
      }
    }

    console.log(`${divider}\n`);
  }

  private printTree(node: CascadeTreeNode, prefix: string, isLast: boolean): void {
    const connector = isLast ? '└── ' : '├── ';
    const typeBadge =
      node.importType === 'type-only'
        ? chalk.gray('[type-only]')
        : node.importType === 'dynamic'
        ? chalk.magenta('[dynamic]')
        : chalk.cyan('[static]');

    console.log(`${prefix}${connector}${node.relativePath} ${typeBadge}`);

    const newPrefix = prefix + (isLast ? '    ' : '│   ');
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      const isChildLast = i === node.children.length - 1;
      this.printTree(child, newPrefix, isChildLast);
    }
  }

  private formatCount(count: number): string {
    if (count === 0) return chalk.green('0');
    if (count < 3) return chalk.yellow(count.toString());
    return chalk.red.bold(count.toString());
  }

  private formatRiskLevel(risk: 'Low' | 'Medium' | 'High' | 'Critical'): string {
    switch (risk) {
      case 'Low':
        return chalk.green.bold('Low');
      case 'Medium':
        return chalk.yellow.bold('Medium');
      case 'High':
        return chalk.red.bold('High');
      case 'Critical':
        return chalk.bgRed.white.bold(' CRITICAL ');
    }
  }

  private formatBugProb(pct: number): string {
    if (pct < 25) return chalk.green(`${pct}%`);
    if (pct < 55) return chalk.yellow(`${pct}%`);
    return chalk.red.bold(`${pct}%`);
  }

  private formatConfidence(score: number): string {
    if (score >= 75) return chalk.green.bold(`${score}%`);
    if (score >= 45) return chalk.yellow.bold(`${score}%`);
    return chalk.red.bold(`${score}%`);
  }
}
