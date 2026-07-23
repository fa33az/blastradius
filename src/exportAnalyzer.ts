import { Project } from 'ts-morph';
import * as path from 'path';
import { DependencyGraph, ExportImpactResult } from './types';

export class ExportAnalyzer {
  private rootPath: string;
  private graph: DependencyGraph;

  constructor(rootPath: string, graph: DependencyGraph) {
    this.rootPath = path.resolve(rootPath);
    this.graph = graph;
  }

  public analyzeExport(targetPath: string, exportName: string): ExportImpactResult {
    const targetNode = this.graph.nodes.get(targetPath);
    const targetRelativePath = targetNode
      ? targetNode.relativePath
      : path.relative(this.rootPath, targetPath).replace(/\\/g, '/');

    const referencingModules: string[] = [];
    let isUsedInEntrypoint = false;

    if (targetNode) {
      for (const edge of targetNode.dependentModules) {
        if (edge.specifiers.includes(exportName) || edge.specifiers.includes('*')) {
          const parentNode = this.graph.nodes.get(edge.sourcePath);
          const relPath = parentNode ? parentNode.relativePath : edge.sourcePath;
          referencingModules.push(relPath);
          if (parentNode?.isEntrypoint) {
            isUsedInEntrypoint = true;
          }
        }
      }
    }

    return {
      exportName,
      targetPath,
      targetRelativePath,
      referencingModules,
      totalReferences: referencingModules.length,
      isUsedInEntrypoint,
    };
  }
}
