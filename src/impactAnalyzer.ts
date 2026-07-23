import * as path from 'path';
import { CascadeTreeNode, DependencyGraph, ImpactResult, ImportType, ModuleNode } from './types';

export class ImpactAnalyzer {
  private graph: DependencyGraph;

  constructor(graph: DependencyGraph) {
    this.graph = graph;
  }

  public analyze(targetInputPath: string): ImpactResult {
    const rootPath = this.graph.rootPath;
    const resolvedPath = path.isAbsolute(targetInputPath)
      ? path.resolve(targetInputPath)
      : path.resolve(rootPath, targetInputPath);

    const targetNode = this.graph.nodes.get(resolvedPath);
    const targetRelativePath = path.relative(rootPath, resolvedPath).replace(/\\/g, '/');

    if (!targetNode) {
      return {
        targetPath: resolvedPath,
        targetRelativePath,
        exists: false,
        directDependents: [],
        typeOnlyDependents: [],
        dynamicDependents: [],
        indirectDependents: [],
        totalAffected: 0,
        maxCascadeDepth: 0,
        cascadeTree: [],
      };
    }

    const directDependents: string[] = [];
    const typeOnlyDependents: string[] = [];
    const dynamicDependents: string[] = [];

    // Categorize direct imports
    for (const edge of targetNode.dependentModules) {
      if (edge.type === 'type-only') {
        typeOnlyDependents.push(edge.sourcePath);
      } else if (edge.type === 'dynamic') {
        dynamicDependents.push(edge.sourcePath);
      } else {
        directDependents.push(edge.sourcePath);
      }
    }

    // Traverse cascade tree starting from target node
    const visited = new Set<string>();
    visited.add(resolvedPath);

    const cascadeTree: CascadeTreeNode[] = [];
    let maxCascadeDepth = 0;
    const indirectSet = new Set<string>();

    for (const edge of targetNode.dependentModules) {
      const childTree = this.buildCascadeTree(edge.sourcePath, 1, edge.type, visited, indirectSet);
      cascadeTree.push(childTree);
      if (childTree.depth > maxCascadeDepth) {
        maxCascadeDepth = childTree.depth;
      }
    }

    // Indirect dependents are all affected nodes excluding direct ones and target itself
    const allDirect = new Set([...directDependents, ...typeOnlyDependents, ...dynamicDependents]);
    const indirectDependents = Array.from(indirectSet).filter(p => !allDirect.has(p) && p !== resolvedPath);
    const totalAffected = allDirect.size + indirectDependents.length;

    return {
      targetPath: resolvedPath,
      targetRelativePath,
      exists: true,
      directDependents,
      typeOnlyDependents,
      dynamicDependents,
      indirectDependents,
      totalAffected,
      maxCascadeDepth,
      cascadeTree,
    };
  }

  private buildCascadeTree(
    currentPath: string,
    depth: number,
    importType: ImportType,
    visited: Set<string>,
    indirectSet: Set<string>
  ): CascadeTreeNode {
    indirectSet.add(currentPath);
    visited.add(currentPath);

    const currentNode = this.graph.nodes.get(currentPath);
    const relativePath = currentNode
      ? currentNode.relativePath
      : path.relative(this.graph.rootPath, currentPath).replace(/\\/g, '/');

    const children: CascadeTreeNode[] = [];

    if (currentNode) {
      for (const edge of currentNode.dependentModules) {
        if (!visited.has(edge.sourcePath)) {
          const childNode = this.buildCascadeTree(
            edge.sourcePath,
            depth + 1,
            edge.type,
            new Set(visited),
            indirectSet
          );
          children.push(childNode);
        }
      }
    }

    // Calculate maximum depth reached in this sub-tree
    let subtreeMaxDepth = depth;
    for (const child of children) {
      if (child.depth > subtreeMaxDepth) {
        subtreeMaxDepth = child.depth;
      }
    }

    return {
      relativePath,
      absolutePath: currentPath,
      depth: subtreeMaxDepth,
      importType,
      children,
    };
  }
}
