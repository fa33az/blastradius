import { Project } from 'ts-morph';
import * as path from 'path';
import { DependencyGraph, FixResult, ImpactResult } from './types';

export class ImportFixer {
  private rootPath: string;
  private graph: DependencyGraph;

  constructor(rootPath: string, graph: DependencyGraph) {
    this.rootPath = path.resolve(rootPath);
    this.graph = graph;
  }

  public pruneUnusedImports(impact: ImpactResult, targetPath: string): FixResult {
    const modifiedFilesSet = new Set<string>();
    let removedImportsCount = 0;
    const errors: string[] = [];

    const targetNode = this.graph.nodes.get(targetPath);
    if (!targetNode || targetNode.dependentModules.length === 0) {
      return {
        success: true,
        modifiedFiles: [],
        removedImportsCount: 0,
        errors: [],
      };
    }

    try {
      const project = new Project({
        compilerOptions: { allowJs: true },
      });

      // Add all direct dependent source files to ts-morph project
      const dependentPaths = targetNode.dependentModules.map(edge => edge.sourcePath);
      for (const depPath of dependentPaths) {
        if (project.getFileSystem().fileExistsSync(depPath)) {
          project.addSourceFileAtPath(depPath);
        }
      }

      const targetRelPath = targetNode.relativePath;
      const targetBaseName = path.basename(targetPath, path.extname(targetPath));

      for (const sourceFile of project.getSourceFiles()) {
        let fileChanged = false;
        const importDecls = sourceFile.getImportDeclarations();

        for (const importDecl of importDecls) {
          const resolvedFile = importDecl.getModuleSpecifierSourceFile();
          const specifierVal = importDecl.getModuleSpecifierValue();
          const resolvedPath = resolvedFile ? path.resolve(resolvedFile.getFilePath()) : null;

          const isMatch =
            (resolvedPath && resolvedPath === targetPath) ||
            specifierVal === targetRelPath ||
            specifierVal === `./${targetRelPath}` ||
            specifierVal.endsWith(`/${targetBaseName}`) ||
            specifierVal === `./${targetBaseName}`;

          if (isMatch) {
            importDecl.remove();
            removedImportsCount++;
            fileChanged = true;
          }
        }

        if (fileChanged) {
          sourceFile.saveSync();
          const relPath = path.relative(this.rootPath, sourceFile.getFilePath()).replace(/\\/g, '/');
          modifiedFilesSet.add(relPath);
        }
      }

      return {
        success: true,
        modifiedFiles: Array.from(modifiedFilesSet),
        removedImportsCount,
        errors,
      };
    } catch (err: any) {
      errors.push(`Failed to prune imports: ${err.message}`);
      return {
        success: false,
        modifiedFiles: Array.from(modifiedFilesSet),
        removedImportsCount,
        errors,
      };
    }
  }
}
