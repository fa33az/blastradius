import prompts from 'prompts';
import * as fs from 'fs';
import { execSync } from 'child_process';
import chalk from 'chalk';
import { BlastRadiusReport, DependencyGraph, ImpactResult } from './types';
import { ImportFixer } from './importFixer';

export class InteractiveHandler {
  public async handleInteractive(
    report: BlastRadiusReport,
    impact: ImpactResult,
    graph: DependencyGraph,
    cwd: string
  ): Promise<void> {
    console.log('\n' + chalk.bold.cyan('🤖 Interactive Deletion Assistant'));
    console.log(`Target File: ${chalk.bold.yellow(report.target)}`);
    console.log(`Deletion Confidence Score: ${chalk.bold.green(report.deletionConfidenceScore + '%')}\n`);

    const response = await prompts({
      type: 'select',
      name: 'action',
      message: 'Choose an action for this file:',
      choices: [
        { title: 'Delete file AND auto-prune unused imports (--fix)', value: 'delete-fix' },
        { title: 'Delete file ONLY', value: 'delete-only' },
        { title: 'Cancel action', value: 'cancel' },
      ],
      initial: 2,
    });

    if (!response.action || response.action === 'cancel') {
      console.log(chalk.gray('Action cancelled. No files modified.'));
      return;
    }

    if (response.action === 'delete-fix' || response.action === 'delete-only') {
      // Confirm deletion step
      const confirm = await prompts({
        type: 'confirm',
        name: 'confirmed',
        message: `Confirm PERMANENT deletion of ${report.target}?`,
        initial: false,
      });

      if (!confirm.confirmed) {
        console.log(chalk.gray('Deletion unconfirmed. Operation aborted.'));
        return;
      }

      // Perform file removal
      if (fs.existsSync(impact.targetPath)) {
        fs.unlinkSync(impact.targetPath);
        console.log(chalk.green(`\n✔ Deleted target file: ${report.target}`));
      }

      // If --fix requested, prune unused imports
      if (response.action === 'delete-fix') {
        const fixer = new ImportFixer(cwd, graph);
        const fixRes = fixer.pruneUnusedImports(impact, impact.targetPath);
        if (fixRes.success && fixRes.modifiedFiles.length > 0) {
          console.log(chalk.green(`✔ Auto-pruned unused imports across ${fixRes.modifiedFiles.length} file(s):`));
          for (const file of fixRes.modifiedFiles) {
            console.log(chalk.gray(`  • ${file}`));
          }
        }
      }

      // Prompt to run test suite
      const runTestPrompt = await prompts({
        type: 'confirm',
        name: 'runTest',
        message: 'Run npm test to verify codebase integrity?',
        initial: true,
      });

      if (runTestPrompt.runTest) {
        console.log(chalk.blue('\nRunning npm test...'));
        try {
          execSync('npm test', { cwd, stdio: 'inherit' });
          console.log(chalk.green('\n✔ Test suite executed cleanly!'));
        } catch {
          console.log(chalk.red('\n❌ Test suite failed after deletion. Check dependent imports.'));
        }
      }
    }
  }
}
