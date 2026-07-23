import simpleGit, { SimpleGit } from 'simple-git';
import * as path from 'path';
import { GitMetrics } from './types';

export class GitAnalyzer {
  private git: SimpleGit;
  private rootPath: string;

  constructor(rootPath: string) {
    this.rootPath = path.resolve(rootPath);
    this.git = simpleGit({ baseDir: this.rootPath });
  }

  public async analyze(targetPath: string): Promise<GitMetrics> {
    const fallback: GitMetrics = {
      isGitRepo: false,
      tracked: false,
      daysSinceLastCommit: null,
      totalCommits: 0,
      authorCount: 0,
      authors: [],
      lastCommitDate: null,
    };

    try {
      const isRepo = await this.git.checkIsRepo();
      if (!isRepo) {
        return fallback;
      }
    } catch {
      return fallback;
    }

    const relPath = path.relative(this.rootPath, targetPath).replace(/\\/g, '/');

    try {
      // Check total commits and last commit date
      const log = await this.git.log({ file: relPath });
      const totalCommits = log.all.length;

      if (totalCommits === 0) {
        return {
          isGitRepo: true,
          tracked: false,
          daysSinceLastCommit: null,
          totalCommits: 0,
          authorCount: 0,
          authors: [],
          lastCommitDate: null,
        };
      }

      const latestCommit = log.latest;
      const lastCommitDateStr = latestCommit ? latestCommit.date : null;

      let daysSinceLastCommit: number | null = null;
      if (lastCommitDateStr) {
        const commitDate = new Date(lastCommitDateStr);
        const now = new Date();
        const diffTime = Math.abs(now.getTime() - commitDate.getTime());
        daysSinceLastCommit = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      }

      const authorsSet = new Set<string>();
      for (const commit of log.all) {
        if (commit.author_name) {
          authorsSet.add(commit.author_name);
        }
      }
      const authors = Array.from(authorsSet);

      return {
        isGitRepo: true,
        tracked: true,
        daysSinceLastCommit,
        totalCommits,
        authorCount: authors.length,
        authors,
        lastCommitDate: lastCommitDateStr,
      };
    } catch {
      return {
        isGitRepo: true,
        tracked: false,
        daysSinceLastCommit: null,
        totalCommits: 0,
        authorCount: 0,
        authors: [],
        lastCommitDate: null,
      };
    }
  }
}
