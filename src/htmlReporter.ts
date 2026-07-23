import * as fs from 'fs';
import * as path from 'path';
import { BlastRadiusReport, CascadeTreeNode } from './types';

export class HtmlReporter {
  public generateHtml(report: BlastRadiusReport, outputPath: string): string {
    const targetPath = path.resolve(outputPath);

    const riskColor =
      report.runtimeRisk === 'Critical'
        ? '#ef4444'
        : report.runtimeRisk === 'High'
        ? '#f97316'
        : report.runtimeRisk === 'Medium'
        ? '#eab308'
        : '#22c55e';

    const confidenceColor =
      report.deletionConfidenceScore >= 80
        ? '#22c55e'
        : report.deletionConfidenceScore >= 50
        ? '#eab308'
        : '#ef4444';

    const treeHtml = report.tree && report.tree.length > 0 ? this.renderTreeHtml(report.tree) : '<div class="no-tree">No downstream dependents found.</div>';

    const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>blastradius Report - ${report.target}</title>
  <style>
    :root {
      --bg: #090d16;
      --card-bg: #111827;
      --border: #1f2937;
      --text: #f3f4f6;
      --muted: #9ca3af;
      --accent: #3b82f6;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      background-color: var(--bg);
      color: var(--text);
      margin: 0;
      padding: 40px 20px;
      display: flex;
      justify-content: center;
    }
    .container {
      max-width: 900px;
      width: 100%;
    }
    .header {
      border-bottom: 1px solid var(--border);
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .title {
      font-size: 28px;
      font-weight: 700;
      margin: 0 0 10px 0;
      color: #ffffff;
    }
    .subtitle {
      color: var(--muted);
      font-size: 15px;
    }
    .target-badge {
      font-family: monospace;
      background-color: #1e293b;
      color: #38bdf8;
      padding: 4px 10px;
      border-radius: 6px;
      font-size: 14px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }
    .card {
      background-color: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 20px;
    }
    .card-title {
      font-size: 13px;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 8px;
    }
    .card-value {
      font-size: 32px;
      font-weight: 800;
    }
    .section-title {
      font-size: 20px;
      font-weight: 600;
      margin: 30px 0 15px 0;
      border-left: 4px solid var(--accent);
      padding-left: 12px;
    }
    .reasons-list {
      background-color: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 20px;
      list-style: none;
      margin: 0;
    }
    .reasons-list li {
      padding: 8px 0;
      border-bottom: 1px solid #1e293b;
      font-size: 14px;
    }
    .reasons-list li:last-child {
      border-bottom: none;
    }
    .tree-container {
      background-color: var(--card-bg);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 20px;
      font-family: monospace;
      font-size: 14px;
      overflow-x: auto;
    }
    .tree-node {
      margin: 4px 0;
    }
    .badge-static { color: #38bdf8; }
    .badge-type { color: #94a3b8; }
    .badge-dynamic { color: #c084fc; }
    .footer {
      margin-top: 50px;
      text-align: center;
      color: var(--muted);
      font-size: 13px;
      border-top: 1px solid var(--border);
      padding-top: 20px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 class="title">blastradius Impact Simulation Report</h1>
      <div class="subtitle">Target Module: <span class="target-badge">${report.target}</span></div>
    </div>

    <div class="grid">
      <div class="card">
        <div class="card-title">Confidence Delete Score</div>
        <div class="card-value" style="color: ${confidenceColor};">${report.deletionConfidenceScore}%</div>
      </div>
      <div class="card">
        <div class="card-title">Runtime Risk</div>
        <div class="card-value" style="color: ${riskColor};">${report.runtimeRisk}</div>
      </div>
      <div class="card">
        <div class="card-title">Bug Probability</div>
        <div class="card-value">${report.bugProbabilityPct}%</div>
      </div>
      <div class="card">
        <div class="card-title">Total Affected Modules</div>
        <div class="card-value">${report.totalAffectedModules}</div>
      </div>
    </div>

    <div class="card" style="margin-bottom: 30px;">
      <div class="card-title">Recommendation</div>
      <div style="font-size: 16px; font-weight: 600; color: #f3f4f6;">${report.recommendation}</div>
    </div>

    <div class="section-title">Risk Factors & Detailed Reasoning</div>
    <ul class="reasons-list">
      ${report.detailedReasons.map(r => `<li style="color: #f87171;">• ${r}</li>`).join('')}
      ${report.positiveFactors.map(f => `<li style="color: #4ade80;">• ${f}</li>`).join('')}
    </ul>

    <div class="section-title">Dependent Cascade Tree</div>
    <div class="tree-container">
      ${treeHtml}
    </div>

    <div class="footer">
      Generated by blastradius CLI | deterministic impact cascade simulator
    </div>
  </div>
</body>
</html>`;

    fs.writeFileSync(targetPath, htmlContent, 'utf-8');
    return targetPath;
  }

  private renderTreeHtml(nodes: CascadeTreeNode[]): string {
    let result = '';
    for (const node of nodes) {
      result += this.renderNodeHtml(node, 0);
    }
    return result;
  }

  private renderNodeHtml(node: CascadeTreeNode, depth: number): string {
    const indent = '&nbsp;&nbsp;&nbsp;&nbsp;'.repeat(depth);
    const badgeClass =
      node.importType === 'type-only'
        ? 'badge-type'
        : node.importType === 'dynamic'
        ? 'badge-dynamic'
        : 'badge-static';

    let html = `<div class="tree-node">${indent}└── ${node.relativePath} <span class="${badgeClass}">[${node.importType}]</span></div>`;
    for (const child of node.children) {
      html += this.renderNodeHtml(child, depth + 1);
    }
    return html;
  }
}
