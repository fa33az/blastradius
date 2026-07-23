import { BlastRadiusReport, CascadeTreeNode } from './types';

export class MarkdownReporter {
  public renderMarkdown(report: BlastRadiusReport): string {
    const lines: string[] = [];

    lines.push(`# Impact Simulation Report: \`${report.target}\``);
    lines.push('');
    lines.push(`> **Tagline**: If I delete this file, what happens?`);
    lines.push('');

    // Summary Table
    lines.push('### Overview Metrics');
    lines.push('| Metric | Value |');
    lines.push('| --- | --- |');
    lines.push(`| **Target File** | \`${report.target}\` |`);
    lines.push(`| **Direct Imports** | ${report.directImports} |`);
    lines.push(`| **Cascade Depth** | ${report.indirectCascadeDepth} |`);
    lines.push(`| **Total Affected Modules** | ${report.totalAffectedModules} |`);
    lines.push(`| **Test References** | ${report.testReferences.length > 0 ? report.testReferences.join(', ') : 'None'} |`);
    lines.push(`| **Last Modified** | ${report.gitMetrics.lastModifiedDaysAgo !== null ? `${report.gitMetrics.lastModifiedDaysAgo} days ago` : 'Unknown'} |`);
    lines.push(`| **Runtime Risk** | **${report.runtimeRisk}** |`);
    lines.push(`| **Bug Probability** | **${report.bugProbabilityPct}%** |`);
    lines.push(`| **Delete Confidence Score** | **${report.deletionConfidenceScore}%** |`);
    lines.push('');

    // Risk Alert Box
    if (report.runtimeRisk === 'High' || report.runtimeRisk === 'Critical') {
      lines.push('> [!CAUTION]');
      lines.push('> **HIGH RISK DELETION DETECTED**');
      lines.push('> This file is deeply integrated into core modules. Deletion is likely to cause build or runtime failure.');
      lines.push('');
    } else {
      lines.push('> [!NOTE]');
      lines.push(`> **Recommendation**: ${report.recommendation}`);
      lines.push('');
    }

    // Detailed Reasoning
    lines.push('### Risk Reasoning & Factors');
    if (report.detailedReasons.length > 0) {
      lines.push('#### Risk Factors:');
      for (const reason of report.detailedReasons) {
        lines.push(`- ${reason}`);
      }
      lines.push('');
    }

    if (report.positiveFactors.length > 0) {
      lines.push('#### Safety Factors:');
      for (const factor of report.positiveFactors) {
        lines.push(`- ${factor}`);
      }
      lines.push('');
    }

    // Cascade Tree
    if (report.tree && report.tree.length > 0) {
      lines.push('### Dependent Cascade Tree');
      lines.push('```');
      for (const rootNode of report.tree) {
        this.appendTreeLines(rootNode, '', true, lines);
      }
      lines.push('```');
      lines.push('');
    }

    return lines.join('\n');
  }

  private appendTreeLines(node: CascadeTreeNode, prefix: string, isLast: boolean, lines: string[]): void {
    const connector = isLast ? '└── ' : '├── ';
    const typeBadge = `[${node.importType}]`;
    lines.push(`${prefix}${connector}${node.relativePath} ${typeBadge}`);

    const newPrefix = prefix + (isLast ? '    ' : '│   ');
    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      const isChildLast = i === node.children.length - 1;
      this.appendTreeLines(child, newPrefix, isChildLast, lines);
    }
  }
}
