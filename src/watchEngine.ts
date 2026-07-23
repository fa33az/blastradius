import chokidar from 'chokidar';
import * as path from 'path';
import chalk from 'chalk';

export class WatchEngine {
  private cwd: string;

  constructor(cwd: string) {
    this.cwd = path.resolve(cwd);
  }

  public startWatch(onFileChange: (changedFile: string) => void): void {
    console.log('\n' + chalk.bold.cyan('👀 Live Watch Mode Active...'));
    console.log(chalk.gray(`Watching directory: ${this.cwd}`));
    console.log(chalk.gray('Press Ctrl+C to stop.\n'));

    const watcher = chokidar.watch(['src/**/*.ts', 'src/**/*.js', 'src/**/*.tsx', 'src/**/*.jsx'], {
      cwd: this.cwd,
      ignored: ['**/node_modules/**', '**/dist/**', '**/.git/**'],
      persistent: true,
      ignoreInitial: true,
    });

    watcher.on('change', (relPath) => {
      const absPath = path.resolve(this.cwd, relPath);
      console.log(chalk.bold.yellow(`\n[CHANGE] File modified: ${relPath}`));
      onFileChange(absPath);
    });
  }
}
