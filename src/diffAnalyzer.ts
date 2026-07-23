import simpleGit, { SimpleGit } from 'simple-git';
import * as path from 'path';
import * as fs from 'fs';

export class DiffAnalyzer {
  private git: SimpleGit;
  private rootPath: string;

  constructor(rootPath: string) {
    this.rootPath = path.resolve(rootPath);
    this.git = simpleGit({ baseDir: this.rootPath });
  }

  public async getChangedFiles(targetBranch?: string): Promise<string[]> {
    const isRepo = await this.git.checkIsRepo().catch(() => false);
    if (!isRepo) return [];

    const changedFilesSet = new Set<string>();

    try {
      if (targetBranch && typeof targetBranch === 'string') {
        // Diff against target branch e.g. git diff --name-only main
        const diffSummary = await this.git.diff(['--name-only', targetBranch]);
        const lines = diffSummary.split('\n').filter(Boolean);
        for (const line of lines) {
          const absPath = path.resolve(this.rootPath, line.trim());
          if (fs.existsSync(absPath)) {
            changedFilesSet.add(absPath);
          }
        }
      } else {
        // Collect unstaged & staged modified/deleted files
        const status = await this.git.status();
        const allFiles = [
          ...status.modified,
          ...status.deleted,
          ...status.staged,
          ...status.created,
        ];
        for (const relFile of allFiles) {
          const absPath = path.resolve(this.rootPath, relFile);
          if (fs.existsSync(absPath)) {
            changedFilesSet.add(absPath);
          }
        }
      }
    } catch {
      // Git command failed gracefully
    }

    return Array.from(changedFilesSet);
  }
}
